import { fetchData } from './providers';

export interface IPResult {
  ip: string;
  iso?: string;
  tor?: boolean;
}

export async function fetchIp(ipEcho: string) {
  return (await fetchData(ipEcho, {
    method: 'GET',
    timeout: 30000,
  })) as IPResult;
}
