import { fetchDataOptions } from '../providers';
import type { BaseGraphEvents, RegistersEvents, DepositsEvents, WithdrawalsEvents, EncryptedNotesEvents, BatchGraphOnProgress, EchoEvents, AllGovernanceEvents } from '../events';
export * from './queries';
export interface queryGraphParams {
    graphApi: string;
    subgraphName: string;
    query: string;
    variables?: {
        [key: string]: string | number;
    };
    fetchDataOptions?: fetchDataOptions;
}
export declare function queryGraph<T>({ graphApi, subgraphName, query, variables, fetchDataOptions, }: queryGraphParams): Promise<T>;
export interface GraphStatistic {
    deposits: {
        index: string;
        timestamp: string;
        blockNumber: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getStatisticParams {
    graphApi: string;
    subgraphName: string;
    currency: string;
    amount: string;
    fetchDataOptions?: fetchDataOptions;
}
export interface getStatisticReturns {
    events: {
        timestamp: number;
        leafIndex: number;
        blockNumber: number;
    }[];
    lastSyncBlock: null | number;
}
export declare function getStatistic({ graphApi, subgraphName, currency, amount, fetchDataOptions, }: getStatisticParams): Promise<getStatisticReturns>;
export interface GraphMeta {
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getMetaParams {
    graphApi: string;
    subgraphName: string;
    fetchDataOptions?: fetchDataOptions;
}
export interface getMetaReturns {
    lastSyncBlock: null | number;
    hasIndexingErrors: null | boolean;
}
export declare function getMeta({ graphApi, subgraphName, fetchDataOptions }: getMetaParams): Promise<getMetaReturns>;
export interface GraphRegisters {
    relayers: {
        id: string;
        address: string;
        ensName: string;
        blockRegistration: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getRegistersParams {
    graphApi: string;
    subgraphName: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getRegisters({ graphApi, subgraphName, fromBlock, fetchDataOptions, }: getRegistersParams): Promise<GraphRegisters>;
export declare function getAllRegisters({ graphApi, subgraphName, fromBlock, fetchDataOptions, onProgress, }: getRegistersParams): Promise<BaseGraphEvents<RegistersEvents>>;
export interface GraphDeposits {
    deposits: {
        id: string;
        blockNumber: string;
        commitment: string;
        index: string;
        timestamp: string;
        from: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getDepositsParams {
    graphApi: string;
    subgraphName: string;
    currency: string;
    amount: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getDeposits({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions, }: getDepositsParams): Promise<GraphDeposits>;
export declare function getAllDeposits({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions, onProgress, }: getDepositsParams): Promise<BaseGraphEvents<DepositsEvents>>;
export interface GraphWithdrawals {
    withdrawals: {
        id: string;
        blockNumber: string;
        nullifier: string;
        to: string;
        fee: string;
        timestamp: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getWithdrawalParams {
    graphApi: string;
    subgraphName: string;
    currency: string;
    amount: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getWithdrawals({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions, }: getWithdrawalParams): Promise<GraphWithdrawals>;
export declare function getAllWithdrawals({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions, onProgress, }: getWithdrawalParams): Promise<BaseGraphEvents<WithdrawalsEvents>>;
export interface GraphNoteAccounts {
    noteAccounts: {
        id: string;
        index: string;
        address: string;
        encryptedAccount: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getNoteAccountsParams {
    graphApi: string;
    subgraphName: string;
    address: string;
    fetchDataOptions?: fetchDataOptions;
}
export interface getNoteAccountsReturns {
    events: {
        id: string;
        index: string;
        address: string;
        encryptedAccount: string;
    }[];
    lastSyncBlock: null | number;
}
export declare function getNoteAccounts({ graphApi, subgraphName, address, fetchDataOptions, }: getNoteAccountsParams): Promise<getNoteAccountsReturns>;
export interface GraphEchoEvents {
    noteAccounts: {
        id: string;
        blockNumber: string;
        address: string;
        encryptedAccount: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getGraphEchoEventsParams {
    graphApi: string;
    subgraphName: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getGraphEchoEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions, }: getGraphEchoEventsParams): Promise<GraphEchoEvents>;
export declare function getAllGraphEchoEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions, onProgress, }: getGraphEchoEventsParams): Promise<BaseGraphEvents<EchoEvents>>;
export interface GraphEncryptedNotes {
    encryptedNotes: {
        blockNumber: string;
        index: string;
        transactionHash: string;
        encryptedNote: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getEncryptedNotesParams {
    graphApi: string;
    subgraphName: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getEncryptedNotes({ graphApi, subgraphName, fromBlock, fetchDataOptions, }: getEncryptedNotesParams): Promise<GraphEncryptedNotes>;
export declare function getAllEncryptedNotes({ graphApi, subgraphName, fromBlock, fetchDataOptions, onProgress, }: getEncryptedNotesParams): Promise<BaseGraphEvents<EncryptedNotesEvents>>;
export interface GraphGovernanceEvents {
    proposals: {
        blockNumber: number;
        logIndex: number;
        transactionHash: string;
        proposalId: number;
        proposer: string;
        target: string;
        startTime: number;
        endTime: number;
        description: string;
    }[];
    votes: {
        blockNumber: number;
        logIndex: number;
        transactionHash: string;
        proposalId: number;
        voter: string;
        support: boolean;
        votes: string;
        from: string;
        input: string;
    }[];
    delegates: {
        blockNumber: number;
        logIndex: number;
        transactionHash: string;
        account: string;
        delegateTo: string;
    }[];
    undelegates: {
        blockNumber: number;
        logIndex: number;
        transactionHash: string;
        account: string;
        delegateFrom: string;
    }[];
    _meta: {
        block: {
            number: number;
        };
        hasIndexingErrors: boolean;
    };
}
export interface getGovernanceEventsParams {
    graphApi: string;
    subgraphName: string;
    fromBlock: number;
    fetchDataOptions?: fetchDataOptions;
    onProgress?: BatchGraphOnProgress;
}
export declare function getGovernanceEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions, }: getGovernanceEventsParams): Promise<GraphGovernanceEvents>;
export declare function getAllGovernanceEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions, onProgress, }: getGovernanceEventsParams): Promise<BaseGraphEvents<AllGovernanceEvents>>;
