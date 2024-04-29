import { Provider } from 'ethers';
import { Multicall } from './typechain';
export interface tokenBalances {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: bigint;
}
export declare function getTokenBalances({ provider, Multicall, currencyName, userAddress, tokenAddresses, }: {
    provider: Provider;
    Multicall: Multicall;
    currencyName: string;
    userAddress: string;
    tokenAddresses: string[];
}): Promise<tokenBalances[]>;
