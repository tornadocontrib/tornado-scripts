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
  parseUnits,
  FetchUrlFeeDataNetworkPlugin,
  FeeData,
  EnsPlugin,
  GasCostPlugin,
} from 'ethers';
import type { RequestInfo, RequestInit, Response, HeadersInit } from 'node-fetch';
import { GasPriceOracle, GasPriceOracle__factory, Multicall, Multicall__factory } from './typechain';
import { isNode, sleep } from './utils';
import type { Config, NetIdType } from './networkConfig';
import { multicall } from './multicall';

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
  // eslint-disable-next-line @typescript-eslint/ban-types
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
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { HttpProxyAgent } = require('http-proxy-agent');
  const { HttpsProxyAgent } = require('https-proxy-agent');
  const { SocksProxyAgent } = require('socks-proxy-agent');
  /* eslint-enable @typescript-eslint/no-var-requires */

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

      options.signal = controller.signal;

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
      signal = controller.signal;
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

// caching to improve performance
const oracleMapper = new Map();
const multicallMapper = new Map();

export type getProviderOptions = fetchDataOptions & {
  pollingInterval?: number;
  gasPriceOracle?: string;
  gasStationApi?: string;
};

export function getGasOraclePlugin(networkKey: string, fetchOptions?: getProviderOptions) {
  const gasStationApi = fetchOptions?.gasStationApi || 'https://gasstation.polygon.technology/v2';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return new FetchUrlFeeDataNetworkPlugin(gasStationApi, async (fetchFeeData, provider, request) => {
    if (!oracleMapper.has(networkKey)) {
      oracleMapper.set(networkKey, GasPriceOracle__factory.connect(fetchOptions?.gasPriceOracle as string, provider));
    }
    if (!multicallMapper.has(networkKey)) {
      multicallMapper.set(
        networkKey,
        Multicall__factory.connect('0xcA11bde05977b3631167028862bE2a173976CA11', provider),
      );
    }
    const Oracle = oracleMapper.get(networkKey) as GasPriceOracle;
    const Multicall = multicallMapper.get(networkKey) as Multicall;

    const [timestamp, heartbeat, feePerGas, priorityFeePerGas] = await multicall(Multicall, [
      {
        contract: Oracle,
        name: 'timestamp',
      },
      {
        contract: Oracle,
        name: 'heartbeat',
      },
      {
        contract: Oracle,
        name: 'maxFeePerGas',
      },
      {
        contract: Oracle,
        name: 'maxPriorityFeePerGas',
      },
    ]);

    const isOutdated = Number(timestamp) <= Date.now() / 1000 - Number(heartbeat);

    if (!isOutdated) {
      const maxPriorityFeePerGas = (priorityFeePerGas * BigInt(13)) / BigInt(10);
      const maxFeePerGas = feePerGas * BigInt(2) + maxPriorityFeePerGas;

      return {
        gasPrice: maxFeePerGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    }

    const fetchReq = new FetchRequest(gasStationApi);
    fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
    if (isNode) {
      // Prevent Cloudflare from blocking our request in node.js
      fetchReq.setHeader('User-Agent', 'ethers');
    }

    const [
      {
        bodyJson: { fast },
      },
      { gasPrice },
    ] = await Promise.all([fetchReq.send(), fetchFeeData()]);

    return {
      gasPrice,
      maxFeePerGas: parseUnits(`${fast.maxFee}`, 9),
      maxPriorityFeePerGas: parseUnits(`${fast.maxPriorityFee}`, 9),
    };
  });
}

export async function getProvider(rpcUrl: string, fetchOptions?: getProviderOptions): Promise<JsonRpcProvider> {
  const fetchReq = new FetchRequest(rpcUrl);
  fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
  // omit network plugins and mimic registerEth function (required for polygon)
  const _staticNetwork = await new JsonRpcProvider(fetchReq).getNetwork();
  const ensPlugin = _staticNetwork.getPlugin('org.ethers.plugins.network.Ens');
  const gasCostPlugin = _staticNetwork.getPlugin('org.ethers.plugins.network.GasCost');
  const gasStationPlugin = <FetchUrlFeeDataNetworkPlugin>(
    _staticNetwork.getPlugin('org.ethers.plugins.network.FetchUrlFeeDataPlugin')
  );
  const staticNetwork = new Network(_staticNetwork.name, _staticNetwork.chainId);
  if (ensPlugin) {
    staticNetwork.attachPlugin(ensPlugin);
  }
  if (gasCostPlugin) {
    staticNetwork.attachPlugin(gasCostPlugin);
  }
  if (fetchOptions?.gasPriceOracle) {
    staticNetwork.attachPlugin(getGasOraclePlugin(`${_staticNetwork.chainId}_${rpcUrl}`, fetchOptions));
  } else if (gasStationPlugin) {
    staticNetwork.attachPlugin(gasStationPlugin);
  }
  const provider = new JsonRpcProvider(fetchReq, staticNetwork, {
    staticNetwork,
  });
  provider.pollingInterval = fetchOptions?.pollingInterval || 1000;
  return provider;
}

export function getProviderWithNetId(
  netId: NetIdType,
  rpcUrl: string,
  config: Config,
  fetchOptions?: getProviderOptions,
): JsonRpcProvider {
  const { networkName, reverseRecordsContract, gasPriceOracleContract, gasStationApi, pollInterval } = config;
  const hasEns = Boolean(reverseRecordsContract);

  const fetchReq = new FetchRequest(rpcUrl);
  fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
  const staticNetwork = new Network(networkName, netId);
  if (hasEns) {
    staticNetwork.attachPlugin(new EnsPlugin(null, Number(netId)));
  }

  staticNetwork.attachPlugin(new GasCostPlugin());

  if (gasPriceOracleContract) {
    staticNetwork.attachPlugin(
      getGasOraclePlugin(`${netId}_${rpcUrl}`, {
        gasPriceOracle: gasPriceOracleContract,
        gasStationApi,
      }),
    );
  }

  const provider = new JsonRpcProvider(fetchReq, staticNetwork, {
    staticNetwork,
  });

  provider.pollingInterval = fetchOptions?.pollingInterval || pollInterval * 1000;

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
    (async () => {
      if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        return new FeeData(null, BigInt(tx.maxFeePerGas), BigInt(tx.maxPriorityFeePerGas));
      }

      if (tx.gasPrice) {
        return new FeeData(BigInt(tx.gasPrice), null, null);
      }

      const fetchedFeeData = await provider.getFeeData();

      if (fetchedFeeData.maxFeePerGas && fetchedFeeData.maxPriorityFeePerGas) {
        return new FeeData(
          null,
          (fetchedFeeData.maxFeePerGas * (BigInt(10000) + BigInt(signer.gasPriceBump))) / BigInt(10000),
          fetchedFeeData.maxPriorityFeePerGas,
        );
      } else {
        return new FeeData(
          ((fetchedFeeData.gasPrice as bigint) * (BigInt(10000) + BigInt(signer.gasPriceBump))) / BigInt(10000),
          null,
          null,
        );
      }
    })(),
    (async () => {
      if (tx.nonce) {
        return tx.nonce;
      }

      let fetchedNonce = await provider.getTransactionCount(signer.address, 'pending');

      // Deal with cached nonce results
      if (signer.bumpNonce && signer.nonce && signer.nonce >= fetchedNonce) {
        console.log(
          `populateTransaction: bumping nonce from ${fetchedNonce} to ${fetchedNonce + 1} for ${signer.address}`,
        );
        fetchedNonce++;
      }

      return fetchedNonce;
    })(),
  ]);

  tx.nonce = nonce;

  // EIP-1559
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    tx.maxFeePerGas = feeData.maxFeePerGas;
    tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    if (!tx.type) {
      tx.type = 2;
    }
    delete tx.gasPrice;
  } else if (feeData.gasPrice) {
    tx.gasPrice = feeData.gasPrice;
    if (!tx.type) {
      tx.type = 0;
    }
    delete tx.maxFeePerGas;
    delete tx.maxPriorityFeePerGas;
  }

  // gasLimit
  tx.gasLimit =
    tx.gasLimit ||
    (await (async () => {
      try {
        const gasLimit = await provider.estimateGas(tx);
        return gasLimit === BigInt(21000)
          ? gasLimit
          : (gasLimit * (BigInt(10000) + BigInt(signer.gasLimitBump))) / BigInt(10000);
      } catch (err) {
        if (signer.gasFailover) {
          console.log('populateTransaction: warning gas estimation failed falling back to 3M gas');
          // Gas failover
          return BigInt('3000000');
        }
        throw err;
      }
    })());

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
    this.gasPriceBump = gasPriceBump ?? 1000;
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
    this.gasPriceBump = gasPriceBump ?? 1000;
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
    this.gasPriceBump = gasPriceBump ?? 1000;
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
