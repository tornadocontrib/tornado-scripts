import Ajv from 'ajv';
import { BigNumberish, isAddress } from 'ethers';

export const ajv = new Ajv({ allErrors: true });

ajv.addKeyword({
    keyword: 'BN',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: (schema: any, data: BigNumberish) => {
        try {
            BigInt(data);
            return true;
        } catch {
            return false;
        }
    },
    errors: true,
});

ajv.addKeyword({
    keyword: 'isAddress',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: (schema: any, data: string) => {
        try {
            return isAddress(data);
        } catch {
            return false;
        }
    },
    errors: true,
});
