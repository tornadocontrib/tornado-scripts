import { Transaction, parseUnits } from 'ethers';
import type { BigNumberish, JsonRpcApiProvider, TransactionLike } from 'ethers';
import { OvmGasPriceOracle } from './typechain';

const DUMMY_ADDRESS = '0x1111111111111111111111111111111111111111';

const DUMMY_NONCE = 1024;

const DUMMY_WITHDRAW_DATA =
  '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111';

/**
 * Example:
 *
 * amountInWei (0.1 ETH) * tokenDecimals (18) * tokenPriceInWei (0.0008) = 125 TOKEN
 */
export function convertETHToTokenAmount(
  amountInWei: BigNumberish,
  tokenPriceInWei: BigNumberish,
  tokenDecimals: number = 18,
): bigint {
  const tokenDecimalsMultiplier = BigInt(10 ** Number(tokenDecimals));
  return (BigInt(amountInWei) * tokenDecimalsMultiplier) / BigInt(tokenPriceInWei);
}

export interface RelayerFeeParams {
  gasPrice: BigNumberish;
  gasLimit?: BigNumberish;
  l1Fee?: BigNumberish;
  denomination: BigNumberish;
  ethRefund: BigNumberish;
  tokenPriceInWei: BigNumberish;
  tokenDecimals: number;
  relayerFeePercent?: number;
  isEth?: boolean;
  premiumPercent?: number;
}

export class TornadoFeeOracle {
  provider: JsonRpcApiProvider;
  ovmGasPriceOracle?: OvmGasPriceOracle;

  constructor(provider: JsonRpcApiProvider, ovmGasPriceOracle?: OvmGasPriceOracle) {
    this.provider = provider;

    if (ovmGasPriceOracle) {
      this.ovmGasPriceOracle = ovmGasPriceOracle;
    }
  }

  /**
   * Calculates Gas Price
   * We apply 50% premium of EIP-1559 network fees instead of 100% from ethers.js
   * (This should cover up to 4 full blocks which is equivalent of minute)
   * (A single block can bump 12.5% of fees, see the methodology https://hackmd.io/@tvanepps/1559-wallets)
   * (Still it is recommended to use 100% premium for sending transactions to prevent stucking it)
   */
  async gasPrice() {
    const [block, getGasPrice, getPriorityFee] = await Promise.all([
      this.provider.getBlock('latest'),
      (async () => {
        try {
          return BigInt(await this.provider.send('eth_gasPrice', []));
        } catch {
          return parseUnits('1', 'gwei');
        }
      })(),
      (async () => {
        try {
          return BigInt(await this.provider.send('eth_maxPriorityFeePerGas', []));
        } catch {
          return BigInt(0);
        }
      })(),
    ]);

    return block?.baseFeePerGas ? (block.baseFeePerGas * BigInt(15)) / BigInt(10) + getPriorityFee : getGasPrice;
  }

  /**
   * Calculate L1 fee for op-stack chains
   *
   * This is required since relayers would pay the full transaction fees for users
   */
  fetchL1OptimismFee(tx?: TransactionLike): Promise<bigint> {
    if (!this.ovmGasPriceOracle) {
      return new Promise((resolve) => resolve(BigInt(0)));
    }

    if (!tx) {
      // this tx is only used to simulate bytes size of the encoded tx so has nothing to with the accuracy
      // inspired by the old style classic-ui calculation
      tx = {
        type: 0,
        gasLimit: 1_000_000,
        nonce: DUMMY_NONCE,
        data: DUMMY_WITHDRAW_DATA,
        gasPrice: parseUnits('1', 'gwei'),
        to: DUMMY_ADDRESS,
      };
    }

    return this.ovmGasPriceOracle.getL1Fee.staticCall(Transaction.from(tx).unsignedSerialized);
  }

  /**
   * We don't need to distinguish default refunds by tokens since most users interact with other defi protocols after withdrawal
   * So we default with 1M gas which is enough for two or three swaps
   * Using 30 gwei for default but it is recommended to supply cached gasPrice value from the UI
   */
  defaultEthRefund(gasPrice?: BigNumberish, gasLimit?: BigNumberish): bigint {
    return (gasPrice ? BigInt(gasPrice) : parseUnits('30', 'gwei')) * BigInt(gasLimit || 1_000_000);
  }

  /**
   * Calculates token amount for required ethRefund purchases required to calculate fees
   */
  calculateTokenAmount(ethRefund: BigNumberish, tokenPriceInEth: BigNumberish, tokenDecimals?: number): bigint {
    return convertETHToTokenAmount(ethRefund, tokenPriceInEth, tokenDecimals);
  }

  /**
   * Warning: For tokens you need to check if the fees are above denomination
   * (Usually happens for small denomination pool or if the gas price is high)
   */
  calculateRelayerFee({
    gasPrice,
    gasLimit = 600_000,
    l1Fee = 0,
    denomination,
    ethRefund = BigInt(0),
    tokenPriceInWei,
    tokenDecimals = 18,
    relayerFeePercent = 0.33,
    isEth = true,
    premiumPercent = 20,
  }: RelayerFeeParams): bigint {
    const gasCosts = BigInt(gasPrice) * BigInt(gasLimit) + BigInt(l1Fee);

    const relayerFee = (BigInt(denomination) * BigInt(Math.floor(10000 * relayerFeePercent))) / BigInt(10000 * 100);

    if (isEth) {
      // Add 20% premium
      return ((gasCosts + relayerFee) * BigInt(premiumPercent ? 100 + premiumPercent : 100)) / BigInt(100);
    }

    const feeInEth = gasCosts + BigInt(ethRefund);

    return (
      ((convertETHToTokenAmount(feeInEth, tokenPriceInWei, tokenDecimals) + relayerFee) *
        BigInt(premiumPercent ? 100 + premiumPercent : 100)) /
      BigInt(100)
    );
  }
}
