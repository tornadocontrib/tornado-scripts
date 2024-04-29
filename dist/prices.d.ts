import { type Provider } from 'ethers';
import type { OffchainOracle, Multicall } from './typechain';
export declare class TokenPriceOracle {
    oracle?: OffchainOracle;
    multicall: Multicall;
    provider: Provider;
    constructor(provider: Provider, multicall: Multicall, oracle?: OffchainOracle);
    fetchPrices(tokens: string[]): Promise<bigint[]>;
}
