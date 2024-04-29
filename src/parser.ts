import { InvalidArgumentError } from 'commander';
import { computeAddress, getAddress, Mnemonic } from 'ethers';
import { validateUrl } from './utils';

export function parseNumber(value?: string | number): number {
  if (!value || isNaN(Number(value))) {
    throw new InvalidArgumentError('Invalid Number');
  }
  return Number(value);
}

export function parseUrl(value?: string): string {
  if (!value || !validateUrl(value, ['http:', 'https:'])) {
    throw new InvalidArgumentError('Invalid URL');
  }
  return value;
}

export function parseRelayer(value?: string): string {
  if (!value || !(value.endsWith('.eth') || validateUrl(value, ['http:', 'https:']))) {
    throw new InvalidArgumentError('Invalid Relayer ETH address or URL');
  }
  return value;
}

export function parseAddress(value?: string): string {
  if (!value) {
    throw new InvalidArgumentError('Invalid Address');
  }
  try {
    return getAddress(value);
  } catch {
    throw new InvalidArgumentError('Invalid Address');
  }
}

export function parseMnemonic(value?: string): string {
  if (!value) {
    throw new InvalidArgumentError('Invalid Mnemonic');
  }
  try {
    Mnemonic.fromPhrase(value);
  } catch {
    throw new InvalidArgumentError('Invalid Mnemonic');
  }
  return value;
}

export function parseKey(value?: string): string {
  if (!value) {
    throw new InvalidArgumentError('Invalid Private Key');
  }
  if (value.length === 64) {
    value = '0x' + value;
  }
  try {
    computeAddress(value);
  } catch {
    throw new InvalidArgumentError('Invalid Private Key');
  }
  return value;
}

/**
 * Recovery key shouldn't have a 0x prefix (Also this is how the UI generates)
 */
export function parseRecoveryKey(value?: string): string {
  if (!value) {
    throw new InvalidArgumentError('Invalid Recovery Key');
  }
  try {
    computeAddress('0x' + value);
  } catch {
    throw new InvalidArgumentError('Invalid Recovery Key');
  }
  return value;
}
