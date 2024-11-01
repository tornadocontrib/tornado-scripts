import { getAddress } from 'ethers';

import {
    RelayerClient,
    RelayerClientConstructor,
    RelayerError,
    RelayerInfo,
    RelayerStatus,
    getSupportedInstances,
} from './relayerClient';
import { fetchData } from './providers';
import { CachedRelayerInfo, MinimalEvents } from './events';
import { ajv, getEventsSchemaValidator, getStatusSchema } from './schemas';
import { enabledChains, getConfig, NetId, NetIdType } from './networkConfig';

// Return no more than 5K events per query
export const MAX_TOVARISH_EVENTS = 5000;

export interface EventsStatus {
    events: number;
    lastBlock: number;
}

export interface InstanceEventsStatus {
    [index: string]: {
        deposits: EventsStatus;
        withdrawals: EventsStatus;
    };
}

export interface CurrencyEventsStatus {
    [index: string]: InstanceEventsStatus;
}

export interface TovarishEventsStatus {
    governance?: EventsStatus;
    registered?: {
        lastBlock: number;
        timestamp: number;
        relayers: number;
    };
    echo: EventsStatus;
    encrypted_notes: EventsStatus;
    instances: CurrencyEventsStatus;
}

export interface TovarishSyncStatus {
    events: boolean;
    tokenPrice: boolean;
    gasPrice: boolean;
}

// Expected response from /status endpoint
export interface TovarishStatus extends RelayerStatus {
    latestBalance: string;
    events: TovarishEventsStatus;
    syncStatus: TovarishSyncStatus;
    onSyncEvents: boolean;
}

// Formatted TovarishStatus for Frontend usage
export interface TovarishInfo extends RelayerInfo {
    latestBlock: number;
    latestBalance: string;
    version: string;
    events: TovarishEventsStatus;
    syncStatus: TovarishSyncStatus;
}

// Query input for TovarishEvents
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

export class TovarishClient extends RelayerClient {
    declare selectedRelayer?: TovarishInfo;

    constructor(clientConstructor: RelayerClientConstructor) {
        super(clientConstructor);
        this.tovarish = true;
    }

    async askRelayerStatus({
        hostname,
        url,
        relayerAddress,
    }: {
        hostname?: string;
        // optional url if entered manually
        url?: string;
        // relayerAddress from registry contract to prevent cheating
        relayerAddress?: string;
    }): Promise<TovarishStatus> {
        const status = (await super.askRelayerStatus({
            hostname,
            url,
            relayerAddress,
        })) as TovarishStatus;

        if (!status.version.includes('tovarish')) {
            throw new Error('Not a tovarish relayer!');
        }

        return status;
    }

    /**
     * Ask status for all enabled chains for tovarish relayer
     */
    async askAllStatus({
        hostname,
        url,
        relayerAddress,
    }: {
        hostname?: string;
        // optional url if entered manually
        url?: string;
        // relayerAddress from registry contract to prevent cheating
        relayerAddress?: string;
    }): Promise<TovarishStatus[]> {
        if (!url && hostname) {
            url = `https://${!hostname.endsWith('/') ? hostname + '/' : hostname}`;
        } else if (url && !url.endsWith('/')) {
            url += '/';
        } else {
            url = '';
        }

        const statusArray = (await fetchData(`${url}status`, {
            ...this.fetchDataOptions,
            headers: {
                'Content-Type': 'application/json, application/x-www-form-urlencoded',
            },
            timeout: 30000,
            maxRetry: this.fetchDataOptions?.torPort ? 2 : 0,
        })) as object;

        if (!Array.isArray(statusArray)) {
            return [];
        }

        const tovarishStatus: TovarishStatus[] = [];

        for (const rawStatus of statusArray) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const netId = (rawStatus as any).netId as NetIdType;
            const config = getConfig(netId);

            const statusValidator = ajv.compile(
                getStatusSchema(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (rawStatus as any).netId,
                    config,
                    this.tovarish,
                ),
            );

            if (!statusValidator) {
                continue;
            }

            const status = {
                ...rawStatus,
                url: `${url}${netId}/`,
            } as TovarishStatus;

            if (status.currentQueue > 5) {
                throw new Error('Withdrawal queue is overloaded');
            }

            if (!enabledChains.includes(status.netId)) {
                throw new Error('This relayer serves a different network');
            }

            if (relayerAddress && status.netId === NetId.MAINNET && status.rewardAccount !== relayerAddress) {
                throw new Error('The Relayer reward address must match registered address');
            }

            if (!status.version.includes('tovarish')) {
                throw new Error('Not a tovarish relayer!');
            }

            tovarishStatus.push(status);
        }

