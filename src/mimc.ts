import { MimcSponge, buildMimcSponge } from 'circomlibjs';
import type { Element, HashFunction } from 'fixed-merkle-tree';

export class Mimc {
    sponge?: MimcSponge;
    hash?: HashFunction<Element>;
    mimcPromise: Promise<void>;

    constructor() {
        this.mimcPromise = this.initMimc();
    }

    async initMimc() {
        this.sponge = await buildMimcSponge();
        this.hash = (left, right) => this.sponge?.F.toString(this.sponge?.multiHash([BigInt(left), BigInt(right)]));
    }

    async getHash() {
        await this.mimcPromise;

        return {
            sponge: this.sponge,
            hash: this.hash,
        };
    }
}

export const mimc = new Mimc();
