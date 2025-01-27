import { Config } from '../networkConfig';
import { addressSchemaType, bnSchemaType } from '.';

export interface statusInstanceType {
    type: string;
    properties: {
        instanceAddress: {
            type: string;
            properties: Record<string, typeof addressSchemaType>;
            required: string[];
        };
        tokenAddress?: typeof addressSchemaType;
        //symbol?: { enum: string[] };
        symbol?: { type: string };
        decimals: { enum: number[] };
    };
    required: string[];
}

export interface statusInstancesType {
    type: string;
    properties: Record<string, statusInstanceType>;
    required: string[];
}

export interface statusEthPricesType {
    type: string;
    properties: Record<string, typeof bnSchemaType>;
    required?: string[];
}

export interface statusSchema {
    type: string;
    properties: {
        rewardAccount: typeof addressSchemaType;
        instances?: statusInstancesType;
        gasPrices: {
            type: string;
            properties: Record<
                string,
                {
                    type: string;
                }
            >;
            required: string[];
        };
        netId: {
            type: string;
        };
        ethPrices?: statusEthPricesType;
        tornadoServiceFee?: {
            type: string;
            maximum: number;
            minimum: number;
        };
        latestBlock: {
            type: string;
        };
        latestBalance: {
            type: string;
            BN: boolean;
        };
        version: {
            type: string;
        };
        health: {
            type: string;
            properties: {
                status: { const: string };
                error: { type: string };
            };
            required: string[];
        };
        syncStatus: {
            type: string;
            properties: {
                events: { type: string };
                tokenPrice: { type: string };
                gasPrice: { type: string };
            };
            required: string[];
        };
        onSyncEvents: { type: string };
        currentQueue: {
            type: string;
        };
    };
    required: string[];
}

const statusSchema: statusSchema = {
    type: 'object',
    properties: {
        rewardAccount: addressSchemaType,
        gasPrices: {
            type: 'object',
            properties: {
                fast: { type: 'number' },
                additionalProperties: { type: 'number' },
            },
            required: ['fast'],
        },
        netId: { type: 'integer' },
        tornadoServiceFee: { type: 'number', maximum: 20, minimum: 0 },
        latestBlock: { type: 'number' },
        latestBalance: bnSchemaType,
        version: { type: 'string' },
        health: {
            type: 'object',
            properties: {
                status: { const: 'true' },
                error: { type: 'string' },
            },
            required: ['status'],
        },
        syncStatus: {
            type: 'object',
            properties: {
                events: { type: 'boolean' },
                tokenPrice: { type: 'boolean' },
                gasPrice: { type: 'boolean' },
            },
            required: ['events', 'tokenPrice', 'gasPrice'],
        },
        onSyncEvents: { type: 'boolean' },
        currentQueue: { type: 'number' },
    },
    required: ['rewardAccount', 'instances', 'netId', 'tornadoServiceFee', 'version', 'health', 'currentQueue'],
};

export function getStatusSchema(config: Config, tovarish: boolean) {
    const { tokens, nativeCurrency } = config;

    // deep copy schema
    const schema = JSON.parse(JSON.stringify(statusSchema)) as statusSchema;

    const instances = Object.keys(tokens).reduce(
        (acc: statusInstancesType, token) => {
            const {
                isOptional,
                isDisabled,
                instanceAddress,
                tokenAddress,
                symbol,
                decimals,
                optionalInstances = [],
            } = tokens[token];
            const amounts = Object.keys(instanceAddress);

            const instanceProperties: statusInstanceType = {
                type: 'object',
                properties: {
                    instanceAddress: {
                        type: 'object',
                        properties: amounts.reduce((acc: Record<string, typeof addressSchemaType>, cur) => {
                            acc[cur] = addressSchemaType;
                            return acc;
                        }, {}),
                        required: amounts.filter((amount) => !optionalInstances.includes(amount)),
                    },
                    decimals: { enum: [decimals] },
                },
                required: ['instanceAddress', 'decimals'].concat(
                    tokenAddress ? ['tokenAddress'] : [],
                    symbol ? ['symbol'] : [],
                ),
            };

            if (tokenAddress) {
                instanceProperties.properties.tokenAddress = addressSchemaType;
            }

            if (symbol) {
                // instanceProperties.properties.symbol = { enum: [symbol] };
                instanceProperties.properties.symbol = { type: 'string' };
            }

            acc.properties[token] = instanceProperties;
            if (!isOptional && !isDisabled) {
                acc.required.push(token);
            }
            return acc;
        },
        {
            type: 'object',
            properties: {},
            required: [],
        },
    );

    schema.properties.instances = instances;

    const _tokens = instances.required.filter((t) => t !== nativeCurrency);

    if (_tokens.length) {
        const ethPrices: statusEthPricesType = {
            type: 'object',
            properties: _tokens.reduce((acc: Record<string, typeof bnSchemaType>, token: string) => {
                acc[token] = bnSchemaType;
                return acc;
            }, {}),
            required: _tokens,
        };
        schema.properties.ethPrices = ethPrices;
        schema.required.push('ethPrices');
    }

    if (tovarish) {
        schema.required.push('gasPrices', 'latestBlock', 'latestBalance', 'syncStatus', 'onSyncEvents');
    }

    return schema;
}
