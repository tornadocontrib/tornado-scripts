import { ajv } from './ajv';
import { addressSchemaType } from './types';

export const netInfoSchemaV0 = {
    type: 'object',
    properties: {
        chainId: { type: 'number' },
        name: { type: 'string' },
        symbol: { type: 'string' },
        decimals: { type: 'number' },
        nativeCurrency: { type: 'string' },
        explorer: { type: 'string' },
        homepage: { type: 'string' },
        blockTime: { type: 'number' },

        deployedBlock: { type: 'number' },

        merkleTreeHeight: { type: 'number' },
        emptyElement: { type: 'string' },

        // Contract Address of stablecoin token, used for fiat conversion
        stablecoin: addressSchemaType,
        multicallContract: addressSchemaType,
        routerContract: addressSchemaType,
        echoContract: addressSchemaType,
        offchainOracleContract: addressSchemaType,

        // Contracts required for governance
        tornContract: addressSchemaType,
        governanceContract: addressSchemaType,
        stakingRewardsContract: addressSchemaType,
        registryContract: addressSchemaType,
        aggregatorContract: addressSchemaType,
        balanceAggregatorContract: addressSchemaType,
        reverseRecordsContract: addressSchemaType,
        ovmGasPriceOracleContract: addressSchemaType,

        tornadoSubgraph: { type: 'string' },
        registrySubgraph: { type: 'string' },
        governanceSubgraph: { type: 'string' },

        relayerEnsSubdomain: { type: 'string' },
    },
    required: ['chainId', 'name', 'symbol', 'explorer', 'homepage', 'blockTime', 'deployedBlock', 'stablecoin'],
    additionalProperties: false,
};

export function getNetInfoSchema(revision = 0) {
    if (revision === 0) {
        return ajv.compile(netInfoSchemaV0);
    }

    throw new Error('Unsupported net info schema');
}
