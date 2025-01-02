import { Config, NetIdType } from '../networkConfig';
import { TornadoNetInfo } from '../info';
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
        symbol?: {
            enum: string[];
        };
        decimals: {
            enum: number[];
        };
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
            properties: Record<string, {
                type: string;
            }>;
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
}
export declare function getStatusSchema(netId: NetIdType, config: Config | TornadoNetInfo, tovarish: boolean): statusSchema;
