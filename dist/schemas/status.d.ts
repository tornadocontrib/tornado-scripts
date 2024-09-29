import { Config, NetIdType } from '../networkConfig';
export type statusInstanceType = {
    type: string;
    properties: {
        instanceAddress: {
            type: string;
            properties: {
                [key in string]: typeof addressType;
            };
            required: string[];
        };
        tokenAddress?: typeof addressType;
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
        [key in string]: typeof bnType;
    };
    required?: string[];
};
export type statusSchema = {
    type: string;
    properties: {
        rewardAccount: typeof addressType;
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
        latestBlock?: {
            type: string;
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
declare const addressType: {
    type: string;
    pattern: string;
};
declare const bnType: {
    type: string;
    BN: boolean;
};
export declare function getStatusSchema(netId: NetIdType, config: Config, tovarish: boolean): statusSchema;
export {};
