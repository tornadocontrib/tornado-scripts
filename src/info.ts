import { formatUnits, ZeroAddress } from 'ethers';
import { InfoRegistry, MultiLock, TovarishRegistry } from 'tornado-contracts';

import { Multicall } from './typechain';
import { NetId, NetIdType, RpcUrls, SubdomainMap, TokenInstances } from './networkConfig';
import { CachedRelayerInfo, MIN_STAKE_BALANCE } from './relayerClient';
import { getNetInfoSchema } from './schemas';
import { multicall } from './multicall';
import { unzlibAsync } from './zip';
import { hexToBytes } from './utils';

export const INFO_REVISION = 0;

export const MERKLE_TREE_HEIGHT = 20;

export const EMPTY_ELEMENT = '21663839004416932945382355908790599225266501822907911457504978515578255421292';

// multicall3.eth
export const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
// tornado-proxy-light.contract.tornadocash.eth
export const TORNADO_PROXY_LIGHT_ADDRESS = '0x0D5550d52428E7e3175bfc9550207e4ad3859b17';
// echoer.contract.tornadocash.eth
export const ECHOER_ADDRESS = '0xa75BF2815618872f155b7C4B0C81bF990f5245E4';
// info-registry.tornadowithdraw.eth
export const INFO_REGISTRY_ADDRESS = '0xeB2219AE55643D2e199024e209e4A58FCC1c46CB';
// tovarish-registry.tornadowithdraw.eth
export const TOVARISH_REGISTRY_ADDRESS = '0x1484Ba55377e4512C8bb58A791F6a4a2aAbbECF6';
// multilock.tornadowithdraw.eth
export const MULTILOCK_ADDRESS = '0xa9ea50025fd38f698ed09628eb73021773f2fc95';

// legacy ENS subdomains (not required for new networks or tornado forks)
export const knownSubdomains = {
    [NetId.MAINNET]: 'mainnet-tornado',
    [NetId.BSC]: 'bsc-tornado',
    [NetId.POLYGON]: 'polygon-tornado',
    [NetId.OPTIMISM]: 'optimism-tornado',
    [NetId.ARBITRUM]: 'arbitrum-tornado',
    [NetId.GNOSIS]: 'gnosis-tornado',
    [NetId.AVALANCHE]: 'avalanche-tornado',
};

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

export class NetInfo {
    // EIP-155 chainId
    chainId: number;

    // Static value
    name: string;
    symbol: string;
    decimals: number;

    // Alternative native currency to resolve pools
    _nativeCurrency?: string;

    // EIP-3091 compatible block explorer
    explorer: string;
    // Chain homepage (ex: ethereum.org)
    homepage: string;
    // Average block generation time in seconds
    blockTime: number;

    constructor(netInfo: NetParams) {
        this.chainId = netInfo.chainId || 1;
        this.name = netInfo.name || 'Ethereum Mainnet';
        this.symbol = netInfo.symbol || 'ETH';
        this.decimals = netInfo.decimals || 18;
        this._nativeCurrency = netInfo.nativeCurrency;
        this.explorer = netInfo.explorer || 'https://etherscan.io';
        this.homepage = netInfo.homepage || 'https://ethereum.org';
        this.blockTime = netInfo.blockTime || 14;
    }

    public get netId() {
        return this.chainId;
    }

    public get networkId() {
        return this.chainId;
    }

    public get nativeCurrency() {
        return this._nativeCurrency || this.symbol.toLowerCase();
    }

    public get currencyName() {
        return this.symbol.toUpperCase();
    }

    public get explorerUrl() {
        return this.explorer;
    }

    public get networkName() {
        return this.name;
    }

    public get pollInterval() {
        return this.blockTime;
    }
}

export interface TornadoNetParams extends NetParams {
    deployedBlock?: number;

    merkleTreeHeight?: number;
    emptyElement?: string;

    // Contract Address of stablecoin token, used for fiat conversion
    stablecoin?: string;
    multicallContract?: string;
    routerContract?: string;
    echoContract?: string;
    offchainOracleContract?: string;

    // Contracts required for governance
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

export class TornadoNetInfo extends NetInfo {
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

