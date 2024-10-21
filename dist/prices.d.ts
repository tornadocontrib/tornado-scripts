import { type Provider } from 'ethers';
import { OffchainOracle, Multicall } from './typechain';
import { Call3 } from './multicall';
export declare class TokenPriceOracle {
    oracle?: OffchainOracle;
    multicall: Multicall;
    provider: Provider;
    fallbackPrice: bigint;
    constructor(provider: Provider, multicall: Multicall, oracle?: OffchainOracle);
    buildCalls(tokens: {
        tokenAddress: string;
        decimals: number;
    }[]): Call3[];
    buildStable(stablecoinAddress: string): Call3[];
    fetchPrice(tokenAddress: string, decimals: number): Promise<bigint>;
    fetchPrices(tokens: {
        tokenAddress: string;
        decimals: number;
    }[]): Promise<bigint[]>;
    fetchEthUSD(stablecoinAddress: string): Promise<number>;
}
