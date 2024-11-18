import {
    Provider,
    BlockTag,
    Block,
    TransactionResponse,
    BaseContract,
    ContractEventName,
    EventLog,
    TransactionReceipt,
    isHexString,
    assert,
    assertArgument,
    DeferredTopicFilter,
    EventFragment,
    TopicFilter,
    Interface,
    UndecodedEventLog,
    Log,
} from 'ethers';
import { chunk, sleep } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDeferred(value: any): value is DeferredTopicFilter {
    return (
        value &&
        typeof value === 'object' &&
        'getTopicFilter' in value &&
        typeof value.getTopicFilter === 'function' &&
        value.fragment
    );
}

/**
 * Copied from ethers.js as they don't export this function
 * https://github.com/ethers-io/ethers.js/blob/main/src.ts/contract/contract.ts#L464
 */
export async function getSubInfo(
    abiInterface: Interface,
    event: ContractEventName,
): Promise<{
    fragment: null | EventFragment;
    tag: string;
    topics: TopicFilter;
}> {
    let topics: Array<null | string | Array<string>>;
    let fragment: null | EventFragment = null;

    // Convert named events to topicHash and get the fragment for
    // events which need deconstructing.

    if (Array.isArray(event)) {
        const topicHashify = function (name: string): string {
            if (isHexString(name, 32)) {
                return name;
            }
            const fragment = abiInterface.getEvent(name);
            assertArgument(fragment, 'unknown fragment', 'name', name);
            return fragment.topicHash;
        };

        // Array of Topics and Names; e.g. `[ "0x1234...89ab", "Transfer(address)" ]`
        topics = event.map((e) => {
            if (e == null) {
                return null;
            }
            if (Array.isArray(e)) {
                return e.map(topicHashify);
            }
            return topicHashify(e);
        });
    } else if (event === '*') {
        topics = [null];
    } else if (typeof event === 'string') {
        if (isHexString(event, 32)) {
            // Topic Hash
            topics = [event];
        } else {
            // Name or Signature; e.g. `"Transfer", `"Transfer(address)"`
            fragment = abiInterface.getEvent(event);
            assertArgument(fragment, 'unknown fragment', 'event', event);
            topics = [fragment.topicHash];
        }
    } else if (isDeferred(event)) {
        // Deferred Topic Filter; e.g. `contract.filter.Transfer(from)`
        topics = await event.getTopicFilter();
    } else if ('fragment' in event) {
        // ContractEvent; e.g. `contract.filter.Transfer`
        fragment = event.fragment;
        topics = [fragment.topicHash];
    } else {
        assertArgument(false, 'unknown event name', 'event', event);
    }

    // Normalize topics and sort TopicSets
    topics = topics.map((t) => {
        if (t == null) {
            return null;
        }
        if (Array.isArray(t)) {
            const items = Array.from(new Set(t.map((t) => t.toLowerCase())).values());
            if (items.length === 1) {
                return items[0];
            }
            items.sort();
            return items;
        }
        return t.toLowerCase();
    });

    const tag = topics
        .map((t) => {
            if (t == null) {
                return 'null';
            }
            if (Array.isArray(t)) {
                return t.join('|');
            }
            return t;
        })
        .join('&');

    return { fragment, tag, topics };
}

export async function multiQueryFilter(
    // Single address will scan for a single contract, array for multiple, and * for all contracts with event topic
    address: string | string[],
    contract: BaseContract,
    event: ContractEventName,
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
) {
    if (fromBlock == null) {
        fromBlock = 0;
    }
    if (toBlock == null) {
        toBlock = 'latest';
    }

    const { fragment, topics } = await getSubInfo(contract.interface, event);

    const filter = {
        address: address === '*' ? undefined : address,
        topics,
        fromBlock,
        toBlock,
    };

    const provider = contract.runner as Provider | null;

    assert(provider, 'contract runner does not have a provider', 'UNSUPPORTED_OPERATION', { operation: 'queryFilter' });

    return (await provider.getLogs(filter)).map((log) => {
        let foundFragment = fragment;
        if (foundFragment == null) {
            try {
                foundFragment = contract.interface.getEvent(log.topics[0]);
                // eslint-disable-next-line no-empty
            } catch {}
        }

        if (foundFragment) {
            try {
                return new EventLog(log, contract.interface, foundFragment);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                return new UndecodedEventLog(log, error);
            }
        }

        return new Log(log, provider);
    });
}

export interface BatchBlockServiceConstructor {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize?: number;
    batchSize?: number;
    shouldRetry?: boolean;
    retryMax?: number;
    retryOn?: number;
}

export type BatchBlockOnProgress = ({
    percentage,
    currentIndex,
    totalIndex,
}: {
    percentage: number;
    currentIndex?: number;
    totalIndex?: number;
}) => void;