    constructor(
        netInfo: TornadoNetParams,
        netInfoRevision: number,
        rpcInfos: RpcInfo[],
        tokenInfos: TokenInfo[],
        instanceInfos: InstanceInfo[],
    ) {
        super(netInfo);

        this.revision = netInfoRevision || INFO_REVISION;

        this.deployedBlock = netInfo.deployedBlock || 0;
        this.merkleTreeHeight = netInfo.merkleTreeHeight;
        this.emptyElement = netInfo.emptyElement;

        this.stablecoin = netInfo.stablecoin || ZeroAddress;
        this.multicallContract = netInfo.multicallContract || MULTICALL_ADDRESS;
        this.routerContract = netInfo.routerContract || TORNADO_PROXY_LIGHT_ADDRESS;
        this.echoContract = netInfo.echoContract || ECHOER_ADDRESS;
        this.offchainOracleContract = netInfo.offchainOracleContract;

        this.tornContract = netInfo.tornContract;
        this.governanceContract = netInfo.governanceContract;
        this.stakingRewardsContract = netInfo.stakingRewardsContract;
        this.registryContract = netInfo.registryContract;
        this.aggregatorContract = netInfo.aggregatorContract;
        this.balanceAggregatorContract = netInfo.balanceAggregatorContract;
        this.reverseRecordsContract = netInfo.reverseRecordsContract;
        this.ovmGasPriceOracleContract = netInfo.ovmGasPriceOracleContract;

        this.tornadoSubgraph = netInfo.tornadoSubgraph;
        this.registrySubgraph = netInfo.registrySubgraph;
        this.governanceSubgraph = netInfo.governanceSubgraph;

        this.relayerEnsSubdomain = netInfo.relayerEnsSubdomain;

        this.rpcInfos = rpcInfos
            .filter(({ chainId }) => chainId === netInfo.chainId)
            .sort((a, b) => (a.isPrior === b.isPrior ? 0 : a.isPrior ? -1 : 1));
        this.tokenInfos = tokenInfos
            .filter(({ chainId }) => chainId === netInfo.chainId)
            .sort((a, b) => a.symbol.localeCompare(b.symbol));
        this.instanceInfos = instanceInfos
            .filter(({ chainId }) => chainId === netInfo.chainId)
            .sort((a, b) => {
                if (a.tokenAddress !== b.tokenAddress) {
                    return (
                        tokenInfos.findIndex((t) => t.address === a.tokenAddress) -
                        tokenInfos.findIndex((t) => t.address === b.tokenAddress)
                    );
                }
                if (a.denomination < b.denomination) {
                    return -1;
                }
                if (a.denomination > b.denomination) {
                    return 1;
                }
                return 0;
            });

        const netInfoValidator = getNetInfoSchema(netInfoRevision);

        if (!netInfoValidator(netInfo) || !this.rpcInfos.length) {
            const errMsg = `Net info validation for chain ${netInfo.chainId} failed`;
            throw new Error(errMsg);
        }
    }

    toJSON() {
        return {
            chainId: this.chainId,
            name: this.name,
            symbol: this.symbol,
            decimals: this.decimals,
            nativeCurrency: this._nativeCurrency,
            explorer: this.explorer,
            homepage: this.homepage,
            blockTime: this.blockTime,

            deployedBlock: this.deployedBlock,
            merkleTreeHeight: this.merkleTreeHeight,
            emptyElement: this.emptyElement,

            stablecoin: this.stablecoin !== ZeroAddress ? this.stablecoin : undefined,
            multicallContract: this.multicallContract !== MULTICALL_ADDRESS ? this.multicallContract : undefined,
            routerContract: this.routerContract !== TORNADO_PROXY_LIGHT_ADDRESS ? this.routerContract : undefined,
            echoContract: this.echoContract !== ECHOER_ADDRESS ? this.echoContract : undefined,
            offchainOracleContract: this.offchainOracleContract,

            tornContract: this.tornContract,
            governanceContract: this.governanceContract,
            stakingRewardsContract: this.stakingRewardsContract,
            registryContract: this.registryContract,
            aggregatorContract: this.aggregatorContract,
            balanceAggregatorContract: this.balanceAggregatorContract,
            reverseRecordsContract: this.reverseRecordsContract,
            ovmGasPriceOracleContract: this.ovmGasPriceOracleContract,

            tornadoSubgraph: this.tornadoSubgraph,
            registrySubgraph: this.registrySubgraph,
            governanceSubgraph: this.governanceSubgraph,

            relayerEnsSubdomain: this.relayerEnsSubdomain,

            revision: this.revision !== INFO_REVISION ? this.revision : undefined,
            rpcInfos: this.rpcInfos,
            tokenInfos: this.tokenInfos,
            instanceInfos: this.instanceInfos,
        };
    }

    /**
     * Legacy format of rpcUrls
     */
    public get rpcUrls() {
        return this.rpcInfos.reduce((acc, { url }) => {
            const { host: name } = new URL(url);
            acc[name] = {
                name,
                url,
            };
            return acc;
        }, {} as RpcUrls);
    }

