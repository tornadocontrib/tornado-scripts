import { ERC20Permit, ERC20Mock, TORN } from '@tornado/contracts';
import { MaxUint256, Provider, Signature, Signer, TypedDataField } from 'ethers';

export interface PermitValue {
    spender: string;
    value: bigint;
    nonce?: bigint;
    deadline?: bigint;
}

export interface PermitCommitments {
    denomination: bigint;
    commitments: string[];
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

export async function getPermitSignature({
    Token,
    signer,
    spender,
    value,
    nonce,
    deadline,
}: PermitValue & {
    Token: ERC20Permit | ERC20Mock | TORN;
    signer?: Signer;
}) {
    const sigSigner = (signer || Token.runner) as Signer & { address: string };
    const provider = sigSigner.provider as Provider;

    const [name, lastNonce, { chainId }] = await Promise.all([
        Token.name(),
        Token.nonces(sigSigner.address),
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
        await sigSigner.signTypedData(DOMAIN_SEPARATOR, PERMIT_TYPE, {
            owner: sigSigner.address,
            spender,
            value,
            nonce: nonce || lastNonce,
            deadline: deadline || MaxUint256,
        }),
    );
}

/**
export async function getPermitCommitmentsSignature({
    PermitTornado,
    Token,
    signer,
    denomination,
    commitments,
    nonce,
}: PermitCommitments & {
    PermitTornado: PermitTornado;
    Token: ERC20Permit | ERC20Mock | TORN;
    signer?: Signer;
}) {
    const value = BigInt(commitments.length) * denomination;
    const commitmentsHash = solidityPackedKeccak256(['bytes32[]'], [commitments]);

    return await getPermitSignature({
        Token,
        signer,
        spender: PermitTornado.target as string,
        value,
        nonce,
        deadline: BigInt(commitmentsHash),
    });
}

export async function getPermit2Signature({
    Token,
    signer,
    spender,
    value: amount,
    nonce,
    deadline,
    witness,
}: PermitValue & {
    Token: BaseContract;
    signer?: Signer;
    witness?: Witness;
}) {
    const sigSigner = (signer || Token.runner) as Signer & { address: string };
    const provider = sigSigner.provider as Provider;

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

    const signature = Signature.from(await sigSigner.signTypedData(domain, types, values));

    return {
        domain,
        types,
        values,
        hash,
        signature,
    };
}

export async function getPermit2CommitmentsSignature({
    PermitTornado,
    Token,
    signer,
    denomination,
    commitments,
    nonce,
    deadline,
}: PermitCommitments & {
    PermitTornado: PermitTornado;
    Token: BaseContract;
    signer?: Signer;
}) {
    const value = BigInt(commitments.length) * denomination;
    const commitmentsHash = solidityPackedKeccak256(['bytes32[]'], [commitments]);

    return await getPermit2Signature({
        Token,
        signer,
        spender: PermitTornado.target as string,
        value,
        nonce,
        deadline,
        witness: {
            witnessTypeName: 'PermitCommitments',
            witnessType: {
                PermitCommitments: [
                    { name: 'instance', type: 'address' },
                    { name: 'commitmentsHash', type: 'bytes32' },
                ],
            },
            witness: {
                instance: PermitTornado.target,
                commitmentsHash,
            },
        },
    });
}
**/
