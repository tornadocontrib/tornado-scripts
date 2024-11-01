import { BaseContract, Provider, EventLog, ContractEventName } from 'ethers';
import type { Tornado, TornadoRouter, TornadoProxyLight, Governance, RelayerRegistry, Echoer, Aggregator } from '@tornado/contracts';
import { BatchEventsService, BatchBlockService, BatchTransactionService, BatchEventOnProgress, BatchBlockOnProgress } from '../batch';
import { fetchDataOptions } from '../providers';
import { type NetIdType, type SubdomainMap } from '../networkConfig';
import { RelayerParams } from '../relayerClient';
import type { TovarishClient } from '../tovarishClient';
import type { ReverseRecords } from '../typechain';
import type { MerkleTreeService } from '../merkleTree';
import type { BaseEvents, CachedEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, EncryptedNotesEvents, AllGovernanceEvents, GovernanceProposalCreatedEvents, GovernanceVotedEvents, RegistersEvents, EchoEvents } from './types';
export declare const DEPOSIT = "deposit";
export declare const WITHDRAWAL = "withdrawal";
export interface BaseEventsServiceConstructor {
    netId: NetIdType;
    provider: Provider;
    graphApi?: string;
    subgraphName?: string;
    contract: BaseContract;
    type: string;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
    tovarishClient?: TovarishClient;
}
export type BatchGraphOnProgress = ({ type, fromBlock, toBlock, count, }: {
    type?: ContractEventName;
    fromBlock?: number;
    toBlock?: number;
    count?: number;
}) => void;
export interface BaseGraphParams {
    graphApi: string;
    subgraphName: string;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
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
    tovarishClient?: TovarishClient;
    constructor({ netId, provider, graphApi, subgraphName, contract, type, deployedBlock, fetchDataOptions, tovarishClient, }: BaseEventsServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getTovarishType(): string;
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
    validateEvents<S>({ events, lastBlock, hasNewEvents, }: BaseEvents<EventType> & {
        hasNewEvents?: boolean;
    }): Promise<S>;
    /**
     * Handle saving events
     */
    saveEvents({ events, lastBlock }: BaseEvents<EventType>): Promise<void>;
    /**
     * Trigger saving and receiving latest events
     */
    updateEvents<S>(): Promise<{
        events: EventType[];
        lastBlock: number;
        validateResult: Awaited<S>;
    }>;
}
export interface BaseTornadoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract'> {
    Tornado: Tornado;
    amount: string;
    currency: string;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
}
export interface DepositsGraphParams extends BaseGraphParams {
    amount: string;
    currency: string;
}
export declare class BaseTornadoService extends BaseEventsService<DepositsEvents | WithdrawalsEvents> {
    amount: string;
    currency: string;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;
    constructor(serviceConstructor: BaseTornadoServiceConstructor);
    getInstanceName(): string;
    getGraphMethod(): string;
    getGraphParams(): DepositsGraphParams;
    formatEvents(events: EventLog[]): Promise<(DepositsEvents | WithdrawalsEvents)[]>;
    validateEvents<S>({ events, hasNewEvents, }: BaseEvents<DepositsEvents | WithdrawalsEvents> & {
        hasNewEvents?: boolean;
    }): Promise<S>;
    getLatestEvents({ fromBlock, }: {
        fromBlock: number;
    }): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>>;
}
export interface BaseEchoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Echoer: Echoer;
}
export declare class BaseEchoService extends BaseEventsService<EchoEvents> {
    constructor(serviceConstructor: BaseEchoServiceConstructor);
    getInstanceName(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<EchoEvents[]>;
    getEventsFromGraph({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<EchoEvents>>;
}
export interface BaseEncryptedNotesServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Router: TornadoRouter | TornadoProxyLight;
}
export declare class BaseEncryptedNotesService extends BaseEventsService<EncryptedNotesEvents> {
    constructor(serviceConstructor: BaseEncryptedNotesServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<EncryptedNotesEvents[]>;
}
export declare const proposalState: {
    [key: string]: string;
};
export interface GovernanceProposals extends GovernanceProposalCreatedEvents {
    title: string;
    proposerName?: string;
    forVotes: bigint;
    againstVotes: bigint;
    executed: boolean;
    extended: boolean;
    quorum: string;
    state: string;
}
export interface GovernanceVotes extends GovernanceVotedEvents {
    contact: string;
    message: string;
    fromName?: string;
    voterName?: string;
}
export interface BaseGovernanceServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Governance: Governance;
    Aggregator: Aggregator;
    ReverseRecords: ReverseRecords;
}
export declare class BaseGovernanceService extends BaseEventsService<AllGovernanceEvents> {
    Governance: Governance;
    Aggregator: Aggregator;
    ReverseRecords: ReverseRecords;
    batchTransactionService: BatchTransactionService;
    constructor(serviceConstructor: BaseGovernanceServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    getGraphMethod(): string;
    formatEvents(events: EventLog[]): Promise<AllGovernanceEvents[]>;
    getEventsFromGraph({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<AllGovernanceEvents>>;
    getAllProposals(): Promise<GovernanceProposals[]>;
    getVotes(proposalId: number): Promise<GovernanceVotes[]>;
    getDelegatedBalance(ethAccount: string): Promise<{
        delegatedAccs: string[];
        undelegatedAccs: string[];
        uniq: string[];
        uniqNames: {
            [key: string]: string;
        };
        balances: bigint[];
        balance: bigint;
    }>;
}
export declare function getTovarishNetworks(registryService: BaseRegistryService, relayers: CachedRelayerInfo[]): Promise<void>;
/**
 * Essential params:
 * ensName, relayerAddress, hostnames
 * Other data is for historic purpose from relayer registry
 */
export interface CachedRelayerInfo extends RelayerParams {
    isRegistered?: boolean;
    registeredAddress?: string;
    stakeBalance?: string;
    hostnames: SubdomainMap;
    tovarishHost?: string;
    tovarishNetworks?: number[];
}
export interface CachedRelayers {
    lastBlock: number;
    timestamp: number;
    relayers: CachedRelayerInfo[];
    fromCache?: boolean;
}
export interface BaseRegistryServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    RelayerRegistry: RelayerRegistry;
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
}
export declare class BaseRegistryService extends BaseEventsService<RegistersEvents> {
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
    updateInterval: number;
    constructor(serviceConstructor: BaseRegistryServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
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
    saveRelayers({ lastBlock, timestamp, relayers }: CachedRelayers): Promise<void>;
    /**
     * Get cached or latest relayer and save to local
     */
    updateRelayers(): Promise<CachedRelayers>;
}
