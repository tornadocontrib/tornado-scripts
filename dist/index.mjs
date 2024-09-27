import { FetchRequest, Network, EnsPlugin, GasCostPlugin, JsonRpcProvider, Wallet, HDNodeWallet, VoidSigner, JsonRpcSigner, BrowserProvider, FeeData, getAddress, parseEther, namehash, formatEther, Interface, Contract, computeAddress, parseUnits, Transaction, ZeroAddress } from 'ethers';
import crossFetch from 'cross-fetch';
import { webcrypto } from 'crypto';
import BN from 'bn.js';
import Ajv from 'ajv';
import { buildPedersenHash, buildMimcSponge } from 'circomlibjs';
import { getEncryptionPublicKey, encrypt, decrypt } from '@metamask/eth-sig-util';
import { Worker as Worker$1 } from 'worker_threads';
import { MerkleTree, PartialMerkleTree } from '@tornado/fixed-merkle-tree';
import * as websnarkUtils from '@tornado/websnark/src/utils';
import websnarkGroth from '@tornado/websnark/src/groth16';

var __async$d = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
BigInt.prototype.toJSON = function() {
  return this.toString();
};
const isNode = !process.browser && typeof globalThis.window === "undefined";
const crypto = isNode ? webcrypto : globalThis.crypto;
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
  } catch (e) {
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
    hexString = hexString.replace("0x", "");
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
  if (hexString.startsWith("0x")) {
    hexString = hexString.replace("0x", "");
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
function bigIntReplacer(key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}
function substring(str, length = 10) {
  if (str.length < length * 2) {
    return str;
  }
  return `${str.substring(0, length)}...${str.substring(str.length - length)}`;
}
function digest(bytes, algo = "SHA-384") {
  return __async$d(this, null, function* () {
    return new Uint8Array(yield crypto.subtle.digest(algo, bytes));
  });
}

var __defProp$4 = Object.defineProperty;
var __defProps$3 = Object.defineProperties;
var __getOwnPropDescs$3 = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols$4 = Object.getOwnPropertySymbols;
var __getProtoOf$1 = Object.getPrototypeOf;
var __hasOwnProp$4 = Object.prototype.hasOwnProperty;
var __propIsEnum$4 = Object.prototype.propertyIsEnumerable;
var __reflectGet$1 = Reflect.get;
var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$4 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$4.call(b, prop))
      __defNormalProp$4(a, prop, b[prop]);
  if (__getOwnPropSymbols$4)
    for (var prop of __getOwnPropSymbols$4(b)) {
      if (__propIsEnum$4.call(b, prop))
        __defNormalProp$4(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps$3 = (a, b) => __defProps$3(a, __getOwnPropDescs$3(b));
var __superGet$1 = (cls, obj, key) => __reflectGet$1(__getProtoOf$1(cls), key, obj);
var __async$c = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
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
function fetchData(_0) {
  return __async$c(this, arguments, function* (url, options = {}) {
    var _a, _b, _c;
    const MAX_RETRY = (_a = options.maxRetry) != null ? _a : 3;
    const RETRY_ON = (_b = options.retryOn) != null ? _b : 500;
    const userAgent = (_c = options.userAgent) != null ? _c : defaultUserAgent;
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
        const resp = yield fetch(url, {
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
` + (yield resp.text());
          throw new Error(errMsg);
        }
        if (options.returnResponse) {
          return resp;
        }
        const contentType = resp.headers.get("content-type");
        if (contentType == null ? void 0 : contentType.includes("application/json")) {
          return yield resp.json();
        }
        if (contentType == null ? void 0 : contentType.includes("text")) {
          return yield resp.text();
        }
        return resp;
      } catch (error) {
        if (timeout) {
          clearTimeout(timeout);
        }
        errorObject = error;
        retry++;
        yield sleep(RETRY_ON);
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
  });
}
const fetchGetUrlFunc = (options = {}) => (req, _signal) => __async$c(void 0, null, function* () {
  let signal;
  if (_signal) {
    const controller = new AbortController();
    signal = controller.signal;
    _signal.addListener(() => {
      controller.abort();
    });
  }
  const init = __spreadProps$3(__spreadValues$4({}, options), {
    method: req.method || "POST",
    headers: req.headers,
    body: req.body || void 0,
    signal,
    returnResponse: true
  });
  const resp = yield fetchData(req.url, init);
  const headers = {};
  resp.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const respBody = yield resp.arrayBuffer();
  const body = respBody == null ? null : new Uint8Array(respBody);
  return {
    statusCode: resp.status,
    statusMessage: resp.statusText,
    headers,
    body
  };
});
function getProvider(rpcUrl, fetchOptions) {
  return __async$c(this, null, function* () {
    const fetchReq = new FetchRequest(rpcUrl);
    fetchReq.getUrlFunc = fetchGetUrlFunc(fetchOptions);
    const staticNetwork = yield new JsonRpcProvider(fetchReq).getNetwork();
    const chainId = Number(staticNetwork.chainId);
    if ((fetchOptions == null ? void 0 : fetchOptions.netId) && fetchOptions.netId !== chainId) {
      const errMsg = `Wrong network for ${rpcUrl}, wants ${fetchOptions.netId} got ${chainId}`;
      throw new Error(errMsg);
    }
    return new JsonRpcProvider(fetchReq, staticNetwork, {
      staticNetwork,
      pollingInterval: (fetchOptions == null ? void 0 : fetchOptions.pollingInterval) || 1e3
    });
  });
}
function getProviderWithNetId(netId, rpcUrl, config, fetchOptions) {
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
    pollingInterval: (fetchOptions == null ? void 0 : fetchOptions.pollingInterval) || pollInterval * 1e3
  });
  return provider;
}
const populateTransaction = (signer, tx) => __async$c(void 0, null, function* () {
  const provider = signer.provider;
  if (!tx.from) {
    tx.from = signer.address;
  } else if (tx.from !== signer.address) {
    const errMsg = `populateTransaction: signer mismatch for tx, wants ${tx.from} have ${signer.address}`;
    throw new Error(errMsg);
  }
  const [feeData, nonce] = yield Promise.all([
    (() => __async$c(void 0, null, function* () {
      if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        return new FeeData(null, BigInt(tx.maxFeePerGas), BigInt(tx.maxPriorityFeePerGas));
      }
      if (tx.gasPrice) {
        return new FeeData(BigInt(tx.gasPrice), null, null);
      }
      const fetchedFeeData = yield provider.getFeeData();
      if (fetchedFeeData.maxFeePerGas && fetchedFeeData.maxPriorityFeePerGas) {
        return new FeeData(
          null,
          fetchedFeeData.maxFeePerGas * (BigInt(1e4) + BigInt(signer.gasPriceBump)) / BigInt(1e4),
          fetchedFeeData.maxPriorityFeePerGas
        );
      } else {
        return new FeeData(
          fetchedFeeData.gasPrice * (BigInt(1e4) + BigInt(signer.gasPriceBump)) / BigInt(1e4),
          null,
          null
        );
      }
    }))(),
    (() => __async$c(void 0, null, function* () {
      if (tx.nonce) {
        return tx.nonce;
      }
      let fetchedNonce = yield provider.getTransactionCount(signer.address, "pending");
      if (signer.bumpNonce && signer.nonce && signer.nonce >= fetchedNonce) {
        console.log(
          `populateTransaction: bumping nonce from ${fetchedNonce} to ${fetchedNonce + 1} for ${signer.address}`
        );
        fetchedNonce++;
      }
      return fetchedNonce;
    }))()
  ]);
  tx.nonce = nonce;
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
  tx.gasLimit = tx.gasLimit || (yield (() => __async$c(void 0, null, function* () {
    try {
      const gasLimit = yield provider.estimateGas(tx);
      return gasLimit === BigInt(21e3) ? gasLimit : gasLimit * (BigInt(1e4) + BigInt(signer.gasLimitBump)) / BigInt(1e4);
    } catch (err) {
      if (signer.gasFailover) {
        console.log("populateTransaction: warning gas estimation failed falling back to 3M gas");
        return BigInt("3000000");
      }
      throw err;
    }
  }))());
  return tx;
});
class TornadoWallet extends Wallet {
  constructor(key, provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(key, provider);
    this.gasPriceBump = gasPriceBump != null ? gasPriceBump : 0;
    this.gasLimitBump = gasLimitBump != null ? gasLimitBump : 3e3;
    this.gasFailover = gasFailover != null ? gasFailover : false;
    this.bumpNonce = bumpNonce != null ? bumpNonce : false;
  }
  static fromMnemonic(mneomnic, provider, index = 0, options) {
    const defaultPath = `m/44'/60'/0'/0/${index}`;
    const { privateKey } = HDNodeWallet.fromPhrase(mneomnic, void 0, defaultPath);
    return new TornadoWallet(privateKey, provider, options);
  }
  populateTransaction(tx) {
    return __async$c(this, null, function* () {
      const txObject = yield populateTransaction(this, tx);
      this.nonce = txObject.nonce;
      return __superGet$1(TornadoWallet.prototype, this, "populateTransaction").call(this, txObject);
    });
  }
}
class TornadoVoidSigner extends VoidSigner {
  constructor(address, provider, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(address, provider);
    this.gasPriceBump = gasPriceBump != null ? gasPriceBump : 0;
    this.gasLimitBump = gasLimitBump != null ? gasLimitBump : 3e3;
    this.gasFailover = gasFailover != null ? gasFailover : false;
    this.bumpNonce = bumpNonce != null ? bumpNonce : false;
  }
  populateTransaction(tx) {
    return __async$c(this, null, function* () {
      const txObject = yield populateTransaction(this, tx);
      this.nonce = txObject.nonce;
      return __superGet$1(TornadoVoidSigner.prototype, this, "populateTransaction").call(this, txObject);
    });
  }
}
class TornadoRpcSigner extends JsonRpcSigner {
  constructor(provider, address, { gasPriceBump, gasLimitBump, gasFailover, bumpNonce } = {}) {
    super(provider, address);
    this.gasPriceBump = gasPriceBump != null ? gasPriceBump : 0;
    this.gasLimitBump = gasLimitBump != null ? gasLimitBump : 3e3;
    this.gasFailover = gasFailover != null ? gasFailover : false;
    this.bumpNonce = bumpNonce != null ? bumpNonce : false;
  }
  sendUncheckedTransaction(tx) {
    return __async$c(this, null, function* () {
      return __superGet$1(TornadoRpcSigner.prototype, this, "sendUncheckedTransaction").call(this, yield populateTransaction(this, tx));
    });
  }
}
class TornadoBrowserProvider extends BrowserProvider {
  constructor(ethereum, network, options) {
    super(ethereum, network);
    this.options = options;
  }
  getSigner(address) {
    return __async$c(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const signerAddress = (yield __superGet$1(TornadoBrowserProvider.prototype, this, "getSigner").call(this, address)).address;
      if (((_a = this.options) == null ? void 0 : _a.webChainId) && ((_b = this.options) == null ? void 0 : _b.connectWallet) && Number(yield __superGet$1(TornadoBrowserProvider.prototype, this, "send").call(this, "eth_chainId", [])) !== Number((_c = this.options) == null ? void 0 : _c.webChainId)) {
        yield this.options.connectWallet();
      }
      if ((_d = this.options) == null ? void 0 : _d.handleNetworkChanges) {
        (_e = window == null ? void 0 : window.ethereum) == null ? void 0 : _e.on("chainChanged", this.options.handleNetworkChanges);
      }
      if ((_f = this.options) == null ? void 0 : _f.handleAccountChanges) {
        (_g = window == null ? void 0 : window.ethereum) == null ? void 0 : _g.on("accountsChanged", this.options.handleAccountChanges);
      }
      if ((_h = this.options) == null ? void 0 : _h.handleAccountDisconnect) {
        (_i = window == null ? void 0 : window.ethereum) == null ? void 0 : _i.on("disconnect", this.options.handleAccountDisconnect);
      }
      return new TornadoRpcSigner(this, signerAddress, this.options);
    });
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

var __defProp$3 = Object.defineProperty;
var __defProps$2 = Object.defineProperties;
var __getOwnPropDescs$2 = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols$3 = Object.getOwnPropertySymbols;
var __hasOwnProp$3 = Object.prototype.hasOwnProperty;
var __propIsEnum$3 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$3 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$3.call(b, prop))
      __defNormalProp$3(a, prop, b[prop]);
  if (__getOwnPropSymbols$3)
    for (var prop of __getOwnPropSymbols$3(b)) {
      if (__propIsEnum$3.call(b, prop))
        __defNormalProp$3(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps$2 = (a, b) => __defProps$2(a, __getOwnPropDescs$2(b));
var __async$b = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const isEmptyArray = (arr) => !Array.isArray(arr) || !arr.length;
const GRAPHQL_LIMIT = 1e3;
function queryGraph(_0) {
  return __async$b(this, arguments, function* ({
    graphApi,
    subgraphName,
    query,
    variables,
    fetchDataOptions: fetchDataOptions2
  }) {
    var _a;
    const graphUrl = `${graphApi}/subgraphs/name/${subgraphName}`;
    const { data, errors } = yield fetchData(graphUrl, __spreadProps$2(__spreadValues$3({}, fetchDataOptions2), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables
      })
    }));
    if (errors) {
      throw new Error(JSON.stringify(errors));
    }
    if ((_a = data == null ? void 0 : data._meta) == null ? void 0 : _a.hasIndexingErrors) {
      throw new Error("Subgraph has indexing errors");
    }
    return data;
  });
}
function getStatistic(_0) {
  return __async$b(this, arguments, function* ({
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
      } = yield queryGraph({
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
  });
}
function getMeta(_0) {
  return __async$b(this, arguments, function* ({ graphApi, subgraphName, fetchDataOptions: fetchDataOptions2 }) {
    try {
      const {
        _meta: {
          block: { number: lastSyncBlock },
          hasIndexingErrors
        }
      } = yield queryGraph({
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
  });
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
function getAllRegisters(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getRegisters({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
          relayerAddress: getAddress(address)
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
  });
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
function getAllDeposits(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getDeposits({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
          from: getAddress(from)
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
  });
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
function getAllWithdrawals(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getWithdrawals({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
          to: getAddress(to),
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
  });
}
function getNoteAccounts(_0) {
  return __async$b(this, arguments, function* ({
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
      } = yield queryGraph({
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
  });
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
function getAllGraphEchoEvents(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getGraphEchoEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
          address: getAddress(e.address),
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
  });
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
function getAllEncryptedNotes(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getEncryptedNotes({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
  });
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
function getAllGovernanceEvents(_0) {
  return __async$b(this, arguments, function* ({
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
        } = yield getGovernanceEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions: fetchDataOptions2 });
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
              proposer: getAddress(proposer),
              target: getAddress(target),
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
              voter: getAddress(voter),
              support,
              votes: votes2,
              from: getAddress(from),
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
              account: getAddress(account),
              delegateTo: getAddress(delegateTo)
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
              account: getAddress(account),
              delegateFrom: getAddress(delegateFrom)
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
  });
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

var __async$a = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class BatchBlockService {
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
  getBlock(blockTag) {
    return __async$a(this, null, function* () {
      const blockObject = yield this.provider.getBlock(blockTag);
      if (!blockObject) {
        const errMsg = `No block for ${blockTag}`;
        throw new Error(errMsg);
      }
      return blockObject;
    });
  }
  createBatchRequest(batchArray) {
    return batchArray.map((blocks, index) => __async$a(this, null, function* () {
      yield sleep(20 * index);
      return (() => __async$a(this, null, function* () {
        let retries = 0;
        let err;
        while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
          try {
            return yield Promise.all(blocks.map((b) => this.getBlock(b)));
          } catch (e) {
            retries++;
            err = e;
            yield sleep(this.retryOn);
          }
        }
        throw err;
      }))();
    }));
  }
  getBatchBlocks(blocks) {
    return __async$a(this, null, function* () {
      let blockCount = 0;
      const results = [];
      for (const chunks of chunk(blocks, this.concurrencySize * this.batchSize)) {
        const chunksResult = (yield Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();
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
    });
  }
}
class BatchTransactionService {
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
  getTransaction(txHash) {
    return __async$a(this, null, function* () {
      const txObject = yield this.provider.getTransaction(txHash);
      if (!txObject) {
        const errMsg = `No transaction for ${txHash}`;
        throw new Error(errMsg);
      }
      return txObject;
    });
  }
  createBatchRequest(batchArray) {
    return batchArray.map((txs, index) => __async$a(this, null, function* () {
      yield sleep(20 * index);
      return (() => __async$a(this, null, function* () {
        let retries = 0;
        let err;
        while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
          try {
            return yield Promise.all(txs.map((tx) => this.getTransaction(tx)));
          } catch (e) {
            retries++;
            err = e;
            yield sleep(this.retryOn);
          }
        }
        throw err;
      }))();
    }));
  }
  getBatchTransactions(txs) {
    return __async$a(this, null, function* () {
      let txCount = 0;
      const results = [];
      for (const chunks of chunk(txs, this.concurrencySize * this.batchSize)) {
        const chunksResult = (yield Promise.all(this.createBatchRequest(chunk(chunks, this.batchSize)))).flat();
        results.push(...chunksResult);
        txCount += chunks.length;
        if (typeof this.onProgress === "function") {
          this.onProgress({ percentage: txCount / txs.length, currentIndex: txCount, totalIndex: txs.length });
        }
      }
      return results;
    });
  }
}
class BatchEventsService {
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
  getPastEvents(_0) {
    return __async$a(this, arguments, function* ({ fromBlock, toBlock, type }) {
      let err;
      let retries = 0;
      while (!this.shouldRetry && retries === 0 || this.shouldRetry && retries < this.retryMax) {
        try {
          return yield this.contract.queryFilter(type, fromBlock, toBlock);
        } catch (e) {
          err = e;
          retries++;
          if (e.message.includes("after last accepted block")) {
            const acceptedBlock = parseInt(e.message.split("after last accepted block ")[1]);
            toBlock = acceptedBlock;
          }
          yield sleep(this.retryOn);
        }
      }
      throw err;
    });
  }
  createBatchRequest(batchArray) {
    return batchArray.map((event, index) => __async$a(this, null, function* () {
      yield sleep(20 * index);
      return this.getPastEvents(event);
    }));
  }
  getBatchEvents(_0) {
    return __async$a(this, arguments, function* ({ fromBlock, toBlock, type = "*" }) {
      if (!toBlock) {
        toBlock = yield this.provider.getBlockNumber();
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
        const fetchedEvents = (yield Promise.all(this.createBatchRequest(chunk2))).flat();
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
    });
  }
}

var __defProp$2 = Object.defineProperty;
var __getOwnPropSymbols$2 = Object.getOwnPropertySymbols;
var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
var __propIsEnum$2 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$2 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$2.call(b, prop))
      __defNormalProp$2(a, prop, b[prop]);
  if (__getOwnPropSymbols$2)
    for (var prop of __getOwnPropSymbols$2(b)) {
      if (__propIsEnum$2.call(b, prop))
        __defNormalProp$2(a, prop, b[prop]);
    }
  return a;
};
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
      meowrpc: {
        name: "Meow RPC",
        url: "https://eth.meowrpc.com"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/ethereum-mainnet"
      },
      oneRPC: {
        name: "1RPC",
        url: "https://1rpc.io/eth"
      }
    },
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
    echoContract: "0x9B27DD5Bb15d42DC224FCD0B7caEbBe16161Df42",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
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
      meowrpc: {
        name: "Meow RPC",
        url: "https://bsc.meowrpc.com"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/bsc-mainnet"
      },
      oneRPC: {
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
    tornadoSubgraph: "tornadocash/matic-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/matic"
      },
      meowrpc: {
        name: "Meow RPC",
        url: "https://polygon.meowrpc.com"
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
    ovmGasPriceOracleContract: "0x420000000000000000000000000000000000000F",
    tornadoSubgraph: "tornadocash/optimism-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      optimism: {
        name: "Optimism",
        url: "https://mainnet.optimism.io"
      },
      meowrpc: {
        name: "Meow RPC",
        url: "https://optimism.meowrpc.com"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/optimism-mainnet"
      },
      oneRpc: {
        name: "1RPC",
        url: "https://1rpc.io/op"
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
    tornadoSubgraph: "tornadocash/arbitrum-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      Arbitrum: {
        name: "Arbitrum RPC",
        url: "https://arb1.arbitrum.io/rpc"
      },
      meowrpc: {
        name: "Meow RPC",
        url: "https://arbitrum.meowrpc.com"
      },
      stackup: {
        name: "Stackup RPC",
        url: "https://public.stackup.sh/api/v1/node/arbitrum-one"
      },
      oneRpc: {
        name: "1rpc",
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
    tornadoSubgraph: "tornadocash/xdai-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      gnosis: {
        name: "Gnosis",
        url: "https://rpc.gnosischain.com"
      },
      blockPi: {
        name: "BlockPi",
        url: "https://gnosis.blockpi.network/v1/rpc/public"
      },
      oneRpc: {
        name: "1rpc",
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x0D5550d52428E7e3175bfc9550207e4ad3859b17",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
    offchainOracleContract: "0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8",
    tornadoSubgraph: "tornadocash/avalanche-tornado-subgraph",
    subgraphs: {},
    rpcUrls: {
      publicRpc: {
        name: "Avalanche RPC",
        url: "https://api.avax.network/ext/bc/C/rpc"
      },
      meowRPC: {
        name: "Meow RPC",
        url: "https://avax.meowrpc.com"
      },
      oneRPC: {
        name: "OneRPC",
        url: "https://1rpc.io/avax/c"
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
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    routerContract: "0x1572AFE6949fdF51Cb3E0856216670ae9Ee160Ee",
    echoContract: "0xa75BF2815618872f155b7C4B0C81bF990f5245E4",
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
      onerpc: {
        name: "1rpc",
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
let customConfig = {};
function addNetwork(newConfig) {
  enabledChains.push(
    ...Object.keys(newConfig).map((netId) => Number(netId)).filter((netId) => !enabledChains.includes(netId))
  );
  customConfig = __spreadValues$2(__spreadValues$2({}, customConfig), newConfig);
}
function getNetworkConfig() {
  const allConfig = __spreadValues$2(__spreadValues$2({}, defaultConfig), customConfig);
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
  return Object.keys(tokens).filter((t) => !(disabledTokens == null ? void 0 : disabledTokens.includes(t)));
}
function getActiveTokenInstances(config) {
  const { tokens, disabledTokens } = config;
  return Object.entries(tokens).reduce((acc, [token, instances]) => {
    if (!(disabledTokens == null ? void 0 : disabledTokens.includes(token))) {
      acc[token] = instances;
    }
    return acc;
  }, {});
}
function getInstanceByAddress(config, address) {
  const { tokens, disabledTokens } = config;
  for (const [currency, { instanceAddress }] of Object.entries(tokens)) {
    if (disabledTokens == null ? void 0 : disabledTokens.includes(currency)) {
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

const addressType = { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" };
const bnType = { type: "string", BN: true };
const statusSchema = {
  type: "object",
  properties: {
    rewardAccount: addressType,
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
    version: { type: "string" },
    health: {
      type: "object",
      properties: {
        status: { const: "true" },
        error: { type: "string" }
      },
      required: ["status"]
    },
    currentQueue: { type: "number" }
  },
  required: ["rewardAccount", "instances", "netId", "tornadoServiceFee", "version", "health"]
};
function getStatusSchema(netId, config) {
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
              acc2[cur] = addressType;
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
        instanceProperties.properties.tokenAddress = addressType;
      }
      if (symbol) {
        instanceProperties.properties.symbol = { enum: [symbol] };
      }
      acc.properties[token] = instanceProperties;
      if (!(optionalTokens == null ? void 0 : optionalTokens.includes(token)) && !(disabledTokens == null ? void 0 : disabledTokens.includes(token))) {
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
  if (netId === NetId.MAINNET) {
    const _tokens = Object.keys(tokens).filter((t) => t !== nativeCurrency);
    const ethPrices = {
      type: "object",
      properties: _tokens.reduce((acc, token) => {
        acc[token] = bnType;
        return acc;
      }, {})
      // required: _tokens
    };
    schema.properties.ethPrices = ethPrices;
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

const ajv = new Ajv({ allErrors: true });
ajv.addKeyword({
  keyword: "BN",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (schema, data) => {
    try {
      BigInt(data);
      return true;
    } catch (e) {
      return false;
    }
  },
  errors: true
});

var __defProp$1 = Object.defineProperty;
var __defProps$1 = Object.defineProperties;
var __getOwnPropDescs$1 = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$1 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$1.call(b, prop))
      __defNormalProp$1(a, prop, b[prop]);
  if (__getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(b)) {
      if (__propIsEnum$1.call(b, prop))
        __defNormalProp$1(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps$1 = (a, b) => __defProps$1(a, __getOwnPropDescs$1(b));
var __async$9 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const MIN_FEE = 0.1;
const MAX_FEE = 0.9;
const MIN_STAKE_BALANCE = parseEther("500");
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
  return rawList.map((l) => getAddress(l));
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
  constructor({ netId, config, fetchDataOptions: fetchDataOptions2 }) {
    this.netId = netId;
    this.config = config;
    this.fetchDataOptions = fetchDataOptions2;
  }
  askRelayerStatus(_0) {
    return __async$9(this, arguments, function* ({
      hostname,
      url,
      relayerAddress
    }) {
      var _a, _b;
      if (!url) {
        url = `https://${!hostname.endsWith("/") ? hostname + "/" : hostname}`;
      } else if (!url.endsWith("/")) {
        url += "/";
      }
      const rawStatus = yield fetchData(`${url}status`, __spreadProps$1(__spreadValues$1({}, this.fetchDataOptions), {
        headers: {
          "Content-Type": "application/json, application/x-www-form-urlencoded"
        },
        timeout: ((_a = this.fetchDataOptions) == null ? void 0 : _a.torPort) ? 1e4 : 3e3,
        maxRetry: ((_b = this.fetchDataOptions) == null ? void 0 : _b.torPort) ? 2 : 0
      }));
      const statusValidator = ajv.compile(getStatusSchema(this.netId, this.config));
      if (!statusValidator(rawStatus)) {
        throw new Error("Invalid status schema");
      }
      const status = __spreadProps$1(__spreadValues$1({}, rawStatus), {
        url
      });
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
    });
  }
  filterRelayer(relayer) {
    return __async$9(this, null, function* () {
      var _a;
      const hostname = relayer.hostnames[this.netId];
      const { ensName, relayerAddress } = relayer;
      if (!hostname) {
        return;
      }
      try {
        const status = yield this.askRelayerStatus({ hostname, relayerAddress });
        return {
          netId: status.netId,
          url: status.url,
          hostname,
          ensName,
          relayerAddress,
          rewardAccount: getAddress(status.rewardAccount),
          instances: getSupportedInstances(status.instances),
          stakeBalance: relayer.stakeBalance,
          gasPrice: (_a = status.gasPrices) == null ? void 0 : _a.fast,
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
    });
  }
  getValidRelayers(relayers) {
    return __async$9(this, null, function* () {
      const invalidRelayers = [];
      const validRelayers = (yield Promise.all(relayers.map((relayer) => this.filterRelayer(relayer)))).filter((r) => {
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
    });
  }
  pickWeightedRandomRelayer(relayers) {
    return pickWeightedRandomRelayer(relayers);
  }
  tornadoWithdraw(_0) {
    return __async$9(this, arguments, function* ({ contract, proof, args }) {
      const { url } = this.selectedRelayer;
      const withdrawResponse = yield fetchData(`${url}v1/tornadoWithdraw`, __spreadProps$1(__spreadValues$1({}, this.fetchDataOptions), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contract,
          proof,
          args
        })
      }));
      const { id, error } = withdrawResponse;
      if (error) {
        throw new Error(error);
      }
      let relayerStatus;
      const jobUrl = `${url}v1/jobs/${id}`;
      console.log(`Job submitted: ${jobUrl}
`);
      while (!relayerStatus || !["FAILED", "CONFIRMED"].includes(relayerStatus)) {
        const jobResponse = yield fetchData(jobUrl, __spreadProps$1(__spreadValues$1({}, this.fetchDataOptions), {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }));
        if (jobResponse.error) {
          throw new Error(error);
        }
        const jobValidator = ajv.compile(jobsSchema);
        if (!jobValidator(jobResponse)) {
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
        }
        yield sleep(3e3);
      }
    });
  }
}

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __reflectGet = Reflect.get;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __superGet = (cls, obj, key) => __reflectGet(__getProtoOf(cls), key, obj);
var __async$8 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const DEPOSIT = "deposit";
const WITHDRAWAL = "withdrawal";
class BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    contract,
    type = "",
    deployedBlock = 0,
    fetchDataOptions: fetchDataOptions2
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
  }
  getInstanceName() {
    return "";
  }
  getType() {
    return this.type || "";
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
  formatEvents(events) {
    return __async$8(this, null, function* () {
      return yield new Promise((resolve) => resolve(events));
    });
  }
  /**
   * Get saved or cached events
   */
  getEventsFromDB() {
    return __async$8(this, null, function* () {
      return {
        events: [],
        lastBlock: null
      };
    });
  }
  /**
   * Events from remote cache (Either from local cache, CDN, or from IPFS)
   */
  getEventsFromCache() {
    return __async$8(this, null, function* () {
      return {
        events: [],
        lastBlock: null,
        fromCache: true
      };
    });
  }
  getSavedEvents() {
    return __async$8(this, null, function* () {
      let cachedEvents = yield this.getEventsFromDB();
      if (!cachedEvents || !cachedEvents.events.length) {
        cachedEvents = yield this.getEventsFromCache();
      }
      return cachedEvents;
    });
  }
  /**
   * Get latest events
   */
  getEventsFromGraph(_0) {
    return __async$8(this, arguments, function* ({
      fromBlock,
      methodName = ""
    }) {
      if (!this.graphApi || !this.subgraphName) {
        return {
          events: [],
          lastBlock: fromBlock
        };
      }
      const { events, lastSyncBlock } = yield graph[methodName || this.getGraphMethod()](__spreadValues({
        fromBlock
      }, this.getGraphParams()));
      return {
        events,
        lastBlock: lastSyncBlock
      };
    });
  }
  getEventsFromRpc(_0) {
    return __async$8(this, arguments, function* ({
      fromBlock,
      toBlock
    }) {
      try {
        if (!toBlock) {
          toBlock = yield this.provider.getBlockNumber();
        }
        if (fromBlock >= toBlock) {
          return {
            events: [],
            lastBlock: toBlock
          };
        }
        this.updateEventProgress({ percentage: 0, type: this.getType() });
        const events = yield this.formatEvents(
          yield this.batchEventsService.getBatchEvents({ fromBlock, toBlock, type: this.getType() })
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
    });
  }
  getLatestEvents(_0) {
    return __async$8(this, arguments, function* ({ fromBlock }) {
      const graphEvents = yield this.getEventsFromGraph({ fromBlock });
      const lastSyncBlock = graphEvents.lastBlock && graphEvents.lastBlock >= fromBlock ? graphEvents.lastBlock : fromBlock;
      const rpcEvents = yield this.getEventsFromRpc({ fromBlock: lastSyncBlock });
      return {
        events: [...graphEvents.events, ...rpcEvents.events],
        lastBlock: rpcEvents.lastBlock
      };
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateEvents({ events, lastBlock }) {
  }
  /**
   * Handle saving events
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  saveEvents(_0) {
    return __async$8(this, arguments, function* ({ events, lastBlock }) {
    });
  }
  /**
   * Trigger saving and receiving latest events
   */
  updateEvents() {
    return __async$8(this, null, function* () {
      var _a;
      const savedEvents = yield this.getSavedEvents();
      let fromBlock = this.deployedBlock;
      if (savedEvents && savedEvents.lastBlock) {
        fromBlock = savedEvents.lastBlock + 1;
      }
      const newEvents = yield this.getLatestEvents({ fromBlock });
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
      const lastBlock = newEvents.lastBlock || ((_a = allEvents[allEvents.length - 1]) == null ? void 0 : _a.blockNumber);
      this.validateEvents({ events: allEvents, lastBlock });
      if (savedEvents.fromCache || newEvents.events.length) {
        yield this.saveEvents({ events: allEvents, lastBlock });
      }
      return {
        events: allEvents,
        lastBlock
      };
    });
  }
}
class BaseTornadoService extends BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Tornado,
    type,
    amount,
    currency,
    deployedBlock,
    fetchDataOptions: fetchDataOptions2
  }) {
    super({ netId, provider, graphApi, subgraphName, contract: Tornado, type, deployedBlock, fetchDataOptions: fetchDataOptions2 });
    this.amount = amount;
    this.currency = currency;
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
  formatEvents(events) {
    return __async$8(this, null, function* () {
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
        const txs = yield this.batchTransactionService.getBatchTransactions([
          ...new Set(formattedEvents.map(({ transactionHash }) => transactionHash))
        ]);
        return formattedEvents.map((event) => {
          const { from } = txs.find(({ hash }) => hash === event.transactionHash);
          return __spreadProps(__spreadValues({}, event), {
            from
          });
        });
      } else {
        const formattedEvents = events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
          const { nullifierHash, to, fee } = args;
          return {
            blockNumber,
            logIndex,
            transactionHash,
            nullifierHash: String(nullifierHash),
            to: getAddress(to),
            fee: String(fee)
          };
        });
        const blocks = yield this.batchBlockService.getBatchBlocks([
          ...new Set(formattedEvents.map(({ blockNumber }) => blockNumber))
        ]);
        return formattedEvents.map((event) => {
          const { timestamp } = blocks.find(({ number }) => number === event.blockNumber);
          return __spreadProps(__spreadValues({}, event), {
            timestamp
          });
        });
      }
    });
  }
  validateEvents({ events }) {
    if (events.length && this.getType().toLowerCase() === DEPOSIT) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.leafIndex !== events.length - 1) {
        const errMsg = `Deposit events invalid wants ${events.length - 1} leafIndex have ${lastEvent.leafIndex}`;
        throw new Error(errMsg);
      }
    }
  }
}
class BaseEchoService extends BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Echoer,
    deployedBlock,
    fetchDataOptions: fetchDataOptions2
  }) {
    super({ netId, provider, graphApi, subgraphName, contract: Echoer, deployedBlock, fetchDataOptions: fetchDataOptions2 });
  }
  getInstanceName() {
    return `echo_${this.netId}`;
  }
  getType() {
    return "Echo";
  }
  getGraphMethod() {
    return "getAllGraphEchoEvents";
  }
  formatEvents(events) {
    return __async$8(this, null, function* () {
      return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { who, data } = args;
        if (who && data) {
          const eventObjects = {
            blockNumber,
            logIndex,
            transactionHash
          };
          return __spreadProps(__spreadValues({}, eventObjects), {
            address: who,
            encryptedAccount: data
          });
        }
      }).filter((e) => e);
    });
  }
  getEventsFromGraph(_0) {
    return __async$8(this, arguments, function* ({ fromBlock }) {
      if (!this.graphApi || this.graphApi.includes("api.thegraph.com")) {
        return {
          events: [],
          lastBlock: fromBlock
        };
      }
      return __superGet(BaseEchoService.prototype, this, "getEventsFromGraph").call(this, { fromBlock });
    });
  }
}
class BaseEncryptedNotesService extends BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Router,
    deployedBlock,
    fetchDataOptions: fetchDataOptions2
  }) {
    super({ netId, provider, graphApi, subgraphName, contract: Router, deployedBlock, fetchDataOptions: fetchDataOptions2 });
  }
  getInstanceName() {
    return `encrypted_notes_${this.netId}`;
  }
  getType() {
    return "EncryptedNote";
  }
  getGraphMethod() {
    return "getAllEncryptedNotes";
  }
  formatEvents(events) {
    return __async$8(this, null, function* () {
      return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { encryptedNote } = args;
        if (encryptedNote && encryptedNote !== "0x") {
          const eventObjects = {
            blockNumber,
            logIndex,
            transactionHash
          };
          return __spreadProps(__spreadValues({}, eventObjects), {
            encryptedNote
          });
        }
      }).filter((e) => e);
    });
  }
}
class BaseGovernanceService extends BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Governance,
    deployedBlock,
    fetchDataOptions: fetchDataOptions2
  }) {
    super({ netId, provider, graphApi, subgraphName, contract: Governance, deployedBlock, fetchDataOptions: fetchDataOptions2 });
    this.batchTransactionService = new BatchTransactionService({
      provider,
      onProgress: this.updateTransactionProgress
    });
  }
  getInstanceName() {
    return `governance_${this.netId}`;
  }
  getType() {
    return "*";
  }
  getGraphMethod() {
    return "getAllGovernanceEvents";
  }
  formatEvents(events) {
    return __async$8(this, null, function* () {
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
          proposalEvents.push(__spreadProps(__spreadValues({}, eventObjects), {
            id: Number(id),
            proposer,
            target,
            startTime: Number(startTime),
            endTime: Number(endTime),
            description
          }));
        }
        if (event === "Voted") {
          const { proposalId, voter, support, votes } = args;
          votedEvents.push(__spreadProps(__spreadValues({}, eventObjects), {
            proposalId: Number(proposalId),
            voter,
            support,
            votes,
            from: "",
            input: ""
          }));
        }
        if (event === "Delegated") {
          const { account, to: delegateTo } = args;
          delegatedEvents.push(__spreadProps(__spreadValues({}, eventObjects), {
            account,
            delegateTo
          }));
        }
        if (event === "Undelegated") {
          const { account, from: delegateFrom } = args;
          undelegatedEvents.push(__spreadProps(__spreadValues({}, eventObjects), {
            account,
            delegateFrom
          }));
        }
      });
      if (votedEvents.length) {
        this.updateTransactionProgress({ percentage: 0 });
        const txs = yield this.batchTransactionService.getBatchTransactions([
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
    });
  }
  getEventsFromGraph(_0) {
    return __async$8(this, arguments, function* ({ fromBlock }) {
      if (!this.graphApi || !this.subgraphName || this.graphApi.includes("api.thegraph.com")) {
        return {
          events: [],
          lastBlock: fromBlock
        };
      }
      return __superGet(BaseGovernanceService.prototype, this, "getEventsFromGraph").call(this, { fromBlock });
    });
  }
}
function getTovarishNetworks(registryService, relayers) {
  return __async$8(this, null, function* () {
    yield Promise.all(
      relayers.filter((r) => r.tovarishUrl).map((relayer) => __async$8(this, null, function* () {
        var _a, _b;
        try {
          relayer.tovarishNetworks = yield fetchData(relayer.tovarishUrl, __spreadProps(__spreadValues({}, registryService.fetchDataOptions), {
            headers: {
              "Content-Type": "application/json"
            },
            timeout: ((_a = registryService.fetchDataOptions) == null ? void 0 : _a.torPort) ? 1e4 : 3e3,
            maxRetry: ((_b = registryService.fetchDataOptions) == null ? void 0 : _b.torPort) ? 2 : 0
          }));
        } catch (e) {
          relayer.tovarishNetworks = [];
        }
      }))
    );
  });
}
class BaseRegistryService extends BaseEventsService {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    RelayerRegistry,
    Aggregator,
    relayerEnsSubdomains,
    deployedBlock,
    fetchDataOptions: fetchDataOptions2
  }) {
    super({ netId, provider, graphApi, subgraphName, contract: RelayerRegistry, deployedBlock, fetchDataOptions: fetchDataOptions2 });
    this.Aggregator = Aggregator;
    this.relayerEnsSubdomains = relayerEnsSubdomains;
    this.updateInterval = 86400;
  }
  getInstanceName() {
    return `registered_${this.netId}`;
  }
  // Name of type used for events
  getType() {
    return "RelayerRegistered";
  }
  // Name of method used for graph
  getGraphMethod() {
    return "getAllRegisters";
  }
  formatEvents(events) {
    return __async$8(this, null, function* () {
      return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const eventObjects = {
          blockNumber,
          logIndex,
          transactionHash
        };
        return __spreadProps(__spreadValues({}, eventObjects), {
          ensName: args.ensName,
          relayerAddress: args.relayerAddress
        });
      });
    });
  }
  /**
   * Get saved or cached relayers
   */
  getRelayersFromDB() {
    return __async$8(this, null, function* () {
      return {
        timestamp: 0,
        relayers: []
      };
    });
  }
  /**
   * Relayers from remote cache (Either from local cache, CDN, or from IPFS)
   */
  getRelayersFromCache() {
    return __async$8(this, null, function* () {
      return {
        timestamp: 0,
        relayers: [],
        fromCache: true
      };
    });
  }
  getSavedRelayers() {
    return __async$8(this, null, function* () {
      let cachedRelayers = yield this.getRelayersFromDB();
      if (!cachedRelayers || !cachedRelayers.relayers.length) {
        cachedRelayers = yield this.getRelayersFromCache();
      }
      return cachedRelayers;
    });
  }
  getLatestRelayers() {
    return __async$8(this, null, function* () {
      const registerEvents = (yield this.updateEvents()).events;
      const subdomains = Object.values(this.relayerEnsSubdomains);
      const registerSet = /* @__PURE__ */ new Set();
      const uniqueRegisters = registerEvents.filter(({ ensName }) => {
        if (!registerSet.has(ensName)) {
          registerSet.add(ensName);
          return true;
        }
        return false;
      });
      const relayerNameHashes = uniqueRegisters.map((r) => namehash(r.ensName));
      const [relayersData, timestamp] = yield Promise.all([
        this.Aggregator.relayersData.staticCall(relayerNameHashes, subdomains.concat("tovarish-relayer")),
        this.provider.getBlock("latest").then((b) => Number(b == null ? void 0 : b.timestamp))
      ]);
      const relayers = relayersData.map(({ owner, balance: stakeBalance, records, isRegistered }, index) => {
        const { ensName, relayerAddress } = uniqueRegisters[index];
        let tovarishUrl = void 0;
        const hostnames = records.reduce((acc, record, recordIndex) => {
          if (record) {
            if (recordIndex === records.length - 1) {
              tovarishUrl = record;
              return acc;
            }
            acc[Number(Object.keys(this.relayerEnsSubdomains)[recordIndex])] = record;
          }
          return acc;
        }, {});
        const isOwner = !relayerAddress || relayerAddress === owner;
        const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;
        const preCondition = Object.keys(hostnames).length && isOwner && isRegistered && hasMinBalance;
        if (preCondition) {
          return {
            ensName,
            relayerAddress,
            isRegistered,
            owner,
            stakeBalance: formatEther(stakeBalance),
            hostnames,
            tovarishUrl
          };
        }
      }).filter((r) => r);
      yield getTovarishNetworks(this, relayers);
      return {
        timestamp,
        relayers
      };
    });
  }
  /**
   * Handle saving relayers
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  saveRelayers(_0) {
    return __async$8(this, arguments, function* ({ timestamp, relayers }) {
    });
  }
  /**
   * Get cached or latest relayer and save to local
   */
  updateRelayers() {
    return __async$8(this, null, function* () {
      let { timestamp, relayers, fromCache } = yield this.getSavedRelayers();
      let shouldSave = fromCache != null ? fromCache : false;
      if (!relayers.length || timestamp + this.updateInterval < Math.floor(Date.now() / 1e3)) {
        console.log("\nUpdating relayers from registry\n");
        ({ timestamp, relayers } = yield this.getLatestRelayers());
        shouldSave = true;
      }
      if (shouldSave) {
        yield this.saveRelayers({ timestamp, relayers });
      }
      return { timestamp, relayers };
    });
  }
}

const _abi$5 = [
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
  static createInterface() {
    return new Interface(_abi$5);
  }
  static connect(address, runner) {
    return new Contract(address, _abi$5, runner);
  }
}
ENS__factory.abi = _abi$5;

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
  static createInterface() {
    return new Interface(_abi$4);
  }
  static connect(address, runner) {
    return new Contract(address, _abi$4, runner);
  }
}
ERC20__factory.abi = _abi$4;

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
  static createInterface() {
    return new Interface(_abi$3);
  }
  static connect(address, runner) {
    return new Contract(address, _abi$3, runner);
  }
}
Multicall__factory.abi = _abi$3;

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
  static createInterface() {
    return new Interface(_abi$2);
  }
  static connect(address, runner) {
    return new Contract(address, _abi$2, runner);
  }
}
OffchainOracle__factory.abi = _abi$2;

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
  static createInterface() {
    return new Interface(_abi$1);
  }
  static connect(address, runner) {
    return new Contract(address, _abi$1, runner);
  }
}
OvmGasPriceOracle__factory.abi = _abi$1;

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
  static createInterface() {
    return new Interface(_abi);
  }
  static connect(address, runner) {
    return new Contract(address, _abi, runner);
  }
}
ReverseRecords__factory.abi = _abi;

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ENS__factory: ENS__factory,
  ERC20__factory: ERC20__factory,
  Multicall__factory: Multicall__factory,
  OffchainOracle__factory: OffchainOracle__factory,
  OvmGasPriceOracle__factory: OvmGasPriceOracle__factory,
  ReverseRecords__factory: ReverseRecords__factory
});

