import type { DepositType } from './deposits';

/**
 * Type of default supported networks
 */
export enum NetId {
    MAINNET = 1,
    BSC = 56,
    POLYGON = 137,
    OPTIMISM = 10,
    ARBITRUM = 42161,
    BASE = 8453,
    BLAST = 81457,
    GNOSIS = 100,
    AVALANCHE = 43114,
    SEPOLIA = 11155111,
}

export type NetIdType = NetId | number;

export interface RpcUrl {
    name: string;
    url: string;
}

export interface RpcUrls {
    [key: string]: RpcUrl;
}

export interface SubgraphUrl {
    name: string;
    url: string;
}

export interface SubgraphUrls {
    [key: string]: SubgraphUrl;
}

export interface TornadoInstance {
    instanceAddress: {
        [key: string]: string;
    };
    instanceApproval?: boolean;
    optionalInstances?: string[];
    tokenAddress?: string;
    tokenGasLimit?: number;
    symbol: string;
    decimals: number;
    gasLimit?: number;
}

export interface TokenInstances {
    [key: string]: TornadoInstance;
}

export interface Config {
    rpcCallRetryAttempt?: number;
    // Should be in gwei
    gasPrices: {
        // fallback gasPrice / maxFeePerGas value
        instant: number;
        fast?: number;
        standard?: number;
        low?: number;
        // fallback EIP-1559 params
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
    // Contract Address of stablecoin token, used for fiat conversion
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
    reverseRecordsContract?: string;
    ovmGasPriceOracleContract?: string;
    tornadoSubgraph: string;
    registrySubgraph?: string;
    governanceSubgraph?: string;
    subgraphs: SubgraphUrls;
    tokens: TokenInstances;
    optionalTokens?: string[];
    disabledTokens?: string[];
    relayerEnsSubdomain: string;
    // Should be in seconds
    pollInterval: number;
    constants: {
        GOVERNANCE_BLOCK?: number;
        NOTE_ACCOUNT_BLOCK?: number;
        ENCRYPTED_NOTES_BLOCK?: number;
        REGISTRY_BLOCK?: number;
        // Should be in seconds
        MINING_BLOCK_TIME?: number;
    };
}

export interface networkConfig {
    [key: NetIdType]: Config;
}

export interface SubdomainMap {
    [key: NetIdType]: string;
}

export const defaultConfig: networkConfig = {
    [NetId.MAINNET]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 80,
            fast: 50,
            standard: 25,
            low: 8,
        },
        nativeCurrency: 'eth',
        currencyName: 'ETH',
        explorerUrl: 'https://etherscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Ethereum Mainnet',
        deployedBlock: 9116966,
        rpcUrls: {
            mevblockerRPC: {
                name: 'MEV Blocker',
                url: 'https://rpc.mevblocker.io',
            },
            tornadoRpc: {
                name: 'Tornado RPC',
                url: 'https://tornadocash-rpc.com',
            },
            keydonix: {
                name: 'Horswap ( Keydonix )',
                url: 'https://ethereum.keydonix.com/v1/mainnet',
            },
            SecureRpc: {
                name: 'SecureRpc',
                url: 'https://api.securerpc.com/v1',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/ethereum-mainnet',
            },
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/eth',
            },
        },
        stablecoin: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
        echoContract: '0x9B27DD5Bb15d42DC224FCD0B7caEbBe16161Df42',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornContract: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
        governanceContract: '0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce',
        stakingRewardsContract: '0x5B3f656C80E8ddb9ec01Dd9018815576E9238c29',
        registryContract: '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
        aggregatorContract: '0xE8F47A78A6D52D317D0D2FFFac56739fE14D1b49',
        reverseRecordsContract: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C',
        tornadoSubgraph: 'tornadocash/mainnet-tornado-subgraph',
        registrySubgraph: 'tornadocash/tornado-relayer-registry',
        governanceSubgraph: 'tornadocash/tornado-governance',
        subgraphs: {},
        tokens: {
            eth: {
                instanceAddress: {
                    '0.1': '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
                    '1': '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
                    '10': '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
                    '100': '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
                },
                symbol: 'ETH',
                decimals: 18,
            },
            dai: {
                instanceAddress: {
                    '100': '0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3',
                    '1000': '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
                    '10000': '0x07687e702b410Fa43f4cB4Af7FA097918ffD2730',
                    '100000': '0x23773E65ed146A459791799d01336DB287f25334',
                },
                tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                tokenGasLimit: 70_000,
                symbol: 'DAI',
                decimals: 18,
                gasLimit: 700_000,
            },
            cdai: {
                instanceAddress: {
                    '5000': '0x22aaA7720ddd5388A3c0A3333430953C68f1849b',
                    '50000': '0x03893a7c7463AE47D46bc7f091665f1893656003',
                    '500000': '0x2717c5e28cf931547B621a5dddb772Ab6A35B701',
                    '5000000': '0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af',
                },
                tokenAddress: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
                tokenGasLimit: 200_000,
                symbol: 'cDAI',
                decimals: 8,
                gasLimit: 700_000,
            },
            usdc: {
                instanceAddress: {
                    '100': '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
                    '1000': '0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D',
                },
                tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                tokenGasLimit: 70_000,
                symbol: 'USDC',
                decimals: 6,
                gasLimit: 700_000,
            },
            usdt: {
                instanceAddress: {
                    '100': '0x169AD27A470D064DEDE56a2D3ff727986b15D52B',
                    '1000': '0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f',
                },
                tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                tokenGasLimit: 70_000,
                symbol: 'USDT',
                decimals: 6,
                gasLimit: 700_000,
            },
            wbtc: {
                instanceAddress: {
                    '0.1': '0x178169B423a011fff22B9e3F3abeA13414dDD0F1',
                    '1': '0x610B717796ad172B316836AC95a2ffad065CeaB4',
                    '10': '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498',
                },
                tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                tokenGasLimit: 70_000,
                symbol: 'WBTC',
                decimals: 8,
                gasLimit: 700_000,
            },
        },
        // Inactive tokens to filter from schema verification and syncing events
        disabledTokens: ['cdai', 'usdt', 'usdc'],
        relayerEnsSubdomain: 'mainnet-tornado',
        pollInterval: 15,
        constants: {
            GOVERNANCE_BLOCK: 11474695,
            NOTE_ACCOUNT_BLOCK: 11842486,
            ENCRYPTED_NOTES_BLOCK: 12143762,
            REGISTRY_BLOCK: 14173129,
            MINING_BLOCK_TIME: 15,
        },
    },
    [NetId.BSC]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 3,
            fast: 1,
            standard: 1,
            low: 1,
        },
        nativeCurrency: 'bnb',
        currencyName: 'BNB',
        explorerUrl: 'https://bscscan.com',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Binance Smart Chain',
        deployedBlock: 8158799,
        stablecoin: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/bsc-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            bnbchain: {
                name: 'BNB Chain',
                url: 'https://bsc-dataseed.bnbchain.org',
            },
            ninicoin: {
                name: 'BNB Chain 2',
                url: 'https://bsc-dataseed1.ninicoin.io',
            },
            tornadoRpc: {
                name: 'Tornado RPC',
                url: 'https://tornadocash-rpc.com/bsc',
            },
            nodereal: {
                name: 'NodeReal',
                url: 'https://binance.nodereal.io',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/bsc-mainnet',
            },
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/bnb',
            },
        },
        tokens: {
            bnb: {
                instanceAddress: {
                    '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
                    '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                },
                symbol: 'BNB',
                decimals: 18,
            },
            usdt: {
                instanceAddress: {
                    '10': '0x261fB4f84bb0BdEe7E035B6a8a08e5c35AdacdDD',
                    '100': '0x3957861d4897d883C9b944C0b4E22bBd0DDE6e21',
                    '1000': '0x6D180403AdFb39F70983eB51A033C5e52eb9BB69',
                    '10000': '0x3722662D8AaB07B216B14C02eF0ee940d14A4200',
                },
                instanceApproval: true,
                tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
                tokenGasLimit: 70_000,
                symbol: 'USDT',
                decimals: 18,
                gasLimit: 700_000,
            },
            btcb: {
                instanceAddress: {
                    '0.0001': '0x736dABbFc8101Ae75287104eCcf67e45D7369Ae1',
                    '0.001': '0x82c7Ce6f1F158cEC5536d591a2BC19864b3CA823',
                    '0.01': '0x8284c96679037d8081E498d8F767cA5a140BFAAf',
                    '0.1': '0x2bcD128Ce23ee30Ee945E613ff129c4DE1102C79',
                },
                instanceApproval: true,
                tokenAddress: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
                tokenGasLimit: 70_000,
                symbol: 'BTCB',
                decimals: 18,
                gasLimit: 700_000,
            },
        },
        optionalTokens: ['usdt', 'btcb'],
        relayerEnsSubdomain: 'bsc-tornado',
        pollInterval: 3,
        constants: {
            NOTE_ACCOUNT_BLOCK: 8159269,
            ENCRYPTED_NOTES_BLOCK: 8159269,
        },
    },
    [NetId.POLYGON]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 60,
            fast: 30,
            standard: 30,
            low: 30,
        },
        nativeCurrency: 'matic',
        currencyName: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Polygon (Matic) Network',
        deployedBlock: 16257962,
        stablecoin: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/matic-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/matic',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/polygon-mainnet',
            },
        },
        tokens: {
            matic: {
                instanceAddress: {
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                    '1000': '0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178',
                    '10000': '0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040',
                    '100000': '0xa5C2254e4253490C54cef0a4347fddb8f75A4998',
                },
                symbol: 'MATIC',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'polygon-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 16257996,
            ENCRYPTED_NOTES_BLOCK: 16257996,
        },
    },
    [NetId.OPTIMISM]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 0.001,
            fast: 0.001,
            standard: 0.001,
            low: 0.001,
        },
        nativeCurrency: 'eth',
        currencyName: 'ETH',
        explorerUrl: 'https://optimistic.etherscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Optimism',
        deployedBlock: 2243689,
        stablecoin: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        ovmGasPriceOracleContract: '0x420000000000000000000000000000000000000F',
        tornadoSubgraph: 'tornadocash/optimism-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/op',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/optimism-mainnet',
            },
        },
        tokens: {
            eth: {
                instanceAddress: {
                    '0.001': '0x82859DC3697062c16422E9b5e8Ba1B6a6EC72c76',
                    '0.01': '0xA287c40411685438750a247Ca67488DEBe56EE32',
                    '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
                    '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                },
                optionalInstances: ['0.001', '0.01'],
                symbol: 'ETH',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'optimism-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 2243694,
            ENCRYPTED_NOTES_BLOCK: 2243694,
        },
    },
    [NetId.ARBITRUM]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 0.02,
            fast: 0.02,
            standard: 0.02,
            low: 0.02,
        },
        nativeCurrency: 'eth',
        currencyName: 'ETH',
        explorerUrl: 'https://arbiscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Arbitrum One',
        deployedBlock: 3430648,
        stablecoin: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/arbitrum-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            Arbitrum: {
                name: 'Arbitrum',
                url: 'https://arb1.arbitrum.io/rpc',
            },
            tornadoRpc: {
                name: 'Tornado RPC',
                url: 'https://tornadocash-rpc.com/arbitrum',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/arbitrum-one',
            },
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/arb',
            },
        },
        tokens: {
            eth: {
                instanceAddress: {
                    '0.001': '0x82859DC3697062c16422E9b5e8Ba1B6a6EC72c76',
                    '0.01': '0xA287c40411685438750a247Ca67488DEBe56EE32',
                    '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
                    '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                },
                optionalInstances: ['0.001', '0.01'],
                symbol: 'ETH',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'arbitrum-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 3430605,
            ENCRYPTED_NOTES_BLOCK: 3430605,
        },
    },
    [NetId.BASE]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 0.1,
            fast: 0.06,
            standard: 0.05,
            low: 0.02,
        },
        nativeCurrency: 'eth',
        currencyName: 'ETH',
        explorerUrl: 'https://basescan.org',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Base',
        deployedBlock: 23149794,
        stablecoin: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/base-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            Base: {
                name: 'Base',
                url: 'https://mainnet.base.org',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/base-mainnet',
            },
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/base',
            },
        },
        tokens: {
            eth: {
                instanceAddress: {
                    '0.001': '0x82859DC3697062c16422E9b5e8Ba1B6a6EC72c76',
                    '0.01': '0xA287c40411685438750a247Ca67488DEBe56EE32',
                    '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
                    '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                },
                symbol: 'ETH',
                decimals: 18,
            },
            dai: {
                instanceAddress: {
                    '10': '0x70CC374aE7D1549a4666b7172B78dDCF672B74f7',
                    '100': '0xD063894588177B8362Dda6C0A7EF09BF6fDF851c',
                    '1000': '0xa7513fdfF61fc83a9C5c08CE31266e6dd400C54E',
                    '10000': '0x8f05eDE57098D843F30bE74AC25c292F87b7f775',
                    '100000': '0xeB7fc86c32e9a5E9DD2a0a78C091b8b625cbee24',
                },
                instanceApproval: true,
                tokenAddress: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
                tokenGasLimit: 70_000,
                symbol: 'DAI',
                decimals: 18,
                gasLimit: 700_000,
            },
            tbtc: {
                instanceAddress: {
                    '0.0001': '0x5465800D7Be34dAe2c1572d2227De94dE93B4432',
                    '0.001': '0xf2d3404c03C8cC0b120bd6E8edD6F69226F03c6d',
                    '0.01': '0x4261d5209A285410DEa8173B6FE1A0e7BCf20f7c',
                    '0.1': '0x9FB147F49bFE17D19789547187EAE2406590b217',
                    '1': '0x2A8515F39716B0C160a3eB32D24E4cbeB76932d2',
                },
                instanceApproval: true,
                tokenAddress: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
                tokenGasLimit: 70_000,
                symbol: 'tBTC',
                decimals: 18,
                gasLimit: 700_000,
            },
        },
        relayerEnsSubdomain: 'base-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 23149794,
            ENCRYPTED_NOTES_BLOCK: 23149794,
        },
    },
    [NetId.BLAST]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 0.001,
            fast: 0.001,
            standard: 0.001,
            low: 0.001,
        },
        nativeCurrency: 'eth',
        currencyName: 'ETH',
        explorerUrl: 'https://blastscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Blast',
        deployedBlock: 12144065,
        stablecoin: '0x4300000000000000000000000000000000000003',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        tornadoSubgraph: 'tornadocash/blast-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            Blast: {
                name: 'Blast',
                url: 'https://rpc.blast.io',
            },
            blastApi: {
                name: 'BlastApi',
                url: 'https://blastl2-mainnet.public.blastapi.io',
            },
        },
        tokens: {
            eth: {
                instanceAddress: {
                    '0.001': '0x82859DC3697062c16422E9b5e8Ba1B6a6EC72c76',
                    '0.01': '0xA287c40411685438750a247Ca67488DEBe56EE32',
                    '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
                    '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                },
                symbol: 'ETH',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'blast-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 12144065,
            ENCRYPTED_NOTES_BLOCK: 12144065,
        },
    },
    [NetId.GNOSIS]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 6,
            fast: 5,
            standard: 4,
            low: 1,
        },
        nativeCurrency: 'xdai',
        currencyName: 'xDAI',
        explorerUrl: 'https://gnosisscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Gnosis Chain',
        deployedBlock: 17754561,
        stablecoin: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/xdai-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            gnosis: {
                name: 'Gnosis',
                url: 'https://rpc.gnosischain.com',
            },
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/gnosis',
            },
        },
        tokens: {
            xdai: {
                instanceAddress: {
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                    '1000': '0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178',
                    '10000': '0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040',
                    '100000': '0xa5C2254e4253490C54cef0a4347fddb8f75A4998',
                },
                symbol: 'xDAI',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'gnosis-tornado',
        pollInterval: 5,
        constants: {
            NOTE_ACCOUNT_BLOCK: 17754564,
            ENCRYPTED_NOTES_BLOCK: 17754564,
        },
    },
    [NetId.AVALANCHE]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 225,
            fast: 35,
            standard: 25,
            low: 25,
        },
        nativeCurrency: 'avax',
        currencyName: 'AVAX',
        explorerUrl: 'https://snowtrace.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Avalanche Mainnet',
        deployedBlock: 4429818,
        stablecoin: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
        echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
        offchainOracleContract: '0x00000000000D6FFc74A8feb35aF5827bf57f6786',
        tornadoSubgraph: 'tornadocash/avalanche-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/avax/c',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/avalanche-mainnet',
            },
        },
        tokens: {
            avax: {
                instanceAddress: {
                    '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
                    '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
                    '500': '0xaf8d1839c3c67cf571aa74B5c12398d4901147B3',
                },
                symbol: 'AVAX',
                decimals: 18,
            },
        },
        relayerEnsSubdomain: 'avalanche-tornado',
        pollInterval: 2,
        constants: {
            NOTE_ACCOUNT_BLOCK: 4429813,
            ENCRYPTED_NOTES_BLOCK: 4429813,
        },
    },
    [NetId.SEPOLIA]: {
        rpcCallRetryAttempt: 15,
        gasPrices: {
            instant: 2,
            fast: 2,
            standard: 2,
            low: 2,
        },
        nativeCurrency: 'eth',
        currencyName: 'SepoliaETH',
        explorerUrl: 'https://sepolia.etherscan.io',
        merkleTreeHeight: 20,
        emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        networkName: 'Ethereum Sepolia',
        deployedBlock: 5594395,
        stablecoin: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
        routerContract: '0x1572AFE6949fdF51Cb3E0856216670ae9Ee160Ee',
        echoContract: '0xcDD1fc3F5ac2782D83449d3AbE80D6b7B273B0e5',
        offchainOracleContract: '0x1f89EAF03E5b260Bc6D4Ae3c3334b1B750F3e127',
        tornContract: '0x3AE6667167C0f44394106E197904519D808323cA',
        governanceContract: '0xe5324cD7602eeb387418e594B87aCADee08aeCAD',
        stakingRewardsContract: '0x6d0018890751Efd31feb8166711B16732E2b496b',
        registryContract: '0x1428e5d2356b13778A13108b10c440C83011dfB8',
        aggregatorContract: '0x4088712AC9fad39ea133cdb9130E465d235e9642',
        reverseRecordsContract: '0xEc29700C0283e5Be64AcdFe8077d6cC95dE23C23',
        tornadoSubgraph: 'tornadocash/sepolia-tornado-subgraph',
        subgraphs: {},
        rpcUrls: {
            oneRpc: {
                name: '1RPC',
                url: 'https://1rpc.io/sepolia',
            },
            tornadoRpc: {
                name: 'Tornado RPC',
                url: 'https://tornadocash-rpc.com/sepolia',
            },
            sepolia: {
                name: 'Sepolia RPC',
                url: 'https://rpc.sepolia.org',
            },
            stackup: {
                name: 'Stackup',
                url: 'https://public.stackup.sh/api/v1/node/ethereum-sepolia',
            },
            ethpandaops: {
                name: 'ethpandaops',
                url: 'https://rpc.sepolia.ethpandaops.io',
            },
        },
        tokens: {
            eth: {
                instanceAddress: {
                    '0.1': '0x8C4A04d872a6C1BE37964A21ba3a138525dFF50b',
                    '1': '0x8cc930096B4Df705A007c4A039BDFA1320Ed2508',
                    '10': '0x8D10d506D29Fc62ABb8A290B99F66dB27Fc43585',
                    '100': '0x44c5C92ed73dB43888210264f0C8b36Fd68D8379',
                },
                symbol: 'ETH',
                decimals: 18,
            },
            dai: {
                instanceAddress: {
                    '100': '0x6921fd1a97441dd603a997ED6DDF388658daf754',
                    '1000': '0x50a637770F5d161999420F7d70d888DE47207145',
                    '10000': '0xecD649870407cD43923A816Cc6334a5bdf113621',
                    '100000': '0x73B4BD04bF83206B6e979BE2507098F92EDf4F90',
                },
                tokenAddress: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
                tokenGasLimit: 70_000,
                symbol: 'DAI',
                decimals: 18,
                gasLimit: 700_000,
            },
        },
        relayerEnsSubdomain: 'sepolia-tornado',
        pollInterval: 15,
        constants: {
            GOVERNANCE_BLOCK: 5594395,
            NOTE_ACCOUNT_BLOCK: 5594395,
            ENCRYPTED_NOTES_BLOCK: 5594395,
            REGISTRY_BLOCK: 5594395,
            MINING_BLOCK_TIME: 15,
        },
    },
};

