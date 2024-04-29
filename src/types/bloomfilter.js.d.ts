/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'bloomfilter.js' {
  export default class BloomFilter {
    m: number;
    k: number;
    size: number;
    bitview: any;

    constructor(n: number, false_postive_tolerance?: number);

    calculateHash(x: number, m: number, i: number): number;

    test(data: any): boolean;

    add(data: any): void;

    bytelength(): number;

    view(): Uint8Array;

    serialize(): string;

    deserialize(serialized: string): BloomFilter;
  }
}
