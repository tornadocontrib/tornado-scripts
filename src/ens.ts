import { namehash, EnsResolver, AbstractProvider, keccak256, Signer } from 'ethers';

import {
  ENSNameWrapper,
  ENSNameWrapper__factory,
  ENSRegistry,
  ENSRegistry__factory,
  ENSResolver,
  ENSResolver__factory,
} from './typechain';
import { bytesToHex, isHex } from './utils';
import { NetId, NetIdType } from './networkConfig';

export function encodedLabelToLabelhash(label: string): string | null {
  if (label.length !== 66) return null;
  if (label.indexOf('[') !== 0) return null;
  if (label.indexOf(']') !== 65) return null;
  const hash = `0x${label.slice(1, 65)}`;
  if (!isHex(hash)) return null;
  return hash;
}

export function labelhash(label: string) {
  if (!label) {
    return bytesToHex(new Uint8Array(32).fill(0));
  }
  return encodedLabelToLabelhash(label) || keccak256(new TextEncoder().encode(label));
}

export function makeLabelNodeAndParent(name: string) {
  const labels = name.split('.');
  const label = labels.shift() as string;
  const parentNode = namehash(labels.join('.'));

  return {
    label,
    labelhash: labelhash(label),
    parentNode,
  };
}

// https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/contracts/consts.ts
export const EnsContracts: {
  [key: NetIdType]: {
    ensRegistry: string;
    ensPublicResolver: string;
    ensNameWrapper: string;
  };
} = {
  [NetId.MAINNET]: {
    ensRegistry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    ensPublicResolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    ensNameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
  },
  [NetId.SEPOLIA]: {
    ensRegistry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    ensPublicResolver: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    ensNameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8',
  },
};

/**
 * ENSUtils to manage on-chain registered relayers
 */
export class ENSUtils {
  ENSRegistry?: ENSRegistry;
  ENSResolver?: ENSResolver;
  ENSNameWrapper?: ENSNameWrapper;
  provider: AbstractProvider;

  constructor(provider: AbstractProvider) {
    this.provider = provider;
  }

  async getContracts() {
    const { chainId } = await this.provider.getNetwork();

    const { ensRegistry, ensPublicResolver, ensNameWrapper } = EnsContracts[Number(chainId)];

    this.ENSRegistry = ENSRegistry__factory.connect(ensRegistry, this.provider);
    this.ENSResolver = ENSResolver__factory.connect(ensPublicResolver, this.provider);
    this.ENSNameWrapper = ENSNameWrapper__factory.connect(ensNameWrapper, this.provider);
  }

  async getOwner(name: string) {
    if (!this.ENSRegistry) {
      await this.getContracts();
    }

    return (this.ENSRegistry as ENSRegistry).owner(namehash(name));
  }

  // nameWrapper connected with wallet signer
  async unwrap(signer: Signer, name: string) {
    if (!this.ENSNameWrapper) {
      await this.getContracts();
    }

    const owner = (signer as unknown as { address: string }).address;

    const nameWrapper = (this.ENSNameWrapper as ENSNameWrapper).connect(signer);

    const { labelhash } = makeLabelNodeAndParent(name);

    return nameWrapper.unwrapETH2LD(labelhash, owner, owner);
  }

  // https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/functions/wallet/createSubname.ts
  async setSubnodeRecord(signer: Signer, name: string) {
    if (!this.ENSResolver) {
      await this.getContracts();
    }

    const resolver = this.ENSResolver as ENSResolver;
    const registry = (this.ENSRegistry as ENSRegistry).connect(signer);

    const owner = (signer as unknown as { address: string }).address;

    const { labelhash, parentNode } = makeLabelNodeAndParent(name);

    return registry.setSubnodeRecord(parentNode, labelhash, owner, resolver.target, BigInt(0));
  }

  // https://github.com/ensdomains/ensjs/blob/main/packages/ensjs/src/functions/wallet/setTextRecord.ts
  async setText(signer: Signer, name: string, key: string, value: string) {
    const resolver = ENSResolver__factory.connect((await this.getResolver(name))?.address as string, signer);

    return resolver.setText(namehash(name), key, value);
  }

  getResolver(name: string) {
    return EnsResolver.fromName(this.provider, name);
  }

  async getText(name: string, key: string) {
    const resolver = await this.getResolver(name);

    // Retuns null if the name doesn't exist
    if (!resolver) {
      return resolver;
    }

    return (await resolver.getText(key)) || '';
  }
}
