'use strict';

var ethers = require('ethers');
var crossFetch = require('cross-fetch');
var crypto$1 = require('crypto');
var BN = require('bn.js');
var Ajv = require('ajv');
var fflate = require('fflate');
var circomlibjs = require('circomlibjs');
var ethSigUtil = require('@metamask/eth-sig-util');
var idb = require('idb');
var worker_threads = require('worker_threads');
var fixedMerkleTree = require('@tornado/fixed-merkle-tree');
var websnarkUtils = require('@tornado/websnark/src/utils');
var websnarkGroth = require('@tornado/websnark/src/groth16');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var websnarkUtils__namespace = /*#__PURE__*/_interopNamespaceDefault(websnarkUtils);

BigInt.prototype.toJSON = function() {
  return this.toString();
};
const isNode = !process.browser && typeof globalThis.window === "undefined";
const crypto = isNode ? crypto$1.webcrypto : globalThis.crypto;
const chunk = (arr, size) => [...Array(Math.ceil(arr.length / size))].map((_, i) => arr.slice(size * i, size + size * i));
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function validateUrl(url, protocols) {
  try {
    const parsedUrl = new URL(url);
    if (protocols && protocols.length) {
      return protocols.map((p) => p.toLowerCase()).includes(parsedUrl.protocol);
    }
    return true;
  } catch {
    return false;
  }
}
function concatBytes(...arrays) {
  const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
  const merged = new Uint8Array(totalSize);
  arrays.forEach((array, i, arrays2) => {
    const offset = arrays2.slice(0, i).reduce((acc, e) => acc + e.length, 0);
    merged.set(array, offset);
  });
  return merged;
}
function bufferToBytes(b) {
  return new Uint8Array(b.buffer);
}
function bytesToBase64(bytes) {
  return btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ""));
}
function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
function bytesToHex(bytes) {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hexString) {
  if (hexString.slice(0, 2) === "0x") {
    hexString = hexString.slice(2);
  }
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }
  return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}
function bytesToBN(bytes) {
  return BigInt(bytesToHex(bytes));
}
function bnToBytes(bigint) {
  let hexString = typeof bigint === "bigint" ? bigint.toString(16) : bigint;
  if (hexString.slice(0, 2) === "0x") {
    hexString = hexString.slice(2);
  }
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }
  return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}
function leBuff2Int(bytes) {
  return new BN(bytes, 16, "le");
}
function leInt2Buff(bigint) {
  return Uint8Array.from(new BN(bigint).toArray("le", 31));
}
function toFixedHex(numberish, length = 32) {
  return "0x" + BigInt(numberish).toString(16).padStart(length * 2, "0");
}
function toFixedLength(string, length = 32) {
  string = string.replace("0x", "");
  return "0x" + string.padStart(length * 2, "0");
}
function rBigInt(nbytes = 31) {
  return bytesToBN(crypto.getRandomValues(new Uint8Array(nbytes)));
}
function rHex(nbytes = 32) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(nbytes)));
}
function bigIntReplacer(key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}
function substring(str, length = 10) {
  if (str.length < length * 2) {
    return str;
  }
  return `${str.substring(0, length)}...${str.substring(str.length - length)}`;
}
async function digest(bytes, algo = "SHA-384") {
  return new Uint8Array(await crypto.subtle.digest(algo, bytes));
}
function numberFormatter(num, digits = 3) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
  const item = lookup.slice().reverse().find((item2) => Number(num) >= item2.value);
  return item ? (Number(num) / item.value).toFixed(digits).replace(regexp, "").concat(item.symbol) : "0";
}
function isHex(value) {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0";
const fetch = crossFetch;
function getHttpAgent({
  fetchUrl,
  proxyUrl,
  torPort,
  retry
}) {
  const { HttpProxyAgent } = require("http-proxy-agent");
  const { HttpsProxyAgent } = require("https-proxy-agent");
  const { SocksProxyAgent } = require("socks-proxy-agent");
  if (torPort) {
    return new SocksProxyAgent(`socks5h://tor${retry}@127.0.0.1:${torPort}`);
  }
  if (!proxyUrl) {
    return;
  }
  const isHttps = fetchUrl.includes("https://");
  if (proxyUrl.includes("socks://") || proxyUrl.includes("socks4://") || proxyUrl.includes("socks5://")) {
    return new SocksProxyAgent(proxyUrl);
  }
  if (proxyUrl.includes("http://") || proxyUrl.includes("https://")) {
    if (isHttps) {
      return new HttpsProxyAgent(proxyUrl);
    }
    return new HttpProxyAgent(proxyUrl);
  }
}
async function fetchData(url, options = {}) {
  const MAX_RETRY = options.maxRetry ?? 3;
  const RETRY_ON = options.retryOn ?? 500;
  const userAgent = options.userAgent ?? defaultUserAgent;
  let retry = 0;
  let errorObject;
  if (!options.method) {
    if (!options.body) {
      options.method = "GET";
    } else {
      options.method = "POST";
    }
  }
  if (!options.headers) {
    options.headers = {};
  }
  if (isNode && !options.headers["User-Agent"]) {
    options.headers["User-Agent"] = userAgent;
  }
  while (retry < MAX_RETRY + 1) {
    let timeout;
    if (!options.signal && options.timeout) {
      const controller = new AbortController();
      options.signal = controller.signal;
      timeout = setTimeout(() => {
        controller.abort();
      }, options.timeout);
    }
    if (!options.agent && isNode && (options.proxy || options.torPort)) {
      options.agent = getHttpAgent({
        fetchUrl: url,
        proxyUrl: options.proxy,
        torPort: options.torPort,
        retry
      });
    }
    if (options.debug && typeof options.debug === "function") {
      options.debug("request", {
        url,
        retry,
        errorObject,
        options
      });
    }
    try {
      const resp = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        redirect: options.redirect,
        signal: options.signal,
        agent: options.agent
      });
      if (options.debug && typeof options.debug === "function") {
        options.debug("response", resp);
      }
      if (!resp.ok) {
        const errMsg = `Request to ${url} failed with error code ${resp.status}:
` + await resp.text();
        throw new Error(errMsg);
      }
      if (options.returnResponse) {
        return resp;
      }
      const contentType = resp.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await resp.json();
      }
      if (contentType?.includes("text")) {
        return await resp.text();
      }
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
  if (options.debug && typeof options.debug === "function") {
    options.debug("error", errorObject);
  }
  throw errorObject;
}
const fetchGetUrlFunc = (options = {}) => async (req, _signal) => {
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
    method: req.method || "POST",
    headers: req.headers,
    body: req.body || void 0,
    signal,
    returnResponse: true
  };
  const resp = await fetchData(req.url, init);
  const headers = {};
  resp.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const respBody = await resp.arrayBuffer();
  const body = respBody == null ? null : new Uint8Array(respBody);
  return {
    statusCode: resp.status,
    statusMessage: resp.statusText,
    headers,
    body
  };
};
async function getProvider(rpcUrl, fetchOptions) {
  const fetchReq = new ethers.FetchRequest(rpcUrl);
  fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
  const staticNetwork = await new ethers.JsonRpcProvider(fetchReq).getNetwork();
  const chainId = Number(staticNetwork.chainId);
  if (fetchOptions?.netId && fetchOptions.netId !== chainId) {
    const errMsg = `Wrong network for ${rpcUrl}, wants ${fetchOptions.netId} got ${chainId}`;
    throw new Error(errMsg);
  }
  return new ethers.JsonRpcProvider(fetchReq, staticNetwork, {
    staticNetwork,
    pollingInterval: fetchOptions?.pollingInterval || 1e3
  });
}
function getProviderWithNetId(netId, rpcUrl, config, fetchOptions) {
  const { networkName, reverseRecordsContract, pollInterval } = config;
  const hasEns = Boolean(reverseRecordsContract);
  const fetchReq = new ethers.FetchRequest(rpcUrl);
  fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
  const staticNetwork = new ethers.Network(networkName, netId);
  if (hasEns) {
    staticNetwork.attachPlugin(new ethers.EnsPlugin(null, Number(netId)));
  }
  staticNetwork.attachPlugin(new ethers.GasCostPlugin());
  const provider = new ethers.JsonRpcProvider(fetchReq, staticNetwork, {
    staticNetwork,
    pollingInterval: fetchOptions?.pollingInterval || pollInterval * 1e3
  });
  return provider;
}
const populateTransaction = async (signer, tx) => {
  const provider = signer.provider;
  if (!tx.from) {
    tx.from = signer.address;
  } else if (tx.from !== signer.address) {
    const errMsg = `populateTransaction: signer mismatch for tx, wants ${tx.from} have ${signer.address}`;
    throw new Error(errMsg);
  }
  const [feeData, nonce] = await Promise.all([
    tx.maxFeePerGas || tx.gasPrice ? void 0 : provider.getFeeData(),
    tx.nonce ? void 0 : provider.getTransactionCount(signer.address, "pending")
  ]);
  if (feeData) {
    if (feeData.maxFeePerGas) {
      if (!tx.type) {
        tx.type = 2;
      }
      tx.maxFeePerGas = feeData.maxFeePerGas * (BigInt(1e4) + BigInt(signer.gasPriceBump)) / BigInt(1e4);
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
      tx.gasLimit = gasLimit === BigInt(21e3) ? gasLimit : gasLimit * (BigInt(1e4) + BigInt(signer.gasLimitBump)) / BigInt(1e4);
    } catch (error) {
      if (signer.gasFailover) {
        console.log("populateTransaction: warning gas estimation failed falling back to 3M gas");
        tx.gasLimit = BigInt("3000000");
      } else {
        throw error;
      }
    }
  }
  return tx;
};
class TornadoWallet extends ethers.Wallet {
  nonce;
  gasPriceBump;
  gasLimitBump;
  gasFailover;
  bumpNonce;
  constructor(key, provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(key, provider);
    this.gasPriceBump = gasPriceBump ?? 0;
    this.gasLimitBump = gasLimitBump ?? 3e3;
    this.gasFailover = gasFailover ?? false;
    this.bumpNonce = bumpNonce ?? false;
  }
  static fromMnemonic(mneomnic, provider, index = 0, options) {
    const defaultPath = `m/44'/60'/0'/0/${index}`;
    const { privateKey } = ethers.HDNodeWallet.fromPhrase(mneomnic, void 0, defaultPath);
    return new TornadoWallet(privateKey, provider, options);
  }
  async populateTransaction(tx) {
    const txObject = await populateTransaction(this, tx);
    this.nonce = Number(txObject.nonce);
    return super.populateTransaction(txObject);
  }
}
class TornadoVoidSigner extends ethers.VoidSigner {
  nonce;
  gasPriceBump;
  gasLimitBump;
  gasFailover;
  bumpNonce;
  constructor(address, provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(address, provider);
    this.gasPriceBump = gasPriceBump ?? 0;
    this.gasLimitBump = gasLimitBump ?? 3e3;
    this.gasFailover = gasFailover ?? false;
    this.bumpNonce = bumpNonce ?? false;
  }
  async populateTransaction(tx) {
    const txObject = await populateTransaction(this, tx);
    this.nonce = Number(txObject.nonce);
    return super.populateTransaction(txObject);
  }
}
class TornadoRpcSigner extends ethers.JsonRpcSigner {
  nonce;
  gasPriceBump;
  gasLimitBump;
  gasFailover;
  bumpNonce;
  constructor(provider, address, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(provider, address);
    this.gasPriceBump = gasPriceBump ?? 0;
    this.gasLimitBump = gasLimitBump ?? 3e3;
    this.gasFailover = gasFailover ?? false;
    this.bumpNonce = bumpNonce ?? false;
  }
  async sendUncheckedTransaction(tx) {
    return super.sendUncheckedTransaction(await populateTransaction(this, tx));
  }
}
class TornadoBrowserProvider extends ethers.BrowserProvider {
  options;
  constructor(ethereum, network, options) {
    super(ethereum, network);
    this.options = options;
  }
  async getSigner(address) {
    const signerAddress = (await super.getSigner(address)).address;
    if (this.options?.netId && this.options?.connectWallet && Number(await super.send("net_version", [])) !== this.options?.netId) {
      await this.options.connectWallet(this.options?.netId);
    }
    if (this.options?.handleNetworkChanges) {
      window?.ethereum?.on("chainChanged", this.options.handleNetworkChanges);
    }
    if (this.options?.handleAccountChanges) {
      window?.ethereum?.on("accountsChanged", this.options.handleAccountChanges);
    }
    if (this.options?.handleAccountDisconnect) {
      window?.ethereum?.on("disconnect", this.options.handleAccountDisconnect);
    }
    return new TornadoRpcSigner(this, signerAddress, this.options);
  }
}

const GET_STATISTIC = `
  query getStatistic($currency: String!, $amount: String!, $first: Int, $orderBy: BigInt, $orderDirection: String) {
    deposits(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: { currency: $currency, amount: $amount }) {
      index
      timestamp
      blockNumber
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const _META = `
  query getMeta {
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_REGISTERED = `
  query getRegistered($first: Int, $fromBlock: Int) {
      relayers(first: $first, orderBy: blockRegistration, orderDirection: asc, where: {
        blockRegistration_gte: $fromBlock
      }) {
        id
        address
        ensName
        blockRegistration
      }
      _meta {
        block {
          number
        }
        hasIndexingErrors
      }
  }
`;
const GET_DEPOSITS = `
  query getDeposits($currency: String!, $amount: String!, $first: Int, $fromBlock: Int) {
    deposits(first: $first, orderBy: index, orderDirection: asc, where: { 
      amount: $amount,
      currency: $currency,
      blockNumber_gte: $fromBlock
    }) {
      id
      blockNumber
      commitment
      index
      timestamp
      from
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_WITHDRAWALS = `
  query getWithdrawals($currency: String!, $amount: String!, $first: Int, $fromBlock: Int!) {
    withdrawals(first: $first, orderBy: blockNumber, orderDirection: asc, where: { 
      currency: $currency,
      amount: $amount,
      blockNumber_gte: $fromBlock
    }) {
      id
      blockNumber
      nullifier
      to
      fee
      timestamp
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_NOTE_ACCOUNTS = `
  query getNoteAccount($address: String!) {
    noteAccounts(where: { address: $address }) {
      id
      index
      address
      encryptedAccount
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_ECHO_EVENTS = `
  query getNoteAccounts($first: Int, $fromBlock: Int) {
    noteAccounts(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      id
      blockNumber
      address
      encryptedAccount
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_ENCRYPTED_NOTES = `
  query getEncryptedNotes($first: Int, $fromBlock: Int) {
    encryptedNotes(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      index
      transactionHash
      encryptedNote
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_GOVERNANCE_EVENTS = `
  query getGovernanceEvents($first: Int, $fromBlock: Int) {
    proposals(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      proposalId
      proposer
      target
      startTime
      endTime
      description
    }
    votes(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      proposalId
      voter
      support
      votes
      from
      input
    }
    delegates(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      account
      delegateTo
    }
    undelegates(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      account
      delegateFrom
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;
const GET_GOVERNANCE_APY = `
  stakeDailyBurns(first: 30, orderBy: date, orderDirection: desc) {
    id
    date
    dailyAmountBurned
  }
`;

const isEmptyArray = (arr) => !Array.isArray(arr) || !arr.length;
const GRAPHQL_LIMIT = 1e3;
async function queryGraph({
  graphApi,
  subgraphName,
  query,
  variables,
  fetchDataOptions: fetchDataOptions2
}) {
  const graphUrl = `${graphApi}/subgraphs/name/${subgraphName}`;
  const { data, errors } = await fetchData(graphUrl, {
    ...fetchDataOptions2,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }
  if (data?._meta?.hasIndexingErrors) {
    throw new Error("Subgraph has indexing errors");
  }
  return data;
}
async function getStatistic({
  graphApi,
  subgraphName,
  currency,
  amount,
  fetchDataOptions: fetchDataOptions2
}) {
  try {
    const {
      deposits,
      _meta: {
        block: { number: lastSyncBlock }
      }
    } = await queryGraph({
      graphApi,
      subgraphName,
      query: GET_STATISTIC,
      variables: {
        currency,
        first: 10,
        orderBy: "index",
        orderDirection: "desc",
        amount
      },
      fetchDataOptions: fetchDataOptions2
    });
    const events = deposits.map((e) => ({
      timestamp: Number(e.timestamp),
      leafIndex: Number(e.index),
      blockNumber: Number(e.blockNumber)
    })).reverse();
    const [lastEvent] = events.slice(-1);
    return {
      events,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getStatistic query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: null
    };
  }
}
async function getMeta({ graphApi, subgraphName, fetchDataOptions: fetchDataOptions2 }) {
  try {
    const {
      _meta: {
        block: { number: lastSyncBlock },
        hasIndexingErrors
      }
    } = await queryGraph({
      graphApi,
      subgraphName,
      query: _META,
      fetchDataOptions: fetchDataOptions2
    });
    return {
      lastSyncBlock,
      hasIndexingErrors
    };
  } catch (err) {
    console.log("Error from getMeta query");
    console.log(err);
    return {
      lastSyncBlock: null,
      hasIndexingErrors: null
    };
  }
}
function getRegisters({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_REGISTERED,
    variables: {
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllRegisters({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      let {
        relayers: result2,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock }
        }
      } = await getRegisters({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      if (isEmptyArray(result2)) {
        break;
      }
      const [firstEvent] = result2;
      const [lastEvent] = result2.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "Registers",
          fromBlock: Number(firstEvent.blockRegistration),
          toBlock: Number(lastEvent.blockRegistration),
          count: result2.length
        });
      }
      if (result2.length < 900) {
        events.push(...result2);
        break;
      }
      result2 = result2.filter(({ blockRegistration }) => blockRegistration !== lastEvent.blockRegistration);
      fromBlock = Number(lastEvent.blockRegistration);
      events.push(...result2);
    }
    if (!events.length) {
      return {
        events: [],
        lastSyncBlock
      };
    }
    const result = events.map(({ id, address, ensName, blockRegistration }) => {
      const [transactionHash, logIndex] = id.split("-");
      return {
        blockNumber: Number(blockRegistration),
        logIndex: Number(logIndex),
        transactionHash,
        ensName,
        relayerAddress: ethers.getAddress(address)
      };
    });
    return {
      events: result,
      lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllRegisters query");
    console.log(err);
    return { events: [], lastSyncBlock: fromBlock };
  }
}
function getDeposits({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_DEPOSITS,
    variables: {
      currency,
      amount,
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllDeposits({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      let {
        deposits: result2,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock }
        }
      } = await getDeposits({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      if (isEmptyArray(result2)) {
        break;
      }
      const [firstEvent] = result2;
      const [lastEvent2] = result2.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "Deposits",
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent2.blockNumber),
          count: result2.length
        });
      }
      if (result2.length < 900) {
        events.push(...result2);
        break;
      }
      result2 = result2.filter(({ blockNumber }) => blockNumber !== lastEvent2.blockNumber);
      fromBlock = Number(lastEvent2.blockNumber);
      events.push(...result2);
    }
    if (!events.length) {
      return {
        events: [],
        lastSyncBlock
      };
    }
    const result = events.map(({ id, blockNumber, commitment, index, timestamp, from }) => {
      const [transactionHash, logIndex] = id.split("-");
      return {
        blockNumber: Number(blockNumber),
        logIndex: Number(logIndex),
        transactionHash,
        commitment,
        leafIndex: Number(index),
        timestamp: Number(timestamp),
        from: ethers.getAddress(from)
      };
    });
    const [lastEvent] = result.slice(-1);
    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllDeposits query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock
    };
  }
}
function getWithdrawals({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_WITHDRAWALS,
    variables: {
      currency,
      amount,
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllWithdrawals({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      let {
        withdrawals: result2,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock }
        }
      } = await getWithdrawals({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      if (isEmptyArray(result2)) {
        break;
      }
      const [firstEvent] = result2;
      const [lastEvent2] = result2.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "Withdrawals",
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent2.blockNumber),
          count: result2.length
        });
      }
      if (result2.length < 900) {
        events.push(...result2);
        break;
      }
      result2 = result2.filter(({ blockNumber }) => blockNumber !== lastEvent2.blockNumber);
      fromBlock = Number(lastEvent2.blockNumber);
      events.push(...result2);
    }
    if (!events.length) {
      return {
        events: [],
        lastSyncBlock
      };
    }
    const result = events.map(({ id, blockNumber, nullifier, to, fee, timestamp }) => {
      const [transactionHash, logIndex] = id.split("-");
      return {
        blockNumber: Number(blockNumber),
        logIndex: Number(logIndex),
        transactionHash,
        nullifierHash: nullifier,
        to: ethers.getAddress(to),
        fee,
        timestamp: Number(timestamp)
      };
    });
    const [lastEvent] = result.slice(-1);
    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllWithdrawals query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock
    };
  }
}
async function getNoteAccounts({
  graphApi,
  subgraphName,
  address,
  fetchDataOptions: fetchDataOptions2
}) {
  try {
    const {
      noteAccounts: events,
      _meta: {
        block: { number: lastSyncBlock }
      }
    } = await queryGraph({
      graphApi,
      subgraphName,
      query: GET_NOTE_ACCOUNTS,
      variables: {
        address: address.toLowerCase()
      },
      fetchDataOptions: fetchDataOptions2
    });
    return {
      events,
      lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getNoteAccounts query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: null
    };
  }
}
function getGraphEchoEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_ECHO_EVENTS,
    variables: {
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllGraphEchoEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      let {
        noteAccounts: result2,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock }
        }
      } = await getGraphEchoEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      if (isEmptyArray(result2)) {
        break;
      }
      const [firstEvent] = result2;
      const [lastEvent2] = result2.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "EchoEvents",
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent2.blockNumber),
          count: result2.length
        });
      }
      if (result2.length < 900) {
        events.push(...result2);
        break;
      }
      result2 = result2.filter(({ blockNumber }) => blockNumber !== lastEvent2.blockNumber);
      fromBlock = Number(lastEvent2.blockNumber);
      events.push(...result2);
    }
    if (!events.length) {
      return {
        events: [],
        lastSyncBlock
      };
    }
    const result = events.map((e) => {
      const [transactionHash, logIndex] = e.id.split("-");
      return {
        blockNumber: Number(e.blockNumber),
        logIndex: Number(logIndex),
        transactionHash,
        address: ethers.getAddress(e.address),
        encryptedAccount: e.encryptedAccount
      };
    });
    const [lastEvent] = result.slice(-1);
    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllGraphEchoEvents query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock
    };
  }
}
function getEncryptedNotes({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_ENCRYPTED_NOTES,
    variables: {
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllEncryptedNotes({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      let {
        encryptedNotes: result2,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock }
        }
      } = await getEncryptedNotes({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      if (isEmptyArray(result2)) {
        break;
      }
      const [firstEvent] = result2;
      const [lastEvent2] = result2.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "EncryptedNotes",
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent2.blockNumber),
          count: result2.length
        });
      }
      if (result2.length < 900) {
        events.push(...result2);
        break;
      }
      result2 = result2.filter(({ blockNumber }) => blockNumber !== lastEvent2.blockNumber);
      fromBlock = Number(lastEvent2.blockNumber);
      events.push(...result2);
    }
    if (!events.length) {
      return {
        events: [],
        lastSyncBlock
      };
    }
    const result = events.map((e) => ({
      blockNumber: Number(e.blockNumber),
      logIndex: Number(e.index),
      transactionHash: e.transactionHash,
      encryptedNote: e.encryptedNote
    }));
    const [lastEvent] = result.slice(-1);
    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllEncryptedNotes query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock
    };
  }
}
function getGovernanceEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2
}) {
  return queryGraph({
    graphApi,
    subgraphName,
    query: GET_GOVERNANCE_EVENTS,
    variables: {
      first: GRAPHQL_LIMIT,
      fromBlock
    },
    fetchDataOptions: fetchDataOptions2
  });
}
async function getAllGovernanceEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions: fetchDataOptions2,
  onProgress
}) {
  try {
    const result = [];
    let lastSyncBlock = fromBlock;
    while (true) {
      const {
        proposals,
        votes,
        delegates,
        undelegates,
        _meta: {
          block: { number: currentBlock }
        }
      } = await getGovernanceEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
      lastSyncBlock = currentBlock;
      const eventsLength = proposals.length + votes.length + delegates.length + undelegates.length;
      if (eventsLength === 0) {
        break;
      }
      const formattedProposals = proposals.map(
        ({ blockNumber, logIndex, transactionHash, proposalId, proposer, target, startTime, endTime, description }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: "ProposalCreated",
            id: Number(proposalId),
            proposer: ethers.getAddress(proposer),
            target: ethers.getAddress(target),
            startTime: Number(startTime),
            endTime: Number(endTime),
            description
          };
        }
      );
      const formattedVotes = votes.map(
        ({ blockNumber, logIndex, transactionHash, proposalId, voter, support, votes: votes2, from, input }) => {
          if (!input || input.length > 2048) {
            input = "";
          }
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: "Voted",
            proposalId: Number(proposalId),
            voter: ethers.getAddress(voter),
            support,
            votes: votes2,
            from: ethers.getAddress(from),
            input
          };
        }
      );
      const formattedDelegates = delegates.map(
        ({ blockNumber, logIndex, transactionHash, account, delegateTo }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: "Delegated",
            account: ethers.getAddress(account),
            delegateTo: ethers.getAddress(delegateTo)
          };
        }
      );
      const formattedUndelegates = undelegates.map(
        ({ blockNumber, logIndex, transactionHash, account, delegateFrom }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: "Undelegated",
            account: ethers.getAddress(account),
            delegateFrom: ethers.getAddress(delegateFrom)
          };
        }
      );
      let formattedEvents = [
        ...formattedProposals,
        ...formattedVotes,
        ...formattedDelegates,
        ...formattedUndelegates
      ].sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          return a.logIndex - b.logIndex;
        }
        return a.blockNumber - b.blockNumber;
      });
      if (eventsLength < 900) {
        result.push(...formattedEvents);
        break;
      }
      const [firstEvent] = formattedEvents;
      const [lastEvent2] = formattedEvents.slice(-1);
      if (typeof onProgress === "function") {
        onProgress({
          type: "Governance Events",
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent2.blockNumber),
          count: eventsLength
        });
      }
      formattedEvents = formattedEvents.filter(({ blockNumber }) => blockNumber !== lastEvent2.blockNumber);
      fromBlock = Number(lastEvent2.blockNumber);
      result.push(...formattedEvents);
    }
    const [lastEvent] = result.slice(-1);
    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    };
  } catch (err) {
    console.log("Error from getAllGovernance query");
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock
    };
  }
}

