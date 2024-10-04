import { zip, unzip, AsyncZippable, Unzipped } from 'fflate';
import { fetchData } from './providers';
import { bytesToBase64, digest } from './utils';

export function zipAsync(file: AsyncZippable): Promise<Uint8Array> {
  return new Promise((res, rej) => {
    zip(file, { mtime: new Date('1/1/1980') }, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}

export function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((res, rej) => {
    unzip(data, {}, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}

export async function downloadZip<T>({
  staticUrl = '',
  zipName,
  zipDigest,
  parseJson = true,
}: {
  staticUrl?: string;
  zipName: string;
  zipDigest?: string;
  parseJson?: boolean;
}): Promise<T> {
  const url = `${staticUrl}/${zipName}.zip`;

  const resp = (await fetchData(url, {
    method: 'GET',
    returnResponse: true,
  })) as Response;

  const data = new Uint8Array(await resp.arrayBuffer());

  // If the zip has digest value, compare it
  if (zipDigest) {
    const hash = 'sha384-' + bytesToBase64(await digest(data));

    if (zipDigest !== hash) {
      const errMsg = `Invalid digest hash for file ${url}, wants ${zipDigest} has ${hash}`;
      throw new Error(errMsg);
    }
  }

  const { [zipName]: content } = await unzipAsync(data);

  if (parseJson) {
    return JSON.parse(new TextDecoder().decode(content)) as T;
  }

  return content as T;
}
