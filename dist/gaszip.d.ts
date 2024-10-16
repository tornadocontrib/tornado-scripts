import { NetIdType } from './networkConfig';
export declare const gasZipInbounds: {
    [key in NetIdType]: string;
};
export declare const gasZipID: {
    [key in NetIdType]: number;
};
export declare function gasZipInput(to: string, shorts: number[]): string | null;
export declare function gasZipMinMax(ethUsd: number): {
    min: number;
    max: number;
    ethUsd: number;
};
