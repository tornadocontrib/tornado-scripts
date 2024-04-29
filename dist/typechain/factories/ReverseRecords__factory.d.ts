import { type ContractRunner } from "ethers";
import type { ReverseRecords, ReverseRecordsInterface } from "../ReverseRecords";
export declare class ReverseRecords__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "contract ENS";
            readonly name: "_ens";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "addresses";
            readonly type: "address[]";
        }];
        readonly name: "getNames";
        readonly outputs: readonly [{
            readonly internalType: "string[]";
            readonly name: "r";
            readonly type: "string[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): ReverseRecordsInterface;
    static connect(address: string, runner?: ContractRunner | null): ReverseRecords;
}
