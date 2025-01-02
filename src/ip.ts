import { fetchData } from './providers';

export interface IPResult {
    ip: string;
    iso?: string;
    tor?: boolean;
}

export function fetchIp(ipEcho: string) {
    return fetchData<IPResult>(ipEcho, {
        method: 'GET',
        timeout: 30000,
    });
}
