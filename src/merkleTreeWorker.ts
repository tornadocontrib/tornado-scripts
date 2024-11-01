/* eslint-disable @typescript-eslint/no-explicit-any */
import workerThreads from 'worker_threads';
import { MerkleTree, Element, TreeEdge, PartialMerkleTree } from '@tornado/fixed-merkle-tree';
import { mimc } from './mimc';
import { isNode } from './utils';

interface WorkData {
    merkleTreeHeight: number;
    edge?: TreeEdge;
    elements: Element[];
    zeroElement: string;
}

async function nodePostWork() {
    const { hash: hashFunction } = await mimc.getHash();
    const { merkleTreeHeight, edge, elements, zeroElement } = workerThreads.workerData as WorkData;

    if (edge) {
        const merkleTree = new PartialMerkleTree(merkleTreeHeight, edge, elements, {
            zeroElement,
            hashFunction,
        });

        (workerThreads.parentPort as workerThreads.MessagePort).postMessage(merkleTree.toString());
        return;
    }

    const merkleTree = new MerkleTree(merkleTreeHeight, elements, {
        zeroElement,
        hashFunction,
    });

    (workerThreads.parentPort as workerThreads.MessagePort).postMessage(merkleTree.toString());
}

if (isNode && workerThreads) {
    nodePostWork();
} else if (!isNode && typeof addEventListener === 'function' && typeof postMessage === 'function') {
    addEventListener('message', async (e: any) => {
        let data;

        if (e.data) {
            data = e.data;
        } else {
            data = e;
        }

        const { hash: hashFunction } = await mimc.getHash();
        const { merkleTreeHeight, edge, elements, zeroElement } = data as WorkData;

        if (edge) {
            const merkleTree = new PartialMerkleTree(merkleTreeHeight, edge, elements, {
                zeroElement,
                hashFunction,
            });

            postMessage(merkleTree.toString());
            return;
        }

        const merkleTree = new MerkleTree(merkleTreeHeight, elements, {
            zeroElement,
            hashFunction,
        });

        postMessage(merkleTree.toString());
    });
} else {
    throw new Error('This browser / environment does not support workers!');
}
