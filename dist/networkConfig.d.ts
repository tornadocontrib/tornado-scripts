/**
 * Type of default supported networks
 */
export declare enum NetId {
    MAINNET = 1,
    BSC = 56,
    POLYGON = 137,
    OPTIMISM = 10,
    ARBITRUM = 42161,
    GNOSIS = 100,
    AVALANCHE = 43114,
    SEPOLIA = 11155111
}
export type NetIdType = NetId | number;
export interface RpcUrl {
    name: string;
    url: string;
}
export type RpcUrls = {
    [key in string]: RpcUrl;
};
export interface SubgraphUrl {
    name: string;
    url: string;
}
export type SubgraphUrls = {
    [key in string]: SubgraphUrl;
};
export type TornadoInstance = {
    instanceAddress: {
        [key in string]: string;
    };
    optionalInstances?: string[];
    tokenAddress?: string;
    tokenGasLimit?: number;
    symbol: string;
    decimals: number;
    gasLimit?: number;
};
export type TokenInstances = {
    [key in string]: TornadoInstance;
};
export type Config = {
    rpcCallRetryAttempt?: number;
    gasPrices: {
        instant: number;
        fast?: number;
        standard?: number;
        low?: number;
        maxPriorityFeePerGas?: number;
    };
    nativeCurrency: string;
    currencyName: string;
    explorerUrl: string;
    merkleTreeHeight: number;
    emptyElement: string;
    networkName: string;
    deployedBlock: number;
    rpcUrls: RpcUrls;
    multicallContract: string;
    routerContract: string;
    echoContract: string;
    offchainOracleContract?: string;
    tornContract?: string;
    governanceContract?: string;
    stakingRewardsContract?: string;
    registryContract?: string;
    aggregatorContract?: string;
    reverseRecordsContract?: string;
    gasPriceOracleContract?: string;
    gasStationApi?: string;
    ovmGasPriceOracleContract?: string;
    tornadoSubgraph: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    subgraphs: SubgraphUrls;
    tokens: TokenInstances;
    optionalTokens?: string[];
    relayerEnsSubdomain: string;
    pollInterval: number;
    constants: {
        GOVERNANCE_BLOCK?: number;
        NOTE_ACCOUNT_BLOCK?: number;
        ENCRYPTED_NOTES_BLOCK?: number;
        REGISTRY_BLOCK?: number;
        MINING_BLOCK_TIME?: number;
    };
};
export type networkConfig = {
    [key in NetIdType]: Config;
};
export declare const defaultConfig: networkConfig;
export declare const enabledChains: number[];
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
export declare function getInstanceByAddress({ netId, address }: {
    netId: NetIdType;
    address: string;
}): {
    amount: string;
    currency: string;
} | undefined;
export declare function getSubdomains(): string[];
