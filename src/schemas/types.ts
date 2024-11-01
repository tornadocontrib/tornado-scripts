export const addressSchemaType = {
    type: 'string',
    pattern: '^0x[a-fA-F0-9]{40}$',
    isAddress: true,
} as const;
export const bnSchemaType = { type: 'string', BN: true } as const;
export const proofSchemaType = {
    type: 'string',
    pattern: '^0x[a-fA-F0-9]{512}$',
} as const;
export const bytes32SchemaType = {
    type: 'string',
    pattern: '^0x[a-fA-F0-9]{64}$',
} as const;
export const bytes32BNSchemaType = { ...bytes32SchemaType, BN: true } as const;
