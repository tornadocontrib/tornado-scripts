import { BaseContract, Interface } from 'ethers';
import { Multicall } from './typechain';
export interface Call3 {
    contract?: BaseContract;
    address?: string;
    interface?: Interface;
    name: string;
    params?: any[];
    allowFailure?: boolean;
}
export declare function multicall(Multicall: Multicall, calls: Call3[]): Promise<any[]>;