var graph = /*#__PURE__*/Object.freeze({
  __proto__: null,
  GET_DEPOSITS: GET_DEPOSITS,
  GET_ECHO_EVENTS: GET_ECHO_EVENTS,
  GET_ENCRYPTED_NOTES: GET_ENCRYPTED_NOTES,
  GET_GOVERNANCE_APY: GET_GOVERNANCE_APY,
  GET_GOVERNANCE_EVENTS: GET_GOVERNANCE_EVENTS,
  GET_NOTE_ACCOUNTS: GET_NOTE_ACCOUNTS,
  GET_REGISTERED: GET_REGISTERED,
  GET_STATISTIC: GET_STATISTIC,
  GET_WITHDRAWALS: GET_WITHDRAWALS,
  _META: _META,
  getAllDeposits: getAllDeposits,
  getAllEncryptedNotes: getAllEncryptedNotes,
  getAllGovernanceEvents: getAllGovernanceEvents,
  getAllGraphEchoEvents: getAllGraphEchoEvents,
  getAllRegisters: getAllRegisters,
  getAllWithdrawals: getAllWithdrawals,
  getDeposits: getDeposits,
  getEncryptedNotes: getEncryptedNotes,
  getGovernanceEvents: getGovernanceEvents,
  getGraphEchoEvents: getGraphEchoEvents,
  getMeta: getMeta,
  getNoteAccounts: getNoteAccounts,
  getRegisters: getRegisters,
  getStatistic: getStatistic,
  getWithdrawals: getWithdrawals,
  queryGraph: queryGraph
});

class BatchBlockService {
  provider;
  onProgress;
  concurrencySize;
  batchSize;
  shouldRetry;
  retryMax;
  retryOn;
  constructor({
    provider,
    onProgress,
    concurrencySize = 10,
    batchSize = 10,
    shouldRetry = true,
    retryMax = 5,
    retryOn = 500
  }) {
    this.provider = provider;
    this.onProgress = onProgress;
    this.concurrencySize = concurrencySize;
    this.batchSize = batchSize;
    this.shouldRetry = shouldRetry;
    this.retryMax = retryMax;
    this.retryOn = retryOn;
  }
  async getBlock(blockTag) {
    const blockObject = await this.provider.getBlock(blockTag);
    if (!blockObject) {
      const errMsg = `No block for ${blockTag}`;
      throw new Error(errMsg);
    }
    return blockObject;
  }
  createBatchRequest(batchArray) {
    return batchArray.map(async (blocks, index) => {
      await sleep(20 * index);
      return (async () => {
        let retries = 0;
        let err;
        while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
          try {
            return await Promise.all(blocks.map((b) => this.getBlock(b)));
          } catch (e) {
            retries++;
            err = e;
            await sleep(this.retryOn);
          }
        }
        throw err;
      })();
    });
  }
  async getBatchBlocks(blocks) {
    let blockCount = 0;
    const results = [];
    for (const chunks of chunk(blocks, this.concurrencySize * this.batchSize)) {
      const chunksResult = (await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();
      results.push(...chunksResult);
      blockCount += chunks.length;
      if (typeof this.onProgress === "function") {
        this.onProgress({
          percentage: blockCount / blocks.length,
          currentIndex: blockCount,
          totalIndex: blocks.length
        });
      }
    }
    return results;
  }
}
class BatchTransactionService {
  provider;
  onProgress;
  concurrencySize;
  batchSize;
  shouldRetry;
  retryMax;
  retryOn;
  constructor({
    provider,
    onProgress,
    concurrencySize = 10,
    batchSize = 10,
    shouldRetry = true,
    retryMax = 5,
    retryOn = 500
  }) {
    this.provider = provider;
    this.onProgress = onProgress;
    this.concurrencySize = concurrencySize;
    this.batchSize = batchSize;
    this.shouldRetry = shouldRetry;
    this.retryMax = retryMax;
    this.retryOn = retryOn;
  }
  async getTransaction(txHash) {
    const txObject = await this.provider.getTransaction(txHash);
    if (!txObject) {
      const errMsg = `No transaction for ${txHash}`;
      throw new Error(errMsg);
    }
    return txObject;
  }
  createBatchRequest(batchArray) {
    return batchArray.map(async (txs, index) => {
      await sleep(20 * index);
      return (async () => {
        let retries = 0;
        let err;
        while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
          try {
            return await Promise.all(txs.map((tx) => this.getTransaction(tx)));
          } catch (e) {
            retries++;
            err = e;
            await sleep(this.retryOn);
          }
        }
        throw err;
      })();
    });
  }
  async getBatchTransactions(txs) {
    let txCount = 0;
    const results = [];
    for (const chunks of chunk(txs, this.concurrencySize * this.batchSize)) {
      const chunksResult = (await Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();
      results.push(...chunksResult);
      txCount += chunks.length;
      if (typeof this.onProgress === "function") {
        this.onProgress({ percentage: txCount / txs.length, currentIndex: txCount, totalIndex: txs.length });
      }
    }
    return results;
  }
}
class BatchEventsService {
  provider;
  contract;
  onProgress;
  concurrencySize;
  blocksPerRequest;
  shouldRetry;
  retryMax;
  retryOn;
  constructor({
    provider,
    contract,
    onProgress,
    concurrencySize = 10,
    blocksPerRequest = 2e3,
    shouldRetry = true,
    retryMax = 5,
    retryOn = 500
  }) {
    this.provider = provider;
    this.contract = contract;
    this.onProgress = onProgress;
    this.concurrencySize = concurrencySize;
    this.blocksPerRequest = blocksPerRequest;
    this.shouldRetry = shouldRetry;
    this.retryMax = retryMax;
    this.retryOn = retryOn;
  }
  async getPastEvents({ fromBlock, toBlock, type }) {
    let err;
    let retries = 0;
    while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
      try {
        return await this.contract.queryFilter(type, fromBlock, toBlock);
      } catch (e) {
        err = e;
        retries++;
        if (e.message.includes("after last accepted block")) {
          const acceptedBlock = parseInt(e.message.split("after last accepted block ")[1]);
          toBlock = acceptedBlock;
        }
        await sleep(this.retryOn);
      }
    }
    throw err;
  }
  createBatchRequest(batchArray) {
    return batchArray.map(async (event, index) => {
      await sleep(20 * index);
      return this.getPastEvents(event);
    });
  }
  async getBatchEvents({ fromBlock, toBlock, type = "*" }) {
    if (!toBlock) {
      toBlock = await this.provider.getBlockNumber();
    }
    const eventsToSync = [];
    for (let i = fromBlock; i < toBlock; i += this.blocksPerRequest) {
      const j = i + this.blocksPerRequest - 1 > toBlock ? toBlock : i + this.blocksPerRequest - 1;
      eventsToSync.push({ fromBlock: i, toBlock: j, type });
    }
    const events = [];
    const eventChunk = chunk(eventsToSync, this.concurrencySize);
    let chunkCount = 0;
    for (const chunk2 of eventChunk) {
      chunkCount++;
      const fetchedEvents = (await Promise.all(this.createBatchRequest(chunk2))).flat();
      events.push(...fetchedEvents);
      if (typeof this.onProgress === "function") {
        this.onProgress({
          percentage: chunkCount / eventChunk.length,
          type,
          fromBlock: chunk2[0].fromBlock,
          toBlock: chunk2[chunk2.length - 1].toBlock,
          count: fetchedEvents.length
        });
      }
    }
    return events;
  }
}

var NetId = /* @__PURE__ */ ((NetId2) => {
  NetId2[NetId2["MAINNET"] = 1] = "MAINNET";
  NetId2[NetId2["BSC"] = 56] = "BSC";
  NetId2[NetId2["POLYGON"] = 137] = "POLYGON";
  NetId2[NetId2["OPTIMISM"] = 10] = "OPTIMISM";
  NetId2[NetId2["ARBITRUM"] = 42161] = "ARBITRUM";
  NetId2[NetId2["GNOSIS"] = 100] = "GNOSIS";
  NetId2[NetId2["AVALANCHE"] = 43114] = "AVALANCHE";
  NetId2[NetId2["SEPOLIA"] = 11155111] = "SEPOLIA";
  return NetId2;
})(NetId || {});
const defaultConfig = {
  [1 /* MAINNET */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 80,
      fast: 50,
      standard: 25,
      low: 8
    },
    nativeCurrency: "eth",
    currencyName: "ETH",
    explorerUrl: "https://etherscan.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Ethereum Mainnet",
    deployedBlock: 9116966,
    rpcUrls: {
      mevblockerRPC: {
        name: "MevblockerRPC",
        url: "https://rpc.mevblocker.io"
      },
      keydonix: {
        name: "keydonix",
        url: "https://ethereum.keydonix.com/v1/mainnet"
      },
      SecureRpc: {
        name: "SecureRpc",
        url: "https://api.securerpc.com/v1"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/ethereum-mainnet"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/eth"
      }
    },
    stablecoin: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
    echoContract: "0x9B27DD5Bb15d42DC224FCD0B7caEbBe16161Df42",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornContract: "0x77777FeDdddFfC19Ff86DB637967013e6C6A116C",
    governanceContract: "0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce",
    stakingRewardsContract: "0x5B3f656C80E8ddb9ec01Dd9018815576E9238c29",
    registryContract: "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2",
    aggregatorContract: "0xE8F47A78A6D52D317D0D2FFFac56739fE14D1b49",
    reverseRecordsContract: "0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C",
    tornadoSubgraph: "tornadocash/mainnet-tornado-subgraph",
    registrySubgraph: "tornadocash/tornado-relayer-registry",
    governanceSubgraph: "tornadocash/tornado-governance",
    subgraphs: {},
    tokens: {
      eth: {
        instanceAddress: {
          "0.1": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc",
          "1": "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936",
          "10": "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF",
          "100": "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291"
        },
        symbol: "ETH",
        decimals: 18
      },
      dai: {
        instanceAddress: {
          "100": "0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3",
          "1000": "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144",
          "10000": "0x07687e702b410Fa43f4cB4Af7FA097918ffD2730",
          "100000": "0x23773E65ed146A459791799d01336DB287f25334"
        },
        tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        tokenGasLimit: 7e4,
        symbol: "DAI",
        decimals: 18,
        gasLimit: 7e5
      },
      cdai: {
        instanceAddress: {
          "5000": "0x22aaA7720ddd5388A3c0A3333430953C68f1849b",
          "50000": "0x03893a7c7463AE47D46bc7f091665f1893656003",
          "500000": "0x2717c5e28cf931547B621a5dddb772Ab6A35B701",
          "5000000": "0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af"
        },
        tokenAddress: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
        tokenGasLimit: 2e5,
        symbol: "cDAI",
        decimals: 8,
        gasLimit: 7e5
      },
      usdc: {
        instanceAddress: {
          "100": "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307",
          "1000": "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D"
        },
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        tokenGasLimit: 7e4,
        symbol: "USDC",
        decimals: 6,
        gasLimit: 7e5
      },
      usdt: {
        instanceAddress: {
          "100": "0x169AD27A470D064DEDE56a2D3ff727986b15D52B",
          "1000": "0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f"
        },
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        tokenGasLimit: 7e4,
        symbol: "USDT",
        decimals: 6,
        gasLimit: 7e5
      },
      wbtc: {
        instanceAddress: {
          "0.1": "0x178169B423a011fff22B9e3F3abeA13414dDD0F1",
          "1": "0x610B717796ad172B316836AC95a2ffad065CeaB4",
          "10": "0xbB93e510BbCD0B7beb5A853875f9eC60275CF498"
        },
        tokenAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        tokenGasLimit: 7e4,
        symbol: "WBTC",
        decimals: 8,
        gasLimit: 7e5
      }
    },
    // Inactive tokens to filter from schema verification and syncing events
    disabledTokens: ["cdai", "usdt", "usdc"],
    relayerEnsSubdomain: "mainnet-tornado",
    pollInterval: 15,
    constants: {
      GOVERNANCE_BLOCK: 11474695,
      NOTE_ACCOUNT_BLOCK: 11842486,
      ENCRYPTED_NOTES_BLOCK: 12143762,
      REGISTRY_BLOCK: 14173129,
      MINING_BLOCK_TIME: 15
    }
  },
  [56 /* BSC */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 5,
      fast: 5,
      standard: 5,
      low: 5
    },
    nativeCurrency: "bnb",
    currencyName: "BNB",
    explorerUrl: "https://bscscan.com",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Binance Smart Chain",
    deployedBlock: 8158799,
    stablecoin: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornadoSubgraph: "tornadocash/bsc-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      bnbchain: {
        name: "BNB Chain",
        url: "https://bsc-dataseed.bnbchain.org"
      },
      ninicoin: {
        name: "ninicoin",
        url: "https://bsc-dataseed1.ninicoin.io"
      },
      nodereal: {
        name: "NodeReal",
        url: "https://binance.nodereal.io"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/bsc-mainnet"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/bnb"
      }
    },
    tokens: {
      bnb: {
        instanceAddress: {
          "0.1": "0x84443CFd09A48AF6eF360C6976C5392aC5023a1F",
          "1": "0xd47438C816c9E7f2E2888E060936a499Af9582b3",
          "10": "0x330bdFADE01eE9bF63C209Ee33102DD334618e0a",
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD"
        },
        symbol: "BNB",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "bsc-tornado",
    pollInterval: 10,
    constants: {
      NOTE_ACCOUNT_BLOCK: 8159269,
      ENCRYPTED_NOTES_BLOCK: 8159269
    }
  },
  [137 /* POLYGON */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 100,
      fast: 75,
      standard: 50,
      low: 30
    },
    nativeCurrency: "matic",
    currencyName: "MATIC",
    explorerUrl: "https://polygonscan.com",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Polygon (Matic) Network",
    deployedBlock: 16257962,
    stablecoin: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornadoSubgraph: "tornadocash/matic-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/matic"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/polygon-mainnet"
      }
    },
    tokens: {
      matic: {
        instanceAddress: {
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD",
          "1000": "0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178",
          "10000": "0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040",
          "100000": "0xa5C2254e4253490C54cef0a4347fddb8f75A4998"
        },
        symbol: "MATIC",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "polygon-tornado",
    pollInterval: 10,
    constants: {
      NOTE_ACCOUNT_BLOCK: 16257996,
      ENCRYPTED_NOTES_BLOCK: 16257996
    }
  },
  [10 /* OPTIMISM */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 1e-3,
      fast: 1e-3,
      standard: 1e-3,
      low: 1e-3
    },
    nativeCurrency: "eth",
    currencyName: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Optimism",
    deployedBlock: 2243689,
    stablecoin: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    ovmGasPriceOracleContract: "0x420000000000000000000000000000000000000F",
    tornadoSubgraph: "tornadocash/optimism-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/op"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/optimism-mainnet"
      }
    },
    tokens: {
      eth: {
        instanceAddress: {
          "0.1": "0x84443CFd09A48AF6eF360C6976C5392aC5023a1F",
          "1": "0xd47438C816c9E7f2E2888E060936a499Af9582b3",
          "10": "0x330bdFADE01eE9bF63C209Ee33102DD334618e0a",
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD"
        },
        symbol: "ETH",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "optimism-tornado",
    pollInterval: 15,
    constants: {
      NOTE_ACCOUNT_BLOCK: 2243694,
      ENCRYPTED_NOTES_BLOCK: 2243694
    }
  },
  [42161 /* ARBITRUM */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 4,
      fast: 3,
      standard: 2.52,
      low: 2.29
    },
    nativeCurrency: "eth",
    currencyName: "ETH",
    explorerUrl: "https://arbiscan.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Arbitrum One",
    deployedBlock: 3430648,
    stablecoin: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornadoSubgraph: "tornadocash/arbitrum-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      Arbitrum: {
        name: "Arbitrum RPC",
        url: "https://arb1.arbitrum.io/rpc"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/arbitrum-one"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/arb"
      }
    },
    tokens: {
      eth: {
        instanceAddress: {
          "0.1": "0x84443CFd09A48AF6eF360C6976C5392aC5023a1F",
          "1": "0xd47438C816c9E7f2E2888E060936a499Af9582b3",
          "10": "0x330bdFADE01eE9bF63C209Ee33102DD334618e0a",
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD"
        },
        symbol: "ETH",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "arbitrum-tornado",
    pollInterval: 15,
    constants: {
      NOTE_ACCOUNT_BLOCK: 3430605,
      ENCRYPTED_NOTES_BLOCK: 3430605
    }
  },
  [100 /* GNOSIS */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 6,
      fast: 5,
      standard: 4,
      low: 1
    },
    nativeCurrency: "xdai",
    currencyName: "xDAI",
    explorerUrl: "https://gnosisscan.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Gnosis Chain",
    deployedBlock: 17754561,
    stablecoin: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornadoSubgraph: "tornadocash/xdai-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      gnosis: {
        name: "Gnosis",
        url: "https://rpc.gnosischain.com"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/gnosis"
      }
    },
    tokens: {
      xdai: {
        instanceAddress: {
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD",
          "1000": "0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178",
          "10000": "0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040",
          "100000": "0xa5C2254e4253490C54cef0a4347fddb8f75A4998"
        },
        symbol: "xDAI",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "gnosis-tornado",
    pollInterval: 15,
    constants: {
      NOTE_ACCOUNT_BLOCK: 17754564,
      ENCRYPTED_NOTES_BLOCK: 17754564
    }
  },
  [43114 /* AVALANCHE */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 225,
      fast: 35,
      standard: 25,
      low: 25
    },
    nativeCurrency: "avax",
    currencyName: "AVAX",
    explorerUrl: "https://snowtrace.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Avalanche Mainnet",
    deployedBlock: 4429818,
    stablecoin: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x00000000000D6FFc74A8feb35aF5827bf57f6786",
    tornadoSubgraph: "tornadocash/avalanche-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/avax/c"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/avalanche-mainnet"
      }
    },
    tokens: {
      avax: {
        instanceAddress: {
          "10": "0x330bdFADE01eE9bF63C209Ee33102DD334618e0a",
          "100": "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD",
          "500": "0xaf8d1839c3c67cf571aa74B5c12398d4901147B3"
        },
        symbol: "AVAX",
        decimals: 18
      }
    },
    relayerEnsSubdomain: "avalanche-tornado",
    pollInterval: 10,
    constants: {
      NOTE_ACCOUNT_BLOCK: 4429813,
      ENCRYPTED_NOTES_BLOCK: 4429813
    }
  },
  [11155111 /* SEPOLIA */]: {
    rpcCallRetryAttempt: 15,
    gasPrices: {
      instant: 2,
      fast: 2,
      standard: 2,
      low: 2
    },
    nativeCurrency: "eth",
    currencyName: "SepoliaETH",
    explorerUrl: "https://sepolia.etherscan.io",
    merkleTreeHeight: 20,
    emptyElement: "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    networkName: "Ethereum Sepolia",
    deployedBlock: 5594395,
    stablecoin: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x1572AFE6949fdF51Cb3E0856216670ae9Ee160Ee",
    echoContract: "0xcDD1fc3F5ac2782D83449d3AbE80D6b7B273B0e5",
    offchainOracleContract: "0x1f89EAF03E5b260Bc6D4Ae3c3334b1B750F3e127",
    tornContract: "0x3AE6667167C0f44394106E197904519D808323cA",
    governanceContract: "0xe5324cD7602eeb387418e594B87aCADee08aeCAD",
    stakingRewardsContract: "0x6d0018890751Efd31feb8166711B16732E2b496b",
    registryContract: "0x1428e5d2356b13778A13108b10c440C83011dfB8",
    aggregatorContract: "0x4088712AC9fad39ea133cdb9130E465d235e9642",
    reverseRecordsContract: "0xEc29700C0283e5Be64AcdFe8077d6cC95dE23C23",
    tornadoSubgraph: "tornadocash/sepolia-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      sepolia: {
        name: "Sepolia RPC",
        url: "https://rpc.sepolia.org"
      },
      stackup: {
        name: "Stackup",
        url: "https://public.stackup.sh/api/v1/node/ethereum-sepolia"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/sepolia"
      },
      ethpandaops: {
        name: "ethpandaops",
        url: "https://rpc.sepolia.ethpandaops.io"
      }
    },
    tokens: {
      eth: {
        instanceAddress: {
          "0.1": "0x8C4A04d872a6C1BE37964A21ba3a138525dFF50b",
          "1": "0x8cc930096B4Df705A007c4A039BDFA1320Ed2508",
          "10": "0x8D10d506D29Fc62ABb8A290B99F66dB27Fc43585",
          "100": "0x44c5C92ed73dB43888210264f0C8b36Fd68D8379"
        },
        symbol: "ETH",
        decimals: 18
      },
      dai: {
        instanceAddress: {
          "100": "0x6921fd1a97441dd603a997ED6DDF388658daf754",
          "1000": "0x50a637770F5d161999420F7d70d888DE47207145",
          "10000": "0xecD649870407cD43923A816Cc6334a5bdf113621",
          "100000": "0x73B4BD04bF83206B6e979BE2507098F92EDf4F90"
        },
        tokenAddress: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
        tokenGasLimit: 7e4,
        symbol: "DAI",
        decimals: 18,
        gasLimit: 7e5
      }
    },
    relayerEnsSubdomain: "sepolia-tornado",
    pollInterval: 15,
    constants: {
      GOVERNANCE_BLOCK: 5594395,
      NOTE_ACCOUNT_BLOCK: 5594395,
      ENCRYPTED_NOTES_BLOCK: 5594395,
      MINING_BLOCK_TIME: 15
    }
  }
};
const enabledChains = Object.values(NetId).filter((n) => typeof n === "number");
exports.customConfig = {};
function addNetwork(newConfig) {
  enabledChains.push(
    ...Object.keys(newConfig).map((netId) => Number(netId)).filter((netId) => !enabledChains.includes(netId))
  );
  exports.customConfig = {
    ...exports.customConfig,
    ...newConfig
  };
}
function getNetworkConfig() {
  const allConfig = {
    ...defaultConfig,
    ...exports.customConfig
  };
  return enabledChains.reduce((acc, curr) => {
    acc[curr] = allConfig[curr];
    return acc;
  }, {});
}
function getConfig(netId) {
  const allConfig = getNetworkConfig();
  const chainConfig = allConfig[netId];
  if (!chainConfig) {
    const errMsg = `No config found for network ${netId}!`;
    throw new Error(errMsg);
  }
  return chainConfig;
}
function getActiveTokens(config) {
  const { tokens, disabledTokens } = config;
  return Object.keys(tokens).filter((t) => !disabledTokens?.includes(t));
}
function getActiveTokenInstances(config) {
  const { tokens, disabledTokens } = config;
  return Object.entries(tokens).reduce((acc, [token, instances]) => {
    if (!disabledTokens?.includes(token)) {
      acc[token] = instances;
    }
    return acc;
  }, {});
}
function getInstanceByAddress(config, address) {
  const { tokens, disabledTokens } = config;
  for (const [currency, { instanceAddress }] of Object.entries(tokens)) {
    if (disabledTokens?.includes(currency)) {
      continue;
    }
    for (const [amount, instance] of Object.entries(instanceAddress)) {
      if (instance === address) {
        return {
          amount,
          currency
        };
      }
    }
  }
}
function getRelayerEnsSubdomains() {
  const allConfig = getNetworkConfig();
  return enabledChains.reduce((acc, chain) => {
    acc[chain] = allConfig[chain].relayerEnsSubdomain;
    return acc;
  }, {});
}