export const enabledChains = Object.values(NetId).filter((n) => typeof n === 'number') as NetIdType[];

/**
 * Custom config object to extend default config
 *
 * Inspired by getUrlFunc from ethers.js
 * https://github.com/ethers-io/ethers.js/blob/v6/src.ts/utils/fetch.ts#L59
 */
export let customConfig: networkConfig = {};

/**
 * Add or override existing network config object
 *
 * Could be also called on the UI hook so that the UI could allow people to use custom privacy pools
 */
export function addNetwork(newConfig: networkConfig) {
    enabledChains.push(
        ...Object.keys(newConfig)
            .map((netId) => Number(netId))
            .filter((netId) => !enabledChains.includes(netId)),
    );

    customConfig = {
        ...customConfig,
        ...newConfig,
    };
}

export function getNetworkConfig(): networkConfig {
    // customConfig object
    const allConfig = {
        ...defaultConfig,
        ...customConfig,
    };

    return enabledChains.reduce((acc, curr) => {
        acc[curr] = allConfig[curr];
        return acc;
    }, {} as networkConfig);
}

export function getConfig(netId: NetIdType) {
    const allConfig = getNetworkConfig();

    const chainConfig = allConfig[netId];

    if (!chainConfig) {
        const errMsg = `No config found for network ${netId}!`;
        throw new Error(errMsg);
    }

    return chainConfig;
}

