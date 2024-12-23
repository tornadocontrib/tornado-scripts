import { BaseContract, Provider, EventLog } from 'ethers';
import { Tornado, TornadoRouter, TornadoProxyLight, Governance, RelayerRegistry, Echoer, Aggregator } from 'tornado-contracts';
import type { MerkleTree } from 'fixed-merkle-tree';
import { BatchEventsService, BatchBlockService, BatchTransactionService, BatchEventOnProgress, BatchBlockOnProgress } from '../batch';
import { fetchDataOptions } from '../providers';
import { type NetIdType, type SubdomainMap } from '../networkConfig';
import { RelayerParams } from '../relayerClient';
import type { TovarishClient } from '../tovarishClient';
import type { ERC20, ReverseRecords } from '../typechain';
import type { MerkleTreeService } from '../merkleTree';
import type { DepositType } from '../deposits';
import type { BaseEvents, CachedEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, EncryptedNotesEvents, AllGovernanceEvents, GovernanceProposalCreatedEvents, GovernanceVotedEvents, EchoEvents, AllRelayerRegistryEvents, StakeBurnedEvents, MultiDepositsEvents, MultiWithdrawalsEvents, TransferEvents } from './types';
export interface BaseEventsServiceConstructor {
    netId: NetIdType;
    provider: Provider;
    contract: BaseContract;
    type: string;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
    tovarishClient?: TovarishClient;
}
export declare class BaseEventsService<EventType extends MinimalEvents> {
    netId: NetIdType;
    provider: Provider;
    contract: BaseContract;
    type: string;
    deployedBlock: number;
    batchEventsService: BatchEventsService;
    fetchDataOptions?: fetchDataOptions;
    tovarishClient?: TovarishClient;
    constructor({ netId, provider, contract, type, deployedBlock, fetchDataOptions, tovarishClient, }: BaseEventsServiceConstructor);
    getInstanceName(): string;
    getType(): string;
    getTovarishType(): string;
    updateEventProgress({ percentage, type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]): void;
    updateBlockProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    updateTransactionProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]): void;
    formatEvents(events: EventLog[]): Promise<EventType[]>;
    /**
     * Get saved or cached events
     */
    getEventsFromDB(): Promise<BaseEvents<EventType>>;
    /**
     * Events from remote cache (Either from local cache, CDN, or from IPFS)
     */
    getEventsFromCache(): Promise<CachedEvents<EventType>>;
    /**
     * This may not return in sorted events when called from browser, make sure to sort it again when directly called
     */
    getSavedEvents(): Promise<BaseEvents<EventType> | CachedEvents<EventType>>;
    getEventsFromRpc({ fromBlock, toBlock, }: {
        fromBlock: number;
        toBlock?: number;
    }): Promise<BaseEvents<EventType>>;
    getLatestEvents({ fromBlock }: {
        fromBlock: number;
    }): Promise<BaseEvents<EventType>>;
    validateEvents<S>({ events, newEvents, lastBlock, }: BaseEvents<EventType> & {
        newEvents: EventType[];
    }): Promise<S>;
    /**
     * Handle saving events
     */
    saveEvents({ events, newEvents, lastBlock }: BaseEvents<EventType> & {
        newEvents: EventType[];
    }): Promise<void>;
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
export declare class BaseTornadoService extends BaseEventsService<DepositsEvents | WithdrawalsEvents> {
    amount: string;
    currency: string;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;
    constructor(serviceConstructor: BaseTornadoServiceConstructor);
    getInstanceName(): string;
    formatEvents(events: EventLog[]): Promise<(DepositsEvents | WithdrawalsEvents)[]>;
    validateEvents<S>({ events, newEvents, }: BaseEvents<DepositsEvents | WithdrawalsEvents> & {
        newEvents: (DepositsEvents | WithdrawalsEvents)[];
    }): Promise<S>;
    getLatestEvents({ fromBlock, }: {
        fromBlock: number;
    }): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>>;
}
export interface BaseMultiTornadoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    instances: Record<string, DepositType>;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
}
export declare class BaseMultiTornadoService extends BaseEventsService<MultiDepositsEvents | MultiWithdrawalsEvents> {
    instances: Record<string, DepositType>;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;
    constructor(serviceConstructor: BaseMultiTornadoServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    formatEvents(events: EventLog[]): Promise<(MultiDepositsEvents | MultiWithdrawalsEvents)[]>;
    validateEvents<S>({ events, newEvents, }: BaseEvents<MultiDepositsEvents | MultiWithdrawalsEvents> & {
        newEvents: (MultiDepositsEvents | MultiWithdrawalsEvents)[];
    }): Promise<S>;
    getEvents(instanceAddress: string): Promise<{
        depositEvents: MultiDepositsEvents[];
        withdrawalEvents: MultiWithdrawalsEvents[];
        tree: MerkleTree | undefined;
        lastBlock: number;
    }>;
}
export interface BaseEchoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Echoer: Echoer;
}
export declare class BaseEchoService extends BaseEventsService<EchoEvents> {
    constructor(serviceConstructor: BaseEchoServiceConstructor);
    getInstanceName(): string;
    formatEvents(events: EventLog[]): Promise<EchoEvents[]>;
}
export interface BaseEncryptedNotesServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Router: TornadoRouter | TornadoProxyLight;
}
export declare class BaseEncryptedNotesService extends BaseEventsService<EncryptedNotesEvents> {
    constructor(serviceConstructor: BaseEncryptedNotesServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    formatEvents(events: EventLog[]): Promise<EncryptedNotesEvents[]>;
}
export declare const proposalState: Record<string, string>;
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
    formatEvents(events: EventLog[]): Promise<AllGovernanceEvents[]>;
    getAllProposals(): Promise<GovernanceProposals[]>;
    getVotes(proposalId: number): Promise<GovernanceVotes[]>;
    getDelegatedBalance(ethAccount: string): Promise<{
        delegatedAccs: string[];
        undelegatedAccs: string[];
        uniq: string[];
        uniqNames: Record<string, string>;
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
export declare class BaseRegistryService extends BaseEventsService<AllRelayerRegistryEvents> {
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
    updateInterval: number;
    constructor(serviceConstructor: BaseRegistryServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    formatEvents(events: EventLog[]): Promise<AllRelayerRegistryEvents[]>;
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
export interface BaseRevenueServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    RelayerRegistry: RelayerRegistry;
}
/**
 * Tracks TORN burned events from RelayerRegistry contract
 */
export declare class BaseRevenueService extends BaseEventsService<StakeBurnedEvents> {
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;
    constructor(serviceConstructor: BaseRevenueServiceConstructor);
    getInstanceName(): string;
    getTovarishType(): string;
    formatEvents(events: EventLog[]): Promise<StakeBurnedEvents[]>;
}
export interface BaseTransferServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Token: ERC20;
}
export declare class BaseTransferService extends BaseEventsService<TransferEvents> {
    constructor(serviceConstructor: BaseTransferServiceConstructor);
    formatEvents(events: EventLog[]): Promise<TransferEvents[]>;
}