const ajv = new Ajv({ allErrors: true });
ajv.addKeyword({
  keyword: "BN",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (schema, data) => {
    try {
      BigInt(data);
      return true;
    } catch {
      return false;
    }
  },
  errors: true
});
ajv.addKeyword({
  keyword: "isAddress",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (schema, data) => {
    try {
      return ethers.isAddress(data);
    } catch {
      return false;
    }
  },
  errors: true
});

const addressSchemaType = {
  type: "string",
  pattern: "^0x[a-fA-F0-9]{40}$",
  isAddress: true
};
const bnSchemaType = { type: "string", BN: true };
const proofSchemaType = { type: "string", pattern: "^0x[a-fA-F0-9]{512}$" };
const bytes32SchemaType = { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" };
const bytes32BNSchemaType = { ...bytes32SchemaType, BN: true };

const baseEventsSchemaProperty = {
  blockNumber: {
    type: "number"
  },
  logIndex: {
    type: "number"
  },
  transactionHash: bytes32SchemaType
};
const baseEventsSchemaRequired = Object.keys(baseEventsSchemaProperty);
const governanceEventsSchema = {
  type: "array",
  items: {
    anyOf: [
      {
        type: "object",
        properties: {
          ...baseEventsSchemaProperty,
          event: { type: "string" },
          id: { type: "number" },
          proposer: addressSchemaType,
          target: addressSchemaType,
          startTime: { type: "number" },
          endTime: { type: "number" },
          description: { type: "string" }
        },
        required: [
          ...baseEventsSchemaRequired,
          "event",
          "id",
          "proposer",
          "target",
          "startTime",
          "endTime",
          "description"
        ],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          ...baseEventsSchemaProperty,
          event: { type: "string" },
          proposalId: { type: "number" },
          voter: addressSchemaType,
          support: { type: "boolean" },
          votes: { type: "string" },
          from: addressSchemaType,
          input: { type: "string" }
        },
        required: [...baseEventsSchemaRequired, "event", "proposalId", "voter", "support", "votes", "from", "input"],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          ...baseEventsSchemaProperty,
          event: { type: "string" },
          account: addressSchemaType,
          delegateTo: addressSchemaType
        },
        required: [...baseEventsSchemaRequired, "account", "delegateTo"],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          ...baseEventsSchemaProperty,
          event: { type: "string" },
          account: addressSchemaType,
          delegateFrom: addressSchemaType
        },
        required: [...baseEventsSchemaRequired, "account", "delegateFrom"],
        additionalProperties: false
      }
    ]
  }
};
const registeredEventsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...baseEventsSchemaProperty,
      ensName: { type: "string" },
      relayerAddress: addressSchemaType
    },
    required: [...baseEventsSchemaRequired, "ensName", "relayerAddress"],
    additionalProperties: false
  }
};
const depositsEventsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...baseEventsSchemaProperty,
      commitment: bytes32SchemaType,
      leafIndex: { type: "number" },
      timestamp: { type: "number" },
      from: addressSchemaType
    },
    required: [...baseEventsSchemaRequired, "commitment", "leafIndex", "timestamp", "from"],
    additionalProperties: false
  }
};
const withdrawalsEventsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...baseEventsSchemaProperty,
      nullifierHash: bytes32SchemaType,
      to: addressSchemaType,
      fee: bnSchemaType,
      timestamp: { type: "number" }
    },
    required: [...baseEventsSchemaRequired, "nullifierHash", "to", "fee", "timestamp"],
    additionalProperties: false
  }
};
const echoEventsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...baseEventsSchemaProperty,
      address: addressSchemaType,
      encryptedAccount: { type: "string" }
    },
    required: [...baseEventsSchemaRequired, "address", "encryptedAccount"],
    additionalProperties: false
  }
};
const encryptedNotesSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...baseEventsSchemaProperty,
      encryptedNote: { type: "string" }
    },
    required: [...baseEventsSchemaRequired, "encryptedNote"],
    additionalProperties: false
  }
};
function getEventsSchemaValidator(type) {
  if (type === DEPOSIT) {
    return ajv.compile(depositsEventsSchema);
  }
  if (type === WITHDRAWAL) {
    return ajv.compile(withdrawalsEventsSchema);
  }
  if (type === "governance") {
    return ajv.compile(governanceEventsSchema);
  }
  if (type === "registered") {
    return ajv.compile(registeredEventsSchema);
  }
  if (type === "echo") {
    return ajv.compile(echoEventsSchema);
  }
  if (type === "encrypted_notes") {
    return ajv.compile(encryptedNotesSchema);
  }
  throw new Error("Unsupported event type for schema validation");
}

const statusSchema = {
  type: "object",
  properties: {
    rewardAccount: addressSchemaType,
    gasPrices: {
      type: "object",
      properties: {
        fast: { type: "number" },
        additionalProperties: { type: "number" }
      },
      required: ["fast"]
    },
    netId: { type: "integer" },
    tornadoServiceFee: { type: "number", maximum: 20, minimum: 0 },
    latestBlock: { type: "number" },
    latestBalance: bnSchemaType,
    version: { type: "string" },
    health: {
      type: "object",
      properties: {
        status: { const: "true" },
        error: { type: "string" }
      },
      required: ["status"]
    },
    syncStatus: {
      type: "object",
      properties: {
        events: { type: "boolean" },
        tokenPrice: { type: "boolean" },
        gasPrice: { type: "boolean" }
      },
      required: ["events", "tokenPrice", "gasPrice"]
    },
    onSyncEvents: { type: "boolean" },
    currentQueue: { type: "number" }
  },
  required: ["rewardAccount", "instances", "netId", "tornadoServiceFee", "version", "health", "currentQueue"]
};
function getStatusSchema(netId, config, tovarish) {
  const { tokens, optionalTokens, disabledTokens, nativeCurrency } = config;
  const schema = JSON.parse(JSON.stringify(statusSchema));
  const instances = Object.keys(tokens).reduce(
    (acc, token) => {
      const { instanceAddress, tokenAddress, symbol, decimals, optionalInstances = [] } = tokens[token];
      const amounts = Object.keys(instanceAddress);
      const instanceProperties = {
        type: "object",
        properties: {
          instanceAddress: {
            type: "object",
            properties: amounts.reduce((acc2, cur) => {
              acc2[cur] = addressSchemaType;
              return acc2;
            }, {}),
            required: amounts.filter((amount) => !optionalInstances.includes(amount))
          },
          decimals: { enum: [decimals] }
        },
        required: ["instanceAddress", "decimals"].concat(
          tokenAddress ? ["tokenAddress"] : [],
          symbol ? ["symbol"] : []
        )
      };
      if (tokenAddress) {
        instanceProperties.properties.tokenAddress = addressSchemaType;
      }
      if (symbol) {
        instanceProperties.properties.symbol = { enum: [symbol] };
      }
      acc.properties[token] = instanceProperties;
      if (!optionalTokens?.includes(token) && !disabledTokens?.includes(token)) {
        acc.required.push(token);
      }
      return acc;
    },
    {
      type: "object",
      properties: {},
      required: []
    }
  );
  schema.properties.instances = instances;
  const _tokens = Object.keys(tokens).filter(
    (t) => t !== nativeCurrency && !config.optionalTokens?.includes(t) && !config.disabledTokens?.includes(t)
  );
  if (netId === NetId.MAINNET) {
    _tokens.push("torn");
  }
  if (_tokens.length) {
    const ethPrices = {
      type: "object",
      properties: _tokens.reduce((acc, token) => {
        acc[token] = bnSchemaType;
        return acc;
      }, {}),
      required: _tokens
    };
    schema.properties.ethPrices = ethPrices;
    schema.required.push("ethPrices");
  }
  if (tovarish) {
    schema.required.push("gasPrices", "latestBlock", "latestBalance", "syncStatus", "onSyncEvents");
  }
  return schema;
}

const jobsSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    id: { type: "string" },
    type: { type: "string" },
    status: { type: "string" },
    contract: { type: "string" },
    proof: { type: "string" },
    args: {
      type: "array",
      items: { type: "string" }
    },
    txHash: { type: "string" },
    confirmations: { type: "number" },
    failedReason: { type: "string" }
  },
  required: ["id", "status"]
};
const jobRequestSchema = {
  ...jobsSchema,
  required: ["id"]
};

const MIN_FEE = 0.1;
const MAX_FEE = 0.9;
const MIN_STAKE_BALANCE = ethers.parseEther("500");
function calculateScore({ stakeBalance, tornadoServiceFee }) {
  if (tornadoServiceFee < MIN_FEE) {
    tornadoServiceFee = MIN_FEE;
  } else if (tornadoServiceFee >= MAX_FEE) {
    return BigInt(0);
  }
  const serviceFeeCoefficient = (tornadoServiceFee - MIN_FEE) ** 2;
  const feeDiffCoefficient = 1 / (MAX_FEE - MIN_FEE) ** 2;
  const coefficientsMultiplier = 1 - feeDiffCoefficient * serviceFeeCoefficient;
  return BigInt(Math.floor(Number(stakeBalance || "0") * coefficientsMultiplier));
}
function getWeightRandom(weightsScores, random) {
  for (let i = 0; i < weightsScores.length; i++) {
    if (random < weightsScores[i]) {
      return i;
    }
    random = random - weightsScores[i];
  }
  return Math.floor(Math.random() * weightsScores.length);
}
function getSupportedInstances(instanceList) {
  const rawList = Object.values(instanceList).map(({ instanceAddress }) => {
    return Object.values(instanceAddress);
  }).flat();
  return rawList.map((l) => ethers.getAddress(l));
}
function pickWeightedRandomRelayer(relayers) {
  const weightsScores = relayers.map((el) => calculateScore(el));
  const totalWeight = weightsScores.reduce((acc, curr) => {
    return acc = acc + curr;
  }, BigInt("0"));
  const random = BigInt(Math.floor(Number(totalWeight) * Math.random()));
  const weightRandomIndex = getWeightRandom(weightsScores, random);
  return relayers[weightRandomIndex];
}
class RelayerClient {
  netId;
  config;
  selectedRelayer;
  fetchDataOptions;
  tovarish;
  constructor({ netId, config, fetchDataOptions: fetchDataOptions2 }) {
    this.netId = netId;
    this.config = config;
    this.fetchDataOptions = fetchDataOptions2;
    this.tovarish = false;
  }
  async askRelayerStatus({
    hostname,
    url,
    relayerAddress
  }) {
    if (!url && hostname) {
      url = `https://${!hostname.endsWith("/") ? hostname + "/" : hostname}`;
    } else if (url && !url.endsWith("/")) {
      url += "/";
    } else {
      url = "";
    }
    const rawStatus = await fetchData(`${url}status`, {
      ...this.fetchDataOptions,
      headers: {
        "Content-Type": "application/json, application/x-www-form-urlencoded"
      },
      timeout: 3e4,
      maxRetry: this.fetchDataOptions?.torPort ? 2 : 0
    });
    const statusValidator = ajv.compile(getStatusSchema(this.netId, this.config, this.tovarish));
    if (!statusValidator(rawStatus)) {
      throw new Error("Invalid status schema");
    }
    const status = {
      ...rawStatus,
      url
    };
    if (status.currentQueue > 5) {
      throw new Error("Withdrawal queue is overloaded");
    }
    if (status.netId !== this.netId) {
      throw new Error("This relayer serves a different network");
    }
    if (relayerAddress && this.netId === NetId.MAINNET && status.rewardAccount !== relayerAddress) {
      throw new Error("The Relayer reward address must match registered address");
    }
    return status;
  }
  async filterRelayer(relayer) {
    const hostname = relayer.hostnames[this.netId];
    const { ensName, relayerAddress } = relayer;
    if (!hostname) {
      return;
    }
    try {
      const status = await this.askRelayerStatus({ hostname, relayerAddress });
      return {
        netId: status.netId,
        url: status.url,
        hostname,
        ensName,
        relayerAddress,
        rewardAccount: ethers.getAddress(status.rewardAccount),
        instances: getSupportedInstances(status.instances),
        stakeBalance: relayer.stakeBalance,
        gasPrice: status.gasPrices?.fast,
        ethPrices: status.ethPrices,
        currentQueue: status.currentQueue,
        tornadoServiceFee: status.tornadoServiceFee
      };
    } catch (err) {
      return {
        hostname,
        relayerAddress,
        errorMessage: err.message,
        hasError: true
      };
    }
  }
  async getValidRelayers(relayers) {
    const invalidRelayers = [];
    const validRelayers = (await Promise.all(relayers.map((relayer) => this.filterRelayer(relayer)))).filter((r) => {
      if (!r) {
        return false;
      }
      if (r.hasError) {
        invalidRelayers.push(r);
        return false;
      }
      return true;
    });
    return {
      validRelayers,
      invalidRelayers
    };
  }
  pickWeightedRandomRelayer(relayers) {
    return pickWeightedRandomRelayer(relayers);
  }
  async tornadoWithdraw({ contract, proof, args }, callback) {
    const { url } = this.selectedRelayer;
    const withdrawResponse = await fetchData(`${url}v1/tornadoWithdraw`, {
      ...this.fetchDataOptions,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contract,
        proof,
        args
      })
    });
    const { id, error } = withdrawResponse;
    if (error) {
      throw new Error(error);
    }
    const jobValidator = ajv.compile(jobRequestSchema);
    if (!jobValidator(withdrawResponse)) {
      const errMsg = `${url}v1/tornadoWithdraw has an invalid job response`;
      throw new Error(errMsg);
    }
    if (typeof callback === "function") {
      callback(withdrawResponse);
    }
    let relayerStatus;
    const jobUrl = `${url}v1/jobs/${id}`;
    console.log(`Job submitted: ${jobUrl}
`);
    while (!relayerStatus || !["FAILED", "CONFIRMED"].includes(relayerStatus)) {
      const jobResponse = await fetchData(jobUrl, {
        ...this.fetchDataOptions,
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (jobResponse.error) {
        throw new Error(error);
      }
      const jobValidator2 = ajv.compile(jobsSchema);
      if (!jobValidator2(jobResponse)) {
        const errMsg = `${jobUrl} has an invalid job response`;
        throw new Error(errMsg);
      }
      const { status, txHash, confirmations, failedReason } = jobResponse;
      if (relayerStatus !== status) {
        if (status === "FAILED") {
          const errMsg = `Job ${status}: ${jobUrl} failed reason: ${failedReason}`;
          throw new Error(errMsg);
        } else if (status === "SENT") {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}
`);
        } else if (status === "MINED") {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}, confirmations: ${confirmations}
`);
        } else if (status === "CONFIRMED") {
          console.log(`Job ${status}: ${jobUrl}, txhash: ${txHash}, confirmations: ${confirmations}
`);
        } else {
          console.log(`Job ${status}: ${jobUrl}
`);
        }
        relayerStatus = status;
        if (typeof callback === "function") {
          callback(jobResponse);
        }
      }
      await sleep(3e3);
    }
  }
}

