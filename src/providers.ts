import type { EventEmitter } from 'stream';
import {
    FetchRequest,
    JsonRpcApiProvider,
    JsonRpcProvider,
    Wallet,
    HDNodeWallet,
    FetchGetUrlFunc,
    Provider,
    SigningKey,
    TransactionRequest,
    JsonRpcSigner,
    BrowserProvider,
    Networkish,
    Eip1193Provider,
    VoidSigner,
    Network,
    EnsPlugin,
    GasCostPlugin,
    FetchCancelSignal,
    resolveProperties,
    TransactionLike,
    FetchUrlFeeDataNetworkPlugin,
    FeeData,
} from 'ethers';
import type { Dispatcher, RequestInit, fetch as undiciFetch } from 'undici-types';

import { isNode, sleep } from './utils';
import type { Config, NetIdType } from './networkConfig';
import type { TornadoNetInfo } from './info';

declare global {
    interface Window {
        ethereum?: Eip1193Provider & EventEmitter;
    }
}

// Update this for every Tor Browser release
export const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

export type DispatcherFunc = (retry: number) => Dispatcher;

export interface fetchDataOptions extends Omit<RequestInit, 'headers'> {
    /**
     * Overriding RequestInit params
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers?: HeadersInit | any;

    /**
     * Expanding RequestInit params
     */
    maxRetry?: number;
    retryOn?: number;
    userAgent?: string;
    timeout?: number;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    debug?: Function;
    returnResponse?: boolean;
    cancelSignal?: FetchCancelSignal;
    dispatcherFunc?: DispatcherFunc;
}

