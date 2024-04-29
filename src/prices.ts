import { parseEther, type Provider } from 'ethers';
import type { OffchainOracle, Multicall } from './typechain';
import { multicall } from './multicall';

export class TokenPriceOracle {
  oracle?: OffchainOracle;
  multicall: Multicall;
  provider: Provider;

  constructor(provider: Provider, multicall: Multicall, oracle?: OffchainOracle) {
    this.provider = provider;
    this.multicall = multicall;
    this.oracle = oracle;
  }

  async fetchPrices(
    tokens: {
      tokenAddress: string;
      decimals: number;
    }[],
  ): Promise<bigint[]> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(tokens.map(() => parseEther('0.0001'))));
    }

    const prices = (await multicall(
      this.multicall,
      tokens.map(({ tokenAddress }) => ({
        contract: this.oracle,
        name: 'getRateToEth',
        params: [tokenAddress, true],
      })),
    )) as bigint[];

    return prices.map((price, index) => {
      return (price * BigInt(10 ** tokens[index].decimals)) / BigInt(10 ** 18);
    });
  }
}