const DEPOSIT = "deposit";
const WITHDRAWAL = "withdrawal";
class BaseEventsService {
  netId;
  provider;
  graphApi;
  subgraphName;
  contract;
  type;
  deployedBlock;
  batchEventsService;
  fetchDataOptions;
  tovarishClient;
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    contract,
    type = "",
    deployedBlock = 0,
    fetchDataOptions: fetchDataOptions2,
    tovarishClient
  }) {
    this.netId = netId;
    this.provider = provider;
    this.graphApi = graphApi;
    this.subgraphName = subgraphName;
    this.fetchDataOptions = fetchDataOptions2;
    this.contract = contract;
    this.type = type;
    this.deployedBlock = deployedBlock;
    this.batchEventsService = new BatchEventsService({
      provider,
      contract,
      onProgress: this.updateEventProgress
    });
    this.tovarishClient = tovarishClient;
  }
  getInstanceName() {
    return "";
  }
  getType() {
    return this.type || "";
  }
  getTovarishType() {
    return String(this.getType() || "").toLowerCase();
  }
  getGraphMethod() {
    return "";
  }
  getGraphParams() {
    return {
      graphApi: this.graphApi || "",
      subgraphName: this.subgraphName || "",
      fetchDataOptions: this.fetchDataOptions,
      onProgress: this.updateGraphProgress
    };
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  updateEventProgress({ percentage, type, fromBlock, toBlock, count }) {
  }
  updateBlockProgress({ percentage, currentIndex, totalIndex }) {
  }
  updateTransactionProgress({ percentage, currentIndex, totalIndex }) {
  }
  updateGraphProgress({ type, fromBlock, toBlock, count }) {
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  async formatEvents(events) {
    return await new Promise((resolve) => resolve(events));
  }
  /**
   * Get saved or cached events
   */
  async getEventsFromDB() {
    return {
      events: [],
      lastBlock: 0
    };
  }
  /**
   * Events from remote cache (Either from local cache, CDN, or from IPFS)
   */
  async getEventsFromCache() {
    return {
      events: [],
      lastBlock: 0,
      fromCache: true
    };
  }
  async getSavedEvents() {
    let dbEvents = await this.getEventsFromDB();
    if (!dbEvents.lastBlock) {
      dbEvents = await this.getEventsFromCache();
    }
    return dbEvents;
  }
  /**
   * Get latest events
   */
  async getEventsFromGraph({
    fromBlock,
    methodName = ""
  }) {
    if (!this.graphApi || !this.subgraphName) {
      return {
        events: [],
        lastBlock: fromBlock
      };
    }
    const { events, lastSyncBlock } = await graph[methodName || this.getGraphMethod()]({
      fromBlock,
      ...this.getGraphParams()
    });
    return {
      events,
      lastBlock: lastSyncBlock
    };
  }
  async getEventsFromRpc({
    fromBlock,
    toBlock
  }) {
    try {
      if (!toBlock) {
        toBlock = await this.provider.getBlockNumber();
      }
      if (fromBlock >= toBlock) {
        return {
          events: [],
          lastBlock: toBlock
        };
      }
      this.updateEventProgress({ percentage: 0, type: this.getType() });
      const events = await this.formatEvents(
        await this.batchEventsService.getBatchEvents({ fromBlock, toBlock, type: this.getType() })
      );
      return {
        events,
        lastBlock: toBlock
      };
    } catch (err) {
      console.log(err);
      return {
        events: [],
        lastBlock: fromBlock
      };
    }
  }
  async getLatestEvents({ fromBlock }) {
    if (this.tovarishClient?.selectedRelayer && ![DEPOSIT, WITHDRAWAL].includes(this.type.toLowerCase())) {
      const { events, lastSyncBlock: lastBlock } = await this.tovarishClient.getEvents({
        type: this.getTovarishType(),
        fromBlock
      });
      return {
        events,
        lastBlock
      };
    }
    const graphEvents = await this.getEventsFromGraph({ fromBlock });
    const lastSyncBlock = graphEvents.lastBlock && graphEvents.lastBlock >= fromBlock ? graphEvents.lastBlock : fromBlock;
    const rpcEvents = await this.getEventsFromRpc({ fromBlock: lastSyncBlock });
    return {
      events: [...graphEvents.events, ...rpcEvents.events],
      lastBlock: rpcEvents.lastBlock
    };
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async validateEvents({
    events,
    lastBlock,
    hasNewEvents
  }) {
    return void 0;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  /**
   * Handle saving events
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveEvents({ events, lastBlock }) {
  }
  /**
   * Trigger saving and receiving latest events
   */
  async updateEvents() {
    const savedEvents = await this.getSavedEvents();
    let fromBlock = this.deployedBlock;
    if (savedEvents && savedEvents.lastBlock) {
      fromBlock = savedEvents.lastBlock + 1;
    }
    const newEvents = await this.getLatestEvents({ fromBlock });
    const eventSet = /* @__PURE__ */ new Set();
    const allEvents = [...savedEvents.events, ...newEvents.events].sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return a.logIndex - b.logIndex;
      }
      return a.blockNumber - b.blockNumber;
    }).filter(({ transactionHash, logIndex }) => {
      const eventKey = `${transactionHash}_${logIndex}`;
      const hasEvent = eventSet.has(eventKey);
      eventSet.add(eventKey);
      return !hasEvent;
    });
    const lastBlock = newEvents.lastBlock || allEvents[allEvents.length - 1]?.blockNumber;
    const validateResult = await this.validateEvents({
      events: allEvents,
      lastBlock,
      hasNewEvents: Boolean(newEvents.events.length)
    });
    if (savedEvents.fromCache || newEvents.events.length) {
      await this.saveEvents({ events: allEvents, lastBlock });
    }
    return {
      events: allEvents,
      lastBlock,
      validateResult
    };
  }
}
class BaseTornadoService extends BaseEventsService {
  amount;
  currency;
  optionalTree;
  merkleTreeService;
  batchTransactionService;
  batchBlockService;
  constructor(serviceConstructor) {
    const { Tornado: contract, amount, currency, provider, optionalTree, merkleTreeService } = serviceConstructor;
    super({
      ...serviceConstructor,
      contract
    });
    this.amount = amount;
    this.currency = currency;
    this.optionalTree = optionalTree;
    this.merkleTreeService = merkleTreeService;
    this.batchTransactionService = new BatchTransactionService({
      provider,
      onProgress: this.updateTransactionProgress
    });
    this.batchBlockService = new BatchBlockService({
      provider,
      onProgress: this.updateBlockProgress
    });
  }
  getInstanceName() {
    return `${this.getType().toLowerCase()}s_${this.netId}_${this.currency}_${this.amount}`;
  }
  getGraphMethod() {
    return `getAll${this.getType()}s`;
  }
  getGraphParams() {
    return {
      graphApi: this.graphApi || "",
      subgraphName: this.subgraphName || "",
      amount: this.amount,
      currency: this.currency,
      fetchDataOptions: this.fetchDataOptions,
      onProgress: this.updateGraphProgress
    };
  }
  async formatEvents(events) {
    const type = this.getType().toLowerCase();
    if (type === DEPOSIT) {
      const formattedEvents = events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { commitment, leafIndex, timestamp } = args;
        return {
          blockNumber,
          logIndex,
          transactionHash,
          commitment,
          leafIndex: Number(leafIndex),
          timestamp: Number(timestamp)
        };
      });
      const txs = await this.batchTransactionService.getBatchTransactions([
        ...new Set(formattedEvents.map(({ transactionHash }) => transactionHash))
      ]);
      return formattedEvents.map((event) => {
        const { from } = txs.find(({ hash }) => hash === event.transactionHash);
        return {
          ...event,
          from
        };
      });
    } else {
      const formattedEvents = events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { nullifierHash, to, fee } = args;
        return {
          blockNumber,
          logIndex,
          transactionHash,
          nullifierHash: String(nullifierHash),
          to: ethers.getAddress(to),
          fee: String(fee)
        };
      });
      const blocks = await this.batchBlockService.getBatchBlocks([
        ...new Set(formattedEvents.map(({ blockNumber }) => blockNumber))
      ]);
      return formattedEvents.map((event) => {
        const { timestamp } = blocks.find(({ number }) => number === event.blockNumber);
        return {
          ...event,
          timestamp
        };
      });
    }
  }
  async validateEvents({
    events,
    hasNewEvents
  }) {
    if (events.length && this.getType().toLowerCase() === DEPOSIT) {
      const depositEvents = events;
      const lastEvent = depositEvents[depositEvents.length - 1];
      if (lastEvent.leafIndex !== depositEvents.length - 1) {
        const errMsg = `Deposit events invalid wants ${depositEvents.length - 1} leafIndex have ${lastEvent.leafIndex}`;
        throw new Error(errMsg);
      }
      if (this.merkleTreeService && (!this.optionalTree || hasNewEvents)) {
        return await this.merkleTreeService.verifyTree(depositEvents);
      }
    }
    return void 0;
  }
  async getLatestEvents({ fromBlock }) {
    if (this.tovarishClient?.selectedRelayer) {
      const { events, lastSyncBlock: lastBlock } = await this.tovarishClient.getEvents({
        type: this.getTovarishType(),
        currency: this.currency,
        amount: this.amount,
        fromBlock
      });
      return {
        events,
        lastBlock
      };
    }
    return super.getLatestEvents({ fromBlock });
  }
}
class BaseEchoService extends BaseEventsService {
  constructor(serviceConstructor) {
    super({
      ...serviceConstructor,
      contract: serviceConstructor.Echoer,
      type: "Echo"
    });
  }
  getInstanceName() {
    return `echo_${this.netId}`;
  }
  getGraphMethod() {
    return "getAllGraphEchoEvents";
  }
  async formatEvents(events) {
    return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
      const { who, data } = args;
      if (who && data) {
        const eventObjects = {
          blockNumber,
          logIndex,
          transactionHash
        };
        return {
          ...eventObjects,
          address: who,
          encryptedAccount: data
        };
      }
    }).filter((e) => e);
  }
  async getEventsFromGraph({ fromBlock }) {
    if (!this.graphApi || this.graphApi.includes("api.thegraph.com")) {
      return {
        events: [],
        lastBlock: fromBlock
      };
    }
    return super.getEventsFromGraph({ fromBlock });
  }
}
class BaseEncryptedNotesService extends BaseEventsService {
  constructor(serviceConstructor) {
    super({
      ...serviceConstructor,
      contract: serviceConstructor.Router,
      type: "EncryptedNote"
    });
  }
  getInstanceName() {
    return `encrypted_notes_${this.netId}`;
  }
  getTovarishType() {
    return "encrypted_notes";
  }
  getGraphMethod() {
    return "getAllEncryptedNotes";
  }
  async formatEvents(events) {
    return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
      const { encryptedNote } = args;
      if (encryptedNote && encryptedNote !== "0x") {
        const eventObjects = {
          blockNumber,
          logIndex,
          transactionHash
        };
        return {
          ...eventObjects,
          encryptedNote
        };
      }
    }).filter((e) => e);
  }
}
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const proposalState = {
  0: "Pending",
  1: "Active",
  2: "Defeated",
  3: "Timelocked",
  4: "AwaitingExecution",
  5: "Executed",
  6: "Expired"
};
function parseDescription(id, text) {
  switch (id) {
    case 1:
      return {
        title: text,
        description: "See: https://torn.community/t/proposal-1-enable-torn-transfers/38"
      };
    case 10:
      text = text.replace("\n", "\\n\\n");
      break;
    case 11:
      text = text.replace('"description"', ',"description"');
      break;
    case 13:
      text = text.replace(/\\\\n\\\\n(\s)?(\\n)?/g, "\\n");
      break;
    case 15:
      text = text.replaceAll("'", '"');
      text = text.replace('"description"', ',"description"');
      break;
    case 16:
      text = text.replace("#16: ", "");
      break;
    case 21:
      return {
        title: "Proposal #21: Restore Governance",
        description: ""
      };
  }
  let title, description, rest;
  try {
    ({ title, description } = JSON.parse(text));
  } catch {
    [title, ...rest] = text.split("\n", 2);
    description = rest.join("\n");
  }
  return {
    title,
    description
  };
}
function parseComment(Governance, calldata) {
  try {
    const methodLength = 4;
    const result = abiCoder.decode(["address[]", "uint256", "bool"], ethers.dataSlice(calldata, methodLength));
    const data = Governance.interface.encodeFunctionData("castDelegatedVote", result);
    const length = ethers.dataLength(data);
    const str = abiCoder.decode(["string"], ethers.dataSlice(calldata, length))[0];
    const [contact, message] = JSON.parse(str);
    return {
      contact,
      message
    };
  } catch {
    return {
      contact: "",
      message: ""
    };
  }
}
class BaseGovernanceService extends BaseEventsService {
  Governance;
  Aggregator;
  ReverseRecords;
  batchTransactionService;
  constructor(serviceConstructor) {
    const { Governance, Aggregator, ReverseRecords, provider } = serviceConstructor;
    super({
      ...serviceConstructor,
      contract: Governance,
      type: "*"
    });
    this.Governance = Governance;
    this.Aggregator = Aggregator;
    this.ReverseRecords = ReverseRecords;
    this.batchTransactionService = new BatchTransactionService({
      provider,
      onProgress: this.updateTransactionProgress
    });
  }
  getInstanceName() {
    return `governance_${this.netId}`;
  }
  getTovarishType() {
    return "governance";
  }
  getGraphMethod() {
    return "getAllGovernanceEvents";
  }
  async formatEvents(events) {
    const proposalEvents = [];
    const votedEvents = [];
    const delegatedEvents = [];
    const undelegatedEvents = [];
    events.forEach(({ blockNumber, index: logIndex, transactionHash, args, eventName: event }) => {
      const eventObjects = {
        blockNumber,
        logIndex,
        transactionHash,
        event
      };
      if (event === "ProposalCreated") {
        const { id, proposer, target, startTime, endTime, description } = args;
        proposalEvents.push({
          ...eventObjects,
          id: Number(id),
          proposer,
          target,
          startTime: Number(startTime),
          endTime: Number(endTime),
          description
        });
      }
      if (event === "Voted") {
        const { proposalId, voter, support, votes } = args;
        votedEvents.push({
          ...eventObjects,
          proposalId: Number(proposalId),
          voter,
          support,
          votes,
          from: "",
          input: ""
        });
      }
      if (event === "Delegated") {
        const { account, to: delegateTo } = args;
        delegatedEvents.push({
          ...eventObjects,
          account,
          delegateTo
        });
      }
      if (event === "Undelegated") {
        const { account, from: delegateFrom } = args;
        undelegatedEvents.push({
          ...eventObjects,
          account,
          delegateFrom
        });
      }
    });
    if (votedEvents.length) {
      this.updateTransactionProgress({ percentage: 0 });
      const txs = await this.batchTransactionService.getBatchTransactions([
        ...new Set(votedEvents.map(({ transactionHash }) => transactionHash))
      ]);
      votedEvents.forEach((event, index) => {
        let { data: input, from } = txs.find((t) => t.hash === event.transactionHash);
        if (!input || input.length > 2048) {
          input = "";
        }
        votedEvents[index].from = from;
        votedEvents[index].input = input;
      });
    }
    return [...proposalEvents, ...votedEvents, ...delegatedEvents, ...undelegatedEvents];
  }
  async getEventsFromGraph({ fromBlock }) {
    if (!this.graphApi || !this.subgraphName || this.graphApi.includes("api.thegraph.com")) {
      return {
        events: [],
        lastBlock: fromBlock
      };
    }
    return super.getEventsFromGraph({ fromBlock });
  }
  async getAllProposals() {
    const { events } = await this.updateEvents();
    const proposalEvents = events.filter((e) => e.event === "ProposalCreated");
    const allProposers = [...new Set(proposalEvents.map((e) => [e.proposer]).flat())];
    const [QUORUM_VOTES, proposalStatus, proposerNameRecords] = await Promise.all([
      this.Governance.QUORUM_VOTES(),
      this.Aggregator.getAllProposals(this.Governance.target),
      this.ReverseRecords.getNames(allProposers)
    ]);
    const proposerNames = allProposers.reduce(
      (acc, address, index) => {
        if (proposerNameRecords[index]) {
          acc[address] = proposerNameRecords[index];
        }
        return acc;
      },
      {}
    );
    return proposalEvents.map((event, index) => {
      const { id, proposer, description: text } = event;
      const status = proposalStatus[index];
      const { forVotes, againstVotes, executed, extended, state } = status;
      const { title, description } = parseDescription(id, text);
      const quorum = (Number(forVotes + againstVotes) / Number(QUORUM_VOTES) * 100).toFixed(0) + "%";
      return {
        ...event,
        title,
        proposerName: proposerNames[proposer] || void 0,
        description,
        forVotes,
        againstVotes,
        executed,
        extended,
        quorum,
        state: proposalState[String(state)]
      };
    });
  }
  async getVotes(proposalId) {
    const { events } = await this.getSavedEvents();
    const votedEvents = events.filter(
      (e) => e.event === "Voted" && e.proposalId === proposalId
    );
    const allVoters = [...new Set(votedEvents.map((e) => [e.from, e.voter]).flat())];
    const names = await this.ReverseRecords.getNames(allVoters);
    const ensNames = allVoters.reduce(
      (acc, address, index) => {
        if (names[index]) {
          acc[address] = names[index];
        }
        return acc;
      },
      {}
    );
    const votes = votedEvents.map((event) => {
      const { from, voter } = event;
      const { contact, message } = parseComment(this.Governance, event.input);
      return {
        ...event,
        contact,
        message,
        fromName: ensNames[from] || void 0,
        voterName: ensNames[voter] || void 0
      };
    });
    return votes;
  }
  async getDelegatedBalance(ethAccount) {
    const { events } = await this.getSavedEvents();
    const delegatedAccs = events.filter((e) => e.event === "Delegated" && e.delegateTo === ethAccount).map((e) => e.account);
    const undelegatedAccs = events.filter((e) => e.event === "Undelegated" && e.delegateFrom === ethAccount).map((e) => e.account);
    const undel = [...undelegatedAccs];
    const uniq = delegatedAccs.filter((acc) => {
      const indexUndelegated = undel.indexOf(acc);
      if (indexUndelegated !== -1) {
        undel.splice(indexUndelegated, 1);
        return false;
      }
      return true;
    });
    const [balances, uniqNameRecords] = await Promise.all([
      this.Aggregator.getGovernanceBalances(this.Governance.target, uniq),
      this.ReverseRecords.getNames(uniq)
    ]);
    const uniqNames = uniq.reduce(
      (acc, address, index) => {
        if (uniqNameRecords[index]) {
          acc[address] = uniqNameRecords[index];
        }
        return acc;
      },
      {}
    );
    return {
      delegatedAccs,
      undelegatedAccs,
      uniq,
      uniqNames,
      balances,
      balance: balances.reduce((acc, curr) => acc + curr, BigInt(0))
    };
  }
}
async function getTovarishNetworks(registryService, relayers) {
  await Promise.all(
    relayers.filter((r) => r.tovarishHost).map(async (relayer) => {
      try {
        relayer.tovarishNetworks = await fetchData(relayer.tovarishHost, {
          ...registryService.fetchDataOptions,
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 3e4,
          maxRetry: registryService.fetchDataOptions?.torPort ? 2 : 0
        });
      } catch {
        relayer.tovarishNetworks = [];
      }
    })
  );
}
const staticRelayers = [
  {
    ensName: "tornadowithdraw.eth",
    relayerAddress: "0x40c3d1656a26C9266f4A10fed0D87EFf79F54E64",
    hostnames: {},
    tovarishHost: "tornadowithdraw.com",
    tovarishNetworks: enabledChains
  }
];
class BaseRegistryService extends BaseEventsService {
  Aggregator;
  relayerEnsSubdomains;
  updateInterval;
  constructor(serviceConstructor) {
    const { RelayerRegistry: contract, Aggregator, relayerEnsSubdomains } = serviceConstructor;
    super({
      ...serviceConstructor,
      contract,
      type: "RelayerRegistered"
    });
    this.Aggregator = Aggregator;
    this.relayerEnsSubdomains = relayerEnsSubdomains;
    this.updateInterval = 86400;
  }
  getInstanceName() {
    return `registered_${this.netId}`;
  }
  getTovarishType() {
    return "registered";
  }
  // Name of method used for graph
  getGraphMethod() {
    return "getAllRegisters";
  }
  async formatEvents(events) {
    return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
      const eventObjects = {
        blockNumber,
        logIndex,
        transactionHash
      };
      return {
        ...eventObjects,
        ensName: args.ensName,
        relayerAddress: args.relayerAddress
      };
    });
  }
  /**
   * Get saved or cached relayers
   */
  async getRelayersFromDB() {
    return {
      lastBlock: 0,
      timestamp: 0,
      relayers: []
    };
  }
  /**
   * Relayers from remote cache (Either from local cache, CDN, or from IPFS)
   */
  async getRelayersFromCache() {
    return {
      lastBlock: 0,
      timestamp: 0,
      relayers: [],
      fromCache: true
    };
  }
  async getSavedRelayers() {
    let cachedRelayers = await this.getRelayersFromDB();
    if (!cachedRelayers || !cachedRelayers.relayers.length) {
      cachedRelayers = await this.getRelayersFromCache();
    }
    return cachedRelayers;
  }
  async getLatestRelayers() {
    const { events, lastBlock } = await this.updateEvents();
    const subdomains = Object.values(this.relayerEnsSubdomains);
    const registerSet = /* @__PURE__ */ new Set();
    const uniqueRegisters = events.filter(({ ensName }) => {
      if (!registerSet.has(ensName)) {
        registerSet.add(ensName);
        return true;
      }
      return false;
    });
    const relayerNameHashes = uniqueRegisters.map((r) => ethers.namehash(r.ensName));
    const [relayersData, timestamp] = await Promise.all([
      this.Aggregator.relayersData.staticCall(relayerNameHashes, subdomains.concat("tovarish-relayer")),
      this.provider.getBlock(lastBlock).then((b) => Number(b?.timestamp))
    ]);
    const relayers = relayersData.map(({ owner, balance: stakeBalance, records, isRegistered }, index) => {
      const { ensName, relayerAddress } = uniqueRegisters[index];
      let tovarishHost = void 0;
      const hostnames = records.reduce((acc, record, recordIndex) => {
        if (record) {
          if (recordIndex === records.length - 1) {
            tovarishHost = record;
            return acc;
          }
          acc[Number(Object.keys(this.relayerEnsSubdomains)[recordIndex])] = record;
        }
        return acc;
      }, {});
      const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;
      const preCondition = Object.keys(hostnames).length && isRegistered && hasMinBalance;
      if (preCondition) {
        return {
          ensName,
          relayerAddress: owner,
          registeredAddress: owner !== relayerAddress ? relayerAddress : void 0,
          isRegistered,
          stakeBalance: ethers.formatEther(stakeBalance),
          hostnames,
          tovarishHost
        };
      }
    }).filter((r) => r);
    await getTovarishNetworks(this, relayers);
    const allRelayers = [...staticRelayers, ...relayers];
    const tovarishRelayers = allRelayers.filter((r) => r.tovarishHost);
    const classicRelayers = allRelayers.filter((r) => !r.tovarishHost);
    return {
      lastBlock,
      timestamp,
      relayers: [...tovarishRelayers, ...classicRelayers]
    };
  }
  /**
   * Handle saving relayers
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveRelayers({ lastBlock, timestamp, relayers }) {
  }
  /**
   * Get cached or latest relayer and save to local
   */
  async updateRelayers() {
    let { lastBlock, timestamp, relayers, fromCache } = await this.getSavedRelayers();
    let shouldSave = fromCache ?? false;
    if (!relayers.length || timestamp + this.updateInterval < Math.floor(Date.now() / 1e3)) {
      console.log("\nUpdating relayers from registry\n");
      ({ lastBlock, timestamp, relayers } = await this.getLatestRelayers());
      shouldSave = true;
    }
    if (shouldSave) {
      await this.saveRelayers({ lastBlock, timestamp, relayers });
    }
    return { lastBlock, timestamp, relayers };
  }
}

function zipAsync(file) {
  return new Promise((res, rej) => {
    fflate.zip(file, { mtime: /* @__PURE__ */ new Date("1/1/1980") }, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}
function unzipAsync(data) {
  return new Promise((res, rej) => {
    fflate.unzip(data, {}, (err, data2) => {
      if (err) {
        rej(err);
        return;
      }
      res(data2);
    });
  });
}
async function downloadZip({
  staticUrl = "",
  zipName,
  zipDigest,
  parseJson = true
}) {
  const url = `${staticUrl}/${zipName}.zip`;
  const resp = await fetchData(url, {
    method: "GET",
    returnResponse: true
  });
  const data = new Uint8Array(await resp.arrayBuffer());
  if (zipDigest) {
    const hash = "sha384-" + bytesToBase64(await digest(data));
    if (zipDigest !== hash) {
      const errMsg = `Invalid digest hash for file ${url}, wants ${zipDigest} has ${hash}`;
      throw new Error(errMsg);
    }
  }
  const { [zipName]: content } = await unzipAsync(data);
  console.log(`Downloaded ${url}${zipDigest ? ` ( Digest: ${zipDigest} )` : ""}`);
  if (parseJson) {
    return JSON.parse(new TextDecoder().decode(content));
  }
  return content;
}

async function saveDBEvents({
  idb,
  instanceName,
  events,
  lastBlock
}) {
  try {
    const formattedEvents = events.map((e) => {
      return {
        eid: `${e.transactionHash}_${e.logIndex}`,
        ...e
      };
    });
    await idb.createMultipleTransactions({
      data: formattedEvents,
      storeName: instanceName
    });
    await idb.putItem({
      data: {
        blockNumber: lastBlock,
        name: instanceName
      },
      storeName: "lastEvents"
    });
  } catch (err) {
    console.log("Method saveDBEvents has error");
    console.log(err);
  }
}
async function loadDBEvents({
  idb,
  instanceName
}) {
  try {
    const lastBlockStore = await idb.getItem({
      storeName: "lastEvents",
      key: instanceName
    });
    if (!lastBlockStore?.blockNumber) {
      return {
        events: [],
        lastBlock: 0
      };
    }
    const events = (await idb.getAll({ storeName: instanceName })).map((e) => {
      delete e.eid;
      return e;
    });
    return {
      events,
      lastBlock: lastBlockStore.blockNumber
    };
  } catch (err) {
    console.log("Method loadDBEvents has error");
    console.log(err);
    return {
      events: [],
      lastBlock: 0
    };
  }
}
async function loadRemoteEvents({
  staticUrl,
  instanceName,
  deployedBlock,
  zipDigest
}) {
  try {
    const zipName = `${instanceName}.json`.toLowerCase();
    const events = await downloadZip({
      staticUrl,
      zipName,
      zipDigest
    });
    if (!Array.isArray(events)) {
      const errStr = `Invalid events from ${staticUrl}/${zipName}`;
      throw new Error(errStr);
    }
    return {
      events,
      lastBlock: events[events.length - 1]?.blockNumber || deployedBlock,
      fromCache: true
    };
  } catch (err) {
    console.log("Method loadRemoteEvents has error");
    console.log(err);
    return {
      events: [],
      lastBlock: deployedBlock,
      fromCache: true
    };
  }
}
class DBTornadoService extends BaseTornadoService {
  staticUrl;
  idb;
  zipDigest;
  constructor(params) {
    super(params);
    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }
  async getEventsFromDB() {
    return await loadDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName()
    });
  }
  async getEventsFromCache() {
    return await loadRemoteEvents({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest
    });
  }
  async saveEvents({ events, lastBlock }) {
    await saveDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock
    });
  }
}
class DBEchoService extends BaseEchoService {
  staticUrl;
  idb;
  zipDigest;
  constructor(params) {
    super(params);
    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }
  async getEventsFromDB() {
    return await loadDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName()
    });
  }
  async getEventsFromCache() {
    return await loadRemoteEvents({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest
    });
  }
  async saveEvents({ events, lastBlock }) {
    await saveDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock
    });
  }
}
class DBEncryptedNotesService extends BaseEncryptedNotesService {
  staticUrl;
  idb;
  zipDigest;
  constructor(params) {
    super(params);
    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }
  async getEventsFromDB() {
    return await loadDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName()
    });
  }
  async getEventsFromCache() {
    return await loadRemoteEvents({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest
    });
  }
  async saveEvents({ events, lastBlock }) {
    await saveDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock
    });
  }
}
class DBGovernanceService extends BaseGovernanceService {
  staticUrl;
  idb;
  zipDigest;
  constructor(params) {
    super(params);
    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }
  async getEventsFromDB() {
    return await loadDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName()
    });
  }
  async getEventsFromCache() {
    return await loadRemoteEvents({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest
    });
  }
  async saveEvents({ events, lastBlock }) {
    await saveDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock
    });
  }
}
class DBRegistryService extends BaseRegistryService {
  staticUrl;
  idb;
  zipDigest;
  constructor(params) {
    super(params);
    this.staticUrl = params.staticUrl;
    this.idb = params.idb;
  }
  async getEventsFromDB() {
    return await loadDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName()
    });
  }
  async getEventsFromCache() {
    return await loadRemoteEvents({
      staticUrl: this.staticUrl,
      instanceName: this.getInstanceName(),
      deployedBlock: this.deployedBlock,
      zipDigest: this.zipDigest
    });
  }
  async saveEvents({ events, lastBlock }) {
    await saveDBEvents({
      idb: this.idb,
      instanceName: this.getInstanceName(),
      events,
      lastBlock
    });
  }
}

const _abi$8 = [
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      }
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "pure",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "key",
        type: "string"
      },
      {
        internalType: "string",
        name: "value",
        type: "string"
      }
    ],
    name: "setText",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      }
    ],
    name: "interfaceImplementer",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "contentTypes",
        type: "uint256"
      }
    ],
    name: "ABI",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    name: "setPubkey",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "hash",
        type: "bytes"
      }
    ],
    name: "setContenthash",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "addr",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "target",
        type: "address"
      },
      {
        internalType: "bool",
        name: "isAuthorised",
        type: "bool"
      }
    ],
    name: "setAuthorisation",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "key",
        type: "string"
      }
    ],
    name: "text",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "contentType",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "setABI",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "name",
        type: "string"
      }
    ],
    name: "setName",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "a",
        type: "bytes"
      }
    ],
    name: "setAddr",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "contenthash",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "pubkey",
    outputs: [
      {
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "a",
        type: "address"
      }
    ],
    name: "setAddr",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      },
      {
        internalType: "address",
        name: "implementer",
        type: "address"
      }
    ],
    name: "setInterface",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      }
    ],
    name: "addr",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "authorisations",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract ENS",
        name: "_ens",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "target",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isAuthorised",
        type: "bool"
      }
    ],
    name: "AuthorisationChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "string",
        name: "indexedKey",
        type: "string"
      },
      {
        indexed: false,
        internalType: "string",
        name: "key",
        type: "string"
      }
    ],
    name: "TextChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    name: "PubkeyChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string"
      }
    ],
    name: "NameChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      },
      {
        indexed: false,
        internalType: "address",
        name: "implementer",
        type: "address"
      }
    ],
    name: "InterfaceChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "hash",
        type: "bytes"
      }
    ],
    name: "ContenthashChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "a",
        type: "address"
      }
    ],
    name: "AddrChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "newAddress",
        type: "bytes"
      }
    ],
    name: "AddressChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "contentType",
        type: "uint256"
      }
    ],
    name: "ABIChanged",
    type: "event"
  }
];
class ENS__factory {
  static abi = _abi$8;
  static createInterface() {
    return new ethers.Interface(_abi$8);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$8, runner);
  }
}

const _abi$7 = [
  {
    inputs: [
      {
        internalType: "contract ENS",
        name: "_ens",
        type: "address"
      },
      {
        internalType: "contract IBaseRegistrar",
        name: "_registrar",
        type: "address"
      },
      {
        internalType: "contract IMetadataService",
        name: "_metadataService",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "CannotUpgrade",
    type: "error"
  },
  {
    inputs: [],
    name: "IncompatibleParent",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "IncorrectTargetOwner",
    type: "error"
  },
  {
    inputs: [],
    name: "IncorrectTokenType",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "labelHash",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "expectedLabelhash",
        type: "bytes32"
      }
    ],
    name: "LabelMismatch",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "label",
        type: "string"
      }
    ],
    name: "LabelTooLong",
    type: "error"
  },
  {
    inputs: [],
    name: "LabelTooShort",
    type: "error"
  },
  {
    inputs: [],
    name: "NameIsNotWrapped",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "OperationProhibited",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "addr",
        type: "address"
      }
    ],
    name: "Unauthorised",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "controller",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "active",
        type: "bool"
      }
    ],
    name: "ControllerChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "ExpiryExtended",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      }
    ],
    name: "FusesSet",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "NameUnwrapped",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "NameWrapped",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]"
      }
    ],
    name: "TransferBatch",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "TransferSingle",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "value",
        type: "string"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256"
      }
    ],
    name: "URI",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "_tokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint32",
        name: "fuseMask",
        type: "uint32"
      }
    ],
    name: "allFusesBurned",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      }
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "accounts",
        type: "address[]"
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]"
      }
    ],
    name: "balanceOfBatch",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "addr",
        type: "address"
      }
    ],
    name: "canExtendSubnames",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "addr",
        type: "address"
      }
    ],
    name: "canModifyName",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "controllers",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "ens",
    outputs: [
      {
        internalType: "contract ENS",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "labelhash",
        type: "bytes32"
      },
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "extendExpiry",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256"
      }
    ],
    name: "getApproved",
    outputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256"
      }
    ],
    name: "getData",
    outputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      },
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        internalType: "address",
        name: "operator",
        type: "address"
      }
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "labelhash",
        type: "bytes32"
      }
    ],
    name: "isWrapped",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "isWrapped",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "metadataService",
    outputs: [
      {
        internalType: "contract IMetadataService",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    name: "names",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "onERC721Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256"
      }
    ],
    name: "ownerOf",
    outputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address"
      },
      {
        internalType: "address",
        name: "_to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "recoverFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "label",
        type: "string"
      },
      {
        internalType: "address",
        name: "wrappedOwner",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      },
      {
        internalType: "uint16",
        name: "ownerControlledFuses",
        type: "uint16"
      }
    ],
    name: "registerAndWrapETH2LD",
    outputs: [
      {
        internalType: "uint256",
        name: "registrarExpiry",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "registrar",
    outputs: [
      {
        internalType: "contract IBaseRegistrar",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256"
      }
    ],
    name: "renew",
    outputs: [
      {
        internalType: "uint256",
        name: "expires",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]"
      },
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "safeBatchTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "labelhash",
        type: "bytes32"
      },
      {
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      },
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "setChildFuses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "controller",
        type: "address"
      },
      {
        internalType: "bool",
        name: "active",
        type: "bool"
      }
    ],
    name: "setController",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint16",
        name: "ownerControlledFuses",
        type: "uint16"
      }
    ],
    name: "setFuses",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IMetadataService",
        name: "_metadataService",
        type: "address"
      }
    ],
    name: "setMetadataService",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "setRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      }
    ],
    name: "setResolver",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "label",
        type: "string"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      },
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "setSubnodeOwner",
    outputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "label",
        type: "string"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      },
      {
        internalType: "uint32",
        name: "fuses",
        type: "uint32"
      },
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    name: "setSubnodeRecord",
    outputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "setTTL",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract INameWrapperUpgrade",
        name: "_upgradeAddress",
        type: "address"
      }
    ],
    name: "setUpgradeContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4"
      }
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "parentNode",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "labelhash",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "controller",
        type: "address"
      }
    ],
    name: "unwrap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "labelhash",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "registrant",
        type: "address"
      },
      {
        internalType: "address",
        name: "controller",
        type: "address"
      }
    ],
    name: "unwrapETH2LD",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        internalType: "bytes",
        name: "extraData",
        type: "bytes"
      }
    ],
    name: "upgrade",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "upgradeContract",
    outputs: [
      {
        internalType: "contract INameWrapperUpgrade",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      }
    ],
    name: "uri",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        internalType: "address",
        name: "wrappedOwner",
        type: "address"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      }
    ],
    name: "wrap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "label",
        type: "string"
      },
      {
        internalType: "address",
        name: "wrappedOwner",
        type: "address"
      },
      {
        internalType: "uint16",
        name: "ownerControlledFuses",
        type: "uint16"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      }
    ],
    name: "wrapETH2LD",
    outputs: [
      {
        internalType: "uint64",
        name: "expiry",
        type: "uint64"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
];
class ENSNameWrapper__factory {
  static abi = _abi$7;
  static createInterface() {
    return new ethers.Interface(_abi$7);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$7, runner);
  }
}

