import { RelayerClient, RelayerClientConstructor, RelayerError, RelayerInfo, RelayerStatus } from './relayerClient';
import { CachedRelayerInfo, MinimalEvents } from './events';
import { NetIdType } from './networkConfig';
export declare const MAX_TOVARISH_EVENTS = 5000;
export interface EventsStatus {
    events: number;
    lastBlock: number;
}
export interface TovarishEventsStatus {
    governance?: EventsStatus;
    registry?: EventsStatus;
    revenue?: EventsStatus;
    echo: EventsStatus;
    encrypted_notes: EventsStatus;
    tornado: EventsStatus;
}
export interface TovarishSyncStatus {
    events: boolean;
    tokenPrice: boolean;
    gasPrice: boolean;
}
export interface TovarishStatus extends RelayerStatus {
    latestBalance: string;
    events: TovarishEventsStatus;
    syncStatus: TovarishSyncStatus;
    onSyncEvents: boolean;
}
export interface TovarishInfo extends RelayerInfo {
    latestBlock: number;
    latestBalance: string;
    version: string;
    events: TovarishEventsStatus;
    syncStatus: TovarishSyncStatus;
}
export interface TovarishEventsQuery {
    type: string;
    currency?: string;
    amount?: string;
    fromBlock: number;
    recent?: boolean;
}
export interface BaseTovarishEvents<T> {
    events: T[];
    lastSyncBlock: number;
}
export declare class TovarishClient extends RelayerClient {
    selectedRelayer?: TovarishInfo;
    constructor(clientConstructor: RelayerClientConstructor);
    askRelayerStatus({ netId, hostname, url, }: {
        netId: NetIdType;
        hostname?: string;
        url?: string;
        relayerAddress?: string;
    }): Promise<TovarishStatus>;
    /**
     * Ask status for all enabled chains for tovarish relayer
     */
    askAllStatus({ hostname, url, relayerAddress, }: {
        hostname?: string;
        url?: string;
        relayerAddress?: string;
    }): Promise<TovarishStatus[]>;
    filterRelayer(netId: NetIdType, relayer: CachedRelayerInfo): Promise<TovarishInfo | RelayerError | undefined>;
    getValidRelayers(netId: NetIdType, relayers: CachedRelayerInfo[]): Promise<{
        validRelayers: TovarishInfo[];
        invalidRelayers: RelayerError[];
    }>;
    getTovarishRelayers(relayers: CachedRelayerInfo[]): Promise<{
        validRelayers: TovarishInfo[];
        invalidRelayers: RelayerError[];
    }>;
    getEvents<T extends MinimalEvents>({ type, currency, amount, fromBlock, recent, }: TovarishEventsQuery): Promise<BaseTovarishEvents<T>>;
}
