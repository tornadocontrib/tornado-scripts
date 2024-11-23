import { downloadZip } from '../zip';
import { IndexedDB } from '../idb';

import { bytesToBase64, digest } from '../utils';
import { fetchData } from '../providers';
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
    BaseRevenueService,
    BaseRevenueServiceConstructor,
    CachedRelayers,
    BaseMultiTornadoService,
    BaseMultiTornadoServiceConstructor,
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
    AllRelayerRegistryEvents,
    StakeBurnedEvents,
    MultiDepositsEvents,
    MultiWithdrawalsEvents,
} from './types';

export async function saveDBEvents<T extends MinimalEvents>({
    idb,
    instanceName,
    newEvents,
    lastBlock,
}: {
    idb: IndexedDB;
    instanceName: string;
    newEvents: T[];
    lastBlock: number;
}) {
    try {
        const formattedEvents = newEvents.map((e) => {
            return {
                eid: `${e.transactionHash}_${e.logIndex}`,
                ...e,
            };
        });

        await idb.createMultipleTransactions({
            data: formattedEvents,
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
        const lastBlockStore = await idb.getItem<{
            blockNumber: number;
            name: string;
        }>({
            storeName: 'lastEvents',
            key: instanceName,
        });

        if (!lastBlockStore?.blockNumber) {
            return {
                events: [],
                lastBlock: 0,
            };
        }

        const events = (
            await idb.getAll<(T & { eid?: string })[]>({
                storeName: instanceName,
            })
        ).map((e) => {
            delete e.eid;
            return e;
        });

        return {
            events,
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

    async saveEvents({
        newEvents,
        lastBlock,
    }: BaseEvents<DepositsEvents | WithdrawalsEvents> & { newEvents: (DepositsEvents | WithdrawalsEvents)[] }) {
        await saveDBEvents<DepositsEvents | WithdrawalsEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
            lastBlock,
        });
    }
}

export interface DBMultiTornadoServiceConstructor extends BaseMultiTornadoServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}

export class DBMultiTornadoService extends BaseMultiTornadoService {
    staticUrl: string;
    idb: IndexedDB;

    zipDigest?: string;

    constructor(params: DBMultiTornadoServiceConstructor) {
        super(params);

        this.staticUrl = params.staticUrl;
        this.idb = params.idb;
    }

    async getEventsFromDB() {
        return await loadDBEvents<MultiDepositsEvents | MultiWithdrawalsEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
        });
    }

    async getEventsFromCache() {
        return await loadRemoteEvents<MultiDepositsEvents | MultiWithdrawalsEvents>({
            staticUrl: this.staticUrl,
            instanceName: this.getInstanceName(),
            deployedBlock: this.deployedBlock,
            zipDigest: this.zipDigest,
        });
    }

    async saveEvents({
        newEvents,
        lastBlock,
    }: BaseEvents<MultiDepositsEvents | MultiWithdrawalsEvents> & {
        newEvents: (MultiDepositsEvents | MultiWithdrawalsEvents)[];
    }) {
        await saveDBEvents<MultiDepositsEvents | MultiWithdrawalsEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
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

    async saveEvents({ newEvents, lastBlock }: BaseEvents<EchoEvents> & { newEvents: EchoEvents[] }) {
        await saveDBEvents<EchoEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
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

    async saveEvents({
        newEvents,
        lastBlock,
    }: BaseEvents<EncryptedNotesEvents> & { newEvents: EncryptedNotesEvents[] }) {
        await saveDBEvents<EncryptedNotesEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
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

    async saveEvents({ newEvents, lastBlock }: BaseEvents<AllGovernanceEvents> & { newEvents: AllGovernanceEvents[] }) {
        await saveDBEvents<AllGovernanceEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
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
    relayerJsonDigest?: string;

    constructor(params: DBRegistryServiceConstructor) {
        super(params);

        this.staticUrl = params.staticUrl;
        this.idb = params.idb;
    }

    async getEventsFromDB() {
        return await loadDBEvents<AllRelayerRegistryEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
        });
    }

    async getEventsFromCache() {
        return await loadRemoteEvents<AllRelayerRegistryEvents>({
            staticUrl: this.staticUrl,
            instanceName: this.getInstanceName(),
            deployedBlock: this.deployedBlock,
            zipDigest: this.zipDigest,
        });
    }

    async saveEvents({
        newEvents,
        lastBlock,
    }: BaseEvents<AllRelayerRegistryEvents> & { newEvents: AllRelayerRegistryEvents[] }) {
        await saveDBEvents<AllRelayerRegistryEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
            lastBlock,
        });
    }

    async getRelayersFromDB(): Promise<CachedRelayers> {
        try {
            const allCachedRelayers = await this.idb.getAll<CachedRelayers[]>({
                storeName: `relayers_${this.netId}`,
            });

            if (!allCachedRelayers?.length) {
                return {
                    lastBlock: 0,
                    timestamp: 0,
                    relayers: [],
                };
            }

            return allCachedRelayers.slice(-1)[0];
        } catch (err) {
            console.log('Method getRelayersFromDB has error');
            console.log(err);

            return {
                lastBlock: 0,
                timestamp: 0,
                relayers: [],
            };
        }
    }

    async getRelayersFromCache(): Promise<CachedRelayers> {
        const url = `${this.staticUrl}/relayers.json`;

        try {
            const resp = await fetchData(url, {
                method: 'GET',
                returnResponse: true,
            });

            const data = new Uint8Array(await resp.arrayBuffer());

            if (this.relayerJsonDigest) {
                const hash = 'sha384-' + bytesToBase64(await digest(data));

                if (hash !== this.relayerJsonDigest) {
                    const errMsg = `Invalid digest hash for ${url}, wants ${this.relayerJsonDigest} has ${hash}`;
                    throw new Error(errMsg);
                }
            }

            return JSON.parse(new TextDecoder().decode(data)) as CachedRelayers;
        } catch (err) {
            console.log('Method getRelayersFromCache has error');
            console.log(err);

            return {
                lastBlock: 0,
                timestamp: 0,
                relayers: [],
            };
        }
    }

    async saveRelayers(cachedRelayers: CachedRelayers): Promise<void> {
        try {
            await this.idb.putItem({
                data: cachedRelayers,
                storeName: `relayers_${this.netId}`,
            });
        } catch (err) {
            console.log('Method saveRelayers has error');
            console.log(err);
        }
    }
}

export interface DBRevenueServiceConstructor extends BaseRevenueServiceConstructor {
    staticUrl: string;
    idb: IndexedDB;
}

export class DBRevenueService extends BaseRevenueService {
    staticUrl: string;
    idb: IndexedDB;

    zipDigest?: string;
    relayerJsonDigest?: string;

    constructor(params: DBRevenueServiceConstructor) {
        super(params);

        this.staticUrl = params.staticUrl;
        this.idb = params.idb;
    }

    async getEventsFromDB() {
        return await loadDBEvents<StakeBurnedEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
        });
    }

    async getEventsFromCache() {
        return await loadRemoteEvents<StakeBurnedEvents>({
            staticUrl: this.staticUrl,
            instanceName: this.getInstanceName(),
            deployedBlock: this.deployedBlock,
            zipDigest: this.zipDigest,
        });
    }

    async saveEvents({ newEvents, lastBlock }: BaseEvents<StakeBurnedEvents> & { newEvents: StakeBurnedEvents[] }) {
        await saveDBEvents<StakeBurnedEvents>({
            idb: this.idb,
            instanceName: this.getInstanceName(),
            newEvents,
            lastBlock,
        });
    }
}
