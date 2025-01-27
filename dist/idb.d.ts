import type * as idb from 'idb';
import type { OpenDBCallbacks, IDBPDatabase } from 'idb';
import type { NetIdType, TornadoConfig } from './networkConfig';
declare global {
    interface Window {
        idb: typeof idb;
    }
}
export declare const INDEX_DB_ERROR = "A mutation operation was attempted on a database that did not allow mutations.";
export interface IDBIndex {
    name: string;
    unique?: boolean;
}
export interface IDBStores {
    name: string;
    keyPath?: string;
    indexes?: IDBIndex[];
}
export interface IDBConstructor {
    dbName: string;
    stores?: IDBStores[];
}
export declare class IndexedDB {
    dbExists: boolean;
    isBlocked: boolean;
    options: OpenDBCallbacks<any>;
    dbName: string;
    dbVersion: number;
    db?: IDBPDatabase<any>;
    constructor({ dbName, stores }: IDBConstructor);
    initDB(): Promise<void>;
    _removeExist(): Promise<void>;
    getFromIndex<T>({ storeName, indexName, key, }: {
        storeName: string;
        indexName: string;
        key?: string;
    }): Promise<T | undefined>;
    getAllFromIndex<T>({ storeName, indexName, key, count, }: {
        storeName: string;
        indexName: string;
        key?: string;
        count?: number;
    }): Promise<T>;
    getItem<T>({ storeName, key }: {
        storeName: string;
        key: string;
    }): Promise<T | undefined>;
    addItem({ storeName, data, key }: {
        storeName: string;
        data: any;
        key: string;
    }): Promise<void>;
    putItem({ storeName, data, key }: {
        storeName: string;
        data: any;
        key?: string;
    }): Promise<void>;
    deleteItem({ storeName, key }: {
        storeName: string;
        key: string;
    }): Promise<void>;
    getAll<T>({ storeName }: {
        storeName: string;
    }): Promise<T>;
    /**
     * Simple key-value store inspired by idb-keyval package
     */
    getValue<T>(key: string): Promise<T | undefined>;
    setValue(key: string, data: any): Promise<void>;
    delValue(key: string): Promise<void>;
    clearStore({ storeName, mode }: {
        storeName: string;
        mode: IDBTransactionMode;
    }): Promise<void>;
    createTransactions({ storeName, data, mode, }: {
        storeName: string;
        data: any;
        mode: IDBTransactionMode;
    }): Promise<void>;
    createMultipleTransactions({ storeName, data, index, mode, }: {
        storeName: string;
        data: any[];
        index?: any;
        mode?: IDBTransactionMode;
    }): Promise<void>;
}
/**
 * Should check if DB is initialized well
 */
export declare function getIndexedDB(netId?: NetIdType, tornadoConfig?: TornadoConfig): Promise<IndexedDB>;
