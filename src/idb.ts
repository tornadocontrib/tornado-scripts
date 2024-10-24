/* eslint-disable @typescript-eslint/no-explicit-any */
import { openDB, deleteDB, OpenDBCallbacks, IDBPDatabase } from 'idb';
import { getConfig, NetIdType } from './networkConfig';

export const INDEX_DB_ERROR = 'A mutation operation was attempted on a database that did not allow mutations.';

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

export class IndexedDB {
  dbExists: boolean;
  isBlocked: boolean;
  // todo: TestDBSchema on any
  options: OpenDBCallbacks<any>;
  dbName: string;
  dbVersion: number;
  db?: IDBPDatabase<any>;

  constructor({ dbName, stores }: IDBConstructor) {
    this.dbExists = false;
    this.isBlocked = false;

    this.options = {
      upgrade(db) {
        Object.values(db.objectStoreNames).forEach((value) => {
          db.deleteObjectStore(value);
        });

        [{ name: 'keyval' }, ...(stores || [])].forEach(({ name, keyPath, indexes }) => {
          const store = db.createObjectStore(name, {
            keyPath,
            autoIncrement: true,
          });

          if (Array.isArray(indexes)) {
            indexes.forEach(({ name, unique = false }) => {
              store.createIndex(name, name, { unique });
            });
          }
        });
      },
    };

    this.dbName = dbName;
    this.dbVersion = 35;
  }

  async initDB() {
    try {
      if (this.dbExists || this.isBlocked) {
        return;
      }

      this.db = await openDB(this.dbName, this.dbVersion, this.options);
      this.db.addEventListener('onupgradeneeded', async () => {
        await this._removeExist();
      });

      this.dbExists = true;
    } catch (err: any) {
      // needed for private mode firefox browser
      if (err.message.includes(INDEX_DB_ERROR)) {
        console.log('This browser does not support IndexedDB!');
        this.isBlocked = true;
        return;
      }

      if (err.message.includes('less than the existing version')) {
        console.log(`Upgrading DB ${this.dbName} to ${this.dbVersion}`);
        await this._removeExist();
        return;
      }

      console.error(`Method initDB has error: ${err.message}`);
    }
  }

  async _removeExist() {
    await deleteDB(this.dbName);
    this.dbExists = false;

    await this.initDB();
  }

  async getFromIndex<T>({
    storeName,
    indexName,
    key,
  }: {
    storeName: string;
    indexName: string;
    key?: string;
  }): Promise<T | undefined> {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      return (await this.db.getFromIndex(storeName, indexName, key)) as T;
    } catch (err: any) {
      throw new Error(`Method getFromIndex has error: ${err.message}`);
    }
  }

  async getAllFromIndex<T>({
    storeName,
    indexName,
    key,
    count,
  }: {
    storeName: string;
    indexName: string;
    key?: string;
    count?: number;
  }): Promise<T> {
    await this.initDB();

    if (!this.db) {
      return [] as T;
    }

    try {
      return (await this.db.getAllFromIndex(storeName, indexName, key, count)) as T;
    } catch (err: any) {
      throw new Error(`Method getAllFromIndex has error: ${err.message}`);
    }
  }

  async getItem<T>({ storeName, key }: { storeName: string; key: string }): Promise<T | undefined> {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const store = this.db.transaction(storeName).objectStore(storeName);

      return (await store.get(key)) as T;
    } catch (err: any) {
      throw new Error(`Method getItem has error: ${err.message}`);
    }
  }

  async addItem({ storeName, data, key = '' }: { storeName: string; data: any; key: string }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const isExist = await tx.objectStore(storeName).get(key);

      if (!isExist) {
        await tx.objectStore(storeName).add(data);
      }
    } catch (err: any) {
      throw new Error(`Method addItem has error: ${err.message}`);
    }
  }

  async putItem({ storeName, data, key }: { storeName: string; data: any; key?: string }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');

      await tx.objectStore(storeName).put(data, key);
    } catch (err: any) {
      throw new Error(`Method putItem has error: ${err.message}`);
    }
  }

  async deleteItem({ storeName, key }: { storeName: string; key: string }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');

      await tx.objectStore(storeName).delete(key);
    } catch (err: any) {
      throw new Error(`Method deleteItem has error: ${err.message}`);
    }
  }

  async getAll<T>({ storeName }: { storeName: string }): Promise<T> {
    await this.initDB();

    if (!this.db) {
      return [] as T;
    }

    try {
      const tx = this.db.transaction(storeName, 'readonly');

      return (await tx.objectStore(storeName).getAll()) as T;
    } catch (err: any) {
      throw new Error(`Method getAll has error: ${err.message}`);
    }
  }

  /**
   * Simple key-value store inspired by idb-keyval package
   */
  getValue<T>(key: string) {
    return this.getItem<T>({ storeName: 'keyval', key });
  }

  setValue(key: string, data: any) {
    return this.putItem({ storeName: 'keyval', key, data });
  }

  delValue(key: string) {
    return this.deleteItem({ storeName: 'keyval', key });
  }

  async clearStore({ storeName, mode = 'readwrite' }: { storeName: string; mode: IDBTransactionMode }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, mode);

      await (tx.objectStore(storeName).clear as () => Promise<void>)();
    } catch (err: any) {
      throw new Error(`Method clearStore has error: ${err.message}`);
    }
  }

  async createTransactions({
    storeName,
    data,
    mode = 'readwrite',
  }: {
    storeName: string;
    data: any;
    mode: IDBTransactionMode;
  }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, mode);

      await (tx.objectStore(storeName).add as (value: any, key?: any) => Promise<any>)(data);
      await tx.done;
    } catch (err: any) {
      throw new Error(`Method createTransactions has error: ${err.message}`);
    }
  }

  async createMultipleTransactions({
    storeName,
    data,
    index,
    mode = 'readwrite',
  }: {
    storeName: string;
    data: any[];
    index?: any;
    mode?: IDBTransactionMode;
  }) {
    await this.initDB();

    if (!this.db) {
      return;
    }

    try {
      const tx = this.db.transaction(storeName, mode);

      for (const item of data) {
        if (item) {
          await (tx.store.put as (value: any, key?: any) => Promise<any>)({ ...item, ...index });
        }
      }
    } catch (err: any) {
      throw new Error(`Method createMultipleTransactions has error: ${err.message}`);
    }
  }
}

