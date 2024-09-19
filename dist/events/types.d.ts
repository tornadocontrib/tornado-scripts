import { RelayerParams } from '../relayerClient';
export interface BaseEvents<T> {
    events: T[];
    lastBlock: number | null;
}
export interface CachedEvents<T> extends BaseEvents<T> {
    fromCache: boolean;
}
export interface BaseGraphEvents<T> {
    events: T[];
    lastSyncBlock: number;
}
export interface MinimalEvents {
    blockNumber: number;
    logIndex: number;
    transactionHash: string;
}
export type GovernanceEvents = MinimalEvents & {
    event: string;
};
export type GovernanceProposalCreatedEvents = GovernanceEvents & {
    id: number;
    proposer: string;
    target: string;
    startTime: number;
    endTime: number;
    description: string;
};
export type GovernanceVotedEvents = GovernanceEvents & {
    proposalId: number;
    voter: string;
    support: boolean;
    votes: string;
    from: string;
    input: string;
};
export type GovernanceDelegatedEvents = GovernanceEvents & {
    account: string;
    delegateTo: string;
};
export type GovernanceUndelegatedEvents = GovernanceEvents & {
    account: string;
    delegateFrom: string;
};
export type AllGovernanceEvents = GovernanceProposalCreatedEvents | GovernanceVotedEvents | GovernanceDelegatedEvents | GovernanceUndelegatedEvents;
export type RegistersEvents = MinimalEvents & RelayerParams;
export type DepositsEvents = MinimalEvents & {
    commitment: string;
    leafIndex: number;
    timestamp: number;
    from: string;
};
export type WithdrawalsEvents = MinimalEvents & {
    nullifierHash: string;
    to: string;
    fee: string;
    timestamp: number;
};
export type EchoEvents = MinimalEvents & {
    address: string;
    encryptedAccount: string;
};
export type EncryptedNotesEvents = MinimalEvents & {
    encryptedNote: string;
};
