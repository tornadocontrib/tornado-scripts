import { IndexedDB } from '../idb';
import { BaseTornadoService, BaseTornadoServiceConstructor, BaseEchoService, BaseEchoServiceConstructor, BaseEncryptedNotesService, BaseEncryptedNotesServiceConstructor, BaseGovernanceService, BaseGovernanceServiceConstructor, BaseRegistryService, BaseRegistryServiceConstructor, BaseRevenueService, BaseRevenueServiceConstructor, CachedRelayers, BaseMultiTornadoService, BaseMultiTornadoServiceConstructor } from './base';
import { BaseEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, CachedEvents, EchoEvents, EncryptedNotesEvents, AllGovernanceEvents, AllRelayerRegistryEvents, StakeBurnedEvents, MultiDepositsEvents, MultiWithdrawalsEvents } from './types';
export declare function saveDBEvents<T extends MinimalEvents>({ idb, instanceName, newEvents, lastBlock, }: {
    idb: IndexedDB;
    instanceName: string;
    newEvents: T[];
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
    saveEvents({ newEvents, lastBlock, }: BaseEvents<DepositsEvents | WithdrawalsEvents> & {
        newEvents: (DepositsEvents | WithdrawalsEvents)[];
    }): Promise<void>;
}
export interface DBMultiTornadoServiceConstructor extends BaseMultiTornadoServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}
export declare class DBMultiTornadoService extends BaseMultiTornadoService {
    staticUrl: string;
    idb: IndexedDB;
    zipDigest?: string;
    constructor(params: DBMultiTornadoServiceConstructor);
    getEventsFromDB(): Promise<BaseEvents<MultiDepositsEvents | MultiWithdrawalsEvents>>;
    getEventsFromCache(): Promise<CachedEvents<MultiDepositsEvents | MultiWithdrawalsEvents>>;
    saveEvents({ newEvents, lastBlock, }: BaseEvents<MultiDepositsEvents | MultiWithdrawalsEvents> & {
        newEvents: (MultiDepositsEvents | MultiWithdrawalsEvents)[];
    }): Promise<void>;
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
    saveEvents({ newEvents, lastBlock }: BaseEvents<EchoEvents> & {
        newEvents: EchoEvents[];
    }): Promise<void>;
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
    saveEvents({ newEvents, lastBlock, }: BaseEvents<EncryptedNotesEvents> & {
        newEvents: EncryptedNotesEvents[];
    }): Promise<void>;
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
    saveEvents({ newEvents, lastBlock }: BaseEvents<AllGovernanceEvents> & {
        newEvents: AllGovernanceEvents[];
    }): Promise<void>;
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
    saveEvents({ newEvents, lastBlock, }: BaseEvents<AllRelayerRegistryEvents> & {
        newEvents: AllRelayerRegistryEvents[];
    }): Promise<void>;
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
    saveEvents({ newEvents, lastBlock }: BaseEvents<StakeBurnedEvents> & {
        newEvents: StakeBurnedEvents[];
    }): Promise<void>;
}
