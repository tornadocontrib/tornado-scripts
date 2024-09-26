import type { Element } from '@tornado/fixed-merkle-tree';
export type snarkInputs = {
    root: Element;
    nullifierHex: string;
    recipient: string;
    relayer: string;
    fee: bigint;
    refund: bigint;
    nullifier: bigint;
    secret: bigint;
    pathElements: Element[];
    pathIndices: Element[];
};
export type snarkProofs = {
    proof: string;
    args: string[];
};
export declare function initGroth16(): Promise<void>;
export declare function calculateSnarkProof(input: snarkInputs, circuit: object, provingKey: ArrayBuffer): Promise<snarkProofs>;
