import { ERC20Permit, ERC20Mock, TORN } from '@tornado/contracts';
import { BaseContract, Signature, TypedDataField } from 'ethers';
export interface PermitValue {
    spender: string;
    value: bigint;
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
export declare function getPermitSignature(Token: ERC20Permit | ERC20Mock | TORN, { spender, value, nonce, deadline }: PermitValue): Promise<Signature>;
export declare function getPermit2Signature(Token: BaseContract, { spender, value: amount, nonce, deadline }: PermitValue, witness?: Witness): Promise<{
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
