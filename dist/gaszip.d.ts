import { NetIdType } from './networkConfig';
export declare const gasZipInbounds: Record<NetIdType, string>;
export declare const gasZipID: Record<NetIdType, number>;
export declare function gasZipInput(to: string, shorts: number[]): string | null;
export declare function gasZipMinMax(ethUsd: number): {
    min: number;
    max: number;
    ethUsd: number;
};
