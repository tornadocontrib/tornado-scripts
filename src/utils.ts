import { webcrypto } from 'crypto';
import BN from 'bn.js';
import type { BigNumberish } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

type bnInput = number | string | number[] | Uint8Array | Buffer | BN;

export const isNode =
  !(
    process as typeof process & {
      browser?: boolean;
    }
  ).browser && typeof globalThis.window === 'undefined';

export const crypto = isNode ? webcrypto : (globalThis.crypto as typeof webcrypto);

export const chunk = <T>(arr: T[], size: number): T[][] =>
  [...Array(Math.ceil(arr.length / size))].map((_, i) => arr.slice(size * i, size + size * i));

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function validateUrl(url: string, protocols?: string[]) {
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

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
  const merged = new Uint8Array(totalSize);

  arrays.forEach((array, i, arrays) => {
    const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
    merged.set(array, offset);
  });

  return merged;
}

export function bufferToBytes(b: Buffer) {
  return new Uint8Array(b.buffer);
}

export function bytesToBase64(bytes: Uint8Array) {
  return btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
}

export function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function bytesToHex(bytes: Uint8Array) {
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToBytes(hexString: string) {
  if (hexString.slice(0, 2) === '0x') {
    hexString = hexString.replace('0x', '');
  }
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }
  return Uint8Array.from((hexString.match(/.{1,2}/g) as string[]).map((byte) => parseInt(byte, 16)));
}

// Convert BE encoded bytes (Buffer | Uint8Array) array to BigInt
export function bytesToBN(bytes: Uint8Array) {
  return BigInt(bytesToHex(bytes));
}

// Convert BigInt to BE encoded Uint8Array type
export function bnToBytes(bigint: bigint | string) {
  // Parse bigint to hex string
  let hexString: string = typeof bigint === 'bigint' ? bigint.toString(16) : bigint;
  // Remove hex string prefix if exists
  if (hexString.startsWith('0x')) {
    hexString = hexString.replace('0x', '');
  }
  // Hex string length should be a multiplier of two (To make correct bytes)
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }
  return Uint8Array.from((hexString.match(/.{1,2}/g) as string[]).map((byte) => parseInt(byte, 16)));
}

// Convert LE encoded bytes (Buffer | Uint8Array) array to BigInt
export function leBuff2Int(bytes: Uint8Array) {
  return new BN(bytes, 16, 'le');
}

// Convert BigInt to LE encoded Uint8Array type
export function leInt2Buff(bigint: bnInput | bigint) {
  return Uint8Array.from(new BN(bigint as bnInput).toArray('le', 31));
}

// Inherited from tornado-core and tornado-cli
export function toFixedHex(numberish: BigNumberish, length = 32) {
  return (
    '0x' +
    BigInt(numberish)
      .toString(16)
      .padStart(length * 2, '0')
  );
}

export function toFixedLength(string: string, length: number = 32) {
  string = string.replace('0x', '');
  return '0x' + string.padStart(length * 2, '0');
}

// Random BigInt in a range of bytes
export function rBigInt(nbytes: number = 31) {
  return bytesToBN(crypto.getRandomValues(new Uint8Array(nbytes)));
}

// Used for JSON.stringify(value, bigIntReplacer, space)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bigIntReplacer(key: any, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function substring(str: string, length: number = 10) {
  if (str.length < length * 2) {
    return str;
  }

  return `${str.substring(0, length)}...${str.substring(str.length - length)}`;
}

export async function digest(bytes: Uint8Array, algo: string = 'SHA-384') {
  return new Uint8Array(await crypto.subtle.digest(algo, bytes));
}

export function numberFormatter(num: string | number | bigint, digits: number = 3): string {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'K' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find((item) => Number(num) >= item.value);
  return item ? (Number(num) / item.value).toFixed(digits).replace(regexp, '').concat(item.symbol) : '0';
}

export function isHex(value: string) {
  return /^0x[0-9a-fA-F]*$/.test(value);
}
