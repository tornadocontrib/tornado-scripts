import { MimcSponge } from 'circomlibjs';
import type { Element, HashFunction } from 'fixed-merkle-tree';
export declare class Mimc {
    sponge?: MimcSponge;
    hash?: HashFunction<Element>;
    mimcPromise: Promise<void>;
    constructor();
    initMimc(): Promise<void>;
    getHash(): Promise<{
        sponge: MimcSponge | undefined;
        hash: HashFunction<Element> | undefined;
    }>;
}
export declare const mimc: Mimc;
