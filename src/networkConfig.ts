/**
 * Type of default supported networks
 */
export enum NetId {
  MAINNET = 1,
  BSC = 56,
  POLYGON = 137,
  OPTIMISM = 10,
  ARBITRUM = 42161,
  GNOSIS = 100,
  AVALANCHE = 43114,
  SEPOLIA = 11155111,
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
};

export type networkConfig = {
  [key in NetIdType]: Config;
};

const theGraph = {
  name: 'Hosted Graph',
  url: 'https://api.thegraph.com',
};
const tornado = {
  name: 'Tornado Subgraphs',
  url: 'https://tornadocash-rpc.com',
};

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
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://mainnet.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      mevblockerRPC: {
        name: 'MevblockerRPC',
        url: 'https://rpc.mevblocker.io',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/ethereum-mainnet',
      },
      noderealRPC: {
        name: 'NodeReal RPC',
        url: 'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7',
      },
      notadegenRPC: {
        name: 'NotADegen RPC',
        url: 'https://rpc.notadegen.com/eth',
      },
      keydonixRPC: {
        name: 'Keydonix RPC',
        url: 'https://ethereum.keydonix.com/v1/mainnet',
      },
      oneRPC: {
        name: '1RPC',
        url: 'https://1rpc.io/eth',
      },
    },
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
    echoContract: '0x9B27DD5Bb15d42DC224FCD0B7caEbBe16161Df42',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    tornContract: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
    governanceContract: '0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce',
    stakingRewardsContract: '0x5B3f656C80E8ddb9ec01Dd9018815576E9238c29',
    registryContract: '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
    aggregatorContract: '0xE8F47A78A6D52D317D0D2FFFac56739fE14D1b49',
    reverseRecordsContract: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C',
    tornadoSubgraph: 'tornadocash/mainnet-tornado-subgraph',
    registrySubgraph: 'tornadocash/tornado-relayer-registry',
    governanceSubgraph: 'tornadocash/tornado-governance',
    subgraphs: {
      tornado,
      theGraph,
    },
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
      instant: 5,
      fast: 5,
      standard: 5,
      low: 5,
    },
    nativeCurrency: 'bnb',
    currencyName: 'BNB',
    explorerUrl: 'https://bscscan.com',
    merkleTreeHeight: 20,
    emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
    networkName: 'Binance Smart Chain',
    deployedBlock: 8158799,
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    tornadoSubgraph: 'tornadocash/bsc-tornado-subgraph',
    subgraphs: {
      tornado,
      theGraph,
    },
    rpcUrls: {
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com/bsc',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://bsc-mainnet.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/bsc-mainnet',
      },
      noderealRPC: {
        name: 'NodeReal RPC',
        url: 'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
      },
      oneRPC: {
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
    },
    relayerEnsSubdomain: 'bsc-tornado',
    pollInterval: 10,
    constants: {
      NOTE_ACCOUNT_BLOCK: 8159269,
      ENCRYPTED_NOTES_BLOCK: 8159269,
    },
  },
  [NetId.POLYGON]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 100,
      fast: 75,
      standard: 50,
      low: 30,
    },
    nativeCurrency: 'matic',
    currencyName: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    merkleTreeHeight: 20,
    emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
    networkName: 'Polygon (Matic) Network',
    deployedBlock: 16257962,
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    gasPriceOracleContract: '0xF81A8D8D3581985D3969fe53bFA67074aDFa8F3C',
    tornadoSubgraph: 'tornadocash/matic-tornado-subgraph',
    subgraphs: {
      tornado,
      theGraph,
    },
    rpcUrls: {
      chainnodes: {
        name: 'Tornado RPC',
        url: 'https://polygon-mainnet.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/polygon-mainnet',
      },
      oneRpc: {
        name: '1RPC',
        url: 'https://1rpc.io/matic',
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
    pollInterval: 10,
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
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ovmGasPriceOracleContract: '0x420000000000000000000000000000000000000F',
    tornadoSubgraph: 'tornadocash/optimism-tornado-subgraph',
    subgraphs: {
      tornado,
      theGraph,
    },
    rpcUrls: {
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com/op',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://optimism-mainnet.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      optimism: {
        name: 'Optimism RPC',
        url: 'https://mainnet.optimism.io',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/optimism-mainnet',
      },
      oneRpc: {
        name: '1RPC',
        url: 'https://1rpc.io/op',
      },
    },
    tokens: {
      eth: {
        instanceAddress: {
          '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
          '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
          '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
          '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
        },
        symbol: 'ETH',
        decimals: 18,
      },
    },
    relayerEnsSubdomain: 'optimism-tornado',
    pollInterval: 15,
    constants: {
      NOTE_ACCOUNT_BLOCK: 2243694,
      ENCRYPTED_NOTES_BLOCK: 2243694,
    },
  },
  [NetId.ARBITRUM]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 4,
      fast: 3,
      standard: 2.52,
      low: 2.29,
    },
    nativeCurrency: 'eth',
    currencyName: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    merkleTreeHeight: 20,
    emptyElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292',
    networkName: 'Arbitrum One',
    deployedBlock: 3430648,
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    tornadoSubgraph: 'tornadocash/arbitrum-tornado-subgraph',
    subgraphs: {
      tornado,
      theGraph,
    },
    rpcUrls: {
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com/arbitrum',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://arbitrum-one.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      arbitrum: {
        name: 'Arbitrum RPC',
        url: 'https://arb1.arbitrum.io/rpc',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/arbitrum-one',
      },
      oneRpc: {
        name: '1rpc',
        url: 'https://1rpc.io/arb',
      },
    },
    tokens: {
      eth: {
        instanceAddress: {
          '0.1': '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
          '1': '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
          '10': '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
          '100': '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
        },
        symbol: 'ETH',
        decimals: 18,
      },
    },
    relayerEnsSubdomain: 'arbitrum-tornado',
    pollInterval: 15,
    constants: {
      NOTE_ACCOUNT_BLOCK: 3430605,
      ENCRYPTED_NOTES_BLOCK: 3430605,
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
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    tornadoSubgraph: 'tornadocash/xdai-tornado-subgraph',
    subgraphs: {
      tornado,
      theGraph,
    },
    rpcUrls: {
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com/gnosis',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://gnosis-mainnet.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
      },
      gnosis: {
        name: 'Gnosis RPC',
        url: 'https://rpc.gnosischain.com',
      },
      stackup: {
        name: 'Stackup RPC',
        url: 'https://public.stackup.sh/api/v1/node/arbitrum-one',
      },
      blockPi: {
        name: 'BlockPi',
        url: 'https://gnosis.blockpi.network/v1/rpc/public',
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
    pollInterval: 15,
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
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x0D5550d52428E7e3175bfc9550207e4ad3859b17',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    offchainOracleContract: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    tornadoSubgraph: 'tornadocash/avalanche-tornado-subgraph',
    subgraphs: {
      theGraph,
    },
    rpcUrls: {
      oneRPC: {
        name: 'OneRPC',
        url: 'https://1rpc.io/avax/c',
      },
      avalancheRPC: {
        name: 'Avalanche RPC',
        url: 'https://api.avax.network/ext/bc/C/rpc',
      },
      meowRPC: {
        name: 'Meow RPC',
        url: 'https://avax.meowrpc.com',
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
    pollInterval: 10,
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
    multicallContract: '0xcA11bde05977b3631167028862bE2a173976CA11',
    routerContract: '0x1572AFE6949fdF51Cb3E0856216670ae9Ee160Ee',
    echoContract: '0xa75BF2815618872f155b7C4B0C81bF990f5245E4',
    tornContract: '0x3AE6667167C0f44394106E197904519D808323cA',
    governanceContract: '0xe5324cD7602eeb387418e594B87aCADee08aeCAD',
    stakingRewardsContract: '0x6d0018890751Efd31feb8166711B16732E2b496b',
    registryContract: '0x1428e5d2356b13778A13108b10c440C83011dfB8',
    aggregatorContract: '0x4088712AC9fad39ea133cdb9130E465d235e9642',
    reverseRecordsContract: '0xEc29700C0283e5Be64AcdFe8077d6cC95dE23C23',
    tornadoSubgraph: 'tornadocash/sepolia-tornado-subgraph',
    subgraphs: {
      tornado,
    },
    rpcUrls: {
      tornado: {
        name: 'Tornado RPC',
        url: 'https://tornadocash-rpc.com/sepolia',
      },
      sepolia: {
        name: 'Sepolia RPC',
        url: 'https://rpc.sepolia.org',
      },
      chainnodes: {
        name: 'Chainnodes RPC',
        url: 'https://sepolia.chainnodes.org/d692ae63-0a7e-43e0-9da9-fe4f4cc6c607',
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

export function getInstanceByAddress({ netId, address }: { netId: NetIdType; address: string }) {
  const { tokens } = getConfig(netId);

  for (const [currency, { instanceAddress }] of Object.entries(tokens)) {
    for (const [amount, instance] of Object.entries(instanceAddress)) {
      if (instance === address) {
        return {
          amount,
          currency,
        };
      }
    }
  }
}

export function getSubdomains() {
  const allConfig = getNetworkConfig();

  return enabledChains.map((chain) => allConfig[chain].relayerEnsSubdomain);
}
