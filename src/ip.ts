import { fetchData, fetchDataOptions } from './providers';

export interface IPResult {
    ip: string;
    iso?: string;
    tor?: boolean;
}

export function fetchIp(ipEcho: string, fetchOptions?: fetchDataOptions) {
    return fetchData<IPResult>(ipEcho, {
        ...(fetchOptions || {}),
        method: 'GET',
        timeout: 30000,
    });
}