/**
 * Should check if DB is initialized well
 */
export async function getIndexedDB(netId?: NetIdType) {
  // key-value db for settings
  if (!netId) {
    const idb = new IndexedDB({ dbName: 'tornado-core' });
    await idb.initDB();
    return idb;
  }

  const minimalIndexes = [
    {
      name: 'blockNumber',
      unique: false,
    },
    {
      name: 'transactionHash',
      unique: false,
    },
  ];

  const defaultState = [
    {
      name: `echo_${netId}`,
      keyPath: 'eid',
      indexes: [
        ...minimalIndexes,
        {
          name: 'address',
          unique: false,
        },
      ],
    },
    {
      name: `encrypted_notes_${netId}`,
      keyPath: 'eid',
      indexes: minimalIndexes,
    },
    {
      name: 'lastEvents',
      keyPath: 'name',
      indexes: [
        {
          name: 'name',
          unique: false,
        },
      ],
    },
  ];

  const config = getConfig(netId);

  const { tokens, nativeCurrency, registryContract, governanceContract } = config;

  const stores = [...defaultState];

  if (registryContract) {
    stores.push({
      name: `registered_${netId}`,
      keyPath: 'ensName',
      indexes: [
        ...minimalIndexes,
        {
          name: 'relayerAddress',
          unique: false,
        },
      ],
    });
  }

  if (governanceContract) {
    stores.push({
      name: `governance_${netId}`,
      keyPath: 'eid',
      indexes: [
        ...minimalIndexes,
        {
          name: 'event',
          unique: false,
        },
      ],
    });
  }

  Object.entries(tokens).forEach(([token, { instanceAddress }]) => {
    Object.keys(instanceAddress).forEach((amount) => {
      if (nativeCurrency === token) {
        stores.push(
          {
            name: `stringify_bloom_${netId}_${token}_${amount}`,
            keyPath: 'hashBloom',
            indexes: [],
          },
          {
            name: `stringify_tree_${netId}_${token}_${amount}`,
            keyPath: 'hashTree',
            indexes: [],
          },
        );
      }

      stores.push(
        {
          name: `deposits_${netId}_${token}_${amount}`,
          keyPath: 'leafIndex', // the key by which it refers to the object must be in all instances of the storage
          indexes: [
            ...minimalIndexes,
            {
              name: 'commitment',
              unique: true,
            },
          ],
        },
        {
          name: `withdrawals_${netId}_${token}_${amount}`,
          keyPath: 'eid',
          indexes: [
            ...minimalIndexes,
            {
              name: 'nullifierHash',
              unique: true,
            }, // keys on which the index is created
          ],
        },
      );
    });
  });

  const idb = new IndexedDB({
    dbName: `tornado_core_${netId}`,
    stores,
  });

  await idb.initDB();

  return idb;
}
