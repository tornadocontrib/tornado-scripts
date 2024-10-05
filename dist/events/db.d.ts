import { IndexedDB } from '../idb';
import { BaseTornadoService, BaseTornadoServiceConstructor } from './base';
import { BaseEvents, MinimalEvents, DepositsEvents, WithdrawalsEvents, CachedEvents } from './types';
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
