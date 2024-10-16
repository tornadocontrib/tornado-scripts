import { formatEther, parseEther, type Provider } from 'ethers';
import { ERC20__factory, OffchainOracle, Multicall } from './typechain';
import { multicall, Call3 } from './multicall';

export class TokenPriceOracle {
  oracle?: OffchainOracle;
  multicall: Multicall;
  provider: Provider;

  constructor(provider: Provider, multicall: Multicall, oracle?: OffchainOracle) {
    this.provider = provider;
    this.multicall = multicall;
    this.oracle = oracle;
  }

  buildCalls(
    tokens: {
      tokenAddress: string;
      decimals: number;
    }[],
  ): Call3[] {
    return tokens.map(({ tokenAddress }) => ({
      contract: this.oracle,
      name: 'getRateToEth',
      params: [tokenAddress, true],
    }));
  }

  buildStable(stablecoinAddress: string): Call3[] {
    const stablecoin = ERC20__factory.connect(stablecoinAddress, this.provider);

    return [
      {
        contract: stablecoin,
        name: 'decimals',
      },
      {
        contract: this.oracle,
        name: 'getRateToEth',
        params: [stablecoin.target, true],
      },
    ];
  }

  async fetchPrice(tokenAddress: string, decimals: number): Promise<bigint> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(parseEther('0.0001')));
    }

    const price = await this.oracle.getRateToEth(tokenAddress, true);

    return (price * BigInt(10 ** decimals)) / BigInt(10 ** 18);
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

    const prices = (await multicall(this.multicall, this.buildCalls(tokens))) as bigint[];

    return prices.map((price, index) => {
      return (price * BigInt(10 ** tokens[index].decimals)) / BigInt(10 ** 18);
    });
  }

  async fetchEthUSD(stablecoinAddress: string): Promise<number> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(10000));
    }

    const [decimals, price] = await multicall(this.multicall, this.buildStable(stablecoinAddress));

    // eth wei price of usdc token
    const ethPrice = (price * BigInt(10n ** decimals)) / BigInt(10 ** 18);

    return 1 / Number(formatEther(ethPrice));
  }
}
