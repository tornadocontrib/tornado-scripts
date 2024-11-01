import { isAddress } from 'ethers';
import { NetId, NetIdType } from './networkConfig';

// https://dev.gas.zip/gas/chain-support/inbound
export const gasZipInbounds: { [key in NetIdType]: string } = {
    [NetId.MAINNET]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.BSC]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.POLYGON]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.OPTIMISM]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.ARBITRUM]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.GNOSIS]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
    [NetId.AVALANCHE]: '0x391E7C679d29bD940d63be94AD22A25d25b5A604',
};

// https://dev.gas.zip/gas/chain-support/outbound
export const gasZipID: { [key in NetIdType]: number } = {
    [NetId.MAINNET]: 255,
    [NetId.BSC]: 14,
    [NetId.POLYGON]: 17,
    [NetId.OPTIMISM]: 55,
    [NetId.ARBITRUM]: 57,
    [NetId.GNOSIS]: 16,
    [NetId.AVALANCHE]: 15,
    [NetId.SEPOLIA]: 102,
};

// https://dev.gas.zip/gas/code-examples/eoaDeposit
export function gasZipInput(to: string, shorts: number[]): string | null {
    let data = '0x';
    if (isAddress(to)) {
        if (to.length === 42) {
            data += '02';
            data += to.slice(2);
        } else {
            return null;
        }
    } else {
        data += '01'; // to == sender
    }

    for (const i in shorts) {
        data += Number(shorts[i]).toString(16).padStart(4, '0');
    }

    return data;
}

export function gasZipMinMax(ethUsd: number) {
    return {
        min: 1 / ethUsd,
        max: 50 / ethUsd,
        ethUsd,
    };
}