    /**
     * Legacy format of instances
     */
    public get tokens() {
        return this.instanceInfos.reduce(
            (
                acc,
                { address: instanceAddress, denomination, tokenAddress, instanceApproval, isOptional, isDisabled },
            ) => {
                const { symbol, decimals, transferGas } = tokenAddress
                    ? (this.tokenInfos.find(({ address }) => address === tokenAddress) as TokenInfo)
                    : {
                          symbol: this.symbol,
                          decimals: 18,
                      };

                const symbolKey = symbol.toLowerCase();

                const amount = Number(formatUnits(denomination, decimals)).toFixed(0);

                if (isDisabled) {
                    return acc;
                }

                if (!acc[symbolKey]) {
                    acc[symbolKey] = {
                        instanceAddress: {},
                        instanceApproval,
                        optionalInstances: [],
                        tokenAddress,
                        tokenGasLimit: transferGas,
                        symbol,
                        decimals,
                    };
                }

                acc[symbolKey].instanceAddress[amount] = instanceAddress;

                if (isOptional) {
                    acc[symbolKey].optionalInstances?.push(amount);
                }

                return acc;
            },
            {} as TokenInstances,
        );
    }

    public get allTokenInfos(): TokenInfo[] {
        return [
            {
                chainId: this.chainId,
                address: '',
                name: this.name,
                symbol: this.symbol,
                decimals: 18,
            },
        ].concat(this.tokenInfos);
    }

    getInstances(currency: string): InstanceWithTokenInfo[] {
        const tokenInfo = this.allTokenInfos.find(({ symbol }) => currency.toLowerCase() === symbol.toLowerCase());

        if (!tokenInfo) {
            const errMsg = `Token ${currency} not found from chain ${this.chainId}`;
            throw new Error(errMsg);
        }

        const { address: tokenContract, name, symbol, decimals, transferGas } = tokenInfo;

        const instances = this.instanceInfos.filter(({ tokenAddress }) => {
            if (!tokenContract) {
                return !tokenAddress;
            }

            return tokenContract === tokenAddress;
        });

        return instances.map((i) => ({
            ...i,
            name,
            symbol,
            decimals,
            amount: Number(formatUnits(i.denomination, decimals)).toFixed(0),
            transferGas,
        }));
    }

    getInstanceByAmount(currency: string, amount: string | number): InstanceWithTokenInfo {
        const instanceInfo = this.getInstances(currency).find((i) => i.amount === Number(amount).toFixed(0));

        if (!instanceInfo) {
            const errMsg = `Instance ${amount} ${currency} not found from chain ${this.chainId}`;
            throw new Error(errMsg);
        }

        return instanceInfo;
    }

    getInstanceByAddress(instanceAddress: string): InstanceWithTokenInfo {
        const instanceInfo = this.instanceInfos.find(({ address }) => address === instanceAddress);

        if (!instanceInfo) {
            const errMsg = `Instance ${instanceAddress} not found from chain ${this.chainId}`;
            throw new Error(errMsg);
        }

        const { name, symbol, decimals, transferGas } = instanceInfo.tokenAddress
            ? (this.tokenInfos.find(({ address }) => address === instanceInfo.tokenAddress) as TokenInfo)
            : {
                  name: this.name,
                  symbol: this.symbol,
                  decimals: 18,
              };

        return {
            ...instanceInfo,
            name,
            symbol,
            decimals,
            amount: Number(formatUnits(instanceInfo.denomination, decimals)).toFixed(0),
            transferGas,
        };
    }
}

export interface TornadoInfosConstructor {
    revision?: number;
    subdomains?: SubdomainMap;

    multicall: Multicall;
    infoRegistry: InfoRegistry;
    tovarishRegistry: TovarishRegistry;

    multilock?: MultiLock;
}

export interface LatestInfos {
    netInfos: TornadoNetInfo[];
    relayerInfos: CachedRelayerInfo[];
    lastInfoUpdate: number;
}

export class TornadoInfos {
    revision: number;
    subdomains?: SubdomainMap;

    multicall: Multicall;
    infoRegistry: InfoRegistry;
    tovarishRegistry: TovarishRegistry;

    multilock?: MultiLock;

    /**
     * Fetched Infos
     */
    netInfos: TornadoNetInfo[];
    relayerInfos: CachedRelayerInfo[];
    lastInfoUpdate: number;

    constructor(infosConstructor: TornadoInfosConstructor) {
        this.revision = infosConstructor.revision || INFO_REVISION;
        this.subdomains = infosConstructor.subdomains;

        this.multicall = infosConstructor.multicall;
        this.infoRegistry = infosConstructor.infoRegistry;
        this.tovarishRegistry = infosConstructor.tovarishRegistry;

        this.multilock = infosConstructor.multilock;

        this.netInfos = [];
        this.relayerInfos = [];
        this.lastInfoUpdate = 0;
    }

    public get enabledChains(): number[] {
        return this.netInfos.map((n) => n.chainId);
    }

    getInfo(chainId: NetIdType) {
        const netInfo = this.netInfos.find((n) => n.chainId === chainId);

        if (!netInfo) {
            const errMsg = `Info for chain ${chainId} not found`;
            throw new Error(errMsg);
        }

        return netInfo;
    }

