import { fetchData, fetchDataOptions } from './providers';

export interface IPResult {
    ip: string;
    iso?: string;
    country?: string;
    country_iso?: string;
    tor?: boolean;
}

export function fetchIp(ipEcho: string, fetchOptions?: fetchDataOptions) {
    return fetchData<IPResult>(ipEcho, {
        ...(fetchOptions || {}),
        method: 'GET',
        timeout: 30000,
    });
}

// 🖕
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

export function fetchFuckingIp(ipFuck = 'https://myip.wtf/json', fetchOptions?: fetchDataOptions) {
    return fetchData<IPResultFuck>(ipFuck, {
        ...(fetchOptions || {}),
        method: 'GET',
        timeout: 30000,
    });
}