        return tovarishStatus;
    }

    async filterRelayer(relayer: CachedRelayerInfo): Promise<TovarishInfo | RelayerError | undefined> {
        const { ensName, relayerAddress, tovarishHost, tovarishNetworks } = relayer;

        if (!tovarishHost || !tovarishNetworks?.includes(this.netId)) {
            return;
        }

        const hostname = `${tovarishHost}/${this.netId}`;

        try {
            const status = await this.askRelayerStatus({
                hostname,
                relayerAddress,
            });

            return {
                netId: status.netId,
                url: status.url,
                hostname,
                ensName,
                relayerAddress,
                rewardAccount: getAddress(status.rewardAccount),
                instances: getSupportedInstances(status.instances),
                stakeBalance: relayer.stakeBalance,
                gasPrice: status.gasPrices?.fast,
                ethPrices: status.ethPrices,
                currentQueue: status.currentQueue,
                tornadoServiceFee: status.tornadoServiceFee,
                // Additional fields for tovarish relayer
                latestBlock: Number(status.latestBlock),
                latestBalance: status.latestBalance,
                version: status.version,
                events: status.events,
                syncStatus: status.syncStatus,
            } as TovarishInfo;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            return {
                hostname,
                relayerAddress,
                errorMessage: err.message,
                hasError: true,
            } as RelayerError;
        }
    }

    async getValidRelayers(relayers: CachedRelayerInfo[]): Promise<{
        validRelayers: TovarishInfo[];
        invalidRelayers: RelayerError[];
    }> {
        const invalidRelayers: RelayerError[] = [];

        const validRelayers = (await Promise.all(relayers.map((relayer) => this.filterRelayer(relayer)))).filter(
            (r) => {
                if (!r) {
                    return false;
                }
                if ((r as RelayerError).hasError) {
                    invalidRelayers.push(r as RelayerError);
                    return false;
                }
                return true;
            },
        ) as TovarishInfo[];

        return {
            validRelayers,
            invalidRelayers,
        };
    }

    async getTovarishRelayers(relayers: CachedRelayerInfo[]): Promise<{
        validRelayers: TovarishInfo[];
        invalidRelayers: RelayerError[];
    }> {
        const validRelayers: TovarishInfo[] = [];
        const invalidRelayers: RelayerError[] = [];

        await Promise.all(
            relayers
                .filter((r) => r.tovarishHost && r.tovarishNetworks?.length)
                .map(async (relayer) => {
                    const { ensName, relayerAddress, tovarishHost } = relayer;

                    try {
                        const statusArray = await this.askAllStatus({
                            hostname: tovarishHost as string,
                            relayerAddress,
                        });

                        for (const status of statusArray) {
                            validRelayers.push({
                                netId: status.netId,
                                url: status.url,
                                hostname: tovarishHost as string,
                                ensName,
                                relayerAddress,
                                rewardAccount: getAddress(status.rewardAccount),
                                instances: getSupportedInstances(status.instances),
                                stakeBalance: relayer.stakeBalance,
                                gasPrice: status.gasPrices?.fast,
                                ethPrices: status.ethPrices,
                                currentQueue: status.currentQueue,
                                tornadoServiceFee: status.tornadoServiceFee,
                                // Additional fields for tovarish relayer
                                latestBlock: Number(status.latestBlock),
                                latestBalance: status.latestBalance,
                                version: status.version,
                                events: status.events,
                                syncStatus: status.syncStatus,
                            });
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (err: any) {
                        invalidRelayers.push({
                            hostname: tovarishHost as string,
                            relayerAddress,
                            errorMessage: err.message,
                            hasError: true,
                        });
                    }
                }),
        );

        return {
            validRelayers,
            invalidRelayers,
        };
    }

    async getEvents<T extends MinimalEvents>({
        type,
        currency,
        amount,
        fromBlock,
        recent,
    }: TovarishEventsQuery): Promise<BaseTovarishEvents<T>> {
        const url = `${this.selectedRelayer?.url}events`;

        const schemaValidator = getEventsSchemaValidator(type);

        try {
            const events = [];
            let lastSyncBlock = fromBlock;

            // eslint-disable-next-line no-constant-condition
            while (true) {
                // eslint-disable-next-line prefer-const
                let { events: fetchedEvents, lastSyncBlock: currentBlock } = (await fetchData(url, {
                    ...this.fetchDataOptions,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type,
                        currency,
                        amount,
                        fromBlock,
                        recent,
                    }),
                })) as BaseTovarishEvents<T>;

                if (!schemaValidator(fetchedEvents)) {
                    const errMsg = `Schema validation failed for ${type} events`;
                    throw new Error(errMsg);
                }

                if (recent) {
                    return {
                        events: fetchedEvents,
                        lastSyncBlock: currentBlock,
                    };
                }

                lastSyncBlock = currentBlock;

                if (!Array.isArray(fetchedEvents) || !fetchedEvents.length) {
                    break;
                }

                fetchedEvents = fetchedEvents.sort((a, b) => {
                    if (a.blockNumber === b.blockNumber) {
                        return a.logIndex - b.logIndex;
                    }
                    return a.blockNumber - b.blockNumber;
                });

                const [lastEvent] = fetchedEvents.slice(-1);

                if (fetchedEvents.length < MAX_TOVARISH_EVENTS - 100) {
                    events.push(...fetchedEvents);
                    break;
                }

                fetchedEvents = fetchedEvents.filter((e) => e.blockNumber !== lastEvent.blockNumber);
                fromBlock = Number(lastEvent.blockNumber);

                events.push(...fetchedEvents);
            }

            return {
                events,
                lastSyncBlock,
            };
        } catch (err) {
            console.log('Error from TovarishClient events endpoint');
            console.log(err);
            return {
                events: [],
                lastSyncBlock: fromBlock,
            };
        }
    }
}
