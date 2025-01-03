import {
    zip,
    unzip,
    AsyncZippable,
    Unzipped,
    ZipAttributes,
    zlib,
    unzlib,
    AsyncZlibOptions,
    AsyncUnzlibOptions,
} from 'fflate';
import { fetchData, fetchDataOptions } from './providers';
import { bytesToBase64, digest } from './utils';

export function zipAsync(file: AsyncZippable, options?: ZipAttributes): Promise<Uint8Array> {
    return new Promise((res, rej) => {
        zip(file, { ...(options || {}), mtime: new Date('1/1/1980') }, (err, data) => {
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

export function zlibAsync(data: Uint8Array, options?: AsyncZlibOptions): Promise<Uint8Array> {
    return new Promise((res, rej) => {
        zlib(data, { ...(options || {}) }, (err, data) => {
            if (err) {
                rej(err);
                return;
            }
            res(data);
        });
    });
}

export function unzlibAsync(data: Uint8Array, options?: AsyncUnzlibOptions): Promise<Uint8Array> {
    return new Promise((res, rej) => {
        unzlib(data, { ...(options || {}) }, (err, data) => {
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
    fetchOptions,
}: {
    staticUrl?: string;
    zipName: string;
    zipDigest?: string;
    parseJson?: boolean;
    fetchOptions?: fetchDataOptions;
}): Promise<T> {
    const url = `${staticUrl}/${zipName}.zip`;

    const resp = (await fetchData(url, {
        ...(fetchOptions || {}),
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

    console.log(`Downloaded ${url}${zipDigest ? ` ( Digest: ${zipDigest} )` : ''}`);

    if (parseJson) {
        return JSON.parse(new TextDecoder().decode(content)) as T;
    }

    return content as T;
}
