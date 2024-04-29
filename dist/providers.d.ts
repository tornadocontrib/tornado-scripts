/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { EventEmitter } from 'stream';
import type { RequestOptions } from 'http';
import { JsonRpcApiProvider, JsonRpcProvider, Wallet, FetchGetUrlFunc, Provider, SigningKey, TransactionRequest, JsonRpcSigner, BrowserProvider, Networkish, Eip1193Provider, VoidSigner, FetchUrlFeeDataNetworkPlugin } from 'ethers';
import type { RequestInfo, RequestInit, Response, HeadersInit } from 'node-fetch';
import type { Config, NetIdType } from './networkConfig';
declare global {
    interface Window {
        ethereum?: Eip1193Provider & EventEmitter;
    }
}
export declare const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0";
export declare const fetch: nodeFetch;
export type nodeFetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;
export type fetchDataOptions = RequestInit & {
    headers?: HeadersInit | any;
    maxRetry?: number;
    retryOn?: number;
    userAgent?: string;
    timeout?: number;
    proxy?: string;
    torPort?: number;
    debug?: Function;
    returnResponse?: boolean;
};
export type NodeAgent = RequestOptions['agent'] | ((parsedUrl: URL) => RequestOptions['agent']);
export declare function getHttpAgent({ fetchUrl, proxyUrl, torPort, retry, }: {
    fetchUrl: string;
    proxyUrl?: string;
    torPort?: number;
    retry: number;
}): NodeAgent | undefined;
export declare function fetchData(url: string, options?: fetchDataOptions): Promise<any>;
export declare const fetchGetUrlFunc: (options?: fetchDataOptions) => FetchGetUrlFunc;
export type getProviderOptions = fetchDataOptions & {
    pollingInterval?: number;
    gasPriceOracle?: string;
    gasStationApi?: string;
};
export declare function getGasOraclePlugin(networkKey: string, fetchOptions?: getProviderOptions): FetchUrlFeeDataNetworkPlugin;
export declare function getProvider(rpcUrl: string, fetchOptions?: getProviderOptions): Promise<JsonRpcProvider>;
export declare function getProviderWithNetId(netId: NetIdType, rpcUrl: string, config: Config, fetchOptions?: getProviderOptions): JsonRpcProvider;
export declare const populateTransaction: (signer: TornadoWallet | TornadoVoidSigner | TornadoRpcSigner, tx: TransactionRequest) => Promise<TransactionRequest>;
export type TornadoWalletOptions = {
    gasPriceBump?: number;
    gasLimitBump?: number;
    gasFailover?: boolean;
    bumpNonce?: boolean;
};
export declare class TornadoWallet extends Wallet {
    nonce?: number | null;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(key: string | SigningKey, provider?: null | Provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }?: TornadoWalletOptions);
    static fromMnemonic(mneomnic: string, provider: Provider, index?: number, options?: TornadoWalletOptions): TornadoWallet;
    populateTransaction(tx: TransactionRequest): Promise<import("ethers").TransactionLike<string>>;
}
export declare class TornadoVoidSigner extends VoidSigner {
    nonce?: number | null;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(address: string, provider?: null | Provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }?: TornadoWalletOptions);
    populateTransaction(tx: TransactionRequest): Promise<import("ethers").TransactionLike<string>>;
}
export declare class TornadoRpcSigner extends JsonRpcSigner {
    nonce?: number | null;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(provider: JsonRpcApiProvider, address: string, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }?: TornadoWalletOptions);
    sendUncheckedTransaction(tx: TransactionRequest): Promise<string>;
}
export type connectWalletFunc = (...args: any[]) => Promise<void>;
export type handleWalletFunc = (...args: any[]) => void;
export type TornadoBrowserProviderOptions = TornadoWalletOptions & {
    webChainId?: NetIdType;
    connectWallet?: connectWalletFunc;
    handleNetworkChanges?: handleWalletFunc;
    handleAccountChanges?: handleWalletFunc;
    handleAccountDisconnect?: handleWalletFunc;
};
export declare class TornadoBrowserProvider extends BrowserProvider {
    options?: TornadoBrowserProviderOptions;
    constructor(ethereum: Eip1193Provider, network?: Networkish, options?: TornadoBrowserProviderOptions);
    getSigner(address: string): Promise<TornadoRpcSigner>;
}
