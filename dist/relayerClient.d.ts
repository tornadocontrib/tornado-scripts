import type { Aggregator } from '@tornado/contracts';
import type { RelayerStructOutput } from '@tornado/contracts/dist/contracts/Governance/Aggregator/Aggregator';
import { NetIdType, Config } from './networkConfig';
import { fetchDataOptions } from './providers';
import type { snarkProofs } from './websnark';
export declare const MIN_STAKE_BALANCE: bigint;
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
export interface semanticVersion {
    major: string;
    minor: string;
    patch: string;
    prerelease?: string;
    buildmetadata?: string;
}
export declare function parseSemanticVersion(version: string): semanticVersion;
export declare function isRelayerUpdated(relayerVersion: string, netId: NetIdType): boolean;
export declare function calculateScore({ stakeBalance, tornadoServiceFee }: RelayerInfo, minFee?: number, maxFee?: number): bigint;
export declare function getWeightRandom(weightsScores: bigint[], random: bigint): number;
export type RelayerInstanceList = {
    [key in string]: {
        instanceAddress: {
            [key in string]: string;
        };
    };
};
export declare function getSupportedInstances(instanceList: RelayerInstanceList): string[];
export declare function pickWeightedRandomRelayer(relayers: RelayerInfo[], netId: NetIdType): RelayerInfo;
export interface RelayerClientConstructor {
    netId: NetIdType;
    config: Config;
    Aggregator: Aggregator;
    fetchDataOptions?: fetchDataOptions;
}
export type RelayerClientWithdraw = snarkProofs & {
    contract: string;
};
export declare class RelayerClient {
    netId: NetIdType;
    config: Config;
    Aggregator: Aggregator;
    selectedRelayer?: Relayer;
    fetchDataOptions?: fetchDataOptions;
    constructor({ netId, config, Aggregator, fetchDataOptions }: RelayerClientConstructor);
    askRelayerStatus({ hostname, relayerAddress, }: {
        hostname: string;
        relayerAddress?: string;
    }): Promise<RelayerStatus>;
    filterRelayer(curr: RelayerStructOutput, relayer: RelayerParams, subdomains: string[], debugRelayer?: boolean): Promise<RelayerInfo | RelayerError>;
    getValidRelayers(relayers: RelayerParams[], subdomains: string[], debugRelayer?: boolean): Promise<{
        validRelayers: RelayerInfo[];
        invalidRelayers: RelayerError[];
    }>;
    pickWeightedRandomRelayer(relayers: RelayerInfo[]): RelayerInfo;
    tornadoWithdraw({ contract, proof, args }: RelayerClientWithdraw): Promise<void>;
}