    /**
     * Try updating config and if fail use fallback
     */
    async updateInfos(fallbackInfos?: LatestInfos): Promise<LatestInfos> {
        try {
            const { netInfos, relayerInfos, lastInfoUpdate } = await this.getLatestInfos();

            this.netInfos = netInfos;
            this.relayerInfos = relayerInfos;
            this.lastInfoUpdate = lastInfoUpdate;

            return {
                netInfos,
                relayerInfos,
                lastInfoUpdate,
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (!fallbackInfos) {
                throw err;
            }

            console.log(`Failed to fetch latest tornado configs, falling back: ${err.message}`);
            console.log(err);

            return {
                netInfos: fallbackInfos.netInfos.map(
                    (n) => new TornadoNetInfo(n, n.revision, n.rpcInfos, n.tokenInfos, n.instanceInfos),
                ),
                relayerInfos: fallbackInfos.relayerInfos,
                lastInfoUpdate: fallbackInfos.lastInfoUpdate,
            };
        }
    }

    async getLatestInfos(): Promise<LatestInfos> {
        const [rawInfos, rawRpcs, rawInstances, rawTokens, rawRelayers, rawExecution] = await multicall(
            this.multicall,
            [
                {
                    contract: this.infoRegistry,
                    name: 'getNetInfos',
                    params: [this.revision],
                },
                {
                    contract: this.infoRegistry,
                    name: 'getRpcs',
                },
                {
                    contract: this.infoRegistry,
                    name: 'getInstances',
                },
                {
                    contract: this.infoRegistry,
                    name: 'getTokens',
                },
                {
                    contract: this.tovarishRegistry,
                    name: 'relayersData',
                    params: [Object.values(this.subdomains || {})],
                },
                ...(this.multilock
                    ? [
                          {
                              contract: this.multilock,
                              name: 'lastExecution',
                          },
                      ]
                    : []),
            ],
        );

        const textDecoder = new TextDecoder();

        const parsedConfigs = await Promise.all(
            rawInfos.map(async (configBytes: string) => {
                const uncompressed = await unzlibAsync(hexToBytes(configBytes));

                const config = JSON.parse(textDecoder.decode(uncompressed));

                return config as TornadoNetParams;
            }),
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpcInfos = rawRpcs.map(({ chainId, url, isPrior }: any) => ({
            chainId: Number(chainId),
            url,
            isPrior,
        })) as RpcInfo[];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenInfos = rawTokens.map(({ chainId, addr: address, name, symbol, decimals, transferGas }: any) => ({
            chainId: Number(chainId),
            address,
            name,
            symbol,
            decimals: Number(decimals),
            transferGas: transferGas ? Number(transferGas) : undefined,
        })) as TokenInfo[];

        const instanceInfos = rawInstances.map(
            ({
                chainId,
                addr: address,
                denomination,
                tokenAddress,
                instanceApproval,
                isOptional,
                isDisabled,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }: any) => ({
                chainId: Number(chainId),
                address,
                denomination,
                tokenAddress: tokenAddress !== ZeroAddress ? tokenAddress : undefined,
                instanceApproval: instanceApproval || undefined,
                isOptional: isOptional || undefined,
                isDisabled: isDisabled || undefined,
            }),
        ) as InstanceInfo[];

        const netInfos = parsedConfigs.map(
            (netCfg) => new TornadoNetInfo(netCfg, this.revision, rpcInfos, tokenInfos, instanceInfos),
        );

        const relayerInfos = rawRelayers
            .map(
                ({
                    ensName,
                    owner: relayerAddress,
                    balance: stakeBalance,
                    isRegistered,
                    tovarishHost,
                    tovarishChains: rawChains,
                    records,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }: any) => {
                    const hostnames = Object.keys(this.subdomains || {}).reduce((acc, curr, i) => {
                        if (records[i]) {
                            acc[Number(curr)] = records[i];
                        }
                        return acc;
                    }, {} as SubdomainMap);

                    const tovarishChains = String(rawChains)
                        .split(',')
                        .map((c) => parseInt(c))
                        .filter((c) => c);

                    const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;

                    const precondition =
                        Boolean(isRegistered && hasMinBalance && (records as string[]).length) ||
                        Boolean(tovarishHost.length && tovarishChains.length);

                    if (precondition) {
                        return {
                            ensName,
                            relayerAddress,
                            isRegistered,
                            registeredAddress: relayerAddress,
                            stakeBalance,
                            hostnames,
                            tovarishHost,
                            tovarishChains,
                        } as CachedRelayerInfo;
                    }
                },
            )
            .filter((r: CachedRelayerInfo | undefined) => r) as CachedRelayerInfo[];

        return {
            netInfos,
            relayerInfos,
            lastInfoUpdate: Number(rawExecution || 0),
        };
    }
}
