import type { EventEmitter } from 'stream';
import type { RequestOptions } from 'http';
import crossFetch from 'cross-fetch';
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
} from 'ethers';
import type { RequestInfo, RequestInit, Response, HeadersInit } from 'node-fetch';
// Temporary workaround until @types/node-fetch is compatible with @types/node
import type { AbortSignal as FetchAbortSignal } from 'node-fetch/externals';
import { isNode, sleep } from './utils';
import type { Config, NetIdType } from './networkConfig';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & EventEmitter;
  }
}

// Update this for every Tor Browser release
export const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0';

export const fetch = crossFetch as unknown as nodeFetch;

export type nodeFetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export type fetchDataOptions = RequestInit & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: HeadersInit | any;
  maxRetry?: number;
  retryOn?: number;
  userAgent?: string;
  timeout?: number;
  proxy?: string;
  torPort?: number;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  debug?: Function;
  returnResponse?: boolean;
};

export type NodeAgent = RequestOptions['agent'] | ((parsedUrl: URL) => RequestOptions['agent']);

export function getHttpAgent({
  fetchUrl,
  proxyUrl,
  torPort,
  retry,
}: {
  fetchUrl: string;
  proxyUrl?: string;
  torPort?: number;
  retry: number;
}): NodeAgent | undefined {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { HttpProxyAgent } = require('http-proxy-agent');
  const { HttpsProxyAgent } = require('https-proxy-agent');
  const { SocksProxyAgent } = require('socks-proxy-agent');
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (torPort) {
    return new SocksProxyAgent(`socks5h://tor${retry}@127.0.0.1:${torPort}`);
  }

  if (!proxyUrl) {
    return;
  }

  const isHttps = fetchUrl.includes('https://');

  if (proxyUrl.includes('socks://') || proxyUrl.includes('socks4://') || proxyUrl.includes('socks5://')) {
    return new SocksProxyAgent(proxyUrl);
  }

  if (proxyUrl.includes('http://') || proxyUrl.includes('https://')) {
    if (isHttps) {
      return new HttpsProxyAgent(proxyUrl);
    }
    return new HttpProxyAgent(proxyUrl);
  }
}

export async function fetchData(url: string, options: fetchDataOptions = {}) {
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

  while (retry < MAX_RETRY + 1) {
    let timeout;

    // Define promise timeout when the options.timeout is available
    if (!options.signal && options.timeout) {
      const controller = new AbortController();

      // Temporary workaround until @types/node-fetch is compatible with @types/node
      options.signal = controller.signal as FetchAbortSignal;

      // Define timeout in seconds
      timeout = setTimeout(() => {
        controller.abort();
      }, options.timeout);
    }

    if (!options.agent && isNode && (options.proxy || options.torPort)) {
      options.agent = getHttpAgent({
        fetchUrl: url,
        proxyUrl: options.proxy,
        torPort: options.torPort,
        retry,
      });
    }

    if (options.debug && typeof options.debug === 'function') {
      options.debug('request', {
        url,
        retry,
        errorObject,
        options,
      });
    }

    try {
      const resp = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        redirect: options.redirect,
        signal: options.signal,
        agent: options.agent,
      });

      if (options.debug && typeof options.debug === 'function') {
        options.debug('response', resp);
      }

      if (!resp.ok) {
        const errMsg = `Request to ${url} failed with error code ${resp.status}:\n` + (await resp.text());
        throw new Error(errMsg);
      }

      if (options.returnResponse) {
        return resp;
      }

      const contentType = resp.headers.get('content-type');

      // If server returns JSON object, parse it and return as an object
      if (contentType?.includes('application/json')) {
        return await resp.json();
      }

      // Else if the server returns text parse it as a string
      if (contentType?.includes('text')) {
        return await resp.text();
      }

      // Return as a response object https://developer.mozilla.org/en-US/docs/Web/API/Response
      return resp;
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
    let signal;

    if (_signal) {
      const controller = new AbortController();
      // Temporary workaround until @types/node-fetch is compatible with @types/node
      signal = controller.signal as FetchAbortSignal;
      _signal.addListener(() => {
        controller.abort();
      });
    }

    const init = {
      ...options,
      method: req.method || 'POST',
      headers: req.headers,
      body: req.body || undefined,
      signal,
      returnResponse: true,
    };

    const resp = await fetchData(req.url, init);

    const headers = {} as { [key in string]: any };
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

export async function getProvider(rpcUrl: string, fetchOptions?: getProviderOptions): Promise<JsonRpcProvider> {
  const fetchReq = new FetchRequest(rpcUrl);

  fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);

  const staticNetwork = await new JsonRpcProvider(fetchReq).getNetwork();

  const chainId = Number(staticNetwork.chainId);

  if (fetchOptions?.netId && fetchOptions.netId !== chainId) {
    const errMsg = `Wrong network for ${rpcUrl}, wants ${fetchOptions.netId} got ${chainId}`;
    throw new Error(errMsg);
  }

  return new JsonRpcProvider(fetchReq, staticNetwork, {
    staticNetwork,
    pollingInterval: fetchOptions?.pollingInterval || 1000,
  });
}

