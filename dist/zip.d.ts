import { AsyncZippable, Unzipped, ZipAttributes, AsyncZlibOptions, AsyncUnzlibOptions } from 'fflate';
import { fetchDataOptions } from './providers';
export declare function zipAsync(file: AsyncZippable, options?: ZipAttributes): Promise<Uint8Array>;
export declare function unzipAsync(data: Uint8Array): Promise<Unzipped>;
export declare function zlibAsync(data: Uint8Array, options?: AsyncZlibOptions): Promise<Uint8Array>;
export declare function unzlibAsync(data: Uint8Array, options?: AsyncUnzlibOptions): Promise<Uint8Array>;
export declare function downloadZip<T>({ staticUrl, zipName, zipDigest, parseJson, fetchOptions, }: {
    staticUrl?: string;
    zipName: string;
    zipDigest?: string;
    parseJson?: boolean;
    fetchOptions?: fetchDataOptions;
}): Promise<T>;
