import { ERC20Permit, ERC20Mock, TORN } from '@tornado/contracts';
import { BaseContract, MaxUint256, Provider, Signature, Signer, TypedDataEncoder, TypedDataField } from 'ethers';
import { rBigInt } from './utils';

export interface PermitValue {
  spender: string;
  value: bigint;
  nonce?: bigint;
  deadline?: bigint;
}

export const permit2Address = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

/**
 * From @uniswap/permit2-sdk ported for ethers.js v6
 */
export interface Witness {
  witnessTypeName: string;
  witnessType: {
    [key: string]: TypedDataField[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  witness: any;
}

export async function getPermitSignature(
  Token: ERC20Permit | ERC20Mock | TORN,
  { spender, value, nonce, deadline }: PermitValue,
) {
  const signer = Token.runner as Signer & { address: string };
  const provider = signer.provider as Provider;

  const [name, lastNonce, { chainId }] = await Promise.all([
    Token.name(),
    Token.nonces(signer.address),
    provider.getNetwork(),
  ]);

  const DOMAIN_SEPARATOR = {
    name,
    version: '1',
    chainId,
    verifyingContract: Token.target as string,
  };

  const PERMIT_TYPE = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  return Signature.from(
    await signer.signTypedData(DOMAIN_SEPARATOR, PERMIT_TYPE, {
      owner: signer.address,
      spender,
      value,
      nonce: nonce || lastNonce,
      deadline: deadline || MaxUint256,
    }),
  );
}

export async function getPermit2Signature(
  Token: BaseContract,
  { spender, value: amount, nonce, deadline }: PermitValue,
  witness?: Witness,
) {
  const signer = Token.runner as Signer & { address: string };
  const provider = signer.provider as Provider;

  const domain = {
    name: 'Permit2',
    chainId: (await provider.getNetwork()).chainId,
    verifyingContract: permit2Address,
  };

  const types: {
    [key: string]: TypedDataField[];
  } = !witness
    ? {
        PermitTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      }
    : {
        PermitWitnessTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'witness', type: witness.witnessTypeName },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        ...witness.witnessType,
      };

  const values: {
    permitted: {
      token: string;
      amount: bigint;
    };
    spender: string;
    nonce: bigint;
    deadline: bigint;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    witness?: any;
  } = {
    permitted: {
      token: Token.target as string,
      amount,
    },
    spender,
    // Sorted nonce are not required for Permit2
    nonce: nonce || rBigInt(16),
    deadline: deadline || MaxUint256,
  };

  if (witness) {
    values.witness = witness.witness;
  }

  const hash = new TypedDataEncoder(types).hash(values);

  const signature = Signature.from(await signer.signTypedData(domain, types, values));

  return {
    domain,
    types,
    values,
    hash,
    signature,
  };
}
