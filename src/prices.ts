import { formatEther, parseEther, type Provider } from 'ethers';
import { ERC20__factory, OffchainOracle, Multicall } from './typechain';
import { multicall, Call3 } from './multicall';

export class TokenPriceOracle {
  oracle?: OffchainOracle;
  multicall: Multicall;
  provider: Provider;

  fallbackPrice: bigint;

  constructor(provider: Provider, multicall: Multicall, oracle?: OffchainOracle) {
    this.provider = provider;
    this.multicall = multicall;
    this.oracle = oracle;
    this.fallbackPrice = parseEther('0.0001');
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
      allowFailure: true,
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
        allowFailure: true,
      },
    ];
  }

  async fetchPrice(tokenAddress: string, decimals: number): Promise<bigint> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(this.fallbackPrice));
    }

    try {
      const price = await this.oracle.getRateToEth(tokenAddress, true);

      return (price * BigInt(10 ** decimals)) / BigInt(10 ** 18);
    } catch (err) {
      console.log(`Failed to fetch oracle price for ${tokenAddress}, will use fallback price ${this.fallbackPrice}`);
      console.log(err);
      return this.fallbackPrice;
    }
  }

  async fetchPrices(
    tokens: {
      tokenAddress: string;
      decimals: number;
    }[],
  ): Promise<bigint[]> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(tokens.map(() => this.fallbackPrice)));
    }

    const prices = (await multicall(this.multicall, this.buildCalls(tokens))) as (bigint | null)[];

    return prices.map((price, index) => {
      if (!price) {
        price = this.fallbackPrice;
      }
      return (price * BigInt(10 ** tokens[index].decimals)) / BigInt(10 ** 18);
    });
  }

  async fetchEthUSD(stablecoinAddress: string): Promise<number> {
    // setup mock price for testnets
    if (!this.oracle) {
      return new Promise((resolve) => resolve(10 ** 18 / Number(this.fallbackPrice)));
    }

    const [decimals, price] = await multicall(this.multicall, this.buildStable(stablecoinAddress));

    // eth wei price of usdc token
    const ethPrice = ((price || this.fallbackPrice) * BigInt(10n ** decimals)) / BigInt(10 ** 18);

    return 1 / Number(formatEther(ethPrice));
  }
}
