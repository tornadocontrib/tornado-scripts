import { BabyJub, PedersenHash, Point } from 'circomlibjs';
export declare class Pedersen {
    pedersenHash?: PedersenHash;
    babyJub?: BabyJub;
    pedersenPromise: Promise<void>;
    constructor();
    initPedersen(): Promise<void>;
    unpackPoint(buffer: Uint8Array): Promise<Point | undefined>;
    toStringBuffer(buffer: Uint8Array): string;
}
export declare const pedersen: Pedersen;
export declare function buffPedersenHash(buffer: Uint8Array): Promise<string>;
