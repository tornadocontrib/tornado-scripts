import { BaseContract, Provider, EventLog, ContractEventName } from 'ethers';
import type { Tornado, TornadoRouter, TornadoProxyLight, Governance, RelayerRegistry, Echoer, Aggregator } from '@tornado/contracts';
import { BatchEventsService, BatchBlockService, BatchTransactionService, BatchEventOnProgress, BatchBlockOnProgress } from '../batch';
import type { fetchDataOptions } from '../providers';
import type { NetIdType, SubdomainMap } from '../networkConfig';
import { RelayerParams } from '../relayerClient';
import type { BaseEvents, CachedEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, EncryptedNotesEvents, AllGovernanceEvents, RegistersEvents, EchoEvents } from './types';
export declare const DEPOSIT = "deposit";
export declare const WITHDRAWAL = "withdrawal";
export type BaseEventsServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    contract: BaseContract;
    type?: string;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export type BatchGraphOnProgress = ({ type, fromBlock, toBlock, count, }: {
    type?: ContractEventName;
    fromBlock?: number;
    toBlock?: number;
    count?: number;
}) => void;
export type BaseGraphParams = {
    graphApi: string;
    subgraphName: string;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
};
export declare class BaseEventsService<EventType extends MinimalEvents> {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    contract: BaseContract;
    type: string;
    deployedBlock: number;
    batchEventsService: BatchEventsService;
    fetchDataOptions?: fetchDataOptions;
    constructor({ netId, provider, graphApi, subgraphName, contract, type, deployedBlock, fetchDataOptions, }: BaseEventsServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getGraphMethod(): string;
    getGraphParams(): BaseGraphParams;
    updateEventProgress({ percentage, type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateBlockProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    updateTransactionProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchGraphOnProgress>[0]): void;
    formatEvents(events: EventLog[]): Promise<EventType[]>;
    /**
     * Get saved or cached events
     */
    getEventsFromDB(): Promise<BaseEvents<EventType>>;
    /**
     * Events from remote cache (Either from local cache, CDN, or from IPFS)
     */
    getEventsFromCache(): Promise<CachedEvents<EventType>>;
    getSavedEvents(): Promise<BaseEvents<EventType> | CachedEvents<EventType>>;
    /**
     * Get latest events
     */
    getEventsFromGraph({ fromBlock, methodName, }: {
        fromBlock: number;
        methodName?: string;
    }): Promise<BaseEvents<EventType>>;
    getEventsFromRpc({ fromBlock, toBlock, }: {
        fromBlock: number;
        toBlock?: number;
    }): Promise<BaseEvents<EventType>>;
    getLatestEvents({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<EventType>>;
    validateEvents({ events, lastBlock }: BaseEvents<EventType>): void;
    /**
     * Handle saving events
     */
    saveEvents({ events, lastBlock }: BaseEvents<EventType>): Promise<void>;
    /**
     * Trigger saving and receiving latest events
     */
    updateEvents(): Promise<{
        events: EventType[];
        lastBlock: number;
    }>;
}
export type BaseTornadoServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    Tornado: Tornado;
    type: string;
    amount: string;
    currency: string;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export type DepositsGraphParams = BaseGraphParams & {
    amount: string;
    currency: string;
};
export declare class BaseTornadoService extends BaseEventsService<DepositsEvents | WithdrawalsEvents> {
    amount: string;
    currency: string;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;
    constructor({ netId, provider, graphApi, subgraphName, Tornado, type, amount, currency, deployedBlock, fetchDataOptions, }: BaseTornadoServiceConstructor);
    getInstanceName(): string;
    getGraphMethod(): string;
    getGraphParams(): DepositsGraphParams;
    formatEvents(events: EventLog[]): Promise<(DepositsEvents | WithdrawalsEvents)[]>;
    validateEvents({ events }: {
        events: (DepositsEvents | WithdrawalsEvents)[];
    }): void;
}
export type BaseEchoServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    Echoer: Echoer;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export declare class BaseEchoService extends BaseEventsService<EchoEvents> {
    constructor({ netId, provider, graphApi, subgraphName, Echoer, deployedBlock, fetchDataOptions, }: BaseEchoServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<EchoEvents[]>;
    getEventsFromGraph({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<EchoEvents>>;
}
export type BaseEncryptedNotesServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    Router: TornadoRouter | TornadoProxyLight;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export declare class BaseEncryptedNotesService extends BaseEventsService<EncryptedNotesEvents> {
    constructor({ netId, provider, graphApi, subgraphName, Router, deployedBlock, fetchDataOptions, }: BaseEncryptedNotesServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<EncryptedNotesEvents[]>;
}
export type BaseGovernanceServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    Governance: Governance;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export declare class BaseGovernanceService extends BaseEventsService<AllGovernanceEvents> {
    batchTransactionService: BatchTransactionService;
    constructor({ netId, provider, graphApi, subgraphName, Governance, deployedBlock, fetchDataOptions, }: BaseGovernanceServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<AllGovernanceEvents[]>;
    getEventsFromGraph({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<AllGovernanceEvents>>;
}
/**
 * Essential params:
 * ensName, relayerAddress, hostnames
 * Other data is for historic purpose from relayer registry
 */
export interface CachedRelayerInfo extends RelayerParams {
    isRegistered?: boolean;
    owner?: string;
    stakeBalance?: string;
    hostnames: SubdomainMap;
}
export interface CachedRelayers {
    timestamp: number;
    relayers: CachedRelayerInfo[];
    fromCache?: boolean;
}
export type BaseRegistryServiceConstructor = {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    RelayerRegistry: RelayerRegistry;
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
};
export declare class BaseRegistryService extends BaseEventsService<RegistersEvents> {
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
    updateInterval: number;
    constructor({ netId, provider, graphApi, subgraphName, RelayerRegistry, Aggregator, relayerEnsSubdomains, deployedBlock, fetchDataOptions, }: BaseRegistryServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<{
        ensName: any;
        relayerAddress: any;
        blockNumber: number;
        logIndex: number;
        transactionHash: string;
    }[]>;
    /**
     * Get saved or cached relayers
     */
    getRelayersFromDB(): Promise<CachedRelayers>;
    /**
     * Relayers from remote cache (Either from local cache, CDN, or from IPFS)
     */
    getRelayersFromCache(): Promise<CachedRelayers>;
    getSavedRelayers(): Promise<CachedRelayers>;
    getLatestRelayers(): Promise<CachedRelayers>;
    /**
     * Handle saving relayers
     */
    saveRelayers({ timestamp, relayers }: CachedRelayers): Promise<void>;
    /**
     * Get cached or latest relayer and save to local
     */
    updateRelayers(): Promise<CachedRelayers>;
}
