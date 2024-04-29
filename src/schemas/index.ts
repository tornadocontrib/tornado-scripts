import Ajv from 'ajv';
import type { BigNumberish } from 'ethers';

export const ajv = new Ajv({ allErrors: true });

ajv.addKeyword({
  keyword: 'BN',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (schema: any, data: BigNumberish) => {
    try {
      BigInt(data);
      return true;
    } catch (e) {
      return false;
    }
  },
  errors: true,
});

export * from './status';
export * from './jobs';
