import type { Element } from '@tornado/fixed-merkle-tree';
export interface snarkInputs {
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
}
export type snarkArgs = [
    _root: string,
    _nullifierHash: string,
    _recipient: string,
    _relayer: string,
    _fee: string,
    _refund: string
];
export interface snarkProofs {
    proof: string;
    args: snarkArgs;
}
export declare function initGroth16(): Promise<void>;
export declare function calculateSnarkProof(input: snarkInputs, circuit: object, provingKey: ArrayBuffer): Promise<snarkProofs>;
