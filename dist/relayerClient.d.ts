import { NetIdType, Config } from './networkConfig';
import { fetchDataOptions } from './providers';
import type { snarkProofs } from './websnark';
import type { CachedRelayerInfo } from './events';
export declare const MIN_FEE = 0.1;
export declare const MAX_FEE = 0.9;
export declare const MIN_STAKE_BALANCE: bigint;
export interface RelayerParams {
    ensName: string;
    relayerAddress: string;
}
/**
 * Info from relayer status
 */
export interface RelayerInfo extends RelayerParams {
    netId: NetIdType;
    url: string;
    hostname: string;
    rewardAccount: string;
    instances: string[];
    stakeBalance?: string;
    gasPrice?: number;
    ethPrices?: Record<string, string>;
    currentQueue: number;
    tornadoServiceFee: number;
}
export interface RelayerError {
    hostname: string;
    relayerAddress?: string;
    errorMessage?: string;
    hasError: boolean;
}
export interface RelayerStatus {
    url: string;
    rewardAccount: string;
    instances: Record<string, {
        instanceAddress: Record<string, string>;
        tokenAddress?: string;
        symbol: string;
        decimals: number;
    }>;
    gasPrices?: {
        fast: number;
        additionalProperties?: number;
    };
    netId: NetIdType;
    ethPrices?: Record<string, string>;
    tornadoServiceFee: number;
    latestBlock?: number;
    version: string;
    health: {
        status: string;
        error: string;
        errorsLog: any[];
    };
    currentQueue: number;
}
export interface TornadoWithdrawParams extends snarkProofs {
    contract: string;
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
/**
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
**/
export declare function calculateScore({ stakeBalance, tornadoServiceFee }: RelayerInfo): bigint;
export declare function getWeightRandom(weightsScores: bigint[], random: bigint): number;
export type RelayerInstanceList = Record<string, {
    instanceAddress: Record<string, string>;
}>;
export declare function getSupportedInstances(instanceList: RelayerInstanceList): string[];
export declare function pickWeightedRandomRelayer(relayers: RelayerInfo[]): RelayerInfo;
export interface RelayerClientConstructor {
    netId: NetIdType;
    config: Config;
    fetchDataOptions?: fetchDataOptions;
}
export declare class RelayerClient {
    netId: NetIdType;
    config: Config;
    selectedRelayer?: RelayerInfo;
    fetchDataOptions?: fetchDataOptions;
    tovarish: boolean;
    constructor({ netId, config, fetchDataOptions }: RelayerClientConstructor);
    askRelayerStatus({ hostname, url, relayerAddress, }: {
        hostname?: string;
        url?: string;
        relayerAddress?: string;
    }): Promise<RelayerStatus>;
    filterRelayer(relayer: CachedRelayerInfo): Promise<RelayerInfo | RelayerError | undefined>;
    getValidRelayers(relayers: CachedRelayerInfo[]): Promise<{
        validRelayers: RelayerInfo[];
        invalidRelayers: RelayerError[];
    }>;
    pickWeightedRandomRelayer(relayers: RelayerInfo[]): RelayerInfo;
    tornadoWithdraw({ contract, proof, args }: TornadoWithdrawParams, callback?: (jobResp: RelayerTornadoWithdraw | RelayerTornadoJobs) => void): Promise<void>;
}
