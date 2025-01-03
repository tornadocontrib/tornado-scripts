import { Provider, BlockTag, Block, TransactionResponse, BaseContract, ContractEventName, EventLog, TransactionReceipt, EventFragment, TopicFilter, Interface, Log } from 'ethers';
/**
 * Copied from ethers.js as they don't export this function
 * https://github.com/ethers-io/ethers.js/blob/main/src.ts/contract/contract.ts#L464
 */
export declare function getSubInfo(abiInterface: Interface, event: ContractEventName): Promise<{
    fragment: null | EventFragment;
    tag: string;
    topics: TopicFilter;
}>;
export declare function multiQueryFilter(address: string | string[], contract: BaseContract, event: ContractEventName, fromBlock?: BlockTag, toBlock?: BlockTag): Promise<Log[]>;
export interface BatchBlockServiceConstructor {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize?: number;
    batchSize?: number;
    shouldRetry?: boolean;
    retryMax?: number;
    retryOn?: number;
}
export type BatchBlockOnProgress = ({ percentage, currentIndex, totalIndex, }: {
    percentage: number;
    currentIndex?: number;
    totalIndex?: number;
}) => void;
/**
 * Fetch blocks from web3 provider on batches
 */
export declare class BatchBlockService {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize: number;
    batchSize: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({ provider, onProgress, concurrencySize, batchSize, shouldRetry, retryMax, retryOn, }: BatchBlockServiceConstructor);
    getBlock(blockTag: BlockTag): Promise<Block>;
    createBatchRequest(batchArray: BlockTag[][]): Promise<Block[]>[];
    getBatchBlocks(blocks: BlockTag[]): Promise<Block[]>;
}
/**
 * Fetch transactions from web3 provider on batches
 */
export declare class BatchTransactionService {
    provider: Provider;
    onProgress?: BatchBlockOnProgress;
    concurrencySize: number;
    batchSize: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({ provider, onProgress, concurrencySize, batchSize, shouldRetry, retryMax, retryOn, }: BatchBlockServiceConstructor);
    getTransaction(txHash: string): Promise<TransactionResponse>;
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt>;
    createBatchRequest(batchArray: string[][], receipt?: boolean): Promise<TransactionResponse[] | TransactionReceipt[]>[];
    getBatchTransactions(txs: string[]): Promise<TransactionResponse[]>;
    getBatchReceipt(txs: string[]): Promise<TransactionReceipt[]>;
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
export type BatchEventOnProgress = ({ percentage, type, fromBlock, toBlock, count, }: {
    percentage: number;
    type?: ContractEventName;
    fromBlock?: number;
    toBlock?: number;
    count?: number;
}) => void;
export interface EventInput {
    fromBlock: number;
    toBlock: number;
    type: ContractEventName;
}
/**
 * Fetch events from web3 provider on bulk
 */
export declare class BatchEventsService {
    provider: Provider;
    contract: BaseContract;
    address?: string | string[];
    onProgress?: BatchEventOnProgress;
    concurrencySize: number;
    blocksPerRequest: number;
    shouldRetry: boolean;
    retryMax: number;
    retryOn: number;
    constructor({ provider, contract, address, onProgress, concurrencySize, blocksPerRequest, shouldRetry, retryMax, retryOn, }: BatchEventServiceConstructor);
    getPastEvents({ fromBlock, toBlock, type }: EventInput): Promise<EventLog[]>;
    createBatchRequest(batchArray: EventInput[]): Promise<EventLog[]>[];
    getBatchEvents({ fromBlock, toBlock, type }: EventInput): Promise<EventLog[]>;
}