const _abi$6 = [
  {
    inputs: [
      {
        internalType: "contract ENS",
        name: "_old",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "label",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "NewOwner",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "resolver",
        type: "address"
      }
    ],
    name: "NewResolver",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "NewTTL",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "operator",
        type: "address"
      }
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "old",
    outputs: [
      {
        internalType: "contract ENS",
        name: "",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "recordExists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "resolver",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "setApprovalForAll",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "setOwner",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "setRecord",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      }
    ],
    name: "setResolver",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "label",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "setSubnodeOwner",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "label",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "setSubnodeRecord",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint64",
        name: "ttl",
        type: "uint64"
      }
    ],
    name: "setTTL",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "ttl",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];
class ENSRegistry__factory {
  static abi = _abi$6;
  static createInterface() {
    return new ethers.Interface(_abi$6);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$6, runner);
  }
}

const _abi$5 = [
  {
    inputs: [
      {
        internalType: "contract ENS",
        name: "_ens",
        type: "address"
      },
      {
        internalType: "contract INameWrapper",
        name: "wrapperAddress",
        type: "address"
      },
      {
        internalType: "address",
        name: "_trustedETHController",
        type: "address"
      },
      {
        internalType: "address",
        name: "_trustedReverseRegistrar",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "contentType",
        type: "uint256"
      }
    ],
    name: "ABIChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "address",
        name: "a",
        type: "address"
      }
    ],
    name: "AddrChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "newAddress",
        type: "bytes"
      }
    ],
    name: "AddressChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "delegate",
        type: "address"
      },
      {
        indexed: true,
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "Approved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "hash",
        type: "bytes"
      }
    ],
    name: "ContenthashChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        indexed: false,
        internalType: "uint16",
        name: "resource",
        type: "uint16"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "record",
        type: "bytes"
      }
    ],
    name: "DNSRecordChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        indexed: false,
        internalType: "uint16",
        name: "resource",
        type: "uint16"
      }
    ],
    name: "DNSRecordDeleted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "lastzonehash",
        type: "bytes"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "zonehash",
        type: "bytes"
      }
    ],
    name: "DNSZonehashChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      },
      {
        indexed: false,
        internalType: "address",
        name: "implementer",
        type: "address"
      }
    ],
    name: "InterfaceChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string"
      }
    ],
    name: "NameChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    name: "PubkeyChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "string",
        name: "indexedKey",
        type: "string"
      },
      {
        indexed: false,
        internalType: "string",
        name: "key",
        type: "string"
      },
      {
        indexed: false,
        internalType: "string",
        name: "value",
        type: "string"
      }
    ],
    name: "TextChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "newVersion",
        type: "uint64"
      }
    ],
    name: "VersionChanged",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "contentTypes",
        type: "uint256"
      }
    ],
    name: "ABI",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "addr",
    outputs: [
      {
        internalType: "address payable",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      }
    ],
    name: "addr",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "delegate",
        type: "address"
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "clearRecords",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "contenthash",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "name",
        type: "bytes32"
      },
      {
        internalType: "uint16",
        name: "resource",
        type: "uint16"
      }
    ],
    name: "dnsRecord",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "name",
        type: "bytes32"
      }
    ],
    name: "hasDNSRecords",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      }
    ],
    name: "interfaceImplementer",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "delegate",
        type: "address"
      }
    ],
    name: "isApprovedFor",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        internalType: "address",
        name: "operator",
        type: "address"
      }
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes[]",
        name: "data",
        type: "bytes[]"
      }
    ],
    name: "multicall",
    outputs: [
      {
        internalType: "bytes[]",
        name: "results",
        type: "bytes[]"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "nodehash",
        type: "bytes32"
      },
      {
        internalType: "bytes[]",
        name: "data",
        type: "bytes[]"
      }
    ],
    name: "multicallWithNodeCheck",
    outputs: [
      {
        internalType: "bytes[]",
        name: "results",
        type: "bytes[]"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "pubkey",
    outputs: [
      {
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    name: "recordVersions",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "contentType",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "setABI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "coinType",
        type: "uint256"
      },
      {
        internalType: "bytes",
        name: "a",
        type: "bytes"
      }
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "a",
        type: "address"
      }
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "hash",
        type: "bytes"
      }
    ],
    name: "setContenthash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "setDNSRecords",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      },
      {
        internalType: "address",
        name: "implementer",
        type: "address"
      }
    ],
    name: "setInterface",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "newName",
        type: "string"
      }
    ],
    name: "setName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "x",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "y",
        type: "bytes32"
      }
    ],
    name: "setPubkey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "key",
        type: "string"
      },
      {
        internalType: "string",
        name: "value",
        type: "string"
      }
    ],
    name: "setText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "hash",
        type: "bytes"
      }
    ],
    name: "setZonehash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceID",
        type: "bytes4"
      }
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "key",
        type: "string"
      }
    ],
    name: "text",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32"
      }
    ],
    name: "zonehash",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
class ENSResolver__factory {
  static abi = _abi$5;
  static createInterface() {
    return new ethers.Interface(_abi$5);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$5, runner);
  }
}

const _abi$4 = [
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "_totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "transfer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      }
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "transferFrom",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "approve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8"
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32"
      }
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
class ERC20__factory {
  static abi = _abi$4;
  static createInterface() {
    return new ethers.Interface(_abi$4);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$4, runner);
  }
}

const _abi$3 = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "aggregate",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256"
      },
      {
        internalType: "bytes[]",
        name: "returnData",
        type: "bytes[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bool",
            name: "allowFailure",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call3[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bool",
            name: "allowFailure",
            type: "bool"
          },
          {
            internalType: "uint256",
            name: "value",
            type: "uint256"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call3Value[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "aggregate3Value",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "blockAndAggregate",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32"
      },
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "getBasefee",
    outputs: [
      {
        internalType: "uint256",
        name: "basefee",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256"
      }
    ],
    name: "getBlockHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getBlockNumber",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getChainId",
    outputs: [
      {
        internalType: "uint256",
        name: "chainid",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentBlockCoinbase",
    outputs: [
      {
        internalType: "address",
        name: "coinbase",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentBlockDifficulty",
    outputs: [
      {
        internalType: "uint256",
        name: "difficulty",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentBlockGasLimit",
    outputs: [
      {
        internalType: "uint256",
        name: "gaslimit",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentBlockTimestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address"
      }
    ],
    name: "getEthBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getLastBlockHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool"
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "tryAggregate",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool"
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address"
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "tryBlockAndAggregate",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32"
      },
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool"
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes"
          }
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "payable",
    type: "function"
  }
];
class Multicall__factory {
  static abi = _abi$3;
  static createInterface() {
    return new ethers.Interface(_abi$3);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$3, runner);
  }
}

const _abi$2 = [
  {
    inputs: [
      {
        internalType: "contract MultiWrapper",
        name: "_multiWrapper",
        type: "address"
      },
      {
        internalType: "contract IOracle[]",
        name: "existingOracles",
        type: "address[]"
      },
      {
        internalType: "enum OffchainOracle.OracleType[]",
        name: "oracleTypes",
        type: "uint8[]"
      },
      {
        internalType: "contract IERC20[]",
        name: "existingConnectors",
        type: "address[]"
      },
      {
        internalType: "contract IERC20",
        name: "wBase",
        type: "address"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "ArraysLengthMismatch",
    type: "error"
  },
  {
    inputs: [],
    name: "ConnectorAlreadyAdded",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidOracleTokenKind",
    type: "error"
  },
  {
    inputs: [],
    name: "OracleAlreadyAdded",
    type: "error"
  },
  {
    inputs: [],
    name: "SameTokens",
    type: "error"
  },
  {
    inputs: [],
    name: "TooBigThreshold",
    type: "error"
  },
  {
    inputs: [],
    name: "UnknownConnector",
    type: "error"
  },
  {
    inputs: [],
    name: "UnknownOracle",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract IERC20",
        name: "connector",
        type: "address"
      }
    ],
    name: "ConnectorAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract IERC20",
        name: "connector",
        type: "address"
      }
    ],
    name: "ConnectorRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract MultiWrapper",
        name: "multiWrapper",
        type: "address"
      }
    ],
    name: "MultiWrapperUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract IOracle",
        name: "oracle",
        type: "address"
      },
      {
        indexed: false,
        internalType: "enum OffchainOracle.OracleType",
        name: "oracleType",
        type: "uint8"
      }
    ],
    name: "OracleAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract IOracle",
        name: "oracle",
        type: "address"
      },
      {
        indexed: false,
        internalType: "enum OffchainOracle.OracleType",
        name: "oracleType",
        type: "uint8"
      }
    ],
    name: "OracleRemoved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "connector",
        type: "address"
      }
    ],
    name: "addConnector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IOracle",
        name: "oracle",
        type: "address"
      },
      {
        internalType: "enum OffchainOracle.OracleType",
        name: "oracleKind",
        type: "uint8"
      }
    ],
    name: "addOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "connectors",
    outputs: [
      {
        internalType: "contract IERC20[]",
        name: "allConnectors",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "contract IERC20",
        name: "dstToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useWrappers",
        type: "bool"
      }
    ],
    name: "getRate",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useSrcWrappers",
        type: "bool"
      }
    ],
    name: "getRateToEth",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useSrcWrappers",
        type: "bool"
      },
      {
        internalType: "contract IERC20[]",
        name: "customConnectors",
        type: "address[]"
      },
      {
        internalType: "uint256",
        name: "thresholdFilter",
        type: "uint256"
      }
    ],
    name: "getRateToEthWithCustomConnectors",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useSrcWrappers",
        type: "bool"
      },
      {
        internalType: "uint256",
        name: "thresholdFilter",
        type: "uint256"
      }
    ],
    name: "getRateToEthWithThreshold",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "contract IERC20",
        name: "dstToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useWrappers",
        type: "bool"
      },
      {
        internalType: "contract IERC20[]",
        name: "customConnectors",
        type: "address[]"
      },
      {
        internalType: "uint256",
        name: "thresholdFilter",
        type: "uint256"
      }
    ],
    name: "getRateWithCustomConnectors",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "srcToken",
        type: "address"
      },
      {
        internalType: "contract IERC20",
        name: "dstToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "useWrappers",
        type: "bool"
      },
      {
        internalType: "uint256",
        name: "thresholdFilter",
        type: "uint256"
      }
    ],
    name: "getRateWithThreshold",
    outputs: [
      {
        internalType: "uint256",
        name: "weightedRate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "multiWrapper",
    outputs: [
      {
        internalType: "contract MultiWrapper",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "oracles",
    outputs: [
      {
        internalType: "contract IOracle[]",
        name: "allOracles",
        type: "address[]"
      },
      {
        internalType: "enum OffchainOracle.OracleType[]",
        name: "oracleTypes",
        type: "uint8[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "connector",
        type: "address"
      }
    ],
    name: "removeConnector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract IOracle",
        name: "oracle",
        type: "address"
      },
      {
        internalType: "enum OffchainOracle.OracleType",
        name: "oracleKind",
        type: "uint8"
      }
    ],
    name: "removeOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "contract MultiWrapper",
        name: "_multiWrapper",
        type: "address"
      }
    ],
    name: "setMultiWrapper",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
class OffchainOracle__factory {
  static abi = _abi$2;
  static createInterface() {
    return new ethers.Interface(_abi$2);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$2, runner);
  }
}

const _abi$1 = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "DecimalsUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "GasPriceUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "L1BaseFeeUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "OverheadUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "ScalarUpdated",
    type: "event"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "gasPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes"
      }
    ],
    name: "getL1Fee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes"
      }
    ],
    name: "getL1GasUsed",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "l1BaseFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "overhead",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "scalar",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_decimals",
        type: "uint256"
      }
    ],
    name: "setDecimals",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_gasPrice",
        type: "uint256"
      }
    ],
    name: "setGasPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_baseFee",
        type: "uint256"
      }
    ],
    name: "setL1BaseFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_overhead",
        type: "uint256"
      }
    ],
    name: "setOverhead",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_scalar",
        type: "uint256"
      }
    ],
    name: "setScalar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
class OvmGasPriceOracle__factory {
  static abi = _abi$1;
  static createInterface() {
    return new ethers.Interface(_abi$1);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$1, runner);
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "contract ENS",
        name: "_ens",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "addresses",
        type: "address[]"
      }
    ],
    name: "getNames",
    outputs: [
      {
        internalType: "string[]",
        name: "r",
        type: "string[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
class ReverseRecords__factory {
  static abi = _abi;
  static createInterface() {
    return new ethers.Interface(_abi);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi, runner);
  }
}

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ENSNameWrapper__factory: ENSNameWrapper__factory,
  ENSRegistry__factory: ENSRegistry__factory,
  ENSResolver__factory: ENSResolver__factory,
  ENS__factory: ENS__factory,
  ERC20__factory: ERC20__factory,
  Multicall__factory: Multicall__factory,
  OffchainOracle__factory: OffchainOracle__factory,
  OvmGasPriceOracle__factory: OvmGasPriceOracle__factory,
  ReverseRecords__factory: ReverseRecords__factory
});

class Pedersen {
  pedersenHash;
  babyJub;
  pedersenPromise;
  constructor() {
    this.pedersenPromise = this.initPedersen();
  }
  async initPedersen() {
    this.pedersenHash = await circomlibjs.buildPedersenHash();
    this.babyJub = this.pedersenHash.babyJub;
  }
  async unpackPoint(buffer) {
    await this.pedersenPromise;
    return this.babyJub?.unpackPoint(this.pedersenHash?.hash(buffer));
  }
  toStringBuffer(buffer) {
    return this.babyJub?.F.toString(buffer);
  }
}
const pedersen = new Pedersen();
async function buffPedersenHash(buffer) {
  const [hash] = await pedersen.unpackPoint(buffer);
  return pedersen.toStringBuffer(hash);
}

function parseNote(noteString) {
  const noteRegex = /tornado-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<noteHex>[0-9a-fA-F]{124})/g;
  const match = noteRegex.exec(noteString);
  if (!match) {
    return;
  }
  const { currency, amount, netId, noteHex } = match.groups;
  return {
    currency: currency.toLowerCase(),
    amount,
    netId: Number(netId),
    noteHex: "0x" + noteHex,
    note: noteString
  };
}
function parseInvoice(invoiceString) {
  const invoiceRegex = /tornadoInvoice-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<commitmentHex>[0-9a-fA-F]{64})/g;
  const match = invoiceRegex.exec(invoiceString);
  if (!match) {
    return;
  }
  const { currency, amount, netId, commitmentHex } = match.groups;
  return {
    currency: currency.toLowerCase(),
    amount,
    netId: Number(netId),
    commitmentHex: "0x" + commitmentHex,
    invoice: invoiceString
  };
}
async function createDeposit({ nullifier, secret }) {
  const preimage = new Uint8Array([...leInt2Buff(nullifier), ...leInt2Buff(secret)]);
  const noteHex = toFixedHex(bytesToBN(preimage), 62);
  const commitment = BigInt(await buffPedersenHash(preimage));
  const commitmentHex = toFixedHex(commitment);
  const nullifierHash = BigInt(await buffPedersenHash(leInt2Buff(nullifier)));
  const nullifierHex = toFixedHex(nullifierHash);
  return {
    preimage,
    noteHex,
    commitment,
    commitmentHex,
    nullifierHash,
    nullifierHex
  };
}
class Deposit {
  currency;
  amount;
  netId;
  nullifier;
  secret;
  note;
  noteHex;
  invoice;
  commitmentHex;
  nullifierHex;
  constructor({
    currency,
    amount,
    netId,
    nullifier,
    secret,
    note,
    noteHex,
    invoice,
    commitmentHex,
    nullifierHex
  }) {
    this.currency = currency;
    this.amount = amount;
    this.netId = netId;
    this.nullifier = nullifier;
    this.secret = secret;
    this.note = note;
    this.noteHex = noteHex;
    this.invoice = invoice;
    this.commitmentHex = commitmentHex;
    this.nullifierHex = nullifierHex;
  }
  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        nullifier: this.nullifier,
        secret: this.secret,
        note: this.note,
        noteHex: this.noteHex,
        invoice: this.invoice,
        commitmentHex: this.commitmentHex,
        nullifierHex: this.nullifierHex
      },
      null,
      2
    );
  }
  static async createNote({ currency, amount, netId, nullifier, secret }) {
    if (!nullifier) {
      nullifier = rBigInt(31);
    }
    if (!secret) {
      secret = rBigInt(31);
    }
    const depositObject = await createDeposit({
      nullifier,
      secret
    });
    const newDeposit = new Deposit({
      currency: currency.toLowerCase(),
      amount,
      netId,
      note: `tornado-${currency.toLowerCase()}-${amount}-${netId}-${depositObject.noteHex}`,
      noteHex: depositObject.noteHex,
      invoice: `tornadoInvoice-${currency.toLowerCase()}-${amount}-${netId}-${depositObject.commitmentHex}`,
      nullifier,
      secret,
      commitmentHex: depositObject.commitmentHex,
      nullifierHex: depositObject.nullifierHex
    });
    return newDeposit;
  }
  static async parseNote(noteString) {
    const parsedNote = parseNote(noteString);
    if (!parsedNote) {
      throw new Error("The note has invalid format");
    }
    const { currency, amount, netId, note, noteHex: parsedNoteHex } = parsedNote;
    const bytes = bnToBytes(parsedNoteHex);
    const nullifier = BigInt(leBuff2Int(bytes.slice(0, 31)).toString());
    const secret = BigInt(leBuff2Int(bytes.slice(31, 62)).toString());
    const { noteHex, commitmentHex, nullifierHex } = await createDeposit({ nullifier, secret });
    const invoice = `tornadoInvoice-${currency}-${amount}-${netId}-${commitmentHex}`;
    const newDeposit = new Deposit({
      currency,
      amount,
      netId,
      note,
      noteHex,
      invoice,
      nullifier,
      secret,
      commitmentHex,
      nullifierHex
    });
    return newDeposit;
  }
}
class Invoice {
  currency;
  amount;
  netId;
  commitmentHex;
  invoice;
  constructor(invoiceString) {
    const parsedInvoice = parseInvoice(invoiceString);
    if (!parsedInvoice) {
      throw new Error("The invoice has invalid format");
    }
    const { currency, amount, netId, invoice, commitmentHex } = parsedInvoice;
    this.currency = currency;
    this.amount = amount;
    this.netId = netId;
    this.commitmentHex = commitmentHex;
    this.invoice = invoice;
  }
  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        commitmentHex: this.commitmentHex,
        invoice: this.invoice
      },
      null,
      2
    );
  }
}

function packEncryptedMessage({ nonce, ephemPublicKey, ciphertext }) {
  const nonceBuf = toFixedHex(bytesToHex(base64ToBytes(nonce)), 24);
  const ephemPublicKeyBuf = toFixedHex(bytesToHex(base64ToBytes(ephemPublicKey)), 32);
  const ciphertextBuf = bytesToHex(base64ToBytes(ciphertext));
  const messageBuff = concatBytes(hexToBytes(nonceBuf), hexToBytes(ephemPublicKeyBuf), hexToBytes(ciphertextBuf));
  return bytesToHex(messageBuff);
}
function unpackEncryptedMessage(encryptedMessage) {
  const messageBuff = hexToBytes(encryptedMessage);
  const nonceBuf = bytesToBase64(messageBuff.slice(0, 24));
  const ephemPublicKeyBuf = bytesToBase64(messageBuff.slice(24, 56));
  const ciphertextBuf = bytesToBase64(messageBuff.slice(56));
  return {
    messageBuff: bytesToHex(messageBuff),
    version: "x25519-xsalsa20-poly1305",
    nonce: nonceBuf,
    ephemPublicKey: ephemPublicKeyBuf,
    ciphertext: ciphertextBuf
  };
}
class NoteAccount {
  netId;
  blockNumber;
  // Dedicated 32 bytes private key only used for note encryption, backed up to an Echoer and local for future derivation
  // Note that unlike the private key it shouldn't have the 0x prefix
  recoveryKey;
  // Address derived from recoveryKey, only used for frontend UI
  recoveryAddress;
  // Note encryption public key derived from recoveryKey
  recoveryPublicKey;
  constructor({ netId, blockNumber, recoveryKey }) {
    if (!recoveryKey) {
      recoveryKey = rHex(32).slice(2);
    }
    this.netId = Math.floor(Number(netId));
    this.blockNumber = blockNumber;
    this.recoveryKey = recoveryKey;
    this.recoveryAddress = ethers.computeAddress("0x" + recoveryKey);
    this.recoveryPublicKey = ethSigUtil.getEncryptionPublicKey(recoveryKey);
  }
  /**
   * Intends to mock eth_getEncryptionPublicKey behavior from MetaMask
   * In order to make the recoveryKey retrival from Echoer possible from the bare private key
   */
  static async getSignerPublicKey(signer) {
    if (signer.privateKey) {
      const wallet = signer;
      const privateKey = wallet.privateKey.slice(0, 2) === "0x" ? wallet.privateKey.slice(2) : wallet.privateKey;
      return ethSigUtil.getEncryptionPublicKey(privateKey);
    }
    const provider = signer.provider;
    return await provider.send("eth_getEncryptionPublicKey", [
      signer.address
    ]);
  }
  // This function intends to provide an encrypted value of recoveryKey for an on-chain Echoer backup purpose
  // Thus, the pubKey should be derived by a Wallet instance or from Web3 wallets
  // pubKey: base64 encoded 32 bytes key from https://docs.metamask.io/wallet/reference/eth_getencryptionpublickey/
  getEncryptedAccount(walletPublicKey) {
    const encryptedData = ethSigUtil.encrypt({
      publicKey: walletPublicKey,
      data: this.recoveryKey,
      version: "x25519-xsalsa20-poly1305"
    });
    const data = packEncryptedMessage(encryptedData);
    return {
      // Use this later to save hexPrivateKey generated with
      // Buffer.from(JSON.stringify(encryptedData)).toString('hex')
      // As we don't use buffer with this library we should leave UI to do the rest
      encryptedData,
      // Data that could be used as an echo(data) params
      data
    };
  }
  /**
   * Decrypt Echoer backuped note encryption account with private keys
   */
  async decryptSignerNoteAccounts(signer, events) {
    const signerAddress = signer.address;
    const decryptedEvents = [];
    for (const event of events) {
      if (event.address !== signerAddress) {
        continue;
      }
      try {
        const unpackedMessage = unpackEncryptedMessage(event.encryptedAccount);
        let recoveryKey;
        if (signer.privateKey) {
          const wallet = signer;
          const privateKey = wallet.privateKey.slice(0, 2) === "0x" ? wallet.privateKey.slice(2) : wallet.privateKey;
          recoveryKey = ethSigUtil.decrypt({
            encryptedData: unpackedMessage,
            privateKey
          });
        } else {
          const { version, nonce, ephemPublicKey, ciphertext } = unpackedMessage;
          const unpackedBuffer = bytesToHex(
            new TextEncoder().encode(
              JSON.stringify({
                version,
                nonce,
                ephemPublicKey,
                ciphertext
              })
            )
          );
          const provider = signer.provider;
          recoveryKey = await provider.send("eth_decrypt", [unpackedBuffer, signerAddress]);
        }
        decryptedEvents.push(
          new NoteAccount({
            netId: this.netId,
            blockNumber: event.blockNumber,
            recoveryKey
          })
        );
      } catch {
        continue;
      }
    }
    return decryptedEvents;
  }
  decryptNotes(events) {
    const decryptedEvents = [];
    for (const event of events) {
      try {
        const unpackedMessage = unpackEncryptedMessage(event.encryptedNote);
        const [address, noteHex] = ethSigUtil.decrypt({
          encryptedData: unpackedMessage,
          privateKey: this.recoveryKey
        }).split("-");
        decryptedEvents.push({
          blockNumber: event.blockNumber,
          address: ethers.getAddress(address),
          noteHex
        });
      } catch {
        continue;
      }
    }
    return decryptedEvents;
  }
  encryptNote({ address, noteHex }) {
    const encryptedData = ethSigUtil.encrypt({
      publicKey: this.recoveryPublicKey,
      data: `${address}-${noteHex}`,
      version: "x25519-xsalsa20-poly1305"
    });
    return packEncryptedMessage(encryptedData);
  }
}