/**
 * Fetch blocks from web3 provider on batches
 */
export class BatchBlockService {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize: number;
    batchSize: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({
        provider,
        onProgress,
        concurrencySize = 10,
        batchSize = 10,
        shouldRetry = true,
        retryMax = 5,
        retryOn = 500,
    }: BatchBlockServiceConstructor) {
        this.provider = provider;
        this.onProgress = onProgress;
        this.concurrencySize = concurrencySize;
        this.batchSize = batchSize;
        this.shouldRetry = shouldRetry;
        this.retryMax = retryMax;
        this.retryOn = retryOn;
    }

    async getBlock(blockTag: BlockTag): Promise<Block> {
        const blockObject = await this.provider.getBlock(blockTag);

        // if the provider returns null (which they have corrupted block data for one of their nodes) throw and retry
        if (!blockObject) {
            const errMsg = `No block for ${blockTag}`;
            throw new Error(errMsg);
        }

        return blockObject;
    }

    createBatchRequest(batchArray: BlockTag[][]): Promise<Block[]>[] {
        return batchArray.map(async (blocks: BlockTag[], index: number) => {
            // send batch requests on milliseconds to avoid including them on a single batch request
            await sleep(40 * index);

            return (async () => {
                let retries = 0;
                let err;

                // eslint-disable-next-line no-unmodified-loop-condition
                while ((!this.shouldRetry && retries === 0) || (this.shouldRetry && retries < this.retryMax)) {
                    try {
                        return await Promise.all(blocks.map((b) => this.getBlock(b)));
                    } catch (e) {
                        retries++;
                        err = e;

                        // retry on 0.5 seconds
                        await sleep(this.retryOn);
                    }
                }

                throw err;
            })();
        });
    }

    async getBatchBlocks(blocks: BlockTag[]): Promise<Block[]> {
        let blockCount = 0;
        const results: Block[] = [];

        for (const chunks of chunk(blocks, this.concurrencySize * this.batchSize)) {
            const chunksResult = (await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();

            results.push(...chunksResult);

            blockCount += chunks.length;

            if (typeof this.onProgress === 'function') {
                this.onProgress({
                    percentage: blockCount / blocks.length,
                    currentIndex: blockCount,
                    totalIndex: blocks.length,
                });
            }
        }

        return results;
    }
}

/**
 * Fetch transactions from web3 provider on batches
 */
export class BatchTransactionService {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize: number;
    batchSize: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({
        provider,
        onProgress,
        concurrencySize = 10,
        batchSize = 10,
        shouldRetry = true,
        retryMax = 5,
        retryOn = 500,
    }: BatchBlockServiceConstructor) {
        this.provider = provider;
        this.onProgress = onProgress;
        this.concurrencySize = concurrencySize;
        this.batchSize = batchSize;
        this.shouldRetry = shouldRetry;
        this.retryMax = retryMax;
        this.retryOn = retryOn;
    }

    async getTransaction(txHash: string): Promise<TransactionResponse> {
        const txObject = await this.provider.getTransaction(txHash);

        if (!txObject) {
            const errMsg = `No transaction for ${txHash}`;
            throw new Error(errMsg);
        }

        return txObject;
    }

    async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
        const txObject = await this.provider.getTransactionReceipt(txHash);

        if (!txObject) {
            const errMsg = `No transaction receipt for ${txHash}`;
            throw new Error(errMsg);
        }

        return txObject;
    }

    createBatchRequest(
        batchArray: string[][],
        receipt?: boolean,
    ): Promise<TransactionResponse[] | TransactionReceipt[]>[] {
        return batchArray.map(async (txs: string[], index: number) => {
            await sleep(40 * index);

            return (async () => {
                let retries = 0;
                let err;

                // eslint-disable-next-line no-unmodified-loop-condition
                while ((!this.shouldRetry && retries === 0) || (this.shouldRetry && retries < this.retryMax)) {
                    try {
                        if (!receipt) {
                            return await Promise.all(txs.map((tx) => this.getTransaction(tx)));
                        } else {
                            return await Promise.all(txs.map((tx) => this.getTransactionReceipt(tx)));
                        }
                    } catch (e) {
                        retries++;
                        err = e;

                        // retry on 0.5 seconds
                        await sleep(this.retryOn);
                    }
                }

                throw err;
            })();
        });
    }

    async getBatchTransactions(txs: string[]): Promise<TransactionResponse[]> {
        let txCount = 0;
        const results = [];

        for (const chunks of chunk(txs, this.concurrencySize * this.batchSize)) {
            const chunksResult = (
                await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))
            ).flat() as TransactionResponse[];

            results.push(...chunksResult);

            txCount += chunks.length;