export function getProviderWithNetId(
  netId: NetIdType,
  rpcUrl: string,
  config: Config,
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
  const provider = signer.provider as Provider;

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

  return tx;
};

export type TornadoWalletOptions = {
  gasPriceBump?: number;
  gasLimitBump?: number;
  gasFailover?: boolean;
  bumpNonce?: boolean;
};

export class TornadoWallet extends Wallet {
  nonce?: number | null;
  gasPriceBump: number;
  gasLimitBump: number;
  gasFailover: boolean;
  bumpNonce: boolean;
  constructor(
    key: string | SigningKey,
    provider?: null | Provider,
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
    this.nonce = txObject.nonce;

    return super.populateTransaction(txObject);
  }
}

export class TornadoVoidSigner extends VoidSigner {
  nonce?: number | null;
  gasPriceBump: number;
  gasLimitBump: number;
  gasFailover: boolean;
  bumpNonce: boolean;
  constructor(
    address: string,
    provider?: null | Provider,
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
    this.nonce = txObject.nonce;

    return super.populateTransaction(txObject);
  }
}

export class TornadoRpcSigner extends JsonRpcSigner {
  nonce?: number | null;
  gasPriceBump: number;
  gasLimitBump: number;
  gasFailover: boolean;
  bumpNonce: boolean;
  constructor(
    provider: JsonRpcApiProvider,
    address: string,
    { gasPriceBump, gasLimitBump, gasFailover, bumpNonce }: TornadoWalletOptions = {},
  ) {
    super(provider, address);
    // 10% bump from the recommended fee
    this.gasPriceBump = gasPriceBump ?? 0;
    // 30% bump from the recommended gaslimit
    this.gasLimitBump = gasLimitBump ?? 3000;
    this.gasFailover = gasFailover ?? false;
    // turn off bumpNonce feature for browser wallet
    this.bumpNonce = bumpNonce ?? false;
  }

  async sendUncheckedTransaction(tx: TransactionRequest) {
    return super.sendUncheckedTransaction(await populateTransaction(this, tx));
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type connectWalletFunc = (...args: any[]) => Promise<void>;

export type handleWalletFunc = (...args: any[]) => void;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type TornadoBrowserProviderOptions = TornadoWalletOptions & {
  webChainId?: NetIdType;
  connectWallet?: connectWalletFunc;
  handleNetworkChanges?: handleWalletFunc;
  handleAccountChanges?: handleWalletFunc;
  handleAccountDisconnect?: handleWalletFunc;
};

export class TornadoBrowserProvider extends BrowserProvider {
  options?: TornadoBrowserProviderOptions;
  constructor(ethereum: Eip1193Provider, network?: Networkish, options?: TornadoBrowserProviderOptions) {
    super(ethereum, network);
    this.options = options;
  }

  async getSigner(address: string): Promise<TornadoRpcSigner> {
    const signerAddress = (await super.getSigner(address)).address;

    if (
      this.options?.webChainId &&
      this.options?.connectWallet &&
      Number(await super.send('eth_chainId', [])) !== Number(this.options?.webChainId)
    ) {
      await this.options.connectWallet();
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
