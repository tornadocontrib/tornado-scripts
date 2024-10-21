import { downloadZip } from '../zip';
import { IndexedDB } from '../idb';

import {
  BaseTornadoService,
  BaseTornadoServiceConstructor,
  BaseEchoService,
  BaseEchoServiceConstructor,
  BaseEncryptedNotesService,
  BaseEncryptedNotesServiceConstructor,
  BaseGovernanceService,
  BaseGovernanceServiceConstructor,
  BaseRegistryService,
  BaseRegistryServiceConstructor,
} from './base';

import {
  BaseEvents,
  MinimalEvents,
  DepositsEvents,
  WithdrawalsEvents,
  CachedEvents,
  EchoEvents,
  EncryptedNotesEvents,
  AllGovernanceEvents,
  RegistersEvents,
} from './types';

export async function saveDBEvents<T extends MinimalEvents>({
  idb,
  instanceName,
  events,
  lastBlock,
}: {
  idb: IndexedDB;
  instanceName: string;
  events: T[];
  lastBlock: number;
}) {
  try {
    await idb.createMultipleTransactions({
      data: events,
      storeName: instanceName,
    });

    await idb.putItem({
      data: {
        blockNumber: lastBlock,
        name: instanceName,
      },
      storeName: 'lastEvents',
    });
  } catch (err) {
    console.log('Method saveDBEvents has error');
    console.log(err);
  }
}

export async function loadDBEvents<T extends MinimalEvents>({
  idb,
  instanceName,
}: {
  idb: IndexedDB;
  instanceName: string;
}): Promise<BaseEvents<T>> {
  try {
    const lastBlockStore = await idb.getItem<{ blockNumber: number; name: string }>({
      storeName: 'lastEvents',
      key: instanceName,
    });

    if (!lastBlockStore?.blockNumber) {
      return {
        events: [],
        lastBlock: 0,
      };
    }

    return {
      events: await idb.getAll<T[]>({ storeName: instanceName }),
      lastBlock: lastBlockStore.blockNumber,
    };
  } catch (err) {
    console.log('Method loadDBEvents has error');
    console.log(err);

    return {
      events: [],
      lastBlock: 0,
    };
  }
}

export async function loadRemoteEvents<T extends MinimalEvents>({
  staticUrl,
  instanceName,
  deployedBlock,
  zipDigest,
}: {
  staticUrl: string;
  instanceName: string;
  deployedBlock: number;
  zipDigest?: string;
}): Promise<CachedEvents<T>> {
  try {
    const zipName = `${instanceName}.json`.toLowerCase();

    const events = await downloadZip<T[]>({
      staticUrl,
      zipName,
      zipDigest,
    });

    if (!Array.isArray(events)) {
      const errStr = `Invalid events from ${staticUrl}/${zipName}`;
      throw new Error(errStr);
    }

    return {
      events,
      lastBlock: events[events.length - 1]?.blockNumber || deployedBlock,
      fromCache: true,
    };
  } catch (err) {
    console.log('Method loadRemoteEvents has error');
    console.log(err);

    return {
      events: [],
      lastBlock: deployedBlock,
      fromCache: true,
    };
  }
}

export interface DBTornadoServiceConstructor extends BaseTornadoServiceConstructor {
  staticUrl: string;
  idb: IndexedDB;
}

export class DBTornadoService extends BaseTornadoService {
  staticUrl: string;
  idb: IndexedDB;

  zipDigest?: string;

  constructor(params: DBTornadoServiceConstructor) {
    super(params);

    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }

  async getEventsFromDB() {
    return await loadDBEvents<DepositsEvents | WithdrawalsEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
    });
  }

  async getEventsFromCache() {
    return await loadRemoteEvents<DepositsEvents | WithdrawalsEvents>({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest,
    });
  }

  async saveEvents({ events, lastBlock }: BaseEvents<DepositsEvents | WithdrawalsEvents>) {
    await saveDBEvents<DepositsEvents | WithdrawalsEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock,
    });
  }
}

export interface DBEchoServiceConstructor extends BaseEchoServiceConstructor {
  staticUrl: string;
  idb: IndexedDB;
}

export class DBEchoService extends BaseEchoService {
  staticUrl: string;
  idb: IndexedDB;

  zipDigest?: string;

  constructor(params: DBEchoServiceConstructor) {
    super(params);

    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }

  async getEventsFromDB() {
    return await loadDBEvents<EchoEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
    });
  }

  async getEventsFromCache() {
    return await loadRemoteEvents<EchoEvents>({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest,
    });
  }

  async saveEvents({ events, lastBlock }: BaseEvents<EchoEvents>) {
    await saveDBEvents<EchoEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock,
    });
  }
}

export interface DBEncryptedNotesServiceConstructor extends BaseEncryptedNotesServiceConstructor {
  staticUrl: string;
  idb: IndexedDB;
}

export class DBEncryptedNotesService extends BaseEncryptedNotesService {
  staticUrl: string;
  idb: IndexedDB;

  zipDigest?: string;

  constructor(params: DBEncryptedNotesServiceConstructor) {
    super(params);

    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }

  async getEventsFromDB() {
    return await loadDBEvents<EncryptedNotesEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
    });
  }

  async getEventsFromCache() {
    return await loadRemoteEvents<EncryptedNotesEvents>({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest,
    });
  }

  async saveEvents({ events, lastBlock }: BaseEvents<EncryptedNotesEvents>) {
    await saveDBEvents<EncryptedNotesEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock,
    });
  }
}

export interface DBGovernanceServiceConstructor extends BaseGovernanceServiceConstructor {
  staticUrl: string;
  idb: IndexedDB;
}

export class DBGovernanceService extends BaseGovernanceService {
  staticUrl: string;
  idb: IndexedDB;

  zipDigest?: string;

  constructor(params: DBGovernanceServiceConstructor) {
    super(params);

    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }

  async getEventsFromDB() {
    return await loadDBEvents<AllGovernanceEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
    });
  }

  async getEventsFromCache() {
    return await loadRemoteEvents<AllGovernanceEvents>({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest,
    });
  }

  async saveEvents({ events, lastBlock }: BaseEvents<AllGovernanceEvents>) {
    await saveDBEvents<AllGovernanceEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock,
    });
  }
}

export interface DBRegistryServiceConstructor extends BaseRegistryServiceConstructor {
  staticUrl: string;
  idb: IndexedDB;
}

export class DBRegistryService extends BaseRegistryService {
  staticUrl: string;
  idb: IndexedDB;

  zipDigest?: string;

  constructor(params: DBRegistryServiceConstructor) {
    super(params);

    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }

  async getEventsFromDB() {
    return await loadDBEvents<RegistersEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
    });
  }

  async getEventsFromCache() {
    return await loadRemoteEvents<RegistersEvents>({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest,
    });
  }

  async saveEvents({ events, lastBlock }: BaseEvents<RegistersEvents>) {
    await saveDBEvents<RegistersEvents>({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock,
    });
  }
}