function encodedLabelToLabelhash(label) {
  if (label.length !== 66) return null;
  if (label.indexOf("[") !== 0) return null;
  if (label.indexOf("]") !== 65) return null;
  const hash = `0x${label.slice(1, 65)}`;
  if (!isHex(hash)) return null;
  return hash;
}
function labelhash(label) {
  if (!label) {
    return bytesToHex(new Uint8Array(32).fill(0));
  }
  return encodedLabelToLabelhash(label) || ethers.keccak256(new TextEncoder().encode(label));
}
function makeLabelNodeAndParent(name) {
  const labels = name.split(".");
  const label = labels.shift();
  const parentNode = ethers.namehash(labels.join("."));
  return {
    label,
    labelhash: labelhash(label),
    parentNode
  };
}
const EnsContracts = {
  [NetId.MAINNET]: {
    ensRegistry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    ensPublicResolver: "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63",
    ensNameWrapper: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"
  },
  [NetId.SEPOLIA]: {
    ensRegistry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    ensPublicResolver: "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD",
    ensNameWrapper: "0x0635513f179D50A207757E05759CbD106d7dFcE8"
  }
};
class ENSUtils {
  ENSRegistry;
  ENSResolver;
  ENSNameWrapper;
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  async getContracts() {
    const { chainId } = await this.provider.getNetwork();
    const { ensRegistry, ensPublicResolver, ensNameWrapper } = EnsContracts[Number(chainId)];
    this.ENSRegistry = ENSRegistry__factory.connect(ensRegistry, this.provider);
    this.ENSResolver = ENSResolver__factory.connect(ensPublicResolver, this.provider);
    this.ENSNameWrapper = ENSNameWrapper__factory.connect(ensNameWrapper, this.provider);
  }
  async getOwner(name) {
    if (!this.ENSRegistry) {
      await this.getContracts();
    }
    return this.ENSRegistry.owner(ethers.namehash(name));
  }
  // nameWrapper connected with wallet signer
  async unwrap(signer, name) {
    if (!this.ENSNameWrapper) {
      await this.getContracts();
    }
    const owner = signer.address;
    const nameWrapper = this.ENSNameWrapper.connect(signer);
    const { labelhash: labelhash2 } = makeLabelNodeAndParent(name);
    return nameWrapper.unwrapETH2LD(labelhash2, owner, owner);
  }
  // https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/functions/wallet/createSubname.ts
  async setSubnodeRecord(signer, name) {
    if (!this.ENSResolver) {
      await this.getContracts();
    }
    const resolver = this.ENSResolver;
    const registry = this.ENSRegistry.connect(signer);
    const owner = signer.address;
    const { labelhash: labelhash2, parentNode } = makeLabelNodeAndParent(name);
    return registry.setSubnodeRecord(parentNode, labelhash2, owner, resolver.target, BigInt(0));
  }
  // https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/functions/wallet/setTextRecord.ts
  async setText(signer, name, key, value) {
    const resolver = ENSResolver__factory.connect((await this.getResolver(name))?.address, signer);
    return resolver.setText(ethers.namehash(name), key, value);
  }
  getResolver(name) {
    return ethers.EnsResolver.fromName(this.provider, name);
  }
  async getText(name, key) {
    const resolver = await this.getResolver(name);
    if (!resolver) {
      return resolver;
    }
    return await resolver.getText(key) || "";
  }
}

const DUMMY_ADDRESS = "0x1111111111111111111111111111111111111111";
const DUMMY_NONCE = 1024;
const DUMMY_WITHDRAW_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111";
function convertETHToTokenAmount(amountInWei, tokenPriceInWei, tokenDecimals = 18) {
  const tokenDecimalsMultiplier = BigInt(10 ** Number(tokenDecimals));
  return BigInt(amountInWei) * tokenDecimalsMultiplier / BigInt(tokenPriceInWei);
}
class TornadoFeeOracle {
  provider;
  ovmGasPriceOracle;
  constructor(provider, ovmGasPriceOracle) {
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
      this.provider.getBlock("latest"),
      (async () => {
        try {
          return BigInt(await this.provider.send("eth_gasPrice", []));
        } catch {
          return ethers.parseUnits("1", "gwei");
        }
      })(),
      (async () => {
        try {
          return BigInt(await this.provider.send("eth_maxPriorityFeePerGas", []));
        } catch {
          return BigInt(0);
        }
      })()
    ]);
    return block?.baseFeePerGas ? block.baseFeePerGas * BigInt(15) / BigInt(10) + getPriorityFee : getGasPrice;
  }
  /**
   * Calculate L1 fee for op-stack chains
   *
   * This is required since relayers would pay the full transaction fees for users
   */
  fetchL1OptimismFee(tx) {
    if (!this.ovmGasPriceOracle) {
      return new Promise((resolve) => resolve(BigInt(0)));
    }
    if (!tx) {
      tx = {
        type: 0,
        gasLimit: 1e6,
        nonce: DUMMY_NONCE,
        data: DUMMY_WITHDRAW_DATA,
        gasPrice: ethers.parseUnits("1", "gwei"),
        to: DUMMY_ADDRESS
      };
    }
    return this.ovmGasPriceOracle.getL1Fee.staticCall(ethers.Transaction.from(tx).unsignedSerialized);
  }
  /**
   * We don't need to distinguish default refunds by tokens since most users interact with other defi protocols after withdrawal
   * So we default with 1M gas which is enough for two or three swaps
   * Using 30 gwei for default but it is recommended to supply cached gasPrice value from the UI
   */
  defaultEthRefund(gasPrice, gasLimit) {
    return (gasPrice ? BigInt(gasPrice) : ethers.parseUnits("30", "gwei")) * BigInt(gasLimit || 1e6);
  }
  /**
   * Calculates token amount for required ethRefund purchases required to calculate fees
   */
  calculateTokenAmount(ethRefund, tokenPriceInEth, tokenDecimals) {
    return convertETHToTokenAmount(ethRefund, tokenPriceInEth, tokenDecimals);
  }
  /**
   * Warning: For tokens you need to check if the fees are above denomination
   * (Usually happens for small denomination pool or if the gas price is high)
   */
  calculateRelayerFee({
    gasPrice,
    gasLimit = 6e5,
    l1Fee = 0,
    denomination,
    ethRefund = BigInt(0),
    tokenPriceInWei,
    tokenDecimals = 18,
    relayerFeePercent = 0.33,
    isEth = true,
    premiumPercent = 20
  }) {
    const gasCosts = BigInt(gasPrice) * BigInt(gasLimit) + BigInt(l1Fee);
    const relayerFee = BigInt(denomination) * BigInt(Math.floor(1e4 * relayerFeePercent)) / BigInt(1e4 * 100);
    if (isEth) {
      return (gasCosts + relayerFee) * BigInt(premiumPercent ? 100 + premiumPercent : 100) / BigInt(100);
    }
    const feeInEth = gasCosts + BigInt(ethRefund);
    return (convertETHToTokenAmount(feeInEth, tokenPriceInWei, tokenDecimals) + relayerFee) * BigInt(premiumPercent ? 100 + premiumPercent : 100) / BigInt(100);
  }
}

const gasZipInbounds = {
  [NetId.MAINNET]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.BSC]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.POLYGON]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.OPTIMISM]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.ARBITRUM]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.GNOSIS]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
  [NetId.AVALANCHE]: "0x391E7C679d29bD940d63be94AD22A25d25b5A604"
};
const gasZipID = {
  [NetId.MAINNET]: 255,
  [NetId.BSC]: 14,
  [NetId.POLYGON]: 17,
  [NetId.OPTIMISM]: 55,
  [NetId.ARBITRUM]: 57,
  [NetId.GNOSIS]: 16,
  [NetId.AVALANCHE]: 15,
  [NetId.SEPOLIA]: 102
};
function gasZipInput(to, shorts) {
  let data = "0x";
  if (ethers.isAddress(to)) {
    if (to.length === 42) {
      data += "02";
      data += to.slice(2);
    } else {
      return null;
    }
  } else {
    data += "01";
  }
  for (const i in shorts) {
    data += Number(shorts[i]).toString(16).padStart(4, "0");
  }
  return data;
}
function gasZipMinMax(ethUsd) {
  return {
    min: 1 / ethUsd,
    max: 50 / ethUsd,
    ethUsd
  };
}

const hasherBytecode = "0x38600c600039612b1b6000f3606460006000377c01000000000000000000000000000000000000000000000000000000006000510463f47d33b5146200003557fe5b7f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f00000016004518160245181838180828009800909089082827f0fbe43c36a80e36d7c7c584d4f8f3759fb51f0d66065d8a227b688d12488c5d408839081808280098009098391089082827f9c48cd3e00a6195a253fc009e60f249456f802ff9baf6549210d201321efc1cc08839081808280098009098391089082827f27c0849dba2643077c13eb42ffb97663cdcecd669bf10f756be30bab71b86cf808839081808280098009098391089082827f2bf76744736132e5c68f7dfdd5b792681d415098554fd8280f00d11b172b80d208839081808280098009098391089082827f33133eb4a1a1ab45037c8bdf9adbb2999baf06f20a9c95180dc4ccdcbec5856808839081808280098009098391089082827f588bb66012356dbc9b059ef1d792b563d6c18624dddecc3fe4583fd3551e9b3008839081808280098009098391089082827f71bc3e244e1b92911fe7f53cf523e491fd6ff487d59337a1d92f92668c4f4c3608839081808280098009098391089082827fd1808e2b039fd010c489768f78d7499938ccc0858f3295151787cfe8b7e40be108839081808280098009098391089082827f76978af3ded437cf41b3faa40cd6bcfce94f27f4abcc3ed34be19abd2c4537d008839081808280098009098391089082827f0a9baee798a320b0ca5b1cf888386d1dc12c13b38e10225aa4e9f03069a099f508839081808280098009098391089082827fb79dbf6050a03b16c3ade8d77e11c767d2251af9cdbd6cdf9a8a0ee921b32c7908839081808280098009098391089082827fa74bbcf5067f067faec2cce4b98d130d7927456f5c5f6c00e0f5406a24eb8b1908839081808280098009098391089082827fab7ab080d4c4018bda6ecc8bd67468bc4619ba12f25b0da879a639c758c8855d08839081808280098009098391089082827fe6a5b797c2bba7e9a873b37f5c41adc47765e9be4a1f0e0650e6a24ad226876308839081808280098009098391089082827f6270ae87cf3d82cf9c0b5f428466c429d7b7cbe234cecff39969171af006016c08839081808280098009098391089082827f9951c9f6e76d636b52f7600d979ca9f3b643dfbe9551c83b31542830321b2a6608839081808280098009098391089082827f4119469e44229cc40c4ff555a2b6f6b39961088e741e3c20a3c9b47f130c555008839081808280098009098391089082827f5d795e02bbaf90ff1f384741e5f18f8b644a0080441315d0e5b3c8123452a0b008839081808280098009098391089082827f281e90a515e6409e9177b4f297f8049ce3d4c3659423c48b3fd64e83596ff10108839081808280098009098391089082827f424185c60a21e84970f7d32cacaa2725aa8a844caea7ed760d2b965af1bf3e7d08839081808280098009098391089082827fd96fcbc3960614ea887da609187a5dada2e1b829f23309a6375212cea1f25c0908839081808280098009098391089082827ffde84026d7c294300af18f7712fc3662f43387ae8cf7fdda1f9a810f4b24bcf208839081808280098009098391089082827f3a9d568575846aa6b8a890b3c237fd0447426db878e6e25333b8eb9b386195c108839081808280098009098391089082827f55a2aa32c84a4cae196dd4094b685dd11757470a3be094d98eea73f02452aa3608839081808280098009098391089082827fcbc9481380978d29ebc5b0a8d4481cd2ef654ee800907adb3d38dc2fd9265fab08839081808280098009098391089082827f24e53af71ef06bacb76d3294c11223911e9d177ff09b7009febc484add0beb7408839081808280098009098391089082827fdbd44e16108225766dac3e5fe7acbe9df519bbba97380e5e9437a90658f2139308839081808280098009098391089082827fc6f434863c79013bb2c202331e04bccea2251c1ff6f191dc2afa23e6f6d28e4e08839081808280098009098391089082827f3490eeb39a733c0e8062d87f981ae65a8fccf25c448f4455d27db3915351b06608839081808280098009098391089082827f30b89830ff7ade3558a5361a24869130ce1fcce97211602962e34859525dac4f08839081808280098009098391089082827f29bae21b579d080a75c1694da628d0ecfd83efc9c8468704f410300062f64ca908839081808280098009098391089082827fe326499de0476e719915dd1c661ef4550723d4aee9ee9af224edd208790fce4408839081808280098009098391089082827f8c45208b8baa6f473821415957088c0b7e72a465f460b09ece2d270aee2f184108839081808280098009098391089082827ffe2ad454f451348f26ce2cc7e7914aef3eb96e8f89a4619a1dc7d11f8401c35208839081808280098009098391089082827f0929db368ef2af2d29bca38845325b0b7a820a4889e44b5829bbe1ed47fd4d5208839081808280098009098391089082827f16531d424b0cbaf9abbf2d2acde698462ea4555bf32ccf1bbd26697e905066f608839081808280098009098391089082827ff5c30d247f045ff6d05cf0dd0a49c9823e7a24b0d751d3c721353b96f29d76f608839081808280098009098391089082827f6eb7a3614056c230c6f171370fdd9d1048bb00b2cdd1b2721d11bdda5023f48608839081808280098009098391089082827f0ee9c4621642a272f710908707557498d25a6fdd51866da5d9f0d205355a618908839081808280098009098391089082827f78ca1cb1c7f6c6894d1cf94f327b8763be173151b6b06f99dfc6a944bb5a72f008839081808280098009098391089082827f5d24d0b1b304d05311ce0f274b0d93746a4860ed5cdd8d4348de557ea7a5ee7a08839081808280098009098391089082827f77423dabd1a3cddc8691438fc5891e3fd49ac0f3e21aaf249791bfde1303d2f308839081808280098009098391089082827f0642e8800a48cc04c0168232c6f542396597a67cf395ad622d947e98bb68697a08839081808280098009098391089082827fc1e7d3cbbc4c35b7490647d8402e56d334336943bda91fe2d34ca9727c0e3df508839081808280098009098391089082827f8d6fb1730335204f38f85e408ac861e76f24349ab6ee0469c22e19350bb24fe108839081808280098009098391089082827f67d0faf5f0db32a1b60e13dc4914246b9edac7990fb4990b19aa86815586441a08839081808280098009098391089082827f2605b9b909ded1b04971eae979027c4e0de57f3b6a60d5ed58aba619c34749ce08839081808280098009098391089082827fd276890b2c205db85f000d1f5111ed8f177e279cae3e52862780f04e846228d008839081808280098009098391089082827f2ac5905f9450a21ef6905ed5951a91b3730e3a2e2d62b50bdeb810015d50376b08839081808280098009098391089082827f7a366839f0291ca54da674ac3f0e1e9aa8b687ba533926cb40268039e57b967a08839081808280098009098391089082827f67ab0f3466989c3dbbe209c37ec272ba83984ba6e445be6d472b63e3ca7270e308839081808280098009098391089082827f0e786007d0ce7e28a90e31d3263887d40c556dec88fcb8b56bc9e9c05ecc0c2908839081808280098009098391089082827f0b814ed99bd00eca389b0022663dbfddfbfa15e321c19abcf1eaf9556075fb6808839081808280098009098391089082827f65c0321ba26fcee4fdc35b4999b78ceb54dcaf9fec2e3bdea98e9f82925c093208839081808280098009098391089082827fab2d2a929601f9c3520e0b14aaa6ba9f1e79821a5b768919670a4ea970722bf408839081808280098009098391089082827fcdd2e0744d4af1a81918de69ec12128a5871367303ff83ed764771cbbdf6502308839081808280098009098391089082827f74527d0c0868f2ec628086b874fa66a7347d3d3b918d2e07a5f33e1067e8ac5808839081808280098009098391089082827f1c6bf6ac0314caead23e357bfcbbaa17d670672ae3a475f80934c716f10aca2508839081808280098009098391089082827f3c4007e286f8dc7efd5d0eeb0e95d7aa6589361d128a0cccb17b554c851a643208839081808280098009098391089082827fae468a86a5a7db7c763a053eb09ac1a02809ce095258c88101ee319e12b0697e08839081808280098009098391089082827f9333e3d052b7c77fcac1eb366f610f6f97852242b1317a87b80f3bbc5c8c2d1d08839081808280098009098391089082827f52ec1d675cf5353153f6b628414783ca6b7fc0fe01948ca206daad712296e39508839081808280098009098391089082827f13ceeeb301572b4991076750e11ea7e7fcbfee454d90dc1763989004a1894f9308839081808280098009098391089082827f8505737e7e94939a08d8cda10b6fbbbf879b2141ae7eabc30fcd22405135fe6408839081808280098009098391089082827f6127db7ac5200a212092b66ec2bfc63653f4dc8ac66c76008fef885258a258b508839081808280098009098391089082827f12692a7d808f44e31d628dbcfea377eb073fb918d7beb8136ea47f8cf094c88c08839081808280098009098391089082827f260e384b1268e3a347c91d6987fd280fa0a275541a7c5be34bf126af35c962e008839081808280098009098391089082827fd88c3b01966d90e713aee8d482ceaa6925311d2342e1a5aca4fcd2f44b6daddc08839081808280098009098391089082827fb87e868affd91b078a87fa75ac9332a6cf23587d94e20c3262db5e91f30bf04b08839081808280098009098391089082827fb5ba5f8acad1a950a3bbf2201055cd3ea27056c0c53f0c4c97f33cda8dbfe90908839081808280098009098391089082827f59ca814b49e00d7b3118c53a2986ded128584acd7428735e08ade6661c457f7508839081808280098009098391089082827f0fc4c0bea813a223fd510c07f7bbe337badd4bcf28649a0d378970c2a15b3aa508839081808280098009098391089082827f0053f1ea6dd60e7a6db09a00be77549ff3d4ee3737be7fb42052ae1321f667c308839081808280098009098391089082827feb937077bb10c8fe38716d4e38edc1f9e7b18c6414fef85fe7e9c5567baa4a0408839081808280098009098391089082827fbacb14c0f1508d828f7fd048d716b8044aec7f0fb48e85e717bf532db972520708839081808280098009098391089082827f4ca0abb8beb7cff572a0c1e6f58e080e1bb243d497a3e74538442a4555ad40be08839081808280098009098391089082827fda9eefd411e590d7e44592cce298af87b2c62aa3cc8bb137aa99ca8d4aa551b508839081808280098009098391089082827f153dae43cef763e7a2fc9846f09a2973b0ad9c35894c220699bcc2954501c6bd08839081808280098009098391089082827fd4ed2a09375813b4fb504c7a9ba13110bdd8549a47349db82c15a434c090e87b08839081808280098009098391089082827f0063a5c4c9c12dcf4bae72c69f3a225664469503d61d9eae5d9553bfb006095b08839081808280098009098391089082827fdc8a4d35ad28e59dd3713b45985cd3b70e37ccc2be42086f1ea078fe2dc9d82d08839081808280098009098391089082827f486ba219308f0c847b22fcb4449f8855192536c01b8057904e81c1c7814f483b08839081808280098009098391089082827f34d9604140a1ac9fdb204285b9fe1b303c281af2fc5fb362f6577282b423bcf308839081808280098009098391089082827fc1681959ec4bc3656911db2b2f56aa4db709c26f1a0a25c879286e37f437465d08839081808280098009098391089082827ffcd849f3b5f9e4368af75619fb27f2e335adbb9b44988f17c4d389fa751ad47a08839081808280098009098391089082827ff5f7fc22ad64c8e7c1e005110e13f4f1c6b1f8f8cc59000db0e3bb38f99554a508839081808280098009098391089082827fa9133b8a20fbae4633ec5f82cb47a38ae1877d12d1febb23982c7c808aa5317508839081808280098009098391089082827ff4827c5c7b61141cc31b75984bb3ed16ed579e5b72e32a1289b63ab55eaf8c1208839081808280098009098391089082827fcca361819ffefe3e50fe34c91a322c9405f4e5a168c1fc0a0a1883993e32c9f408839081808280098009098391089082827f6656088842bfc9e325a532784d3362cecfa86f9c7b208a6b499836ebe48ff15708839081808280098009098391089082827f00129c7cd00e42ed05a37dbceb80d47b65e1d750ef2148278a54723fdf42c4cc08839081808280098009098391089082827fa85b235631b786f85cd46f7768f6c71ae004ad267ae59bdf929ada149b19588808839081808280098009098391089082827f34df65a82686be09c5b237911abf237a9887c1a418f279ac79b446d7d311f5ea08839081808280098009098391089082827f815a850c3989df9ca6231e0bdd9916fc0e076f2c6c7f0f260a846d0179f9c32d08839081808280098009098391089082827f50fb0940848a67aee83d348421fadd79aefc7a2adabeec6e64904ebe1bf63e7d08839081808280098009098391089082827fbab63a16273599f8b66895461e62a19ff0d103693be771d93e3691bba89cdd8d08839081808280098009098391089082827f6931a091756e0bc709ebecfffba5038634c5b3d5d0c5876dd72aac67452db8a208839081808280098009098391089082827f55559b8bb79db8809c46ee627f1b5ce1d8e6d89bf94a9987a1407759d1ba896308839081808280098009098391089082827fa9a1a11b2979018cb155914d09f1df19b7ffec241e8b2487b6f6272a56a44a0a08839081808280098009098391089082827ff83293400e7bccea4bb86dcb0d5ca57fa2466e13a572d7d3531c6fa491cb0f1b08839081808280098009098391089082827fb7cb5742b6bc5339624d3568a33c21f31b877f8396972582028da999abf249f208839081808280098009098391089082827ff56efb400f8500b5c5bf811c65c86c7ed2e965f14f1a69bca436c0c60b79f46508839081808280098009098391089082827fd7c4427998d9c440f849dcd75b7157996eaad1b9a1d58cc2441931300e26eb2208839081808280098009098391089082827fca5ed18ad53e33fdc3ae8cf353ff3f6dd315f60060442b74f6b614b24ebd4cc308839081808280098009098391089082827f9ad3e9376c97b194a0fbf43e22a3616981d777365c765ead09a1d033fdf536b708839081808280098009098391089082827fc6daeff5769a06b26fe3b8fef30df07b1387373a7814cef364fe1d6059eaf54a08839081808280098009098391089082827fc20a78398345c6b8cf439643dab96223bf879c302648293eaf496fee5c978c6608839081808280098009098391089082827f589ca65b6cf0e90653c06dddc057dc61ba2839974569051c98b43e8618716efb08839081808280098009098391089082827f83064161f127d8c59fc73625957e21630dc6dc99e5443f6ce37ecd6bf28e69b708839081808280098009098391089082827f46d0ba662b50100b9a3af52052f68932feec1d12290b2033c4f49148893d8ba308839081808280098009098391089082827f18dd55b4a83a53f2ee578eb3e6d26f594824d44670fc3f4de80642344d15c09a08839081808280098009098391089082827f9fb5b594f48bc58b345ab90ded705920a7274b8e070eee8ce8cf90c72c3604b608839081808280098009098391089082827f1901d8f4f2c8449128e00663978f2050f2eb1cd6acb60d9d09c57c5d46ee54fe08839081808280098009098391089082827f5ec56789beab24ef7ee32f594d5fc561ec59dfeb93606dc7dcc6fe65133a7db408839081808280098009098391089082827f01c0b2cbe4fa9877a3d08eb67c510e8630da0a8beda94a6d9283e6f70d268bc508839081808280098009098391089082827f0b1d85acd9031a9107350eed946a25734e974799c5ba7cff13b15a5a623a25f008839081808280098009098391089082827f204497d1d359552905a2fe655f3d6f94926ea92d12cdaa6556ec26362f239f6408839081808280098009098391089082827fe075f7edc6631a8d7ffe33019f44fc91f286236d5a5f90f16de4791b72a2a5f008839081808280098009098391089082827f243f46e353354256ab8fe0ca4e9230dfc330bc163e602dfeaf307c1d1a7264b908839081808280098009098391089082827fd448ae5e09625fa1fcfd732fc9cd8f06e4c33b81f0a9240c83da56f41e9ecceb08839081808280098009098391089082827f2f312eef69a33d9fa753c08840275692a03432b3e6da67f9c59b9f9f4971cd5608839081808280098009098391089082827f5f333996af231bd5a293137da91801e191a6f24eb532ad1a7e6e9a2ad0efbc0008839081808280098009098391089082827fa8f771e0383a832dc8e2eaa8efabda300947acaf0684fabddf8b4abb0abd8a6208839081808280098009098391089082827f9ff0b3d7a4643596f651b70c1963cc4fa6c46018d78f05cb2c5f187e25df83a908839081808280098009098391089082827f9c373b704838325648273734dcdf962d7c156f431f70380ba4855832c4a238b808839081808280098009098391089082827fea2afa02604b8afeeb570f48a0e97a5e6bfe9613394b9a6b0026ecd6cec8c33a08839081808280098009098391089082827f68892258cd8eb43b71caa6d6837ec9959bfdfd72f25c9005ebaffc4011f8a7bf08839081808280098009098391089082827ff2824f561f6f82e3c1232836b0d268fa3b1b5489edd39a5fe1503bfc7ca91f4908839081808280098009098391089082827f164eda75fda2861f9d812f24e37ac938844fbe383c243b32b9f66ae2e76be71908839081808280098009098391089082827ff0a6fc431f5bf0dd1cca93b8b65b3f72c91f0693e2c74be9243b15abb31afcc008839081808280098009098391089082827fe68db66ba891ef0cd527f09ec6fff3ec0a269cf3d891a35ec13c902f70334b4f08839081808280098009098391089082827f3a44a5b102f7883a2b8630a3cae6e6db2e6e483bb7cfeb3492cbd91793ef598e08839081808280098009098391089082827f43939fe8ef789acb33cbf129ba8a3aa1bd61510a178022a05177c9c5a1c59bf108839081808280098009098391089082827f936fe3b66dfda1bc5a7aae241b4db442858bd720c1d579c0c869f273cd55d77408839081808280098009098391089082827f3490fcaa8ffa37f35dc67ae006e81352c7103945417b8e4b142afcaefa344b8508839081808280098009098391089082827fcae66096cff344caca53ffe0e58aafeb468bd174f00d8abc425b2099c088187408839081808280098009098391089082827fc7d05783a41bc14f3c9a45384b6d5e2547c5b6a224c8316910b208f2718a70ab08839081808280098009098391089082827f5ac6b9ba94040d5692b865b6677b60ef3201b5c2121699f70beb9f9b2528a02608839081808280098009098391089082827fa902a3d4d9ecbfb9b2c76fddf780554bf93cad97b244e805d3adb94e1816290008839081808280098009098391089082827fe9df91ffeeb086a4d26041c29dac6fca1d56a4d022fe34b38831267395b98d2708839081808280098009098391089082827f862646f851d91a8840ad9ee711f12ec13b3e8f980ff5ef5ee43ca4520d57def708839081808280098009098391089082827f30b7381c9725b9db07816baf8524943a79cea135807c84cce0833485c11e0c2e08839081808280098009098391089082827f96afc10c5cedaddbda99df79387397c9be74a5b50f3a0c04ccb68d4e0f3a989f08839081808280098009098391089082827f3543da80d10da251c548776fe907c4ef89993d62e0062ae5c0496fcb851c366108839081808280098009098391089082827fe5140fe26d8b008430fccd50a68e3e11c1163d63b6d8b7cc40bc6f3c1d0b1b0608839081808280098009098391089082827ffefdf1872e4475e8bbb0ef6fab7f561bff121314695c433bd4c29ec118060c9608839081808280098009098391089082827f6bb8c9f3d57b18e002df059db1e6a5d42ad566f153f18460774f68ac2650940008839081808280098009098391089082827f5415122d50b26f4fab5784004c56cf03f128f825ad2236f4b3d51f74737bd97308839081808280098009098391089082827f00e115c4a98efae6a3a5ecc873b0cef63ccd5b515710a3ab03ec52218f784dc908839081808280098009098391089082827fda7d525427bad87b88238657c21331245578bc76aa6240b7f972382537a202ab08839081808280098009098391089082827f83332e8b34505b83010270dc795290a2f515b8f89c163acecdf4799df04c62f808839081808280098009098391089082827fb09ecb6033d1a065f17a61066cd737d0c3c5873b51c3ab0a285e26939e62aa1808839081808280098009098391089082827f24e65c718938c2b937378e7435332174329730bde85a4185e37875824eb4985908839081808280098009098391089082827f68e41430ccd41cc5e92a9f9acd2e955c1385b9f5ed8d3f133d767429484a8eba08839081808280098009098391089082827fc038fe9d0125ab8be54545276f841274e414c596ed4c9eaa6919604603d1ffa908839081808280098009098391089082827f23248698612cd8e83234fcf5db9b6b225f4b0ba78d72ef13ea1edff5f0fb029808839081808280098009098391089082827fd2a9fa3d39c1ba91eefa666a1db71c6e0e4e3b707626b0197a4e59e7110cf0d408839081808280098009098391089082827fc28931ee7dfa02b62872e0d937ba3dc5c637118273a1f1f0c4fc880905c82efc08839081808280098009098391089082827f01cd399556445e3d7b201d6c5e56a5794e60be2cfd9a4643e7ead79bb4f60f7908839081808280098009098391089082827fac855cc58d5fbb0dff91a79683eb0e914c1b7d8d0a540d416838a89f83a8312f08839081808280098009098391089082827ff7798af7ccf36b836705849f7dd40328bf9346657255b431446ec75a6817181608839081808280098009098391089082827fe52a24c92d3f067bf551eeaf98c62ba525e84882d7adad835fad8de72986b2b108839081808280098009098391089082827fffc8682759a2bf1dd67c87a77c285467801f1c44fd78fa4eb5957a4832c9d72d08839081808280098009098391089082827f1482ac3e7e4f321627850d95a13942aea6d2923402b913046856ff7e8aaf9aff08839081808280098009098391089082827f17332b4c7aac2a07ccfe954de7ad22ccf6fcb4c5fa15c130ed22a40ae9398f4708839081808280098009098391089082827fd4be0546013f84a0d1e118b37589723b58e323983263616d1b036f8b3fdd858308839081808280098009098391089082827fa64ec737d31dddf939b184438ccdd3e1d3e667572857cd6c9c31a0d1d9b7b08508839081808280098009098391089082827f8ad12fbc74117cff4743d674539c86548c6758710a07a6abe3715e4b53526d3408839081808280098009098391089082827f15a16435a2300b27a337561401f06682ba85019aa0af61b264a1177d38b5c13c08839081808280098009098391089082827f22616f306e76352293a22ab6ee15509d9b108d4136b32fa7f9ed259793f392a108839081808280098009098391089082827f519727b25560caf00ce0d3f911bd4356f907160ab5186da10a629c7ccae1851e08839081808280098009098391089082827fcff39e77928ce9310118d50e29bc87e7f78b53ad51366359aa17f07902ae639208839081808280098009098391089082827f17dead3bfa1968c744118023dead77cdbee22c5b7c2414f5a6bdf82fd94cf3ad08839081808280098009098391089082827f2bef0f8b22a1cfb90100f4a552a9d02b772130123de8144a00c4d57497e1d7f408839081808280098009098391089082827fbf5188713fef90b31c35243f92cfa4331ab076e30e24b355c79b01f41d152a1108839081808280098009098391089082827f3baadd2fd92e3e12fb371be0578941dc0a108fbca0a7d81b88316fb94d6b4dfe08839081808280098009098391089082827fd4f955742e20a28d38611bf9fc4a478c97b673a7cd40d0113a58a1efe338d9aa08839081808280098009098391089082827f3c1c3fe9a5f7ccd54ad5a51a224b3f94775266d19c3733017e4920d7391ad64508839081808280098009098391089082827f6372df6148abeed66fda5461779a9651130c6c525df733852bcd929016768a7a08839081808280098009098391089082827f6d098e848fb853f95adb5a6364b5ab33c79fb08877f2cf3e0e160d9fcb3ebcc508839081808280098009098391089082827f48c5fc90f27431fabfe496dfba14bb0dba71141eb5472a365fd13023f4fe629608839081808280098009098391089082827fbb988dfc0c4dfe53999bd34840adcb63fdbf501ccd622ca2ddf5064ad8cdebf408839081808280098009098391089082827f25b068c942724c424ed5851c9575c22752c9bd25f91ebfa589de3d88ee7627f908839081808280098009098391089082827fed98a1931e361add218de11ff7879bd7114cda19c24ddbe15b3b0190ce01e1aa08839081808280098009098391089082827fc80b5a7d63f6c43542ad612023d3ffd6c684ce2eab837180addcb4decf51854408839081808280098009098391089082827fe2ef24bf47c5203118c6ff96657dd3c6fdff7212d5c798d826455de77b4b70cd08839081808280098009098391089082827f907da812fd5a8375587e4860f87691d0a8d61d454c507d09e5562e1a5d0fcc7608839081808280098009098391089082827fc459abbc62bc6070cacdff597e97990de56edc51cc6643afb0f6789fef1bad6308839081808280098009098391089082827f38d61f5e566855d70d36ef0f0f1fefcd7c829bdd60d95e0ef1fb5b98856280a408839081808280098009098391089082827f13218626665c420d3aa2b0fa49224a3dce8e08b8b56f8851bd9cb5e25cb3042d08839081808280098009098391089082827f6f685fb152dba21b4d02422e237e246df73d7d711ae6d7d33983bae0f873e31008839081808280098009098391089082827f5ade34719e2498dde70e4571c40474475a4af706a3cb82ac18a7fa44c22d1c4708839081808280098009098391089082827f8a0c3dc7a496adca059cb95d9b173812a00f3c4d435e0b9e8116e0c4b5f56acb08839081808280098009098391089082827f196bc98252f63169ed79073ee091a0e8ed0b5af51017da143940c00bdb86370908839081808280098009098391089082827fd979bf70695d93f8efb552a413701918afec9e12dfe213f4d0c27cfa68fad6c208839081808280098009098391089082827fb803072d02f54d237a3c6c4cc18eda6dce87a03c6819df54e4ed8aed6dc56d4608839081808280098009098391089082827f1efcda9d986cddcf431af4d59c6a7709d650885b7886cba70f0e7cd92b331cdc08839081808280098009098391089082827fd3ca5f7859b82ac50b63da06d43aa68a6b685f0a60397638bbea173b3f60419208839081808280098009098391089082827fa59d392c0667316ad37a06be2d51aabe9e79bdef0013bc109985648a14c7e41f08839081808280098009098391089082827fac2f5f0d2146791b396e2bed6cf15a20bc22cc4c8cf7dd4b3514ac00148dd0a708839081808280098009098391089082827f17a993a6af068d72bc36f0e814d29fef3f97d7a72aa963889b16a8457409861a08839081808280098009098391089082827f6f1bf99686550e0396f7f4e2df6fdaa090fbc272c8c76eb32a3c6791de5a07b508839081808280098009098391089082827f8234d705e1ecdc59cc6ed40749069d4b45e63deb49b5b7d7f527abd31c072b1b08839081808280098009098391089082827f6fe929a1fd6aacba5c4012c45dd727d2c816119567450003913d882cb97bc47e08839081808280098009098391089082827fad5371215f2aba49026b2e48739c11b4d8ffbb24dd4a6e41b9763862af96787a08839081808280098009098391089082827fd0e704566c49e1a11edc2c128b2e07f36dc0c755468268f8fe4c4859b9fa595b08839081808280098009098391089082827f263e1195090d00be1d8fb37de17ccf3b66d180645efa0d831865cfaa8797769e08839081808280098009098391089082827fe65c090eebde2cfa7f9c92cf75641c7683fb8e81f4a48f5b7a9c7eb26a85029f08839081808280098009098391089082827fa18971781c6855f6a9752912780bb9b719c14a677a4c6393d62d6e046b97a2ac08839081808280098009098391089082827ff6fc1ef1bca8bec055cc66edecc5dc99030fe78311a3f21d8cd624df4f89e62508839081808280098009098391089082827f824e4e2838501516d3296542cb47a59a1ca4326e947c9c874d88dccc8e37b99a08839081808280098009098391089082827f3cd5a9e7353a50e454c9c1381b556b543897cc89153c3e3749f2021d8237226308839081808280098009098391089082827fb4bcedbd54d0c917a315cc7ca785e3c5995abbeeb3deb3ebaf02c7a9bf6cc83f08839081808280098009098391089082827f1f7476211105b3039cef009c51155ae93526c53a74973ecfce40754b3df1052108839081808280098009098391089082827f58aefbd978440c94b4b9fbd36e00e6e36caeacf82b0da0a6161d34c541a5a6e308839081808280098009098391089082827fc22cd6d61be780a33c77677bc6ba40307b597ed981db57cb485313eec2a5a49708839081808280098009098391089082827fd9ffc4fe0dc5f835c8dcdc1e60b8f0b1637f32a809175371b94a057272b0748d08839081808280098009098391089082827ff6a5268541bc4c64ad0ade8f55dda3492604857a71c923662a214dd7e9c20c1008839081808280098009098391089082826000088390818082800980090983910860205260005260406000f3";
function deployHasher(signer) {
  return signer.sendTransaction({ data: hasherBytecode });
}

