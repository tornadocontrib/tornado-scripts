export declare const addressSchemaType: {
    readonly type: "string";
    readonly pattern: "^0x[a-fA-F0-9]{40}$";
    readonly isAddress: true;
};
export declare const bnSchemaType: {
    readonly type: "string";
    readonly BN: true;
};
export declare const proofSchemaType: {
    readonly type: "string";
    readonly pattern: "^0x[a-fA-F0-9]{512}$";
};
export declare const bytes32SchemaType: {
    readonly type: "string";
    readonly pattern: "^0x[a-fA-F0-9]{64}$";
};
export declare const bytes32BNSchemaType: {
    readonly BN: true;
    readonly type: "string";
    readonly pattern: "^0x[a-fA-F0-9]{64}$";
};
