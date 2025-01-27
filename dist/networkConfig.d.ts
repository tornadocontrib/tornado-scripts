import type { DepositType } from './deposits';
export declare const MERKLE_TREE_HEIGHT = 20;
export declare const EMPTY_ELEMENT = "21663839004416932945382355908790599225266501822907911457504978515578255421292";
export declare const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
export declare const ONEINCH_ORACLE_ADDRESS = "0x00000000000D6FFc74A8feb35aF5827bf57f6786";
export declare const TORNADO_PROXY_LIGHT_ADDRESS = "0x0D5550d52428E7e3175bfc9550207e4ad3859b17";
export declare const ECHOER_ADDRESS = "0xa75BF2815618872f155b7C4B0C81bF990f5245E4";
export declare const TOVARISH_REGISTRY_ADDRESS = "0xc9D5C487c10bC755d34029b1135FA1c190d80f9b";
export declare const TOVARISH_AGGREGATOR_ADDRESS = "0x7A51f64A277d3597475Ea28283d0423764613231";
/**
 * Type of default supported networks
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
export interface TornadoInstances {
    instanceAddress: Record<string, string>;
    instanceApproval?: boolean;
    optionalInstances?: string[];
    isOptional?: boolean;
    isDisabled?: boolean;
    tokenAddress?: string;
    tokenGasLimit?: number;
    symbol: string;
    decimals: number;
    gasLimit?: number;
}
export interface TornadoSingleInstance {
    netId: NetId;
    instanceAddress: string;
    instanceApproval?: boolean;
    isOptional?: boolean;
    isDisabled?: boolean;
    tokenAddress?: string;
    tokenGasLimit?: number;
    currency: string;
    amount: string;
    decimals: number;
    gasLimit?: number;
}
export type TokenInstances = Record<string, TornadoInstances>;
export type SubdomainMap = Record<NetIdType, string>;
export interface ConfigParams {
    netId: NetIdType;
    networkName: string;
    currencyName: string;
    nativeCurrency?: string;
    explorerUrl: string;
    homepageUrl: string;
    blockTime: number;
    deployedBlock: number;
    merkleTreeHeight?: number;
    emptyElement?: string;
    stablecoin: string;
    multicallContract?: string;
    routerContract?: string;
    echoContract?: string;
    offchainOracleContract?: string;
    tornContract?: string;
    governanceContract?: string;
    stakingRewardsContract?: string;
    registryContract?: string;
    tovarishRegistryContract?: string;
    aggregatorContract?: string;
    reverseRecordsContract?: string;
    ovmGasPriceOracleContract?: string;
    relayerEnsSubdomain: string;
    tornadoSubgraph?: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    subgraphs?: string[];
    rpcUrls: string[];
    tokens: TokenInstances;
}
export declare class Config {
    netId: NetIdType;
    networkName: string;
    currencyName: string;
    nativeCurrency: string;
    explorerUrl: string;
    homepageUrl: string;
    blockTime: number;
    deployedBlock: number;
    merkleTreeHeight?: number;
    emptyElement?: string;
    stablecoin: string;
    multicallContract: string;
    routerContract: string;
    echoContract: string;
    offchainOracleContract?: string;
    tornContract?: string;
    governanceContract?: string;
    stakingRewardsContract?: string;
    registryContract?: string;
    tovarishRegistryContract?: string;
    aggregatorContract?: string;
    reverseRecordsContract?: string;
    ovmGasPriceOracleContract?: string;
    relayerEnsSubdomain: string;
    tornadoSubgraph?: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    subgraphs?: string[];
    rpcUrls: string[];
    tokens: TokenInstances;
    constructor(configParams: ConfigParams);
    toJSON(): ConfigParams;
    get allTokens(): string[];
    get allSymbols(): string[];
    getInstance(currency: string, amount: string): TornadoSingleInstance;
    getInstanceByAddress(instanceAddress: string): TornadoSingleInstance;
    get depositTypes(): Record<string, DepositType>;
}
export interface TornadoConfigParams {
    configs?: Record<NetIdType, ConfigParams>;
    governanceNetwork?: NetIdType;
    relayerNetwork?: NetIdType;
}
export declare class TornadoConfig {
    configs: Record<NetIdType, Config>;
    governanceNetwork: NetIdType;
    relayerNetwork: NetIdType;
    constructor(configParams?: TornadoConfigParams);
    get chains(): NetIdType[];
    getConfig(netId: NetIdType): Config;
}
export declare const defaultConfig: Record<NetIdType, ConfigParams>;