const INDEX_DB_ERROR = "A mutation operation was attempted on a database that did not allow mutations.";
class IndexedDB {
  dbExists;
  isBlocked;
  // todo: TestDBSchema on any
  options;
  dbName;
  dbVersion;
  db;
  constructor({ dbName, stores }) {
    this.dbExists = false;
    this.isBlocked = false;
    this.options = {
      upgrade(db) {
        Object.values(db.objectStoreNames).forEach((value) => {
          db.deleteObjectStore(value);
        });
        [{ name: "keyval" }, ...stores || []].forEach(({ name, keyPath, indexes }) => {
          const store = db.createObjectStore(name, {
            keyPath,
            autoIncrement: true
          });
          if (Array.isArray(indexes)) {
            indexes.forEach(({ name: name2, unique = false }) => {
              store.createIndex(name2, name2, { unique });
            });
          }
        });
      }
    };
    this.dbName = dbName;
    this.dbVersion = 35;
  }
  async initDB() {
    try {
      if (this.dbExists || this.isBlocked) {
        return;
      }
      this.db = await idb.openDB(this.dbName, this.dbVersion, this.options);
      this.db.addEventListener("onupgradeneeded", async () => {
        await this._removeExist();
      });
      this.dbExists = true;
    } catch (err) {
      if (err.message.includes(INDEX_DB_ERROR)) {
        console.log("This browser does not support IndexedDB!");
        this.isBlocked = true;
        return;
      }
      if (err.message.includes("less than the existing version")) {
        console.log(`Upgrading DB ${this.dbName} to ${this.dbVersion}`);
        await this._removeExist();
        return;
      }
      console.error(`Method initDB has error: ${err.message}`);
    }
  }
  async _removeExist() {
    await idb.deleteDB(this.dbName);
    this.dbExists = false;
    await this.initDB();
  }
  async getFromIndex({
    storeName,
    indexName,
    key
  }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      return await this.db.getFromIndex(storeName, indexName, key);
    } catch (err) {
      throw new Error(`Method getFromIndex has error: ${err.message}`);
    }
  }
  async getAllFromIndex({
    storeName,
    indexName,
    key,
    count
  }) {
    await this.initDB();
    if (!this.db) {
      return [];
    }
    try {
      return await this.db.getAllFromIndex(storeName, indexName, key, count);
    } catch (err) {
      throw new Error(`Method getAllFromIndex has error: ${err.message}`);
    }
  }
  async getItem({ storeName, key }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const store = this.db.transaction(storeName).objectStore(storeName);
      return await store.get(key);
    } catch (err) {
      throw new Error(`Method getItem has error: ${err.message}`);
    }
  }
  async addItem({ storeName, data, key = "" }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, "readwrite");
      const isExist = await tx.objectStore(storeName).get(key);
      if (!isExist) {
        await tx.objectStore(storeName).add(data);
      }
    } catch (err) {
      throw new Error(`Method addItem has error: ${err.message}`);
    }
  }
  async putItem({ storeName, data, key }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, "readwrite");
      await tx.objectStore(storeName).put(data, key);
    } catch (err) {
      throw new Error(`Method putItem has error: ${err.message}`);
    }
  }
  async deleteItem({ storeName, key }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, "readwrite");
      await tx.objectStore(storeName).delete(key);
    } catch (err) {
      throw new Error(`Method deleteItem has error: ${err.message}`);
    }
  }
  async getAll({ storeName }) {
    await this.initDB();
    if (!this.db) {
      return [];
    }
    try {
      const tx = this.db.transaction(storeName, "readonly");
      return await tx.objectStore(storeName).getAll();
    } catch (err) {
      throw new Error(`Method getAll has error: ${err.message}`);
    }
  }
  /**
   * Simple key-value store inspired by idb-keyval package
   */
  getValue(key) {
    return this.getItem({ storeName: "keyval", key });
  }
  setValue(key, data) {
    return this.putItem({ storeName: "keyval", key, data });
  }
  delValue(key) {
    return this.deleteItem({ storeName: "keyval", key });
  }
  async clearStore({ storeName, mode = "readwrite" }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, mode);
      await tx.objectStore(storeName).clear();
    } catch (err) {
      throw new Error(`Method clearStore has error: ${err.message}`);
    }
  }
  async createTransactions({
    storeName,
    data,
    mode = "readwrite"
  }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, mode);
      await tx.objectStore(storeName).add(data);
      await tx.done;
    } catch (err) {
      throw new Error(`Method createTransactions has error: ${err.message}`);
    }
  }
  async createMultipleTransactions({
    storeName,
    data,
    index,
    mode = "readwrite"
  }) {
    await this.initDB();
    if (!this.db) {
      return;
    }
    try {
      const tx = this.db.transaction(storeName, mode);
      for (const item of data) {
        if (item) {
          await tx.store.put({ ...item, ...index });
        }
      }
    } catch (err) {
      throw new Error(`Method createMultipleTransactions has error: ${err.message}`);
    }
  }
}
async function getIndexedDB(netId) {
  if (!netId) {
    const idb2 = new IndexedDB({ dbName: "tornado-core" });
    await idb2.initDB();
    return idb2;
  }
  const minimalIndexes = [
    {
      name: "blockNumber",
      unique: false
    },
    {
      name: "transactionHash",
      unique: false
    }
  ];
  const defaultState = [
    {
      name: `echo_${netId}`,
      keyPath: "eid",
      indexes: [
        ...minimalIndexes,
        {
          name: "address",
          unique: false
        }
      ]
    },
    {
      name: `encrypted_notes_${netId}`,
      keyPath: "eid",
      indexes: minimalIndexes
    },
    {
      name: "lastEvents",
      keyPath: "name",
      indexes: [
        {
          name: "name",
          unique: false
        }
      ]
    }
  ];
  const config = getConfig(netId);
  const { tokens, nativeCurrency, registryContract, governanceContract } = config;
  const stores = [...defaultState];
  if (registryContract) {
    stores.push({
      name: `registered_${netId}`,
      keyPath: "ensName",
      indexes: [
        ...minimalIndexes,
        {
          name: "relayerAddress",
          unique: false
        }
      ]
    });
  }
  if (governanceContract) {
    stores.push({
      name: `governance_${netId}`,
      keyPath: "eid",
      indexes: [
        ...minimalIndexes,
        {
          name: "event",
          unique: false
        }
      ]
    });
  }
  Object.entries(tokens).forEach(([token, { instanceAddress }]) => {
    Object.keys(instanceAddress).forEach((amount) => {
      if (nativeCurrency === token) {
        stores.push(
          {
            name: `stringify_bloom_${netId}_${token}_${amount}`,
            keyPath: "hashBloom",
            indexes: []
          },
          {
            name: `stringify_tree_${netId}_${token}_${amount}`,
            keyPath: "hashTree",
            indexes: []
          }
        );
      }
      stores.push(
        {
          name: `deposits_${netId}_${token}_${amount}`,
          keyPath: "leafIndex",
          // the key by which it refers to the object must be in all instances of the storage
          indexes: [
            ...minimalIndexes,
            {
              name: "commitment",
              unique: true
            }
          ]
        },
        {
          name: `withdrawals_${netId}_${token}_${amount}`,
          keyPath: "eid",
          indexes: [
            ...minimalIndexes,
            {
              name: "nullifierHash",
              unique: true
            }
            // keys on which the index is created
          ]
        }
      );
    });
  });
  const idb = new IndexedDB({
    dbName: `tornado_core_${netId}`,
    stores
  });
  await idb.initDB();
  return idb;
}

async function fetchIp(ipEcho) {
  return await fetchData(ipEcho, {
    method: "GET",
    timeout: 3e4
  });
}

class Mimc {
  sponge;
  hash;
  mimcPromise;
  constructor() {
    this.mimcPromise = this.initMimc();
  }
  async initMimc() {
    this.sponge = await circomlibjs.buildMimcSponge();
    this.hash = (left, right) => this.sponge?.F.toString(this.sponge?.multiHash([BigInt(left), BigInt(right)]));
  }
  async getHash() {
    await this.mimcPromise;
    return {
      sponge: this.sponge,
      hash: this.hash
    };
  }
}
const mimc = new Mimc();

class MerkleTreeService {
  currency;
  amount;
  netId;
  Tornado;
  commitmentHex;
  instanceName;
  merkleTreeHeight;
  emptyElement;
  merkleWorkerPath;
  constructor({
    netId,
    amount,
    currency,
    Tornado,
    commitmentHex,
    merkleTreeHeight = 20,
    emptyElement = "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    merkleWorkerPath
  }) {
    const instanceName = `${netId}_${currency}_${amount}`;
    this.currency = currency;
    this.amount = amount;
    this.netId = Number(netId);
    this.Tornado = Tornado;
    this.instanceName = instanceName;
    this.commitmentHex = commitmentHex;
    this.merkleTreeHeight = merkleTreeHeight;
    this.emptyElement = emptyElement;
    this.merkleWorkerPath = merkleWorkerPath;
  }
  async createTree(events) {
    const { hash: hashFunction } = await mimc.getHash();
    if (this.merkleWorkerPath) {
      console.log("Using merkleWorker\n");
      try {
        if (isNode) {
          const merkleWorkerPromise = new Promise((resolve, reject) => {
            const worker = new worker_threads.Worker(this.merkleWorkerPath, {
              workerData: {
                merkleTreeHeight: this.merkleTreeHeight,
                elements: events,
                zeroElement: this.emptyElement
              }
            });
            worker.on("message", resolve);
            worker.on("error", reject);
            worker.on("exit", (code) => {
              if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
              }
            });
          });
          return fixedMerkleTree.MerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
        } else {
          const merkleWorkerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(this.merkleWorkerPath);
            worker.onmessage = (e) => {
              resolve(e.data);
            };
            worker.onerror = (e) => {
              reject(e);
            };
            worker.postMessage({
              merkleTreeHeight: this.merkleTreeHeight,
              elements: events,
              zeroElement: this.emptyElement
            });
          });
          return fixedMerkleTree.MerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
        }
      } catch (err) {
        console.log("merkleWorker failed, falling back to synchronous merkle tree");
        console.log(err);
      }
    }
    return new fixedMerkleTree.MerkleTree(this.merkleTreeHeight, events, {
      zeroElement: this.emptyElement,
      hashFunction
    });
  }
  async createPartialTree({ edge, elements }) {
    const { hash: hashFunction } = await mimc.getHash();
    if (this.merkleWorkerPath) {
      console.log("Using merkleWorker\n");
      try {
        if (isNode) {
          const merkleWorkerPromise = new Promise((resolve, reject) => {
            const worker = new worker_threads.Worker(this.merkleWorkerPath, {
              workerData: {
                merkleTreeHeight: this.merkleTreeHeight,
                edge,
                elements,
                zeroElement: this.emptyElement
              }
            });
            worker.on("message", resolve);
            worker.on("error", reject);
            worker.on("exit", (code) => {
              if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
              }
            });
          });
          return fixedMerkleTree.PartialMerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
        } else {
          const merkleWorkerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(this.merkleWorkerPath);
            worker.onmessage = (e) => {
              resolve(e.data);
            };
            worker.onerror = (e) => {
              reject(e);
            };
            worker.postMessage({
              merkleTreeHeight: this.merkleTreeHeight,
              edge,
              elements,
              zeroElement: this.emptyElement
            });
          });
          return fixedMerkleTree.PartialMerkleTree.deserialize(JSON.parse(await merkleWorkerPromise), hashFunction);
        }
      } catch (err) {
        console.log("merkleWorker failed, falling back to synchronous merkle tree");
        console.log(err);
      }
    }
    return new fixedMerkleTree.PartialMerkleTree(this.merkleTreeHeight, edge, elements, {
      zeroElement: this.emptyElement,
      hashFunction
    });
  }
  async verifyTree(events) {
    console.log(
      `
Creating deposit tree for ${this.netId} ${this.amount} ${this.currency.toUpperCase()} would take a while
`
    );
    const timeStart = Date.now();
    const tree = await this.createTree(events.map(({ commitment }) => commitment));
    const isKnownRoot = await this.Tornado.isKnownRoot(toFixedHex(BigInt(tree.root)));
    if (!isKnownRoot) {
      const errMsg = `Deposit Event ${this.netId} ${this.amount} ${this.currency} is invalid`;
      throw new Error(errMsg);
    }
    console.log(
      `
Created ${this.netId} ${this.amount} ${this.currency.toUpperCase()} tree in ${Date.now() - timeStart}ms
`
    );
    return tree;
  }
}

