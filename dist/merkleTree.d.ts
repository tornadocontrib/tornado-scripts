import { MerkleTree, PartialMerkleTree, Element, TreeEdge } from 'fixed-merkle-tree';
import type { Tornado } from '@tornado/contracts';
import type { DepositType } from './deposits';
import type { DepositsEvents } from './events';
import type { NetIdType } from './networkConfig';
export interface MerkleTreeConstructor extends DepositType {
    Tornado: Tornado;
    commitmentHex?: string;
    merkleTreeHeight?: number;
    emptyElement?: string;
    merkleWorkerPath?: string;
}
export declare class MerkleTreeService {
    currency: string;
    amount: string;
    netId: NetIdType;
    Tornado: Tornado;
    commitmentHex?: string;
    instanceName: string;
    merkleTreeHeight: number;
    emptyElement: string;
    merkleWorkerPath?: string;
    constructor({ netId, amount, currency, Tornado, commitmentHex, merkleTreeHeight, emptyElement, merkleWorkerPath, }: MerkleTreeConstructor);
    createTree(events: Element[]): Promise<MerkleTree>;
    createPartialTree({ edge, elements }: {
        edge: TreeEdge;
        elements: Element[];
    }): Promise<PartialMerkleTree>;
    verifyTree(events: DepositsEvents[]): Promise<MerkleTree>;
}
