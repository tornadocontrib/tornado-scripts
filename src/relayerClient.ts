import { getAddress, namehash, parseEther } from 'ethers';
import type { Aggregator } from '@tornado/contracts';
import type { RelayerStructOutput } from '@tornado/contracts/dist/contracts/Governance/Aggregator/Aggregator';
import { sleep } from './utils';
import { NetId, NetIdType, Config } from './networkConfig';
import { fetchData, fetchDataOptions } from './providers';
import { ajv, jobsSchema, getStatusSchema } from './schemas';
import type { snarkProofs } from './websnark';

export const MIN_STAKE_BALANCE = parseEther('500');

export interface RelayerParams {
  ensName: string;
  relayerAddress?: string;
}

export interface Relayer {
  netId: NetIdType;
  url: string;
  hostname: string;
  rewardAccount: string;
  instances: string[];
  gasPrice?: number;
  ethPrices?: {
    [key in string]: string;
  };
  currentQueue: number;
  tornadoServiceFee: number;
}

export type RelayerInfo = Relayer & {
  ensName: string;
  stakeBalance: bigint;
  relayerAddress: string;
};

export type RelayerError = {
  hostname: string;
  relayerAddress?: string;
  errorMessage?: string;
};

export interface RelayerStatus {
  url: string;
  rewardAccount: string;
  instances: {
    [key in string]: {
      instanceAddress: {
        [key in string]: string;
      };
      tokenAddress?: string;
      symbol: string;
      decimals: number;
    };
  };
  gasPrices?: {
    fast: number;
    additionalProperties?: number;
  };
  netId: NetIdType;
  ethPrices?: {
    [key in string]: string;
  };
  tornadoServiceFee: number;
  latestBlock?: number;
  version: string;
  health: {
    status: string;
    error: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorsLog: any[];
  };
  currentQueue: number;
}

export interface RelayerTornadoWithdraw {
  id?: string;
  error?: string;
}

export interface RelayerTornadoJobs {
  error?: string;
  id: string;
  type?: string;
  status: string;
  contract?: string;
  proof?: string;
  args?: string[];
  txHash?: string;
  confirmations?: number;
  failedReason?: string;
}

const semVerRegex =
  /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export interface semanticVersion {
  major: string;
  minor: string;
  patch: string;
  prerelease?: string;
  buildmetadata?: string;
}

export function parseSemanticVersion(version: string) {
  const { groups } = semVerRegex.exec(version) as RegExpExecArray;
  return groups as unknown as semanticVersion;
}

export function isRelayerUpdated(relayerVersion: string, netId: NetIdType) {
  const { major, patch, prerelease } = parseSemanticVersion(relayerVersion);
  // Save backwards compatibility with V4 relayers for Ethereum Mainnet
  const requiredMajor = netId === NetId.MAINNET ? '4' : '5';
  const isUpdatedMajor = major === requiredMajor;

  if (prerelease) return false;
  return isUpdatedMajor && (Number(patch) >= 5 || netId !== NetId.MAINNET); // Patch checking - also backwards compatibility for Mainnet
}

export function calculateScore({ stakeBalance, tornadoServiceFee }: RelayerInfo, minFee = 0.33, maxFee = 0.53) {
  if (tornadoServiceFee < minFee) {
    tornadoServiceFee = minFee;
  } else if (tornadoServiceFee >= maxFee) {
    return BigInt(0);
  }

  const serviceFeeCoefficient = (tornadoServiceFee - minFee) ** 2;
  const feeDiffCoefficient = 1 / (maxFee - minFee) ** 2;
  const coefficientsMultiplier = 1 - feeDiffCoefficient * serviceFeeCoefficient;

  return BigInt(Math.floor(Number(stakeBalance) * coefficientsMultiplier));
}

export function getWeightRandom(weightsScores: bigint[], random: bigint) {
  for (let i = 0; i < weightsScores.length; i++) {
    if (random < weightsScores[i]) {
      return i;
    }
    random = random - weightsScores[i];
  }
  return Math.floor(Math.random() * weightsScores.length);
}