async function multicall(Multicall2, calls) {
  const calldata = calls.map((call) => {
    const target = call.contract?.target || call.address;
    const callInterface = call.contract?.interface || call.interface;
    return {
      target,
      callData: callInterface.encodeFunctionData(call.name, call.params),
      allowFailure: call.allowFailure ?? false
    };
  });
  const returnData = await Multicall2.aggregate3.staticCall(calldata);
  const res = returnData.map((call, i) => {
    const callInterface = calls[i].contract?.interface || calls[i].interface;
    const [result, data] = call;
    const decodeResult = result && data && data !== "0x" ? callInterface.decodeFunctionResult(calls[i].name, data) : null;
    return !decodeResult ? null : decodeResult.length === 1 ? decodeResult[0] : decodeResult;
  });
  return res;
}

const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
async function getPermitSignature({
  Token,
  signer,
  spender,
  value,
  nonce,
  deadline
}) {
  const sigSigner = signer || Token.runner;
  const provider = sigSigner.provider;
  const [name, lastNonce, { chainId }] = await Promise.all([
    Token.name(),
    Token.nonces(sigSigner.address),
    provider.getNetwork()
  ]);
  const DOMAIN_SEPARATOR = {
    name,
    version: "1",
    chainId,
    verifyingContract: Token.target
  };
  const PERMIT_TYPE = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  };
  return ethers.Signature.from(
    await sigSigner.signTypedData(DOMAIN_SEPARATOR, PERMIT_TYPE, {
      owner: sigSigner.address,
      spender,
      value,
      nonce: nonce || lastNonce,
      deadline: deadline || ethers.MaxUint256
    })
  );
}
async function getPermitCommitmentsSignature({
  PermitTornado: PermitTornado2,
  Token,
  signer,
  denomination,
  commitments,
  nonce
}) {
  const value = BigInt(commitments.length) * denomination;
  const commitmentsHash = ethers.solidityPackedKeccak256(["bytes32[]"], [commitments]);
  return await getPermitSignature({
    Token,
    signer,
    spender: PermitTornado2.target,
    value,
    nonce,
    deadline: BigInt(commitmentsHash)
  });
}
async function getPermit2Signature({
  Token,
  signer,
  spender,
  value: amount,
  nonce,
  deadline,
  witness
}) {
  const sigSigner = signer || Token.runner;
  const provider = sigSigner.provider;
  const domain = {
    name: "Permit2",
    chainId: (await provider.getNetwork()).chainId,
    verifyingContract: permit2Address
  };
  const types = !witness ? {
    PermitTransferFrom: [
      { name: "permitted", type: "TokenPermissions" },
      { name: "spender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ],
    TokenPermissions: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" }
    ]
  } : {
    PermitWitnessTransferFrom: [
      { name: "permitted", type: "TokenPermissions" },
      { name: "spender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "witness", type: witness.witnessTypeName }
    ],
    TokenPermissions: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    ...witness.witnessType
  };
  const values = {
    permitted: {
      token: Token.target,
      amount
    },
    spender,
    // Sorted nonce are not required for Permit2
    nonce: nonce || rBigInt(16),
    deadline: deadline || ethers.MaxUint256
  };
  if (witness) {
    values.witness = witness.witness;
  }
  const hash = new ethers.TypedDataEncoder(types).hash(values);
  const signature = ethers.Signature.from(await sigSigner.signTypedData(domain, types, values));
  return {
    domain,
    types,
    values,
    hash,
    signature
  };
}
async function getPermit2CommitmentsSignature({
  PermitTornado: PermitTornado2,
  Token,
  signer,
  denomination,
  commitments,
  nonce,
  deadline
}) {
  const value = BigInt(commitments.length) * denomination;
  const commitmentsHash = ethers.solidityPackedKeccak256(["bytes32[]"], [commitments]);
  return await getPermit2Signature({
    Token,
    signer,
    spender: PermitTornado2.target,
    value,
    nonce,
    deadline,
    witness: {
      witnessTypeName: "PermitCommitments",
      witnessType: {
        PermitCommitments: [
          { name: "instance", type: "address" },
          { name: "commitmentsHash", type: "bytes32" }
        ]
      },
      witness: {
        instance: PermitTornado2.target,
        commitmentsHash
      }
    }
  });
}

class TokenPriceOracle {
  oracle;
  multicall;
  provider;
  fallbackPrice;
  constructor(provider, multicall2, oracle) {
    this.provider = provider;
    this.multicall = multicall2;
    this.oracle = oracle;
    this.fallbackPrice = ethers.parseEther("0.0001");
  }
  buildCalls(tokens) {
    return tokens.map(({ tokenAddress }) => ({
      contract: this.oracle,
      name: "getRateToEth",
      params: [tokenAddress, true],
      allowFailure: true
    }));
  }
  buildStable(stablecoinAddress) {
    const stablecoin = ERC20__factory.connect(stablecoinAddress, this.provider);
    return [
      {
        contract: stablecoin,
        name: "decimals"
      },
      {
        contract: this.oracle,
        name: "getRateToEth",
        params: [stablecoin.target, true],
        allowFailure: true
      }
    ];
  }
  async fetchPrice(tokenAddress, decimals) {
    if (!this.oracle) {
      return new Promise((resolve) => resolve(this.fallbackPrice));
    }
    try {
      const price = await this.oracle.getRateToEth(tokenAddress, true);
      return price * BigInt(10 ** decimals) / BigInt(10 ** 18);
    } catch (err) {
      console.log(`Failed to fetch oracle price for ${tokenAddress}, will use fallback price ${this.fallbackPrice}`);
      console.log(err);
      return this.fallbackPrice;
    }
  }
  async fetchPrices(tokens) {
    if (!this.oracle) {
      return new Promise((resolve) => resolve(tokens.map(() => this.fallbackPrice)));
    }
    const prices = await multicall(this.multicall, this.buildCalls(tokens));
    return prices.map((price, index) => {
      if (!price) {
        price = this.fallbackPrice;
      }
      return price * BigInt(10 ** tokens[index].decimals) / BigInt(10 ** 18);
    });
  }
  async fetchEthUSD(stablecoinAddress) {
    if (!this.oracle) {
      return new Promise((resolve) => resolve(10 ** 18 / Number(this.fallbackPrice)));
    }
    const [decimals, price] = await multicall(this.multicall, this.buildStable(stablecoinAddress));
    const ethPrice = (price || this.fallbackPrice) * BigInt(10n ** decimals) / BigInt(10 ** 18);
    return 1 / Number(ethers.formatEther(ethPrice));
  }
}

async function getTokenBalances({
  provider,
  Multicall: Multicall2,
  currencyName,
  userAddress,
  tokenAddresses = []
}) {
  const tokenCalls = tokenAddresses.map((tokenAddress) => {
    const Token = ERC20__factory.connect(tokenAddress, provider);
    return [
      {
        contract: Token,
        name: "balanceOf",
        params: [userAddress]
      },
      {
        contract: Token,
        name: "name"
      },
      {
        contract: Token,
        name: "symbol"
      },
      {
        contract: Token,
        name: "decimals"
      }
    ];
  }).flat();
  const multicallResults = await multicall(Multicall2, [
    {
      contract: Multicall2,
      name: "getEthBalance",
      params: [userAddress]
    },
    ...tokenCalls.length ? tokenCalls : []
  ]);
  const ethResults = multicallResults[0];
  const tokenResults = multicallResults.slice(1).length ? chunk(multicallResults.slice(1), tokenCalls.length / tokenAddresses.length) : [];
  const tokenBalances = tokenResults.map((tokenResult, index) => {
    const [tokenBalance, tokenName, tokenSymbol, tokenDecimals] = tokenResult;
    const tokenAddress = tokenAddresses[index];
    return {
      address: tokenAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(tokenDecimals),
      balance: tokenBalance
    };
  });
  return [
    {
      address: ethers.ZeroAddress,
      name: currencyName,
      symbol: currencyName,
      decimals: 18,
      balance: ethResults
    },
    ...tokenBalances
  ];
}

const MAX_TOVARISH_EVENTS = 5e3;
class TovarishClient extends RelayerClient {
  constructor(clientConstructor) {
    super(clientConstructor);
    this.tovarish = true;
  }
  async askRelayerStatus({
    hostname,
    url,
    relayerAddress
  }) {
    const status = await super.askRelayerStatus({ hostname, url, relayerAddress });
    if (!status.version.includes("tovarish")) {
      throw new Error("Not a tovarish relayer!");
    }
    return status;
  }
  /**
   * Ask status for all enabled chains for tovarish relayer
   */
  async askAllStatus({
    hostname,
    url,
    relayerAddress
  }) {
    if (!url && hostname) {
      url = `https://${!hostname.endsWith("/") ? hostname + "/" : hostname}`;
    } else if (url && !url.endsWith("/")) {
      url += "/";
    } else {
      url = "";
    }
    const statusArray = await fetchData(`${url}status`, {
      ...this.fetchDataOptions,
      headers: {
        "Content-Type": "application/json, application/x-www-form-urlencoded"
      },
      timeout: 3e4,
      maxRetry: this.fetchDataOptions?.torPort ? 2 : 0
    });
    if (!Array.isArray(statusArray)) {
      return [];
    }
    const tovarishStatus = [];
    for (const rawStatus of statusArray) {
      const netId = rawStatus.netId;
      const config = getConfig(netId);
      const statusValidator = ajv.compile(getStatusSchema(rawStatus.netId, config, this.tovarish));
      if (!statusValidator) {
        continue;
      }
      const status = {
        ...rawStatus,
        url: `${url}${netId}/`
      };
      if (status.currentQueue > 5) {
        throw new Error("Withdrawal queue is overloaded");
      }
      if (!enabledChains.includes(status.netId)) {
        throw new Error("This relayer serves a different network");
      }
      if (relayerAddress && status.netId === NetId.MAINNET && status.rewardAccount !== relayerAddress) {
        throw new Error("The Relayer reward address must match registered address");
      }
      if (!status.version.includes("tovarish")) {
        throw new Error("Not a tovarish relayer!");
      }
      tovarishStatus.push(status);
    }
    return tovarishStatus;
  }
  async filterRelayer(relayer) {
    const { ensName, relayerAddress, tovarishHost, tovarishNetworks } = relayer;
    if (!tovarishHost || !tovarishNetworks?.includes(this.netId)) {
      return;
    }
    const hostname = `${tovarishHost}/${this.netId}`;
    try {
      const status = await this.askRelayerStatus({ hostname, relayerAddress });
      return {
        netId: status.netId,
        url: status.url,
        hostname,
        ensName,
        relayerAddress,
        rewardAccount: ethers.getAddress(status.rewardAccount),
        instances: getSupportedInstances(status.instances),
        stakeBalance: relayer.stakeBalance,
        gasPrice: status.gasPrices?.fast,
        ethPrices: status.ethPrices,
        currentQueue: status.currentQueue,
        tornadoServiceFee: status.tornadoServiceFee,
        // Additional fields for tovarish relayer
        latestBlock: Number(status.latestBlock),
        latestBalance: status.latestBalance,
        version: status.version,
        events: status.events,
        syncStatus: status.syncStatus
      };
    } catch (err) {
      return {
        hostname,
        relayerAddress,
        errorMessage: err.message,
        hasError: true
      };
    }
  }
  async getValidRelayers(relayers) {
    const invalidRelayers = [];
    const validRelayers = (await Promise.all(relayers.map((relayer) => this.filterRelayer(relayer)))).filter((r) => {
      if (!r) {
        return false;
      }
      if (r.hasError) {
        invalidRelayers.push(r);
        return false;
      }
      return true;
    });
    return {
      validRelayers,
      invalidRelayers
    };
  }
  async getTovarishRelayers(relayers) {
    const validRelayers = [];
    const invalidRelayers = [];
    await Promise.all(
      relayers.filter((r) => r.tovarishHost && r.tovarishNetworks?.length).map(async (relayer) => {
        const { ensName, relayerAddress, tovarishHost } = relayer;
        try {
          const statusArray = await this.askAllStatus({ hostname: tovarishHost, relayerAddress });
          for (const status of statusArray) {
            validRelayers.push({
              netId: status.netId,
              url: status.url,
              hostname: tovarishHost,
              ensName,
              relayerAddress,
              rewardAccount: ethers.getAddress(status.rewardAccount),
              instances: getSupportedInstances(status.instances),
              stakeBalance: relayer.stakeBalance,
              gasPrice: status.gasPrices?.fast,
              ethPrices: status.ethPrices,
              currentQueue: status.currentQueue,
              tornadoServiceFee: status.tornadoServiceFee,
              // Additional fields for tovarish relayer
              latestBlock: Number(status.latestBlock),
              latestBalance: status.latestBalance,
              version: status.version,
              events: status.events,
              syncStatus: status.syncStatus
            });
          }
        } catch (err) {
          invalidRelayers.push({
            hostname: tovarishHost,
            relayerAddress,
            errorMessage: err.message,
            hasError: true
          });
        }
      })
    );
    return {
      validRelayers,
      invalidRelayers
    };
  }
  async getEvents({
    type,
    currency,
    amount,
    fromBlock,
    recent
  }) {
    const url = `${this.selectedRelayer?.url}events`;
    const schemaValidator = getEventsSchemaValidator(type);
    try {
      const events = [];
      let lastSyncBlock = fromBlock;
      while (true) {
        let { events: fetchedEvents, lastSyncBlock: currentBlock } = await fetchData(url, {
          ...this.fetchDataOptions,
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type,
            currency,
            amount,
            fromBlock,
            recent
          })
        });
        if (!schemaValidator(fetchedEvents)) {
          const errMsg = `Schema validation failed for ${type} events`;
          throw new Error(errMsg);
        }
        if (recent) {
          return {
            events: fetchedEvents,
            lastSyncBlock: currentBlock
          };
        }
        lastSyncBlock = currentBlock;
        if (!Array.isArray(fetchedEvents) || !fetchedEvents.length) {
          break;
        }
        fetchedEvents = fetchedEvents.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) {
            return a.logIndex - b.logIndex;
          }
          return a.blockNumber - b.blockNumber;
        });
        const [lastEvent] = fetchedEvents.slice(-1);
        if (fetchedEvents.length < MAX_TOVARISH_EVENTS - 100) {
          events.push(...fetchedEvents);
          break;
        }
        fetchedEvents = fetchedEvents.filter((e) => e.blockNumber !== lastEvent.blockNumber);
        fromBlock = Number(lastEvent.blockNumber);
        events.push(...fetchedEvents);
      }
      return {
        events,
        lastSyncBlock
      };
    } catch (err) {
      console.log("Error from TovarishClient events endpoint");
      console.log(err);
      return {
        events: [],
        lastSyncBlock: fromBlock
      };
    }
  }
}

let groth16;
async function initGroth16() {
  if (!groth16) {
    groth16 = await websnarkGroth({ wasmInitialMemory: 2e3 });
  }
}
async function calculateSnarkProof(input, circuit, provingKey) {
  if (!groth16) {
    await initGroth16();
  }
  const snarkInput = {
    root: input.root,
    nullifierHash: BigInt(input.nullifierHex).toString(),
    recipient: BigInt(input.recipient),
    relayer: BigInt(input.relayer),
    fee: input.fee,
    refund: input.refund,
    nullifier: input.nullifier,
    secret: input.secret,
    pathElements: input.pathElements,
    pathIndices: input.pathIndices
  };
  console.log("Start generating SNARK proof", snarkInput);
  console.time("SNARK proof time");
  const proofData = await websnarkUtils__namespace.genWitnessAndProve(await groth16, snarkInput, circuit, provingKey);
  const proof = websnarkUtils__namespace.toSolidityInput(proofData).proof;
  console.timeEnd("SNARK proof time");
  const args = [
    toFixedHex(input.root, 32),
    toFixedHex(input.nullifierHex, 32),
    input.recipient,
    input.relayer,
    toFixedHex(input.fee, 32),
    toFixedHex(input.refund, 32)
  ];
  return { proof, args };
}

exports.BaseEchoService = BaseEchoService;
exports.BaseEncryptedNotesService = BaseEncryptedNotesService;
exports.BaseEventsService = BaseEventsService;
exports.BaseGovernanceService = BaseGovernanceService;
exports.BaseRegistryService = BaseRegistryService;
exports.BaseTornadoService = BaseTornadoService;
exports.BatchBlockService = BatchBlockService;
exports.BatchEventsService = BatchEventsService;
exports.BatchTransactionService = BatchTransactionService;
exports.DBEchoService = DBEchoService;
exports.DBEncryptedNotesService = DBEncryptedNotesService;
exports.DBGovernanceService = DBGovernanceService;
exports.DBRegistryService = DBRegistryService;
exports.DBTornadoService = DBTornadoService;
exports.DEPOSIT = DEPOSIT;
exports.Deposit = Deposit;
exports.ENSNameWrapper__factory = ENSNameWrapper__factory;
exports.ENSRegistry__factory = ENSRegistry__factory;
exports.ENSResolver__factory = ENSResolver__factory;
exports.ENSUtils = ENSUtils;
exports.ENS__factory = ENS__factory;
exports.ERC20__factory = ERC20__factory;
exports.EnsContracts = EnsContracts;
exports.GET_DEPOSITS = GET_DEPOSITS;
exports.GET_ECHO_EVENTS = GET_ECHO_EVENTS;
exports.GET_ENCRYPTED_NOTES = GET_ENCRYPTED_NOTES;
exports.GET_GOVERNANCE_APY = GET_GOVERNANCE_APY;
exports.GET_GOVERNANCE_EVENTS = GET_GOVERNANCE_EVENTS;
exports.GET_NOTE_ACCOUNTS = GET_NOTE_ACCOUNTS;
exports.GET_REGISTERED = GET_REGISTERED;
exports.GET_STATISTIC = GET_STATISTIC;
exports.GET_WITHDRAWALS = GET_WITHDRAWALS;
exports.INDEX_DB_ERROR = INDEX_DB_ERROR;
exports.IndexedDB = IndexedDB;
exports.Invoice = Invoice;
exports.MAX_FEE = MAX_FEE;
exports.MAX_TOVARISH_EVENTS = MAX_TOVARISH_EVENTS;
exports.MIN_FEE = MIN_FEE;
exports.MIN_STAKE_BALANCE = MIN_STAKE_BALANCE;
exports.MerkleTreeService = MerkleTreeService;
exports.Mimc = Mimc;
exports.Multicall__factory = Multicall__factory;
exports.NetId = NetId;
exports.NoteAccount = NoteAccount;
exports.OffchainOracle__factory = OffchainOracle__factory;
exports.OvmGasPriceOracle__factory = OvmGasPriceOracle__factory;
exports.Pedersen = Pedersen;
exports.RelayerClient = RelayerClient;
exports.ReverseRecords__factory = ReverseRecords__factory;
exports.TokenPriceOracle = TokenPriceOracle;
exports.TornadoBrowserProvider = TornadoBrowserProvider;
exports.TornadoFeeOracle = TornadoFeeOracle;
exports.TornadoRpcSigner = TornadoRpcSigner;
exports.TornadoVoidSigner = TornadoVoidSigner;
exports.TornadoWallet = TornadoWallet;
exports.TovarishClient = TovarishClient;
exports.WITHDRAWAL = WITHDRAWAL;
exports._META = _META;
exports.addNetwork = addNetwork;
exports.addressSchemaType = addressSchemaType;
exports.ajv = ajv;
exports.base64ToBytes = base64ToBytes;
exports.bigIntReplacer = bigIntReplacer;
exports.bnSchemaType = bnSchemaType;
exports.bnToBytes = bnToBytes;
exports.buffPedersenHash = buffPedersenHash;
exports.bufferToBytes = bufferToBytes;
exports.bytes32BNSchemaType = bytes32BNSchemaType;
exports.bytes32SchemaType = bytes32SchemaType;
exports.bytesToBN = bytesToBN;
exports.bytesToBase64 = bytesToBase64;
exports.bytesToHex = bytesToHex;
exports.calculateScore = calculateScore;
exports.calculateSnarkProof = calculateSnarkProof;
exports.chunk = chunk;
exports.concatBytes = concatBytes;
exports.convertETHToTokenAmount = convertETHToTokenAmount;
exports.createDeposit = createDeposit;
exports.crypto = crypto;
exports.defaultConfig = defaultConfig;
exports.defaultUserAgent = defaultUserAgent;
exports.deployHasher = deployHasher;
exports.depositsEventsSchema = depositsEventsSchema;
exports.digest = digest;
exports.downloadZip = downloadZip;
exports.echoEventsSchema = echoEventsSchema;
exports.enabledChains = enabledChains;
exports.encodedLabelToLabelhash = encodedLabelToLabelhash;
exports.encryptedNotesSchema = encryptedNotesSchema;
exports.factories = index;
exports.fetch = fetch;
exports.fetchData = fetchData;
exports.fetchGetUrlFunc = fetchGetUrlFunc;
exports.fetchIp = fetchIp;
exports.gasZipID = gasZipID;
exports.gasZipInbounds = gasZipInbounds;
exports.gasZipInput = gasZipInput;
exports.gasZipMinMax = gasZipMinMax;
exports.getActiveTokenInstances = getActiveTokenInstances;
exports.getActiveTokens = getActiveTokens;
exports.getAllDeposits = getAllDeposits;
exports.getAllEncryptedNotes = getAllEncryptedNotes;
exports.getAllGovernanceEvents = getAllGovernanceEvents;
exports.getAllGraphEchoEvents = getAllGraphEchoEvents;
exports.getAllRegisters = getAllRegisters;
exports.getAllWithdrawals = getAllWithdrawals;
exports.getConfig = getConfig;
exports.getDeposits = getDeposits;
exports.getEncryptedNotes = getEncryptedNotes;
exports.getEventsSchemaValidator = getEventsSchemaValidator;
exports.getGovernanceEvents = getGovernanceEvents;
exports.getGraphEchoEvents = getGraphEchoEvents;
exports.getHttpAgent = getHttpAgent;
exports.getIndexedDB = getIndexedDB;
exports.getInstanceByAddress = getInstanceByAddress;
exports.getMeta = getMeta;
exports.getNetworkConfig = getNetworkConfig;
exports.getNoteAccounts = getNoteAccounts;
exports.getPermit2CommitmentsSignature = getPermit2CommitmentsSignature;
exports.getPermit2Signature = getPermit2Signature;
exports.getPermitCommitmentsSignature = getPermitCommitmentsSignature;
exports.getPermitSignature = getPermitSignature;
exports.getProvider = getProvider;
exports.getProviderWithNetId = getProviderWithNetId;
exports.getRegisters = getRegisters;
exports.getRelayerEnsSubdomains = getRelayerEnsSubdomains;
exports.getStatistic = getStatistic;
exports.getStatusSchema = getStatusSchema;
exports.getSupportedInstances = getSupportedInstances;
exports.getTokenBalances = getTokenBalances;
exports.getTovarishNetworks = getTovarishNetworks;
exports.getWeightRandom = getWeightRandom;
exports.getWithdrawals = getWithdrawals;
exports.governanceEventsSchema = governanceEventsSchema;
exports.hasherBytecode = hasherBytecode;
exports.hexToBytes = hexToBytes;
exports.initGroth16 = initGroth16;
exports.isHex = isHex;
exports.isNode = isNode;
exports.jobRequestSchema = jobRequestSchema;
exports.jobsSchema = jobsSchema;
exports.labelhash = labelhash;
exports.leBuff2Int = leBuff2Int;
exports.leInt2Buff = leInt2Buff;
exports.loadDBEvents = loadDBEvents;
exports.loadRemoteEvents = loadRemoteEvents;
exports.makeLabelNodeAndParent = makeLabelNodeAndParent;
exports.mimc = mimc;
exports.multicall = multicall;
exports.numberFormatter = numberFormatter;
exports.packEncryptedMessage = packEncryptedMessage;
exports.parseInvoice = parseInvoice;
exports.parseNote = parseNote;
exports.pedersen = pedersen;
exports.permit2Address = permit2Address;
exports.pickWeightedRandomRelayer = pickWeightedRandomRelayer;
exports.populateTransaction = populateTransaction;
exports.proofSchemaType = proofSchemaType;
exports.proposalState = proposalState;
exports.queryGraph = queryGraph;
exports.rBigInt = rBigInt;
exports.rHex = rHex;
exports.registeredEventsSchema = registeredEventsSchema;
exports.saveDBEvents = saveDBEvents;
exports.sleep = sleep;
exports.substring = substring;
exports.toFixedHex = toFixedHex;
exports.toFixedLength = toFixedLength;
exports.unpackEncryptedMessage = unpackEncryptedMessage;
exports.unzipAsync = unzipAsync;
exports.validateUrl = validateUrl;
exports.withdrawalsEventsSchema = withdrawalsEventsSchema;
exports.zipAsync = zipAsync;
