// @ts-expect-error no-websnark-types
import * as websnarkUtils from '@tornado/websnark/src/utils';
// @ts-expect-error no-websnark-types
import websnarkGroth from '@tornado/websnark/src/groth16';
import type { Element } from '@tornado/fixed-merkle-tree';
import type { AddressLike, BytesLike, BigNumberish } from 'ethers';
import { toFixedHex } from './utils';

export type snarkInputs = {
  // Public snark inputs
  root: Element;
  nullifierHex: string;
  recipient: AddressLike;
  relayer: AddressLike;
  fee: bigint;
  refund: bigint;

  // Private snark inputs
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
  _refund: BigNumberish,
];

export type snarkProofs = {
  proof: BytesLike;
  args: snarkArgs;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let groth16: any;

export async function initGroth16() {
  if (!groth16) {
    groth16 = await websnarkGroth({ wasmInitialMemory: 2000 });
  }
}

export async function calculateSnarkProof(
  input: snarkInputs,
  circuit: object,
  provingKey: ArrayBuffer,
): Promise<snarkProofs> {
  if (!groth16) {
    await initGroth16();
  }

  const snarkInput = {
    root: input.root,
    nullifierHash: BigInt(input.nullifierHex).toString(),
    recipient: BigInt(input.recipient as string),
    relayer: BigInt(input.relayer as string),
    fee: input.fee,
    refund: input.refund,

    nullifier: input.nullifier,
    secret: input.secret,
    pathElements: input.pathElements,
    pathIndices: input.pathIndices,
  };

  console.log('Start generating SNARK proof', snarkInput);
  console.time('SNARK proof time');
  const proofData = await websnarkUtils.genWitnessAndProve(await groth16, snarkInput, circuit, provingKey);
  const proof = websnarkUtils.toSolidityInput(proofData).proof as BytesLike;
  console.timeEnd('SNARK proof time');

  const args = [
    toFixedHex(input.root, 32) as BytesLike,
    toFixedHex(input.nullifierHex, 32) as BytesLike,
    input.recipient,
    input.relayer,
    toFixedHex(input.fee, 32) as BigNumberish,
    toFixedHex(input.refund, 32) as BigNumberish,
  ] as snarkArgs;

  return { proof, args };
}