var __async$7 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class Pedersen {
  constructor() {
    this.pedersenPromise = this.initPedersen();
  }
  initPedersen() {
    return __async$7(this, null, function* () {
      this.pedersenHash = yield buildPedersenHash();
      this.babyJub = this.pedersenHash.babyJub;
    });
  }
  unpackPoint(buffer) {
    return __async$7(this, null, function* () {
      var _a, _b;
      yield this.pedersenPromise;
      return (_b = this.babyJub) == null ? void 0 : _b.unpackPoint((_a = this.pedersenHash) == null ? void 0 : _a.hash(buffer));
    });
  }
  toStringBuffer(buffer) {
    var _a;
    return (_a = this.babyJub) == null ? void 0 : _a.F.toString(buffer);
  }
}
const pedersen = new Pedersen();
function buffPedersenHash(buffer) {
  return __async$7(this, null, function* () {
    const [hash] = yield pedersen.unpackPoint(buffer);
    return pedersen.toStringBuffer(hash);
  });
}

var __async$6 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
function createDeposit(_0) {
  return __async$6(this, arguments, function* ({ nullifier, secret }) {
    const preimage = new Uint8Array([...leInt2Buff(nullifier), ...leInt2Buff(secret)]);
    const noteHex = toFixedHex(bytesToBN(preimage), 62);
    const commitment = BigInt(yield buffPedersenHash(preimage));
    const commitmentHex = toFixedHex(commitment);
    const nullifierHash = BigInt(yield buffPedersenHash(leInt2Buff(nullifier)));
    const nullifierHex = toFixedHex(nullifierHash);
    return {
      preimage,
      noteHex,
      commitment,
      commitmentHex,
      nullifierHash,
      nullifierHex
    };
  });
}
class Deposit {
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
  static createNote(_0) {
    return __async$6(this, arguments, function* ({ currency, amount, netId, nullifier, secret }) {
      if (!nullifier) {
        nullifier = rBigInt(31);
      }
      if (!secret) {
        secret = rBigInt(31);
      }
      const depositObject = yield createDeposit({
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
    });
  }
  static parseNote(noteString) {
    return __async$6(this, null, function* () {
      const noteRegex = new RegExp("tornado-(?<currency>\\w+)-(?<amount>[\\d.]+)-(?<netId>\\d+)-0x(?<note>[0-9a-fA-F]{124})", "g");
      const match = noteRegex.exec(noteString);
      if (!match) {
        throw new Error("The note has invalid format");
      }
      const matchGroup = match == null ? void 0 : match.groups;
      const currency = matchGroup.currency.toLowerCase();
      const amount = matchGroup.amount;
      const netId = Number(matchGroup.netId);
      const bytes = bnToBytes("0x" + matchGroup.note);
      const nullifier = BigInt(leBuff2Int(bytes.slice(0, 31)).toString());
      const secret = BigInt(leBuff2Int(bytes.slice(31, 62)).toString());
      const depositObject = yield createDeposit({ nullifier, secret });
      const invoice = `tornadoInvoice-${currency}-${amount}-${netId}-${depositObject.commitmentHex}`;
      const newDeposit = new Deposit({
        currency,
        amount,
        netId,
        note: noteString,
        noteHex: depositObject.noteHex,
        invoice,
        nullifier,
        secret,
        commitmentHex: depositObject.commitmentHex,
        nullifierHex: depositObject.nullifierHex
      });
      return newDeposit;
    });
  }
}
class Invoice {
  constructor(invoiceString) {
    const invoiceRegex = new RegExp("tornadoInvoice-(?<currency>\\w+)-(?<amount>[\\d.]+)-(?<netId>\\d+)-0x(?<commitment>[0-9a-fA-F]{64})", "g");
    const match = invoiceRegex.exec(invoiceString);
    if (!match) {
      throw new Error("The note has invalid format");
    }
    const matchGroup = match == null ? void 0 : match.groups;
    const currency = matchGroup.currency.toLowerCase();
    const amount = matchGroup.amount;
    const netId = Number(matchGroup.netId);
    this.currency = currency;
    this.amount = amount;
    this.netId = netId;
    this.commitment = "0x" + matchGroup.commitment;
    this.invoice = invoiceString;
  }
  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        commitment: this.commitment,
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
  constructor({ netId, blockNumber, recoveryKey, Echoer: Echoer2 }) {
    if (!recoveryKey) {
      recoveryKey = bytesToHex(crypto.getRandomValues(new Uint8Array(32))).slice(2);
    }
    this.netId = Math.floor(Number(netId));
    this.blockNumber = blockNumber;
    this.recoveryKey = recoveryKey;
    this.recoveryAddress = computeAddress("0x" + recoveryKey);
    this.recoveryPublicKey = getEncryptionPublicKey(recoveryKey);
    this.Echoer = Echoer2;
  }
  /**
   * Intends to mock eth_getEncryptionPublicKey behavior from MetaMask
   * In order to make the recoveryKey retrival from Echoer possible from the bare private key
   */
  static getWalletPublicKey(wallet) {
    let { privateKey } = wallet;
    if (privateKey.startsWith("0x")) {
      privateKey = privateKey.replace("0x", "");
    }
    return getEncryptionPublicKey(privateKey);
  }
  // This function intends to provide an encrypted value of recoveryKey for an on-chain Echoer backup purpose
  // Thus, the pubKey should be derived by a Wallet instance or from Web3 wallets
  // pubKey: base64 encoded 32 bytes key from https://docs.metamask.io/wallet/reference/eth_getencryptionpublickey/
  getEncryptedAccount(walletPublicKey) {
    const encryptedData = encrypt({
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
  decryptAccountsWithWallet(wallet, events) {
    let { privateKey } = wallet;
    if (privateKey.startsWith("0x")) {
      privateKey = privateKey.replace("0x", "");
    }
    const decryptedEvents = [];
    for (const event of events) {
      try {
        const unpackedMessage = unpackEncryptedMessage(event.encryptedAccount);
        const recoveryKey = decrypt({
          encryptedData: unpackedMessage,
          privateKey
        });
        decryptedEvents.push(
          new NoteAccount({
            netId: this.netId,
            blockNumber: event.blockNumber,
            recoveryKey,
            Echoer: this.Echoer
          })
        );
      } catch (e) {
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
        const [address, noteHex] = decrypt({
          encryptedData: unpackedMessage,
          privateKey: this.recoveryKey
        }).split("-");
        decryptedEvents.push({
          blockNumber: event.blockNumber,
          address: getAddress(address),
          noteHex
        });
      } catch (e) {
        continue;
      }
    }
    return decryptedEvents;
  }
  encryptNote({ address, noteHex }) {
    const encryptedData = encrypt({
      publicKey: this.recoveryPublicKey,
      data: `${address}-${noteHex}`,
      version: "x25519-xsalsa20-poly1305"
    });
    return packEncryptedMessage(encryptedData);
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
  constructor(ovmGasPriceOracle) {
    if (ovmGasPriceOracle) {
      this.ovmGasPriceOracle = ovmGasPriceOracle;
    }
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
        gasPrice: parseUnits("1", "gwei"),
        to: DUMMY_ADDRESS
      };
    }
    return this.ovmGasPriceOracle.getL1Fee.staticCall(Transaction.from(tx).unsignedSerialized);
  }
  /**
   * We don't need to distinguish default refunds by tokens since most users interact with other defi protocols after withdrawal
   * So we default with 1M gas which is enough for two or three swaps
   * Using 30 gwei for default but it is recommended to supply cached gasPrice value from the UI
   */
  defaultEthRefund(gasPrice, gasLimit) {
    return (gasPrice ? BigInt(gasPrice) : parseUnits("30", "gwei")) * BigInt(gasLimit || 1e6);
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

var __async$5 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class Mimc {
  constructor() {
    this.mimcPromise = this.initMimc();
  }
  initMimc() {
    return __async$5(this, null, function* () {
      this.sponge = yield buildMimcSponge();
      this.hash = (left, right) => {
        var _a, _b;
        return (_b = this.sponge) == null ? void 0 : _b.F.toString((_a = this.sponge) == null ? void 0 : _a.multiHash([BigInt(left), BigInt(right)]));
      };
    });
  }
  getHash() {
    return __async$5(this, null, function* () {
      yield this.mimcPromise;
      return {
        sponge: this.sponge,
        hash: this.hash
      };
    });
  }
}
const mimc = new Mimc();

var __async$4 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class MerkleTreeService {
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
  createTree(events) {
    return __async$4(this, null, function* () {
      const { hash: hashFunction } = yield mimc.getHash();
      if (this.merkleWorkerPath) {
        console.log("Using merkleWorker\n");
        try {
          if (isNode) {
            const merkleWorkerPromise = new Promise((resolve, reject) => {
              const worker = new Worker$1(this.merkleWorkerPath, {
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
            return MerkleTree.deserialize(JSON.parse(yield merkleWorkerPromise), hashFunction);
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
            return MerkleTree.deserialize(JSON.parse(yield merkleWorkerPromise), hashFunction);
          }
        } catch (err) {
          console.log("merkleWorker failed, falling back to synchronous merkle tree");
          console.log(err);
        }
      }
      return new MerkleTree(this.merkleTreeHeight, events, {
        zeroElement: this.emptyElement,
        hashFunction
      });
    });
  }
  createPartialTree(_0) {
    return __async$4(this, arguments, function* ({ edge, elements }) {
      const { hash: hashFunction } = yield mimc.getHash();
      if (this.merkleWorkerPath) {
        console.log("Using merkleWorker\n");
        try {
          if (isNode) {
            const merkleWorkerPromise = new Promise((resolve, reject) => {
              const worker = new Worker$1(this.merkleWorkerPath, {
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
            return PartialMerkleTree.deserialize(JSON.parse(yield merkleWorkerPromise), hashFunction);
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
            return PartialMerkleTree.deserialize(JSON.parse(yield merkleWorkerPromise), hashFunction);
          }
        } catch (err) {
          console.log("merkleWorker failed, falling back to synchronous merkle tree");
          console.log(err);
        }
      }
      return new PartialMerkleTree(this.merkleTreeHeight, edge, elements, {
        zeroElement: this.emptyElement,
        hashFunction
      });
    });
  }
  verifyTree(events) {
    return __async$4(this, null, function* () {
      console.log(
        `
Creating deposit tree for ${this.netId} ${this.amount} ${this.currency.toUpperCase()} would take a while
`
      );
      console.time("Created tree in");
      const tree = yield this.createTree(events.map(({ commitment }) => commitment));
      console.timeEnd("Created tree in");
      console.log("");
      const isKnownRoot = yield this.Tornado.isKnownRoot(toFixedHex(BigInt(tree.root)));
      if (!isKnownRoot) {
        const errMsg = `Deposit Event ${this.netId} ${this.amount} ${this.currency} is invalid`;
        throw new Error(errMsg);
      }
      return tree;
    });
  }
}

var __async$3 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
function multicall(Multicall2, calls) {
  return __async$3(this, null, function* () {
    const calldata = calls.map((call) => {
      var _a, _b, _c;
      const target = ((_a = call.contract) == null ? void 0 : _a.target) || call.address;
      const callInterface = ((_b = call.contract) == null ? void 0 : _b.interface) || call.interface;
      return {
        target,
        callData: callInterface.encodeFunctionData(call.name, call.params),
        allowFailure: (_c = call.allowFailure) != null ? _c : false
      };
    });
    const returnData = yield Multicall2.aggregate3.staticCall(calldata);
    const res = returnData.map((call, i) => {
      var _a;
      const callInterface = ((_a = calls[i].contract) == null ? void 0 : _a.interface) || calls[i].interface;
      const [result, data] = call;
      const decodeResult = result && data && data !== "0x" ? callInterface.decodeFunctionResult(calls[i].name, data) : null;
      return !decodeResult ? null : decodeResult.length === 1 ? decodeResult[0] : decodeResult;
    });
    return res;
  });
}

var __async$2 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class TokenPriceOracle {
  constructor(provider, multicall2, oracle) {
    this.provider = provider;
    this.multicall = multicall2;
    this.oracle = oracle;
  }
  fetchPrices(tokens) {
    return __async$2(this, null, function* () {
      if (!this.oracle) {
        return new Promise((resolve) => resolve(tokens.map(() => parseEther("0.0001"))));
      }
      const prices = yield multicall(
        this.multicall,
        tokens.map(({ tokenAddress }) => ({
          contract: this.oracle,
          name: "getRateToEth",
          params: [tokenAddress, true]
        }))
      );
      return prices.map((price, index) => {
        return price * BigInt(10 ** tokens[index].decimals) / BigInt(10 ** 18);
      });
    });
  }
}

var __async$1 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
function getTokenBalances(_0) {
  return __async$1(this, arguments, function* ({
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
    const multicallResults = yield multicall(Multicall2, [
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
        address: ZeroAddress,
        name: currencyName,
        symbol: currencyName,
        decimals: 18,
        balance: ethResults
      },
      ...tokenBalances
    ];
  });
}

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
let groth16;
function initGroth16() {
  return __async(this, null, function* () {
    if (!groth16) {
      groth16 = yield websnarkGroth({ wasmInitialMemory: 2e3 });
    }
  });
}
function calculateSnarkProof(input, circuit, provingKey) {
  return __async(this, null, function* () {
    if (!groth16) {
      yield initGroth16();
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
    const proofData = yield websnarkUtils.genWitnessAndProve(yield groth16, snarkInput, circuit, provingKey);
    const proof = websnarkUtils.toSolidityInput(proofData).proof;
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
  });
}

export { BaseEchoService, BaseEncryptedNotesService, BaseEventsService, BaseGovernanceService, BaseRegistryService, BaseTornadoService, BatchBlockService, BatchEventsService, BatchTransactionService, DEPOSIT, Deposit, ENS__factory, ERC20__factory, GET_DEPOSITS, GET_ECHO_EVENTS, GET_ENCRYPTED_NOTES, GET_GOVERNANCE_APY, GET_GOVERNANCE_EVENTS, GET_NOTE_ACCOUNTS, GET_REGISTERED, GET_STATISTIC, GET_WITHDRAWALS, Invoice, MAX_FEE, MIN_FEE, MIN_STAKE_BALANCE, MerkleTreeService, Mimc, Multicall__factory, NetId, NoteAccount, OffchainOracle__factory, OvmGasPriceOracle__factory, Pedersen, RelayerClient, ReverseRecords__factory, TokenPriceOracle, TornadoBrowserProvider, TornadoFeeOracle, TornadoRpcSigner, TornadoVoidSigner, TornadoWallet, WITHDRAWAL, _META, addNetwork, ajv, base64ToBytes, bigIntReplacer, bnToBytes, buffPedersenHash, bufferToBytes, bytesToBN, bytesToBase64, bytesToHex, calculateScore, calculateSnarkProof, chunk, concatBytes, convertETHToTokenAmount, createDeposit, crypto, customConfig, defaultConfig, defaultUserAgent, digest, enabledChains, index as factories, fetch, fetchData, fetchGetUrlFunc, getActiveTokenInstances, getActiveTokens, getAllDeposits, getAllEncryptedNotes, getAllGovernanceEvents, getAllGraphEchoEvents, getAllRegisters, getAllWithdrawals, getConfig, getDeposits, getEncryptedNotes, getGovernanceEvents, getGraphEchoEvents, getHttpAgent, getInstanceByAddress, getMeta, getNetworkConfig, getNoteAccounts, getProvider, getProviderWithNetId, getRegisters, getRelayerEnsSubdomains, getStatistic, getStatusSchema, getSupportedInstances, getTokenBalances, getTovarishNetworks, getWeightRandom, getWithdrawals, hexToBytes, initGroth16, isNode, jobsSchema, leBuff2Int, leInt2Buff, mimc, multicall, packEncryptedMessage, pedersen, pickWeightedRandomRelayer, populateTransaction, queryGraph, rBigInt, sleep, substring, toFixedHex, toFixedLength, unpackEncryptedMessage, validateUrl };
