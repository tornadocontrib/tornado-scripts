export declare function parseNumber(value?: string | number): number;
export declare function parseUrl(value?: string): string;
export declare function parseRelayer(value?: string): string;
export declare function parseAddress(value?: string): string;
export declare function parseMnemonic(value?: string): string;
export declare function parseKey(value?: string): string;
/**
 * Recovery key shouldn't have a 0x prefix (Also this is how the UI generates)
 */
export declare function parseRecoveryKey(value?: string): string;