export async function fetchData<T>(url: string, options: fetchDataOptions = {}): Promise<T> {
    const MAX_RETRY = options.maxRetry ?? 3;
    const RETRY_ON = options.retryOn ?? 500;
    const userAgent = options.userAgent ?? defaultUserAgent;

    let retry = 0;
    let errorObject;

    if (!options.method) {
        if (!options.body) {
            options.method = 'GET';
        } else {
            options.method = 'POST';
        }
    }

    if (!options.headers) {
        options.headers = {};
    }

    if (isNode && !options.headers['User-Agent']) {
        options.headers['User-Agent'] = userAgent;
    }

    if (typeof globalThis.fetch !== 'function') {
        throw new Error('Fetch API is not available, use latest browser or nodejs installation!');
    }

    while (retry < MAX_RETRY + 1) {
        let timeout;

        if (!options.signal && options.timeout) {
            const controller = new AbortController();

            options.signal = controller.signal;

            // Define timeout in seconds
            timeout = setTimeout(() => {
                controller.abort();
            }, options.timeout);

            // Support Ethers.js style FetchCancelSignal class
            if (options.cancelSignal) {
                // assert(_signal == null || !_signal.cancelled, "request cancelled before sending", "CANCELLED");
                if (options.cancelSignal.cancelled) {
                    throw new Error('request cancelled before sending');
                }

                options.cancelSignal.addListener(() => {
                    controller.abort();
                });
            }
        }

        if (typeof options.debug === 'function') {
            options.debug('request', {
                url,
                retry,
                errorObject,
                options,
            });
        }

        try {
            const dispatcher = options.dispatcherFunc ? options.dispatcherFunc(retry) : options.dispatcher;

            const resp = await (globalThis.fetch as unknown as typeof undiciFetch)(url, {
                ...options,
                dispatcher,
            });

            if (options.debug && typeof options.debug === 'function') {
                options.debug('response', resp);
            }

            if (!resp.ok) {
                const errMsg = `Request to ${url} failed with error code ${resp.status}:\n` + (await resp.text());
                throw new Error(errMsg);
            }

            if (options.returnResponse) {
                return resp as T;
            }

            const contentType = resp.headers.get('content-type');

            // If server returns JSON object, parse it and return as an object
            if (contentType?.includes('application/json')) {
                return (await resp.json()) as T;
            }

            // Else if the server returns text parse it as a string
            if (contentType?.includes('text')) {
                return (await resp.text()) as T;
            }

            // Return as a response object https://developer.mozilla.org/en-US/docs/Web/API/Response
            return resp as T;
        } catch (error) {
            if (timeout) {
                clearTimeout(timeout);
            }

            errorObject = error;

            retry++;

            await sleep(RETRY_ON);
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }

    if (options.debug && typeof options.debug === 'function') {
        options.debug('error', errorObject);
    }

    throw errorObject;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const fetchGetUrlFunc =
    (options: fetchDataOptions = {}): FetchGetUrlFunc =>
    async (req, _signal) => {
        const init = {
            ...options,
            method: req.method || 'POST',
            headers: req.headers,
            body: req.body || undefined,
            timeout: options.timeout || req.timeout,
            cancelSignal: _signal,
            returnResponse: true,
        };

        const resp = await fetchData<Response>(req.url, init);

        const headers = {} as Record<string, any>;
        resp.headers.forEach((value: any, key: string) => {
            headers[key.toLowerCase()] = value;
        });

        const respBody = await resp.arrayBuffer();
        const body = respBody == null ? null : new Uint8Array(respBody);

        return {
            statusCode: resp.status,
            statusMessage: resp.statusText,
            headers,
            body,
        };
    };
/* eslint-enable @typescript-eslint/no-explicit-any */

export type getProviderOptions = fetchDataOptions & {
    // NetId to check against rpc
    netId?: NetIdType;
    pollingInterval?: number;
};

export const FeeDataNetworkPluginName = new FetchUrlFeeDataNetworkPlugin(
    '',
    () => new Promise((resolve) => resolve(new FeeData())),
).name;

export async function getProvider(rpcUrl: string, fetchOptions?: getProviderOptions): Promise<JsonRpcProvider> {
    // Use our own fetchGetUrlFunc to support proxies and retries
    const fetchReq = new FetchRequest(rpcUrl);

    fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);

    const fetchedNetwork = await new JsonRpcProvider(fetchReq).getNetwork();

    // Audit if we are connected to right network
    const chainId = Number(fetchedNetwork.chainId);

    if (fetchOptions?.netId && fetchOptions.netId !== chainId) {
        const errMsg = `Wrong network for ${rpcUrl}, wants ${fetchOptions.netId} got ${chainId}`;
        throw new Error(errMsg);
    }

    // Clone to new network to exclude polygon gas station plugin
    const staticNetwork = new Network(fetchedNetwork.name, fetchedNetwork.chainId);

    fetchedNetwork.plugins.forEach((plugin) => {
        if (plugin.name !== FeeDataNetworkPluginName) {
            staticNetwork.attachPlugin(plugin.clone());
        }
    });

    return new JsonRpcProvider(fetchReq, staticNetwork, {
        staticNetwork,
        pollingInterval: fetchOptions?.pollingInterval || 1000,
    });
}

export function getProviderWithNetId(
    netId: NetIdType,
    rpcUrl: string,
    config: Config | TornadoNetInfo,
    fetchOptions?: getProviderOptions,
): JsonRpcProvider {
    const { networkName, reverseRecordsContract, pollInterval } = config;
    const hasEns = Boolean(reverseRecordsContract);

    const fetchReq = new FetchRequest(rpcUrl);
    fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
    const staticNetwork = new Network(networkName, netId);
    if (hasEns) {
        staticNetwork.attachPlugin(new EnsPlugin(null, Number(netId)));
    }
    staticNetwork.attachPlugin(new GasCostPlugin());

    const provider = new JsonRpcProvider(fetchReq, staticNetwork, {
        staticNetwork,
        pollingInterval: fetchOptions?.pollingInterval || pollInterval * 1000,
    });

    return provider;
}

export const populateTransaction = async (
    signer: TornadoWallet | TornadoVoidSigner | TornadoRpcSigner,
    tx: TransactionRequest,
) => {
    const provider = ((signer as TornadoRpcSigner).readonlyProvider || signer.provider) as Provider;

    if (!tx.from) {
        tx.from = signer.address;
    } else if (tx.from !== signer.address) {
        const errMsg = `populateTransaction: signer mismatch for tx, wants ${tx.from} have ${signer.address}`;
        throw new Error(errMsg);
    }

    const [feeData, nonce] = await Promise.all([
        tx.maxFeePerGas || tx.gasPrice ? undefined : provider.getFeeData(),
        tx.nonce ? undefined : provider.getTransactionCount(signer.address, 'pending'),
    ]);

    if (feeData) {
        // EIP-1559
        if (feeData.maxFeePerGas) {
            if (!tx.type) {
                tx.type = 2;
            }

            tx.maxFeePerGas = (feeData.maxFeePerGas * (BigInt(10000) + BigInt(signer.gasPriceBump))) / BigInt(10000);
            tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
            delete tx.gasPrice;
        } else if (feeData.gasPrice) {
            if (!tx.type) {
                tx.type = 0;
            }
            tx.gasPrice = feeData.gasPrice;
            delete tx.maxFeePerGas;
            delete tx.maxPriorityFeePerGas;
        }
    }

    if (nonce) {
        tx.nonce = nonce;
    }

    if (!tx.gasLimit) {
        try {
            const gasLimit = await provider.estimateGas(tx);

            tx.gasLimit =
                gasLimit === BigInt(21000)
                    ? gasLimit
                    : (gasLimit * (BigInt(10000) + BigInt(signer.gasLimitBump))) / BigInt(10000);
        } catch (error) {
            if (signer.gasFailover) {
                console.log('populateTransaction: warning gas estimation failed falling back to 3M gas');
                // Gas failover
                tx.gasLimit = BigInt('3000000');
            } else {
                throw error;
            }
        }
    }

    return resolveProperties(tx);
};

export interface TornadoWalletOptions {
    gasPriceBump?: number;
    gasLimitBump?: number;
    gasFailover?: boolean;
    bumpNonce?: boolean;
    readonlyProvider?: Provider;
}

export class TornadoWallet extends Wallet {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(
        key: string | SigningKey,
        provider?: Provider,
        { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }: TornadoWalletOptions = {},
    ) {
        super(key, provider);
        // 10% bump from the recommended fee
        this.gasPriceBump = gasPriceBump ?? 0;
        // 30% bump from the recommended gaslimit
        this.gasLimitBump = gasLimitBump ?? 3000;
        this.gasFailover = gasFailover ?? false;
        // Disable bump nonce feature unless being used by the server environment
        this.bumpNonce = bumpNonce ?? false;
    }

    static fromMnemonic(mneomnic: string, provider: Provider, index = 0, options?: TornadoWalletOptions) {
        const defaultPath = `m/44'/60'/0'/0/${index}`;
        const { privateKey } = HDNodeWallet.fromPhrase(mneomnic, undefined, defaultPath);
        return new TornadoWallet(privateKey as unknown as SigningKey, provider, options);
    }

    async populateTransaction(tx: TransactionRequest) {
        const txObject = await populateTransaction(this, tx);
        this.nonce = Number(txObject.nonce);
        return txObject as Promise<TransactionLike<string>>;
    }
}

export class TornadoVoidSigner extends VoidSigner {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    constructor(
        address: string,
        provider?: Provider,
        { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }: TornadoWalletOptions = {},
    ) {
        super(address, provider);
        // 10% bump from the recommended fee
        this.gasPriceBump = gasPriceBump ?? 0;
        // 30% bump from the recommended gaslimit
        this.gasLimitBump = gasLimitBump ?? 3000;
        this.gasFailover = gasFailover ?? false;
        // turn off bumpNonce feature for view only wallet
        this.bumpNonce = bumpNonce ?? false;
    }

    async populateTransaction(tx: TransactionRequest) {
        const txObject = await populateTransaction(this, tx);
        this.nonce = Number(txObject.nonce);
        return txObject as Promise<TransactionLike<string>>;
    }
}

export class TornadoRpcSigner extends JsonRpcSigner {
    nonce?: number;
    gasPriceBump: number;
    gasLimitBump: number;
    gasFailover: boolean;
    bumpNonce: boolean;
    readonlyProvider?: Provider;
    constructor(
        provider: JsonRpcApiProvider,
        address: string,
        { gasPriceBump, gasLimitBump, gasFailover, bumpNonce, readonlyProvider }: TornadoWalletOptions = {},
    ) {
        super(provider, address);
        // 10% bump from the recommended fee
        this.gasPriceBump = gasPriceBump ?? 0;
        // 30% bump from the recommended gaslimit
        this.gasLimitBump = gasLimitBump ?? 3000;
        this.gasFailover = gasFailover ?? false;
        // turn off bumpNonce feature for browser wallet
        this.bumpNonce = bumpNonce ?? false;
        this.readonlyProvider = readonlyProvider;
    }

    async sendUncheckedTransaction(tx: TransactionRequest) {
        return super.sendUncheckedTransaction(await populateTransaction(this, tx));
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type connectWalletFunc = (...args: any[]) => Promise<void>;

export type handleWalletFunc = (...args: any[]) => void;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface TornadoBrowserProviderOptions extends TornadoWalletOptions {
    netId?: NetIdType;
    connectWallet?: connectWalletFunc;
    handleNetworkChanges?: handleWalletFunc;
    handleAccountChanges?: handleWalletFunc;
    handleAccountDisconnect?: handleWalletFunc;
}

export class TornadoBrowserProvider extends BrowserProvider {
    options?: TornadoBrowserProviderOptions;
    constructor(ethereum: Eip1193Provider, network?: Networkish, options?: TornadoBrowserProviderOptions) {
        super(ethereum, network);
        this.options = options;
    }

    async getSigner(address: string): Promise<TornadoRpcSigner> {
        const signerAddress = (await super.getSigner(address)).address;

        if (
            this.options?.netId &&
            this.options?.connectWallet &&
            Number(await super.send('net_version', [])) !== this.options?.netId
        ) {
            await this.options.connectWallet(this.options?.netId);
        }

        if (this.options?.handleNetworkChanges) {
            window?.ethereum?.on('chainChanged', this.options.handleNetworkChanges);
        }

        if (this.options?.handleAccountChanges) {
            window?.ethereum?.on('accountsChanged', this.options.handleAccountChanges);
        }

        if (this.options?.handleAccountDisconnect) {
            window?.ethereum?.on('disconnect', this.options.handleAccountDisconnect);
        }

        return new TornadoRpcSigner(this, signerAddress, this.options);
    }
}
