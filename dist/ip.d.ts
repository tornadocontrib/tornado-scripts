export interface IPResult {
    ip: string;
    iso?: string;
    tor?: boolean;
}
export declare function fetchIp(ipEcho: string): Promise<IPResult>;