export type RelayerInstanceList = {
  [key in string]: {
    instanceAddress: {
      [key in string]: string;
    };
  };
};

export function getSupportedInstances(instanceList: RelayerInstanceList) {
  const rawList = Object.values(instanceList)
    .map(({ instanceAddress }) => {
      return Object.values(instanceAddress);
    })
    .flat();

  return rawList.map((l) => getAddress(l));
}

export function pickWeightedRandomRelayer(relayers: RelayerInfo[], netId: NetIdType) {
  let minFee: number, maxFee: number;

  if (netId !== NetId.MAINNET) {
    minFee = 0.01;
    maxFee = 0.3;
  }

  const weightsScores = relayers.map((el) => calculateScore(el, minFee, maxFee));
  const totalWeight = weightsScores.reduce((acc, curr) => {
    return (acc = acc + curr);
  }, BigInt('0'));

  const random = BigInt(Number(totalWeight) * Math.random());
  const weightRandomIndex = getWeightRandom(weightsScores, random);

  return relayers[weightRandomIndex];
}

export interface RelayerClientConstructor {
  netId: NetIdType;
  config: Config;
  Aggregator: Aggregator;
  fetchDataOptions?: fetchDataOptions;
}

export type RelayerClientWithdraw = snarkProofs & {
  contract: string;
};

export class RelayerClient {
  netId: NetIdType;
  config: Config;
  Aggregator: Aggregator;
  selectedRelayer?: Relayer;
  fetchDataOptions?: fetchDataOptions;

  constructor({ netId, config, Aggregator, fetchDataOptions }: RelayerClientConstructor) {
    this.netId = netId;
    this.config = config;
    this.Aggregator = Aggregator;
    this.fetchDataOptions = fetchDataOptions;
  }

  async askRelayerStatus({
    hostname,
    relayerAddress,
  }: {
    hostname: string;
    relayerAddress?: string;
  }): Promise<RelayerStatus> {
    const url = `https://${!hostname.endsWith('/') ? hostname + '/' : hostname}`;

    const rawStatus = (await fetchData(`${url}status`, {
      ...this.fetchDataOptions,
      headers: {
        'Content-Type': 'application/json, application/x-www-form-urlencoded',
      },
      timeout: this.fetchDataOptions?.torPort ? 10000 : 3000,
      maxRetry: this.fetchDataOptions?.torPort ? 2 : 0,
    })) as object;

    const statusValidator = ajv.compile(getStatusSchema(this.netId, this.config));

    if (!statusValidator(rawStatus)) {
      throw new Error('Invalid status schema');
    }

    const status = {
      ...rawStatus,
      url,
    } as RelayerStatus;

    if (status.currentQueue > 5) {
      throw new Error('Withdrawal queue is overloaded');
    }

    if (status.netId !== this.netId) {
      throw new Error('This relayer serves a different network');
    }

    if (relayerAddress && this.netId === NetId.MAINNET && status.rewardAccount !== relayerAddress) {
      throw new Error('The Relayer reward address must match registered address');
    }

    if (!isRelayerUpdated(status.version, this.netId)) {
      throw new Error('Outdated version.');
    }

    return status;
  }

  async filterRelayer(
    curr: RelayerStructOutput,
    relayer: RelayerParams,
    subdomains: string[],
    debugRelayer: boolean = false,
  ): Promise<RelayerInfo | RelayerError> {
    const { ensSubdomainKey } = this.config;
    const subdomainIndex = subdomains.indexOf(ensSubdomainKey);
    const mainnetSubdomain = curr.records[0];
    const hostname = curr.records[subdomainIndex];
    const isHostWithProtocol = hostname.includes('http');

    const { owner, balance: stakeBalance, isRegistered } = curr;
    const { ensName, relayerAddress } = relayer;

    const isOwner = !relayerAddress || relayerAddress === owner;
    const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;

    const preCondition =
      hostname && isOwner && mainnetSubdomain && isRegistered && hasMinBalance && !isHostWithProtocol;

    if (preCondition || debugRelayer) {
      try {
        const status = await this.askRelayerStatus({ hostname, relayerAddress });

        return {
          netId: status.netId,
          url: status.url,
          hostname,
          ensName,
          stakeBalance,
          relayerAddress,
          rewardAccount: getAddress(status.rewardAccount),
          instances: getSupportedInstances(status.instances),
          gasPrice: status.gasPrices?.fast,
          ethPrices: status.ethPrices,
          currentQueue: status.currentQueue,
          tornadoServiceFee: status.tornadoServiceFee,
        } as RelayerInfo;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (debugRelayer) {
          throw err;
        }
        return {
          hostname,
          relayerAddress,
          errorMessage: err.message,
        } as RelayerError;
      }
    } else {
      if (debugRelayer) {
        const errMsg = `Relayer ${hostname} condition not met`;
        throw new Error(errMsg);
      }
      return {
        hostname,
        relayerAddress,
        errorMessage: `Relayer ${hostname} condition not met`,
      };
    }
  }

