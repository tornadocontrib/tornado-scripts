import { fetchDataOptions } from './providers';
export interface IPResult {
    ip: string;
    iso?: string;
    country?: string;
    country_iso?: string;
    tor?: boolean;
}
export declare function fetchIp(ipEcho: string, fetchOptions?: fetchDataOptions): Promise<IPResult>;
export interface IPResultFuck {
    YourFuckingIPAddress: string;
    YourFuckingLocation: string;
    YourFuckingHostname: string;
    YourFuckingISP: string;
    YourFuckingTorExit: boolean;
    YourFuckingCity?: string;
    YourFuckingCountry: string;
    YourFuckingCountryCode: string;
}
export declare function fetchFuckingIp(ipFuck?: string, fetchOptions?: fetchDataOptions): Promise<IPResultFuck>;