export function getActiveTokens(config: Config): string[] {
    const { tokens, disabledTokens } = config;

    return Object.keys(tokens).filter((t) => !disabledTokens?.includes(t));
}

export function getActiveTokenInstances(config: Config): TokenInstances {
    const { tokens, disabledTokens } = config;

    return Object.entries(tokens).reduce((acc, [token, instances]) => {
        if (!disabledTokens?.includes(token)) {
            acc[token] = instances;
        }
        return acc;
    }, {} as TokenInstances);
}

export function getInstanceByAddress(config: Config, address: string) {
    const { tokens, disabledTokens } = config;

    for (const [currency, { instanceAddress, tokenAddress, symbol, decimals }] of Object.entries(tokens)) {
        if (disabledTokens?.includes(currency)) {
            continue;
        }
        for (const [amount, instance] of Object.entries(instanceAddress)) {
            if (instance === address) {
                return {
                    amount,
                    currency,
                    symbol,
                    decimals,
                    tokenAddress,
                };
            }
        }
    }
}

export function getRelayerEnsSubdomains() {
    const allConfig = getNetworkConfig();

    return enabledChains.reduce((acc, chain) => {
        acc[chain] = allConfig[chain].relayerEnsSubdomain;
        return acc;
    }, {} as SubdomainMap);
}

export function getMultiInstances(netId: NetIdType, config: Config): { [key in string]: DepositType } {
    return Object.entries(config.tokens).reduce(
        (acc, [currency, { instanceAddress }]) => {
            Object.entries(instanceAddress).forEach(([amount, contractAddress]) => {
                acc[contractAddress] = {
                    currency,
                    amount,
                    netId,
                };
            });
            return acc;
        },
        {} as { [key in string]: DepositType },
    );
}
