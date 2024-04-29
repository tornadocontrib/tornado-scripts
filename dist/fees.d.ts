import type { BigNumberish, TransactionLike } from 'ethers';
import { OvmGasPriceOracle } from './typechain';
/**
 * Example:
 *
 * amountInWei (0.1 ETH) * tokenDecimals (18) * tokenPriceInWei (0.0008) = 125 TOKEN
 */
export declare function convertETHToTokenAmount(amountInWei: BigNumberish, tokenPriceInWei: BigNumberish, tokenDecimals?: number): bigint;
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
export declare class TornadoFeeOracle {
    ovmGasPriceOracle?: OvmGasPriceOracle;
    constructor(ovmGasPriceOracle?: OvmGasPriceOracle);
    /**
     * Calculate L1 fee for op-stack chains
     *
     * This is required since relayers would pay the full transaction fees for users
     */
    fetchL1OptimismFee(tx?: TransactionLike): Promise<bigint>;
    /**
     * We don't need to distinguish default refunds by tokens since most users interact with other defi protocols after withdrawal
     * So we default with 1M gas which is enough for two or three swaps
     * Using 30 gwei for default but it is recommended to supply cached gasPrice value from the UI
     */
    defaultEthRefund(gasPrice?: BigNumberish, gasLimit?: BigNumberish): bigint;
    /**
     * Calculates token amount for required ethRefund purchases required to calculate fees
     */
    calculateTokenAmount(ethRefund: BigNumberish, tokenPriceInEth: BigNumberish, tokenDecimals?: number): bigint;
    /**
     * Warning: For tokens you need to check if the fees are above denomination
     * (Usually happens for small denomination pool or if the gas price is high)
     */
    calculateRelayerFee({ gasPrice, gasLimit, l1Fee, denomination, ethRefund, tokenPriceInWei, tokenDecimals, relayerFeePercent, isEth, premiumPercent, }: RelayerFeeParams): bigint;
}
