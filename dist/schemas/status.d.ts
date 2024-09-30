import { Config, NetIdType } from '../networkConfig';
import { addressSchemaType, bnSchemaType } from '.';
export type statusInstanceType = {
    type: string;
    properties: {
        instanceAddress: {
            type: string;
            properties: {
                [key in string]: typeof addressSchemaType;
            };
            required: string[];
        };
        tokenAddress?: typeof addressSchemaType;
        symbol?: {
            enum: string[];
        };
        decimals: {
            enum: number[];
        };
    };
    required: string[];
};
export type statusInstancesType = {
    type: string;
    properties: {
        [key in string]: statusInstanceType;
    };
    required: string[];
};
export type statusEthPricesType = {
    type: string;
    properties: {
        [key in string]: typeof bnSchemaType;
    };
    required?: string[];
};
export type statusSchema = {
    type: string;
    properties: {
        rewardAccount: typeof addressSchemaType;
        instances?: statusInstancesType;
        gasPrices: {
            type: string;
            properties: {
                [key in string]: {
                    type: string;
                };
            };
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
                status: {
                    const: string;
                };
                error: {
                    type: string;
                };
            };
            required: string[];
        };
        syncStatus: {
            type: string;
            properties: {
                events: {
                    type: string;
                };
                tokenPrice: {
                    type: string;
                };
                gasPrice: {
                    type: string;
                };
            };
            required: string[];
        };
        onSyncEvents: {
            type: string;
        };
        currentQueue: {
            type: string;
        };
    };
    required: string[];
};
export declare function getStatusSchema(netId: NetIdType, config: Config, tovarish: boolean): statusSchema;
