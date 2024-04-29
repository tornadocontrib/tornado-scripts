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

  fetchPrices(tokens: string[]): Promise<bigint[]> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(tokens.map(() => parseEther('0.0001'))));
    }

    return multicall(
      this.multicall,
      tokens.map((token) => ({
        contract: this.oracle,
        name: 'getRateToEth',
        params: [token, true],
      })),
    );
  }
}
