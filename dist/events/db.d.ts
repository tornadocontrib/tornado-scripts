import { IndexedDB } from '../idb';
import { BaseTornadoService, BaseTornadoServiceConstructor, BaseEchoService, BaseEchoServiceConstructor, BaseEncryptedNotesService, BaseEncryptedNotesServiceConstructor, BaseGovernanceService, BaseGovernanceServiceConstructor, BaseRegistryService, BaseRegistryServiceConstructor, BaseRevenueService, BaseRevenueServiceConstructor, CachedRelayers } from './base';
import { BaseEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, CachedEvents, EchoEvents, EncryptedNotesEvents, AllGovernanceEvents, AllRelayerRegistryEvents, StakeBurnedEvents } from './types';
export declare function saveDBEvents<T extends MinimalEvents>({ idb, instanceName, events, lastBlock, }: {
    idb: IndexedDB;
    instanceName: string;
    events: T[];
    lastBlock: number;
}): Promise<void>;
export declare function loadDBEvents<T extends MinimalEvents>({ idb, instanceName, }: {
    idb: IndexedDB;
    instanceName: string;
}): Promise<BaseEvents<T>>;
export declare function loadRemoteEvents<T extends MinimalEvents>({ staticUrl, instanceName, deployedBlock, zipDigest, }: {
    staticUrl: string;
    instanceName: string;
    deployedBlock: number;
    zipDigest?: string;
}): Promise<CachedEvents<T>>;
export interface DBTornadoServiceConstructor extends BaseTornadoServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBTornadoService extends BaseTornadoService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    constructor(params: DBTornadoServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>>;
    getEventsFromCache(): Promise<CachedEvents<DepositsEvents | WithdrawalsEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<DepositsEvents | WithdrawalsEvents>): Promise<void>;
}
export interface DBEchoServiceConstructor extends BaseEchoServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBEchoService extends BaseEchoService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    constructor(params: DBEchoServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<EchoEvents>>;
    getEventsFromCache(): Promise<CachedEvents<EchoEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<EchoEvents>): Promise<void>;
}
export interface DBEncryptedNotesServiceConstructor extends BaseEncryptedNotesServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBEncryptedNotesService extends BaseEncryptedNotesService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    constructor(params: DBEncryptedNotesServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<EncryptedNotesEvents>>;
    getEventsFromCache(): Promise<CachedEvents<EncryptedNotesEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<EncryptedNotesEvents>): Promise<void>;
}
export interface DBGovernanceServiceConstructor extends BaseGovernanceServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBGovernanceService extends BaseGovernanceService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    constructor(params: DBGovernanceServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<AllGovernanceEvents>>;
    getEventsFromCache(): Promise<CachedEvents<AllGovernanceEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<AllGovernanceEvents>): Promise<void>;
}
export interface DBRegistryServiceConstructor extends BaseRegistryServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBRegistryService extends BaseRegistryService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    relayerJsonDigest?: string;
    constructor(params: DBRegistryServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<AllRelayerRegistryEvents>>;
    getEventsFromCache(): Promise<CachedEvents<AllRelayerRegistryEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<AllRelayerRegistryEvents>): Promise<void>;
    getRelayersFromDB(): Promise<CachedRelayers>;
    getRelayersFromCache(): Promise<CachedRelayers>;
    saveRelayers(cachedRelayers: CachedRelayers): Promise<void>;
}
export interface DBRevenueServiceConstructor extends BaseRevenueServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBRevenueService extends BaseRevenueService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    relayerJsonDigest?: string;
    constructor(params: DBRevenueServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<StakeBurnedEvents>>;
    getEventsFromCache(): Promise<CachedEvents<StakeBurnedEvents>>;
    saveEvents({ events, lastBlock }: BaseEvents<StakeBurnedEvents>): Promise<void>;
}
