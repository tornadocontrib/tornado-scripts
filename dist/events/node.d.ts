import { BatchBlockOnProgress, BatchEventOnProgress } from '../batch';
import { BaseDepositsService, BaseEncryptedNotesService, BaseGovernanceService, BaseRegistryService, BaseDepositsServiceConstructor, BaseEncryptedNotesServiceConstructor, BaseGovernanceServiceConstructor, BaseRegistryServiceConstructor, BaseEchoServiceConstructor, BaseEchoService } from './base';
import type { BaseEvents, DepositsEvents, WithdrawalsEvents, EncryptedNotesEvents, RegistersEvents, AllGovernanceEvents, EchoEvents } from './types';
export type NodeDepositsServiceConstructor = BaseDepositsServiceConstructor & {
    cacheDirectory?: string;
    userDirectory?: string;
};
export declare class NodeDepositsService extends BaseDepositsService {
    cacheDirectory?: string;
    userDirectory?: string;
    constructor({ netId, provider, graphApi, subgraphName, Tornado, type, amount, currency, deployedBlock, fetchDataOptions, cacheDirectory, userDirectory, }: NodeDepositsServiceConstructor);
    updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateTransactionProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    updateBlockProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    getEventsFromDB(): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>>;
    getEventsFromCache(): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<DepositsEvents | WithdrawalsEvents>): Promise<void>;
}
export type NodeEchoServiceConstructor = BaseEchoServiceConstructor & {
    cacheDirectory?: string;
    userDirectory?: string;
};
export declare class NodeEchoService extends BaseEchoService {
    cacheDirectory?: string;
    userDirectory?: string;
    constructor({ netId, provider, graphApi, subgraphName, Echoer, deployedBlock, fetchDataOptions, cacheDirectory, userDirectory, }: NodeEchoServiceConstructor);
    updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    getEventsFromDB(): Promise<BaseEvents<EchoEvents>>;
    getEventsFromCache(): Promise<BaseEvents<EchoEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<EchoEvents>): Promise<void>;
}
export type NodeEncryptedNotesServiceConstructor = BaseEncryptedNotesServiceConstructor & {
    cacheDirectory?: string;
    userDirectory?: string;
};
export declare class NodeEncryptedNotesService extends BaseEncryptedNotesService {
    cacheDirectory?: string;
    userDirectory?: string;
    constructor({ netId, provider, graphApi, subgraphName, Router, deployedBlock, fetchDataOptions, cacheDirectory, userDirectory, }: NodeEncryptedNotesServiceConstructor);
    updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    getEventsFromDB(): Promise<BaseEvents<EncryptedNotesEvents>>;
    getEventsFromCache(): Promise<BaseEvents<EncryptedNotesEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<EncryptedNotesEvents>): Promise<void>;
}
export type NodeGovernanceServiceConstructor = BaseGovernanceServiceConstructor & {
    cacheDirectory?: string;
    userDirectory?: string;
};
export declare class NodeGovernanceService extends BaseGovernanceService {
    cacheDirectory?: string;
    userDirectory?: string;
    constructor({ netId, provider, graphApi, subgraphName, Governance, deployedBlock, fetchDataOptions, cacheDirectory, userDirectory, }: NodeGovernanceServiceConstructor);
    updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateTransactionProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    getEventsFromDB(): Promise<BaseEvents<AllGovernanceEvents>>;
    getEventsFromCache(): Promise<BaseEvents<AllGovernanceEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<AllGovernanceEvents>): Promise<void>;
}
export type NodeRegistryServiceConstructor = BaseRegistryServiceConstructor & {
    cacheDirectory?: string;
    userDirectory?: string;
};
export declare class NodeRegistryService extends BaseRegistryService {
    cacheDirectory?: string;
    userDirectory?: string;
    constructor({ netId, provider, graphApi, subgraphName, RelayerRegistry, deployedBlock, fetchDataOptions, cacheDirectory, userDirectory, }: NodeRegistryServiceConstructor);
    updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    getEventsFromDB(): Promise<BaseEvents<RegistersEvents>>;
    getEventsFromCache(): Promise<BaseEvents<RegistersEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<RegistersEvents>): Promise<void>;
}
