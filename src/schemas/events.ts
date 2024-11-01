import { DEPOSIT, WITHDRAWAL } from '../events';
import { ajv } from './ajv';
import { addressSchemaType, bnSchemaType, bytes32SchemaType } from './types';

const baseEventsSchemaProperty = {
    blockNumber: {
        type: 'number',
    },
    logIndex: {
        type: 'number',
    },
    transactionHash: bytes32SchemaType,
} as const;

const baseEventsSchemaRequired = Object.keys(baseEventsSchemaProperty) as string[];

export const governanceEventsSchema = {
    type: 'array',
    items: {
        anyOf: [
            {
                type: 'object',
                properties: {
                    ...baseEventsSchemaProperty,
                    event: { type: 'string' },
                    id: { type: 'number' },
                    proposer: addressSchemaType,
                    target: addressSchemaType,
                    startTime: { type: 'number' },
                    endTime: { type: 'number' },
                    description: { type: 'string' },
                },
                required: [
                    ...baseEventsSchemaRequired,
                    'event',
                    'id',
                    'proposer',
                    'target',
                    'startTime',
                    'endTime',
                    'description',
                ],
                additionalProperties: false,
            },
            {
                type: 'object',
                properties: {
                    ...baseEventsSchemaProperty,
                    event: { type: 'string' },
                    proposalId: { type: 'number' },
                    voter: addressSchemaType,
                    support: { type: 'boolean' },
                    votes: { type: 'string' },
                    from: addressSchemaType,
                    input: { type: 'string' },
                },
                required: [
                    ...baseEventsSchemaRequired,
                    'event',
                    'proposalId',
                    'voter',
                    'support',
                    'votes',
                    'from',
                    'input',
                ],
                additionalProperties: false,
            },
            {
                type: 'object',
                properties: {
                    ...baseEventsSchemaProperty,
                    event: { type: 'string' },
                    account: addressSchemaType,
                    delegateTo: addressSchemaType,
                },
                required: [...baseEventsSchemaRequired, 'account', 'delegateTo'],
                additionalProperties: false,
            },
            {
                type: 'object',
                properties: {
                    ...baseEventsSchemaProperty,
                    event: { type: 'string' },
                    account: addressSchemaType,
                    delegateFrom: addressSchemaType,
                },
                required: [...baseEventsSchemaRequired, 'account', 'delegateFrom'],
                additionalProperties: false,
            },
        ],
    },
} as const;

export const registeredEventsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            ...baseEventsSchemaProperty,
            ensName: { type: 'string' },
            relayerAddress: addressSchemaType,
        },
        required: [...baseEventsSchemaRequired, 'ensName', 'relayerAddress'],
        additionalProperties: false,
    },
} as const;

export const depositsEventsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            ...baseEventsSchemaProperty,
            commitment: bytes32SchemaType,
            leafIndex: { type: 'number' },
            timestamp: { type: 'number' },
            from: addressSchemaType,
        },
        required: [...baseEventsSchemaRequired, 'commitment', 'leafIndex', 'timestamp', 'from'],
        additionalProperties: false,
    },
} as const;

export const withdrawalsEventsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            ...baseEventsSchemaProperty,
            nullifierHash: bytes32SchemaType,
            to: addressSchemaType,
            fee: bnSchemaType,
            timestamp: { type: 'number' },
        },
        required: [...baseEventsSchemaRequired, 'nullifierHash', 'to', 'fee', 'timestamp'],
        additionalProperties: false,
    },
} as const;

export const echoEventsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            ...baseEventsSchemaProperty,
            address: addressSchemaType,
            encryptedAccount: { type: 'string' },
        },
        required: [...baseEventsSchemaRequired, 'address', 'encryptedAccount'],
        additionalProperties: false,
    },
} as const;

export const encryptedNotesSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            ...baseEventsSchemaProperty,
            encryptedNote: { type: 'string' },
        },
        required: [...baseEventsSchemaRequired, 'encryptedNote'],
        additionalProperties: false,
    },
} as const;

export function getEventsSchemaValidator(type: string) {
    if (type === DEPOSIT) {
        return ajv.compile(depositsEventsSchema);
    }

    if (type === WITHDRAWAL) {
        return ajv.compile(withdrawalsEventsSchema);
    }

    if (type === 'governance') {
        return ajv.compile(governanceEventsSchema);
    }

    if (type === 'registered') {
        return ajv.compile(registeredEventsSchema);
    }

    if (type === 'echo') {
        return ajv.compile(echoEventsSchema);
    }

    if (type === 'encrypted_notes') {
        return ajv.compile(encryptedNotesSchema);
    }

    throw new Error('Unsupported event type for schema validation');
}