  async getValidRelayers(
    // this should be ascending order of events
    relayers: RelayerParams[],
    subdomains: string[],
    debugRelayer: boolean = false,
  ): Promise<{
    validRelayers: RelayerInfo[];
    invalidRelayers: RelayerError[];
  }> {
    const relayersSet = new Set();

    const uniqueRelayers = relayers.reverse().filter(({ ensName }) => {
      if (!relayersSet.has(ensName)) {
        relayersSet.add(ensName);
        return true;
      }
      return false;
    });

    const relayerNameHashes = uniqueRelayers.map((r) => namehash(r.ensName));

    const relayersData = await this.Aggregator.relayersData.staticCall(relayerNameHashes, subdomains);

    const invalidRelayers: RelayerError[] = [];

    const validRelayers = (
      await Promise.all(
        relayersData.map((curr, index) => this.filterRelayer(curr, uniqueRelayers[index], subdomains, debugRelayer)),
      )
    ).filter((r) => {
      if ((r as RelayerError).errorMessage) {
        invalidRelayers.push(r);
        return false;
      }
      return true;
    }) as RelayerInfo[];

    return {
      validRelayers,
      invalidRelayers,
    };
  }

  pickWeightedRandomRelayer(relayers: RelayerInfo[]) {
    return pickWeightedRandomRelayer(relayers, this.netId);
  }

  async tornadoWithdraw({ contract, proof, args }: RelayerClientWithdraw) {
    const { url } = this.selectedRelayer as Relayer;

    const withdrawResponse = (await fetchData(`${url}v1/tornadoWithdraw`, {
      ...this.fetchDataOptions,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract,
        proof,
        args,
      }),
    })) as RelayerTornadoWithdraw;

    const { id, error } = withdrawResponse;

    if (error) {
      throw new Error(error);
    }

    let relayerStatus: string | undefined;

    const jobUrl = `${url}v1/jobs/${id}`;

    console.log(`Job submitted: ${jobUrl}\n`);

    while (!relayerStatus || !['FAILED', 'CONFIRMED'].includes(relayerStatus)) {
      const jobResponse = await fetchData(jobUrl, {
        ...this.fetchDataOptions,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (jobResponse.error) {
        throw new Error(error);
      }

      const jobValidator = ajv.compile(jobsSchema);

      if (!jobValidator(jobResponse)) {
        const errMsg = `${jobUrl} has an invalid job response`;
        throw new Error(errMsg);
      }

      const { status, txHash, confirmations, failedReason } = jobResponse as unknown as RelayerTornadoJobs;

      if (relayerStatus !== status) {
        if (status === 'FAILED') {
          const errMsg = `Job ${status}: ${jobUrl} failed reason: ${failedReason}`;
          throw new Error(errMsg);
        } else if (status === 'SENT') {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}\n`);
        } else if (status === 'MINED') {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}, confirmations: ${confirmations}\n`);
        } else if (status === 'CONFIRMED') {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}, confirmations: ${confirmations}\n`);
        } else {
          console.log(`Job ${status}: ${jobUrl}\n`);
        }

        relayerStatus = status;
      }

      await sleep(3000);
    }
  }
}
