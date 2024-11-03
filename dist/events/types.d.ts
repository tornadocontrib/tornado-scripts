import { RelayerParams } from '../relayerClient';
export interface BaseEvents<T> {
    events: T[];
    lastBlock: number;
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
export interface GovernanceEvents extends MinimalEvents {
    event: string;
}
export interface GovernanceProposalCreatedEvents extends GovernanceEvents {
    id: number;
    proposer: string;
    target: string;
    startTime: number;
    endTime: number;
    description: string;
}
export interface GovernanceVotedEvents extends GovernanceEvents {
    proposalId: number;
    voter: string;
    support: boolean;
    votes: string;
    from: string;
    input: string;
}
export interface GovernanceDelegatedEvents extends GovernanceEvents {
    account: string;
    delegateTo: string;
}
export interface GovernanceUndelegatedEvents extends GovernanceEvents {
    account: string;
    delegateFrom: string;
}
export type AllGovernanceEvents = GovernanceProposalCreatedEvents | GovernanceVotedEvents | GovernanceDelegatedEvents | GovernanceUndelegatedEvents;
export interface RelayerRegistryEvents extends MinimalEvents {
    event: string;
}
export interface RelayerRegisteredEvents extends RelayerRegistryEvents, RelayerParams {
    ensHash: string;
    stakedAmount: string;
}
export interface RelayerUnregisteredEvents extends RelayerRegistryEvents {
    relayerAddress: string;
}
export interface WorkerRegisteredEvents extends RelayerRegistryEvents {
    relayerAddress: string;
    workerAddress: string;
}
export interface WorkerUnregisteredEvents extends RelayerRegistryEvents {
    relayerAddress: string;
    workerAddress: string;
}
export type AllRelayerRegistryEvents = RelayerRegisteredEvents | RelayerUnregisteredEvents | WorkerRegisteredEvents | WorkerUnregisteredEvents;
export interface StakeBurnedEvents extends MinimalEvents {
    relayerAddress: string;
    amountBurned: string;
    instanceAddress: string;
    gasFee: string;
    relayerFee: string;
    timestamp: number;
}
export type RegistersEvents = MinimalEvents & RelayerParams;
export interface DepositsEvents extends MinimalEvents {
    commitment: string;
    leafIndex: number;
    timestamp: number;
    from: string;
}
export interface WithdrawalsEvents extends MinimalEvents {
    nullifierHash: string;
    to: string;
    fee: string;
    timestamp: number;
}
export interface EchoEvents extends MinimalEvents {
    address: string;
    encryptedAccount: string;
}
export interface EncryptedNotesEvents extends MinimalEvents {
    encryptedNote: string;
}
