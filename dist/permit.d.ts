import { ERC20Permit, ERC20Mock, TORN, PermitTornado } from '@tornado/contracts';
import { BaseContract, Signature, Signer, TypedDataField } from 'ethers';
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
export declare const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
/**
 * From @uniswap/permit2-sdk ported for ethers.js v6
 */
export interface Witness {
    witnessTypeName: string;
    witnessType: {
        [key: string]: TypedDataField[];
    };
    witness: any;
}
export declare function getPermitSignature({ Token, signer, spender, value, nonce, deadline, }: PermitValue & {
    Token: ERC20Permit | ERC20Mock | TORN;
    signer?: Signer;
}): Promise<Signature>;
export declare function getPermitCommitmentsSignature({ PermitTornado, Token, signer, denomination, commitments, nonce, }: PermitCommitments & {
    PermitTornado: PermitTornado;
    Token: ERC20Permit | ERC20Mock | TORN;
    signer?: Signer;
}): Promise<Signature>;
export declare function getPermit2Signature({ Token, signer, spender, value: amount, nonce, deadline, witness, }: PermitValue & {
    Token: BaseContract;
    signer?: Signer;
    witness?: Witness;
}): Promise<{
    domain: {
        name: string;
        chainId: bigint;
        verifyingContract: string;
    };
    types: {
        [key: string]: TypedDataField[];
    };
    values: {
        permitted: {
            token: string;
            amount: bigint;
        };
        spender: string;
        nonce: bigint;
        deadline: bigint;
        witness?: any;
    };
    hash: string;
    signature: Signature;
}>;
export declare function getPermit2CommitmentsSignature({ PermitTornado, Token, signer, denomination, commitments, nonce, deadline, }: PermitCommitments & {
    PermitTornado: PermitTornado;
    Token: BaseContract;
    signer?: Signer;
}): Promise<{
    domain: {
        name: string;
        chainId: bigint;
        verifyingContract: string;
    };
    types: {
        [key: string]: TypedDataField[];
    };
    values: {
        permitted: {
            token: string;
            amount: bigint;
        };
        spender: string;
        nonce: bigint;
        deadline: bigint;
        witness?: any;
    };
    hash: string;
    signature: Signature;
}>;
