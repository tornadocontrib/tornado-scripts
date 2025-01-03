import { fetchDataOptions } from './providers';
export interface IPResult {
    ip: string;
    iso?: string;
    tor?: boolean;
}
export declare function fetchIp(ipEcho: string, fetchOptions?: fetchDataOptions): Promise<IPResult>;
