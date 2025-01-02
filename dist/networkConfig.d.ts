import type { DepositType } from './deposits';
/**
 * Type of chainIds used on this library (not essential for new networks)
 */
export declare enum NetId {
    MAINNET = 1,
    BSC = 56,
    POLYGON = 137,
    OPTIMISM = 10,
    ARBITRUM = 42161,
    BASE = 8453,
    BLAST = 81457,
    GNOSIS = 100,
    AVALANCHE = 43114,
    SEPOLIA = 11155111
}
export type NetIdType = NetId | number;
export interface RpcUrl {
    name: string;
    url: string;
}
export type RpcUrls = Record<string, RpcUrl>;
export interface SubgraphUrl {
    name: string;
    url: string;
}
export type SubgraphUrls = Record<string, SubgraphUrl>;
export interface TornadoInstance {
    instanceAddress: Record<string, string>;
    instanceApproval?: boolean;
    optionalInstances?: string[];
    tokenAddress?: string;
    tokenGasLimit?: number;
    symbol: string;
    decimals: number;
    gasLimit?: number;
}
export type TokenInstances = Record<string, TornadoInstance>;
export interface Config {
    nativeCurrency: string;
    currencyName: string;
    explorerUrl: string;
    merkleTreeHeight: number;
    emptyElement: string;
    networkName: string;
    deployedBlock: number;
    rpcUrls: RpcUrls;
    stablecoin: string;
    multicallContract: string;
    routerContract: string;
    echoContract: string;
    offchainOracleContract?: string;
    tornContract?: string;
    governanceContract?: string;
    stakingRewardsContract?: string;
    registryContract?: string;
    aggregatorContract?: string;
    balanceAggregatorContract?: string;
    reverseRecordsContract?: string;
    ovmGasPriceOracleContract?: string;
    tornadoSubgraph?: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    subgraphs?: SubgraphUrls;
    tokens: TokenInstances;
    optionalTokens?: string[];
    disabledTokens?: string[];
    relayerEnsSubdomain: string;
    pollInterval: number;
}
export type networkConfig = Record<NetIdType, Config>;
export type SubdomainMap = Record<NetIdType, string>;
export declare const defaultConfig: networkConfig;
export declare const enabledChains: NetIdType[];
/**
 * Custom config object to extend default config
 *
 * Inspired by getUrlFunc from ethers.js
 * https://github.com/ethers-io/ethers.js/blob/v6/src.ts/utils/fetch.ts#L59
 */
export declare let customConfig: networkConfig;
/**
 * Add or override existing network config object
 *
 * Could be also called on the UI hook so that the UI could allow people to use custom privacy pools
 */
export declare function addNetwork(newConfig: networkConfig): void;
export declare function getNetworkConfig(): networkConfig;
export declare function getConfig(netId: NetIdType): Config;
export declare function getActiveTokens(config: Config): string[];
export declare function getInstanceByAddress(config: Config, address: string): {
    amount: string;
    currency: string;
    symbol: string;
    decimals: number;
    tokenAddress: string | undefined;
} | undefined;
export declare function getRelayerEnsSubdomains(): SubdomainMap;
export declare function getMultiInstances(netId: NetIdType, config: Config): Record<string, DepositType>;
