import { Worker as NodeWorker } from 'worker_threads';
import { MerkleTree, PartialMerkleTree, Element, TreeEdge } from 'fixed-merkle-tree';
import type { Tornado } from '@tornado/contracts';
import { isNode, toFixedHex } from './utils';
import { mimc } from './mimc';
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

export class MerkleTreeService {
    currency: string;
    amount: string;
    netId: NetIdType;
    Tornado: Tornado;
    commitmentHex?: string;
    instanceName: string;

    merkleTreeHeight: number;
    emptyElement: string;

    merkleWorkerPath?: string;

    constructor({
        netId,
        amount,
        currency,
        Tornado,
        commitmentHex,
        merkleTreeHeight = 20,
        emptyElement = '21663839004416932945382355908790599225266501822907911457504978515578255421292',
        merkleWorkerPath,
    }: MerkleTreeConstructor) {
        const instanceName = `${netId}_${currency}_${amount}`;

        this.currency = currency;
        this.amount = amount;
        this.netId = Number(netId);

        this.Tornado = Tornado;
        this.instanceName = instanceName;
        this.commitmentHex = commitmentHex;

        this.merkleTreeHeight = merkleTreeHeight;
        this.emptyElement = emptyElement;
        this.merkleWorkerPath = merkleWorkerPath;
    }

    async createTree(events: Element[]) {
        const { hash: hashFunction } = await mimc.getHash();

        if (this.merkleWorkerPath) {
            console.log('Using merkleWorker\n');

            try {
                if (isNode) {
                    const merkleWorkerPromise = new Promise((resolve, reject) => {
                        const worker = new NodeWorker(this.merkleWorkerPath as string, {
                            workerData: {
                                merkleTreeHeight: this.merkleTreeHeight,
                                elements: events,
                                zeroElement: this.emptyElement,
                            },
                        });
                        worker.on('message', resolve);
                        worker.on('error', reject);
                        worker.on('exit', (code) => {
                            if (code !== 0) {
                                reject(new Error(`Worker stopped with exit code ${code}`));
                            }
                        });
                    }) as Promise<string>;

                    return MerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
                } else {
                    const merkleWorkerPromise = new Promise((resolve, reject) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const worker = new (Worker as any)(this.merkleWorkerPath);

                        worker.onmessage = (e: { data: string }) => {
                            resolve(e.data);
                        };

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        worker.onerror = (e: any) => {
                            reject(e);
                        };

                        worker.postMessage({
                            merkleTreeHeight: this.merkleTreeHeight,
                            elements: events,
                            zeroElement: this.emptyElement,
                        });
                    }) as Promise<string>;

                    return MerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
                }
            } catch (err) {
                console.log('merkleWorker failed, falling back to synchronous merkle tree');
                console.log(err);
            }
        }

        return new MerkleTree(this.merkleTreeHeight, events, {
            zeroElement: this.emptyElement,
            hashFunction,
        });
    }

    async createPartialTree({ edge, elements }: { edge: TreeEdge; elements: Element[] }) {
        const { hash: hashFunction } = await mimc.getHash();

        if (this.merkleWorkerPath) {
            console.log('Using merkleWorker\n');

            try {
                if (isNode) {
                    const merkleWorkerPromise = new Promise((resolve, reject) => {
                        const worker = new NodeWorker(this.merkleWorkerPath as string, {
                            workerData: {
                                merkleTreeHeight: this.merkleTreeHeight,
                                edge,
                                elements,
                                zeroElement: this.emptyElement,
                            },
                        });
                        worker.on('message', resolve);
                        worker.on('error', reject);
                        worker.on('exit', (code) => {
                            if (code !== 0) {
                                reject(new Error(`Worker stopped with exit code ${code}`));
                            }
                        });
                    }) as Promise<string>;

                    return PartialMerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
                } else {
                    const merkleWorkerPromise = new Promise((resolve, reject) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const worker = new (Worker as any)(this.merkleWorkerPath);

                        worker.onmessage = (e: { data: string }) => {
                            resolve(e.data);
                        };

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        worker.onerror = (e: any) => {
                            reject(e);
                        };

                        worker.postMessage({
                            merkleTreeHeight: this.merkleTreeHeight,
                            edge,
                            elements,
                            zeroElement: this.emptyElement,
                        });
                    }) as Promise<string>;

                    return PartialMerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
                }
            } catch (err) {
                console.log('merkleWorker failed, falling back to synchronous merkle tree');
                console.log(err);
            }
        }

        return new PartialMerkleTree(this.merkleTreeHeight, edge, elements, {
            zeroElement: this.emptyElement,
            hashFunction,
        });
    }

    async verifyTree(events: DepositsEvents[]) {
        console.log(
            `\nCreating deposit tree for ${this.netId} ${this.amount} ${this.currency.toUpperCase()} would take a while\n`,
        );

        const timeStart = Date.now();

        const tree = await this.createTree(events.map(({ commitment }) => commitment));

        const isKnownRoot = await this.Tornado.isKnownRoot(toFixedHex(BigInt(tree.root)));

        if (!isKnownRoot) {
            const errMsg = `Deposit Event ${this.netId} ${this.amount} ${this.currency} is invalid`;
            throw new Error(errMsg);
        }

        console.log(
            `\nCreated ${this.netId} ${this.amount} ${this.currency.toUpperCase()} tree in ${Date.now() - timeStart}ms\n`,
        );

        return tree;
    }
}
