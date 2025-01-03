import { AsyncZippable, Unzipped, ZipAttributes } from 'fflate';
export declare function zipAsync(file: AsyncZippable, options?: ZipAttributes): Promise<Uint8Array>;
export declare function unzipAsync(data: Uint8Array): Promise<Unzipped>;
export declare function downloadZip<T>({ staticUrl, zipName, zipDigest, parseJson, }: {
    staticUrl?: string;
    zipName: string;
    zipDigest?: string;
    parseJson?: boolean;
}): Promise<T>;
