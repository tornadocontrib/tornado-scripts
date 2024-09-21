import { getAddress, parseEther } from 'ethers';
import { sleep } from './utils';
import { NetId, NetIdType, Config } from './networkConfig';
import { fetchData, fetchDataOptions } from './providers';
import { ajv, jobsSchema, getStatusSchema } from './schemas';
import type { snarkProofs } from './websnark';
import { CachedRelayerInfo } from './events/base';

export const MIN_FEE = 0.1;

export const MAX_FEE = 0.6;

export const MIN_STAKE_BALANCE = parseEther('500');

export interface RelayerParams {
  ensName: string;
  relayerAddress: string;
}

/**
 * Info from relayer status
 */
export type RelayerInfo = RelayerParams & {
  netId: NetIdType;
  url: string;
  hostname: string;
  rewardAccount: string;
  instances: string[];
  stakeBalance?: string;
  gasPrice?: number;
  ethPrices?: {
    [key in string]: string;
  };
  currentQueue: number;
  tornadoServiceFee: number;
};

export type RelayerError = {
  hostname: string;
  relayerAddress?: string;
  errorMessage?: string;
  hasError: boolean;
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

export function calculateScore({ stakeBalance, tornadoServiceFee }: RelayerInfo) {
  if (tornadoServiceFee < MIN_FEE) {
    tornadoServiceFee = MIN_FEE;
  } else if (tornadoServiceFee >= MAX_FEE) {
    return BigInt(0);
  }

  const serviceFeeCoefficient = (tornadoServiceFee - MIN_FEE) ** 2;
  const feeDiffCoefficient = 1 / (MAX_FEE - MIN_FEE) ** 2;
  const coefficientsMultiplier = 1 - feeDiffCoefficient * serviceFeeCoefficient;

  return BigInt(Math.floor(Number(stakeBalance || '0') * coefficientsMultiplier));
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

export function pickWeightedRandomRelayer(relayers: RelayerInfo[]) {
  const weightsScores = relayers.map((el) => calculateScore(el));
  const totalWeight = weightsScores.reduce((acc, curr) => {
    return (acc = acc + curr);
  }, BigInt('0'));

  const random = BigInt(Math.floor(Number(totalWeight) * Math.random()));
  const weightRandomIndex = getWeightRandom(weightsScores, random);

  return relayers[weightRandomIndex];
}

export interface RelayerClientConstructor {
  netId: NetIdType;
  config: Config;
  fetchDataOptions?: fetchDataOptions;
}

export type RelayerClientWithdraw = snarkProofs & {
  contract: string;
};

export class RelayerClient {
  netId: NetIdType;
  config: Config;
  selectedRelayer?: RelayerInfo;
  fetchDataOptions?: fetchDataOptions;

  constructor({ netId, config, fetchDataOptions }: RelayerClientConstructor) {
    this.netId = netId;
    this.config = config;
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

  async filterRelayer(relayer: CachedRelayerInfo): Promise<RelayerInfo | RelayerError | undefined> {
    const hostname = relayer.hostnames[this.netId];
    const { ensName, relayerAddress } = relayer;

    if (!hostname) {
      return;
    }

    try {
      const status = await this.askRelayerStatus({ hostname, relayerAddress });

      return {
        netId: status.netId,
        url: status.url,
        hostname,
        ensName,
        relayerAddress,
        rewardAccount: getAddress(status.rewardAccount),
        instances: getSupportedInstances(status.instances),
        stakeBalance: relayer.stakeBalance,
        gasPrice: status.gasPrices?.fast,
        ethPrices: status.ethPrices,
        currentQueue: status.currentQueue,
        tornadoServiceFee: status.tornadoServiceFee,
      } as RelayerInfo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return {
        hostname,
        relayerAddress,
        errorMessage: err.message,
        hasError: true,
      } as RelayerError;
    }
  }

  async getValidRelayers(relayers: CachedRelayerInfo[]): Promise<{
    validRelayers: RelayerInfo[];
    invalidRelayers: RelayerError[];
  }> {
    const invalidRelayers: RelayerError[] = [];

    const validRelayers = (await Promise.all(relayers.map((relayer) => this.filterRelayer(relayer)))).filter((r) => {
      if (!r) {
        return false;
      }
      if ((r as RelayerError).hasError) {
        invalidRelayers.push(r as RelayerError);
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
    return pickWeightedRandomRelayer(relayers);
  }

  async tornadoWithdraw({ contract, proof, args }: RelayerClientWithdraw) {
    const { url } = this.selectedRelayer as RelayerInfo;

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
