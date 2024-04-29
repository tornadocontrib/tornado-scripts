/**
 * Create tree cache file from node.js
 *
 * Only works for node.js, modified from https://github.com/tornadocash/tornado-classic-ui/blob/master/scripts/updateTree.js
 */
import { MerkleTree } from '@tornado/fixed-merkle-tree';
import { DepositsEvents } from './events';
import type { NetIdType } from './networkConfig';
export interface TreeCacheConstructor {
    netId: NetIdType;
    amount: string;
    currency: string;
    userDirectory: string;
    PARTS_COUNT?: number;
    LEAVES?: number;
    zeroElement?: string;
}
export interface treeMetadata {
    blockNumber: number;
    logIndex: number;
    transactionHash: string;
    timestamp: number;
    from: string;
    leafIndex: number;
}
export declare class TreeCache {
    netId: NetIdType;
    amount: string;
    currency: string;
    userDirectory: string;
    PARTS_COUNT: number;
    constructor({ netId, amount, currency, userDirectory, PARTS_COUNT }: TreeCacheConstructor);
    getInstanceName(): string;
    createTree(events: DepositsEvents[], tree: MerkleTree): Promise<void>;
}
