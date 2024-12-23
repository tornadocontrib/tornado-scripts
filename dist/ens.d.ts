import { EnsResolver, AbstractProvider, Signer } from 'ethers';
import { ENSNameWrapper, ENSRegistry, ENSResolver } from './typechain';
import { NetIdType } from './networkConfig';
export declare function encodedLabelToLabelhash(label: string): string | null;
export declare function labelhash(label: string): string;
export declare function makeLabelNodeAndParent(name: string): {
    label: string;
    labelhash: string;
    parentNode: string;
};
export declare const EnsContracts: Record<NetIdType, {
    ensRegistry: string;
    ensPublicResolver: string;
    ensNameWrapper: string;
}>;
/**
 * ENSUtils to manage on-chain registered relayers
 */
export declare class ENSUtils {
    ENSRegistry?: ENSRegistry;
    ENSResolver?: ENSResolver;
    ENSNameWrapper?: ENSNameWrapper;
    provider: AbstractProvider;
    constructor(provider: AbstractProvider);
    getContracts(): Promise<void>;
    getOwner(name: string): Promise<string>;
    unwrap(signer: Signer, name: string): Promise<import("ethers").ContractTransactionResponse>;
    setSubnodeRecord(signer: Signer, name: string): Promise<import("ethers").ContractTransactionResponse>;
    getResolver(name: string): Promise<EnsResolver | null>;
    getText(name: string, key: string): Promise<string | null>;
    setText(signer: Signer, name: string, key: string, value: string): Promise<import("ethers").ContractTransactionResponse>;
}