            if (typeof this.onProgress === 'function') {
                this.onProgress({
                    percentage: txCount / txs.length,
                    currentIndex: txCount,
                    totalIndex: txs.length,
                });
            }
        }

        return results;
    }

    async getBatchReceipt(txs: string[]): Promise<TransactionReceipt[]> {
        let txCount = 0;
        const results = [];

        for (const chunks of chunk(txs, this.concurrencySize * this.batchSize)) {
            const chunksResult = (
                await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize), true))
            ).flat() as TransactionReceipt[];

            results.push(...chunksResult);

            txCount += chunks.length;

            if (typeof this.onProgress === 'function') {
                this.onProgress({
                    percentage: txCount / txs.length,
                    currentIndex: txCount,
                    totalIndex: txs.length,
                });
            }
        }

        return results;
    }
}

export interface BatchEventServiceConstructor {
    provider: Provider;
    contract: BaseContract;
    address?: string | string[];
    onProgress?: BatchEventOnProgress;
    concurrencySize?: number;
    blocksPerRequest?: number;
    shouldRetry?: boolean;
    retryMax?: number;
    retryOn?: number;
}

export type BatchEventOnProgress = ({
    percentage,
    type,
    fromBlock,
    toBlock,
    count,
}: {
    percentage: number;
    type?: ContractEventName;
    fromBlock?: number;
    toBlock?: number;
    count?: number;
}) => void;

// To enable iteration only numbers are accepted for fromBlock input
export interface EventInput {
    fromBlock: number;
    toBlock: number;
    type: ContractEventName;
}

/**
 * Fetch events from web3 provider on bulk
 */
export class BatchEventsService {
    provider: Provider;
    contract: BaseContract;
    address?: string | string[];
    onProgress?: BatchEventOnProgress;
    concurrencySize: number;
    blocksPerRequest: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({
        provider,
        contract,
        address,
        onProgress,
        concurrencySize = 10,
        blocksPerRequest = 5000,
        shouldRetry = true,
        retryMax = 5,
        retryOn = 500,
    }: BatchEventServiceConstructor) {
        this.provider = provider;
        this.contract = contract;
        this.address = address;
        this.onProgress = onProgress;
        this.concurrencySize = concurrencySize;
        this.blocksPerRequest = blocksPerRequest;
        this.shouldRetry = shouldRetry;
        this.retryMax = retryMax;
        this.retryOn = retryOn;
    }

    async getPastEvents({ fromBlock, toBlock, type }: EventInput): Promise<EventLog[]> {
        let err;
        let retries = 0;

        // eslint-disable-next-line no-unmodified-loop-condition
        while ((!this.shouldRetry && retries === 0) || (this.shouldRetry && retries < this.retryMax)) {
            try {
                if (this.address) {
                    return (await multiQueryFilter(
                        this.address,
                        this.contract,
                        type,
                        fromBlock,
                        toBlock,
                    )) as EventLog[];
                }
                return (await this.contract.queryFilter(type, fromBlock, toBlock)) as EventLog[];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                err = e;
                retries++;

                // If provider.getBlockNumber returned last block that isn't accepted (happened on Avalanche/Gnosis),
                // get events to last accepted block
                if (e.message.includes('after last accepted block')) {
                    const acceptedBlock = parseInt(e.message.split('after last accepted block ')[1]);
                    toBlock = acceptedBlock;
                }

                // retry on 0.5 seconds
                await sleep(this.retryOn);
            }
        }

        throw err;
    }

    createBatchRequest(batchArray: EventInput[]): Promise<EventLog[]>[] {
        return batchArray.map(async (event: EventInput, index: number) => {
            await sleep(10 * index);

            return this.getPastEvents(event);
        });
    }

    async getBatchEvents({ fromBlock, toBlock, type = '*' }: EventInput): Promise<EventLog[]> {
        if (!toBlock) {
            toBlock = await this.provider.getBlockNumber();
        }

        const eventsToSync = [];

        for (let i = fromBlock; i < toBlock; i += this.blocksPerRequest) {
            const j = i + this.blocksPerRequest - 1 > toBlock ? toBlock : i + this.blocksPerRequest - 1;

            eventsToSync.push({ fromBlock: i, toBlock: j, type });
        }

        const events = [];
        const eventChunk = chunk(eventsToSync, this.concurrencySize);

        let chunkCount = 0;

        for (const chunk of eventChunk) {
            chunkCount++;

            const fetchedEvents = (await Promise.all(this.createBatchRequest(chunk))).flat();
            events.push(...fetchedEvents);

            if (typeof this.onProgress === 'function') {
                this.onProgress({
                    percentage: chunkCount / eventChunk.length,
                    type,
                    fromBlock: chunk[0].fromBlock,
                    toBlock: chunk[chunk.length - 1].toBlock,
                    count: fetchedEvents.length,
                });
            }
        }

        return events;
    }
}
