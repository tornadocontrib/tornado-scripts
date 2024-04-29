import type { Element } from '@tornado/fixed-merkle-tree';
import type { AddressLike, BytesLike, BigNumberish } from 'ethers';
export type snarkInputs = {
    root: Element;
    nullifierHex: string;
    recipient: AddressLike;
    relayer: AddressLike;
    fee: bigint;
    refund: bigint;
    nullifier: bigint;
    secret: bigint;
    pathElements: Element[];
    pathIndices: Element[];
};
export type snarkArgs = [
    _root: BytesLike,
    _nullifierHash: BytesLike,
    _recipient: AddressLike,
    _relayer: AddressLike,
    _fee: BigNumberish,
    _refund: BigNumberish
];
export type snarkProofs = {
    proof: BytesLike;
    args: snarkArgs;
};
export declare function calculateSnarkProof(input: snarkInputs, circuit: object, provingKey: ArrayBuffer): Promise<snarkProofs>;
