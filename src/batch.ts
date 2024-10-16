import type { Provider, BlockTag, Block, TransactionResponse, BaseContract, ContractEventName, EventLog } from 'ethers';
import { chunk, sleep } from './utils';

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
      await sleep(20 * index);

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

  createBatchRequest(batchArray: string[][]): Promise<TransactionResponse[]>[] {
    return batchArray.map(async (txs: string[], index: number) => {
      await sleep(20 * index);

      return (async () => {
        let retries = 0;
        let err;

        // eslint-disable-next-line no-unmodified-loop-condition
        while ((!this.shouldRetry && retries === 0) || (this.shouldRetry && retries < this.retryMax)) {
          try {
            return await Promise.all(txs.map((tx) => this.getTransaction(tx)));
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
      const chunksResult = (await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();

      results.push(...chunksResult);

      txCount += chunks.length;

      if (typeof this.onProgress === 'function') {
        this.onProgress({ percentage: txCount / txs.length, currentIndex: txCount, totalIndex: txs.length });
      }
    }

    return results;
  }
}

export interface BatchEventServiceConstructor {
  provider: Provider;
  contract: BaseContract;
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
  onProgress?: BatchEventOnProgress;
  concurrencySize: number;
  blocksPerRequest: number;
  shouldRetry: boolean;
  retryMax: number;
  retryOn: number;
  constructor({
    provider,
    contract,
    onProgress,
    concurrencySize = 10,
    blocksPerRequest = 2000,
    shouldRetry = true,
    retryMax = 5,
    retryOn = 500,
  }: BatchEventServiceConstructor) {
    this.provider = provider;
    this.contract = contract;
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
      await sleep(20 * index);

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
