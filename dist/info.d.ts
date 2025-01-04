import { InfoRegistry, MultiLock, TovarishRegistry } from 'tornado-contracts';
import { Multicall } from './typechain';
import { NetIdType, RpcUrls, TokenInstances } from './networkConfig';
import { CachedRelayerInfo } from './relayerClient';
export declare const INFO_REVISION = 0;
export declare const MERKLE_TREE_HEIGHT = 20;
export declare const EMPTY_ELEMENT = "21663839004416932945382355908790599225266501822907911457504978515578255421292";
export declare const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
export declare const TORNADO_PROXY_LIGHT_ADDRESS = "0x0D5550d52428E7e3175bfc9550207e4ad3859b17";
export declare const ECHOER_ADDRESS = "0xa75BF2815618872f155b7C4B0C81bF990f5245E4";
export declare const INFO_REGISTRY_ADDRESS = "0xeB2219AE55643D2e199024e209e4A58FCC1c46CB";
export declare const TOVARISH_REGISTRY_ADDRESS = "0x48Ca4E40f0623F2E17619AEc21dF4Eae58097d5B";
export declare const MULTILOCK_ADDRESS = "0xa9ea50025fd38f698ed09628eb73021773f2fc95";
export declare const DONATION_ADDRESS = "0x40c3d1656a26C9266f4A10fed0D87EFf79F54E64";
export interface RpcInfo {
    chainId: number;
    url: string;
    isPrior: boolean;
}
export interface TokenInfo {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    transferGas?: number;
}
export interface InstanceInfo {
    chainId: number;
    address: string;
    denomination: bigint;
    tokenAddress?: string;
    instanceApproval?: boolean;
    isOptional?: boolean;
    isDisabled?: boolean;
}
export interface InstanceWithTokenInfo extends InstanceInfo, TokenInfo {
    amount: string;
}
/**
 * Minimal EVM network config inspired by https://github.com/ethereum-lists/chains
 */
export interface NetParams {
    chainId?: number;
    name?: string;
    symbol?: string;
    decimals?: number;
    nativeCurrency?: string;
    explorer?: string;
    homepage?: string;
    blockTime?: number;
}
export declare class NetInfo {
    chainId: number;
    name: string;
    symbol: string;
    decimals: number;
    _nativeCurrency?: string;
    explorer: string;
    homepage: string;
    blockTime: number;
    constructor(netInfo: NetParams);
    get netId(): number;
    get networkId(): number;
    get nativeCurrency(): string;
    get currencyName(): string;
    get explorerUrl(): string;
    get networkName(): string;
    get pollInterval(): number;
}
export interface TornadoNetParams extends NetParams {
    deployedBlock?: number;
    merkleTreeHeight?: number;
    emptyElement?: string;
    stablecoin?: string;
    multicallContract?: string;
    routerContract?: string;
    echoContract?: string;
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
    relayerEnsSubdomain: string;
}
export declare class TornadoNetInfo extends NetInfo {
    revision: number;
    /**
     * Network netInfo
     */
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
    aggregatorContract?: string;
    balanceAggregatorContract?: string;
    reverseRecordsContract?: string;
    ovmGasPriceOracleContract?: string;
    tornadoSubgraph?: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    relayerEnsSubdomain: string;
    /**
     * RPC list
     */
    rpcInfos: RpcInfo[];
    /**
     * Token list
     */
    tokenInfos: TokenInfo[];
    /**
     * Instance list
     */
    instanceInfos: InstanceInfo[];
    constructor(netInfo: TornadoNetParams, netInfoRevision: number, rpcInfos: RpcInfo[], tokenInfos: TokenInfo[], instanceInfos: InstanceInfo[]);
    toJSON(): {
        chainId: number;
        name: string;
        symbol: string;
        decimals: number;
        nativeCurrency: string | undefined;
        explorer: string;
        homepage: string;
        blockTime: number;
        deployedBlock: number;
        merkleTreeHeight: number | undefined;
        emptyElement: string | undefined;
        stablecoin: string | undefined;
        multicallContract: string | undefined;
        routerContract: string | undefined;
        echoContract: string | undefined;
        offchainOracleContract: string | undefined;
        tornContract: string | undefined;
        governanceContract: string | undefined;
        stakingRewardsContract: string | undefined;
        registryContract: string | undefined;
        aggregatorContract: string | undefined;
        balanceAggregatorContract: string | undefined;
        reverseRecordsContract: string | undefined;
        ovmGasPriceOracleContract: string | undefined;
        tornadoSubgraph: string | undefined;
        registrySubgraph: string | undefined;
        governanceSubgraph: string | undefined;
        relayerEnsSubdomain: string;
        revision: number | undefined;
        rpcInfos: RpcInfo[];
        tokenInfos: TokenInfo[];
        instanceInfos: InstanceInfo[];
    };
    /**
     * Legacy format of rpcUrls
     */
    get rpcUrls(): RpcUrls;
    /**
     * Legacy format of instances
     */
    get tokens(): TokenInstances;
    get allTokenInfos(): TokenInfo[];
    getInstances(currency: string): InstanceWithTokenInfo[];
    getInstanceByAmount(currency: string, amount: string | number): InstanceWithTokenInfo;
    getInstanceByAddress(instanceAddress: string): InstanceWithTokenInfo;
}
export interface TornadoInfosConstructor {
    revision?: number;
    infoNetwork?: NetIdType;
    governanceNetwork?: NetIdType;
    relayerNetwork?: NetIdType;
    donationAddress?: string;
    keys?: string[];
    multicall: Multicall;
    infoRegistry: InfoRegistry;
    tovarishRegistry: TovarishRegistry;
    multilock: MultiLock;
}
export interface LatestInfos {
    keyValue: Record<string, string>;
    netInfos: TornadoNetInfo[];
    relayerInfos: CachedRelayerInfo[];
    lastInfoUpdate: number;
}
/**
 * Collection of configuration for Frontend and CLI
 */
export declare class TornadoInfos {
    revision: number;
    infoNetwork: NetIdType;
    governanceNetwork: NetIdType;
    relayerNetwork: NetIdType;
    donationAddress: string;
    keys: string[];
    multicall: Multicall;
    infoRegistry: InfoRegistry;
    tovarishRegistry: TovarishRegistry;
    multilock: MultiLock;
    /**
     * Fetched Infos
     */
    netInfos: TornadoNetInfo[];
    relayerInfos: CachedRelayerInfo[];
    lastInfoUpdate: number;
    constructor(infosConstructor: TornadoInfosConstructor);
    get enabledChains(): number[];
    getInfo(chainId: NetIdType): TornadoNetInfo;
    /**
     * Try updating config and if fail use fallback
     */
    updateInfos(fallbackInfos?: LatestInfos): Promise<LatestInfos>;
    getLatestInfos(): Promise<LatestInfos>;
}
