import type { EventEmitter } from 'stream';
import { JsonRpcApiProvider, JsonRpcProvider, Wallet, FetchGetUrlFunc, Provider, SigningKey, TransactionRequest, JsonRpcSigner, BrowserProvider, Networkish, Eip1193Provider, VoidSigner, FetchCancelSignal, TransactionLike } from 'ethers';
import type { Dispatcher, RequestInit } from 'undici-types';
import type { Config, NetIdType } from './networkConfig';
import type { TornadoNetInfo } from './info';
declare global {
    interface Window {
        ethereum?: Eip1193Provider & EventEmitter;
    }
}
export declare const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";
export type DispatcherFunc = (retry: number) => Dispatcher;
export interface fetchDataOptions extends Omit<RequestInit, 'headers'> {
    /**
     * Overriding RequestInit params
     */
    headers?: HeadersInit | any;
    /**
     * Expanding RequestInit params
     */
    maxRetry?: number;
    retryOn?: number;
    userAgent?: string;
    timeout?: number;
    debug?: Function;
    returnResponse?: boolean;
    cancelSignal?: FetchCancelSignal;
    dispatcherFunc?: DispatcherFunc;
}
export declare function fetchData<T>(url: string, options?: fetchDataOptions): Promise<T>;
export declare const fetchGetUrlFunc: (options?: fetchDataOptions) => FetchGetUrlFunc;
export type getProviderOptions = fetchDataOptions & {
    netId?: NetIdType;
    pollingInterval?: number;
};
export declare const FeeDataNetworkPluginName: string;
export declare function getProvider(rpcUrl: string, fetchOptions?: getProviderOptions): Promise<JsonRpcProvider>;
export declare function getProviderWithNetId(netId: NetIdType, rpcUrl: string, config: Config | TornadoNetInfo, fetchOptions?: getProviderOptions): JsonRpcProvider;
export declare const populateTransaction: (signer: TornadoWallet | TornadoVoidSigner | TornadoRpcSigner, tx: TransactionRequest) => Promise<{
    type?: null | number | undefined;
    to?: string | import("ethers").Addressable | null | undefined;
    from?: string | import("ethers").Addressable | null | undefined;
    nonce?: null | number | undefined;
    gasLimit?: string | number | bigint | null | undefined;
    gasPrice?: string | number | bigint | null | undefined;
    maxPriorityFeePerGas?: string | number | bigint | null | undefined;
    maxFeePerGas?: string | number | bigint | null | undefined;
    data?: null | string | undefined;
    value?: string | number | bigint | null | undefined;
    chainId?: string | number | bigint | null | undefined;
    accessList?: import("ethers").AccessList | [string, string[]][] | Record<string, string[]> | null | undefined;
    customData?: any;
    blockTag?: string | number | bigint | undefined;
    enableCcipRead?: boolean | undefined;
    blobVersionedHashes?: (null | Array<string>) | undefined;
    maxFeePerBlobGas?: string | number | bigint | null | undefined;
    blobs?: (null | Array<import("ethers").BlobLike>) | undefined;
    kzg?: (null | import("ethers").KzgLibrary) | undefined;
}>;
export interface TornadoWalletOptions {
    gasPriceBump?: number;
    gasLimitBump?: number;
    gasFailover?: boolean;
    bumpNonce?: boolean;
    readonlyProvider?: Provider;
}
export declare class TornadoWallet extends Wallet {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(key: string | SigningKey, provider?: Provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }?: TornadoWalletOptions);
    static fromMnemonic(mneomnic: string, provider: Provider, index?: number, options?: TornadoWalletOptions): TornadoWallet;
    populateTransaction(tx: TransactionRequest): Promise<TransactionLike<string>>;
}
export declare class TornadoVoidSigner extends VoidSigner {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(address: string, provider?: Provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }?: TornadoWalletOptions);
    populateTransaction(tx: TransactionRequest): Promise<TransactionLike<string>>;
}
export declare class TornadoRpcSigner extends JsonRpcSigner {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    readonlyProvider?: Provider;
    constructor(provider: JsonRpcApiProvider, address: string, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce, readonlyProvider }?: TornadoWalletOptions);
    sendUncheckedTransaction(tx: TransactionRequest): Promise<string>;
}
export type connectWalletFunc = (...args: any[]) => Promise<void>;
export type handleWalletFunc = (...args: any[]) => void;
export interface TornadoBrowserProviderOptions extends TornadoWalletOptions {
    netId?: NetIdType;
    connectWallet?: connectWalletFunc;
    handleNetworkChanges?: handleWalletFunc;
    handleAccountChanges?: handleWalletFunc;
    handleAccountDisconnect?: handleWalletFunc;
}
export declare class TornadoBrowserProvider extends BrowserProvider {
    options?: TornadoBrowserProviderOptions;
    constructor(ethereum: Eip1193Provider, network?: Networkish, options?: TornadoBrowserProviderOptions);
    getSigner(address: string): Promise<TornadoRpcSigner>;
}
