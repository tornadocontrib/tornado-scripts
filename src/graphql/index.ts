import { getAddress } from 'ethers';
import { fetchData, fetchDataOptions } from '../providers';

import type {
  BaseGraphEvents,
  RegistersEvents,
  DepositsEvents,
  WithdrawalsEvents,
  EncryptedNotesEvents,
  BatchGraphOnProgress,
  EchoEvents,
  AllGovernanceEvents,
  GovernanceProposalCreatedEvents,
  GovernanceVotedEvents,
  GovernanceDelegatedEvents,
  GovernanceUndelegatedEvents,
} from '../events';
import {
  _META,
  GET_DEPOSITS,
  GET_STATISTIC,
  GET_REGISTERED,
  GET_WITHDRAWALS,
  GET_NOTE_ACCOUNTS,
  GET_ENCRYPTED_NOTES,
  GET_ECHO_EVENTS,
  GET_GOVERNANCE_EVENTS,
} from './queries';

export * from './queries';

const isEmptyArray = (arr: object) => !Array.isArray(arr) || !arr.length;

const first = 1000;

export type queryGraphParams = {
  graphApi: string;
  subgraphName: string;
  query: string;
  variables?: {
    [key: string]: string | number;
  };
  fetchDataOptions?: fetchDataOptions;
};

export async function queryGraph<T>({
  graphApi,
  subgraphName,
  query,
  variables,
  fetchDataOptions,
}: queryGraphParams): Promise<T> {
  const graphUrl = `${graphApi}/subgraphs/name/${subgraphName}`;

  const { data, errors } = await fetchData(graphUrl, {
    ...fetchDataOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  if (data?._meta?.hasIndexingErrors) {
    throw new Error('Subgraph has indexing errors');
  }

  return data;
}

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

export async function getStatistic({
  graphApi,
  subgraphName,
  currency,
  amount,
  fetchDataOptions,
}: getStatisticParams): Promise<getStatisticReturns> {
  try {
    const {
      deposits,
      _meta: {
        block: { number: lastSyncBlock },
      },
    } = await queryGraph<GraphStatistic>({
      graphApi,
      subgraphName,
      query: GET_STATISTIC,
      variables: {
        currency,
        first: 10,
        orderBy: 'index',
        orderDirection: 'desc',
        amount,
      },
      fetchDataOptions,
    });

    const events = deposits
      .map((e) => ({
        timestamp: Number(e.timestamp),
        leafIndex: Number(e.index),
        blockNumber: Number(e.blockNumber),
      }))
      .reverse();

    const [lastEvent] = events.slice(-1);

    return {
      events,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getStatistic query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: null,
    };
  }
}

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

export async function getMeta({ graphApi, subgraphName, fetchDataOptions }: getMetaParams): Promise<getMetaReturns> {
  try {
    const {
      _meta: {
        block: { number: lastSyncBlock },
        hasIndexingErrors,
      },
    } = await queryGraph<GraphMeta>({
      graphApi,
      subgraphName,
      query: _META,
      fetchDataOptions,
    });

    return {
      lastSyncBlock,
      hasIndexingErrors,
    };
  } catch (err) {
    console.log('Error from getMeta query');
    console.log(err);
    return {
      lastSyncBlock: null,
      hasIndexingErrors: null,
    };
  }
}

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

export function getRegisters({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
}: getRegistersParams): Promise<GraphRegisters> {
  return queryGraph<GraphRegisters>({
    graphApi,
    subgraphName,
    query: GET_REGISTERED,
    variables: {
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllRegisters({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getRegistersParams): Promise<BaseGraphEvents<RegistersEvents>> {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let {
        relayers: result,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock },
        },
      } = await getRegisters({ graphApi, subgraphName, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      if (isEmptyArray(result)) {
        break;
      }

      const [firstEvent] = result;
      const [lastEvent] = result.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'Registers',
          fromBlock: Number(firstEvent.blockRegistration),
          toBlock: Number(lastEvent.blockRegistration),
          count: result.length,
        });
      }

      if (result.length < 900) {
        events.push(...result);
        break;
      }

      result = result.filter(({ blockRegistration }) => blockRegistration !== lastEvent.blockRegistration);
      fromBlock = Number(lastEvent.blockRegistration);

      events.push(...result);
    }

    if (!events.length) {
      return {
        events: [],
        lastSyncBlock,
      };
    }

    const result = events.map(({ id, address, ensName, blockRegistration }) => {
      const [transactionHash, logIndex] = id.split('-');

      return {
        blockNumber: Number(blockRegistration),
        logIndex: Number(logIndex),
        transactionHash,
        ensName,
        relayerAddress: getAddress(address),
      };
    });

    return {
      events: result,
      lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllRegisters query');
    console.log(err);
    return { events: [], lastSyncBlock: fromBlock };
  }
}

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

export function getDeposits({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions,
}: getDepositsParams): Promise<GraphDeposits> {
  return queryGraph<GraphDeposits>({
    graphApi,
    subgraphName,
    query: GET_DEPOSITS,
    variables: {
      currency,
      amount,
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllDeposits({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getDepositsParams): Promise<BaseGraphEvents<DepositsEvents>> {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let {
        deposits: result,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock },
        },
      } = await getDeposits({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      if (isEmptyArray(result)) {
        break;
      }

      const [firstEvent] = result;
      const [lastEvent] = result.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'Deposits',
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent.blockNumber),
          count: result.length,
        });
      }

      if (result.length < 900) {
        events.push(...result);
        break;
      }

      result = result.filter(({ blockNumber }) => blockNumber !== lastEvent.blockNumber);
      fromBlock = Number(lastEvent.blockNumber);

      events.push(...result);
    }

    if (!events.length) {
      return {
        events: [],
        lastSyncBlock,
      };
    }

    const result = events.map(({ id, blockNumber, commitment, index, timestamp, from }) => {
      const [transactionHash, logIndex] = id.split('-');

      return {
        blockNumber: Number(blockNumber),
        logIndex: Number(logIndex),
        transactionHash,
        commitment,
        leafIndex: Number(index),
        timestamp: Number(timestamp),
        from: getAddress(from),
      };
    });

    const [lastEvent] = result.slice(-1);

    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllDeposits query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock,
    };
  }
}

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

export function getWithdrawals({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions,
}: getWithdrawalParams): Promise<GraphWithdrawals> {
  return queryGraph<GraphWithdrawals>({
    graphApi,
    subgraphName,
    query: GET_WITHDRAWALS,
    variables: {
      currency,
      amount,
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllWithdrawals({
  graphApi,
  subgraphName,
  currency,
  amount,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getWithdrawalParams): Promise<BaseGraphEvents<WithdrawalsEvents>> {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let {
        withdrawals: result,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock },
        },
      } = await getWithdrawals({ graphApi, subgraphName, currency, amount, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      if (isEmptyArray(result)) {
        break;
      }

      const [firstEvent] = result;
      const [lastEvent] = result.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'Withdrawals',
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent.blockNumber),
          count: result.length,
        });
      }

      if (result.length < 900) {
        events.push(...result);
        break;
      }

      result = result.filter(({ blockNumber }) => blockNumber !== lastEvent.blockNumber);
      fromBlock = Number(lastEvent.blockNumber);

      events.push(...result);
    }

    if (!events.length) {
      return {
        events: [],
        lastSyncBlock,
      };
    }

    const result = events.map(({ id, blockNumber, nullifier, to, fee, timestamp }) => {
      const [transactionHash, logIndex] = id.split('-');

      return {
        blockNumber: Number(blockNumber),
        logIndex: Number(logIndex),
        transactionHash,
        nullifierHash: nullifier,
        to: getAddress(to),
        fee,
        timestamp: Number(timestamp),
      };
    });

    const [lastEvent] = result.slice(-1);

    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllWithdrawals query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock,
    };
  }
}

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

export async function getNoteAccounts({
  graphApi,
  subgraphName,
  address,
  fetchDataOptions,
}: getNoteAccountsParams): Promise<getNoteAccountsReturns> {
  try {
    const {
      noteAccounts: events,
      _meta: {
        block: { number: lastSyncBlock },
      },
    } = await queryGraph<GraphNoteAccounts>({
      graphApi,
      subgraphName,
      query: GET_NOTE_ACCOUNTS,
      variables: {
        address: address.toLowerCase(),
      },
      fetchDataOptions,
    });

    return {
      events,
      lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getNoteAccounts query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: null,
    };
  }
}

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

export function getGraphEchoEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
}: getGraphEchoEventsParams): Promise<GraphEchoEvents> {
  return queryGraph<GraphEchoEvents>({
    graphApi,
    subgraphName,
    query: GET_ECHO_EVENTS,
    variables: {
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllGraphEchoEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getGraphEchoEventsParams): Promise<BaseGraphEvents<EchoEvents>> {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let {
        noteAccounts: result,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock },
        },
      } = await getGraphEchoEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      if (isEmptyArray(result)) {
        break;
      }

      const [firstEvent] = result;
      const [lastEvent] = result.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'EchoEvents',
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent.blockNumber),
          count: result.length,
        });
      }

      if (result.length < 900) {
        events.push(...result);
        break;
      }

      result = result.filter(({ blockNumber }) => blockNumber !== lastEvent.blockNumber);
      fromBlock = Number(lastEvent.blockNumber);

      events.push(...result);
    }

    if (!events.length) {
      return {
        events: [],
        lastSyncBlock,
      };
    }

    const result = events.map((e) => {
      const [transactionHash, logIndex] = e.id.split('-');

      return {
        blockNumber: Number(e.blockNumber),
        logIndex: Number(logIndex),
        transactionHash: transactionHash,
        address: getAddress(e.address),
        encryptedAccount: e.encryptedAccount,
      };
    });

    const [lastEvent] = result.slice(-1);

    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllGraphEchoEvents query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock,
    };
  }
}

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

export function getEncryptedNotes({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
}: getEncryptedNotesParams): Promise<GraphEncryptedNotes> {
  return queryGraph<GraphEncryptedNotes>({
    graphApi,
    subgraphName,
    query: GET_ENCRYPTED_NOTES,
    variables: {
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllEncryptedNotes({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getEncryptedNotesParams): Promise<BaseGraphEvents<EncryptedNotesEvents>> {
  try {
    const events = [];
    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let {
        encryptedNotes: result,
        _meta: {
          // eslint-disable-next-line prefer-const
          block: { number: currentBlock },
        },
      } = await getEncryptedNotes({ graphApi, subgraphName, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      if (isEmptyArray(result)) {
        break;
      }

      const [firstEvent] = result;
      const [lastEvent] = result.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'EncryptedNotes',
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent.blockNumber),
          count: result.length,
        });
      }

      if (result.length < 900) {
        events.push(...result);
        break;
      }

      result = result.filter(({ blockNumber }) => blockNumber !== lastEvent.blockNumber);
      fromBlock = Number(lastEvent.blockNumber);

      events.push(...result);
    }

    if (!events.length) {
      return {
        events: [],
        lastSyncBlock,
      };
    }

    const result = events.map((e) => ({
      blockNumber: Number(e.blockNumber),
      logIndex: Number(e.index),
      transactionHash: e.transactionHash,
      encryptedNote: e.encryptedNote,
    }));

    const [lastEvent] = result.slice(-1);

    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllEncryptedNotes query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock,
    };
  }
}

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

export function getGovernanceEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
}: getGovernanceEventsParams): Promise<GraphGovernanceEvents> {
  return queryGraph<GraphGovernanceEvents>({
    graphApi,
    subgraphName,
    query: GET_GOVERNANCE_EVENTS,
    variables: {
      first,
      fromBlock,
    },
    fetchDataOptions,
  });
}

export async function getAllGovernanceEvents({
  graphApi,
  subgraphName,
  fromBlock,
  fetchDataOptions,
  onProgress,
}: getGovernanceEventsParams): Promise<BaseGraphEvents<AllGovernanceEvents>> {
  try {
    const result = [];

    let lastSyncBlock = fromBlock;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const {
        proposals,
        votes,
        delegates,
        undelegates,
        _meta: {
          block: { number: currentBlock },
        },
      } = await getGovernanceEvents({ graphApi, subgraphName, fromBlock, fetchDataOptions });

      lastSyncBlock = currentBlock;

      const eventsLength = proposals.length + votes.length + delegates.length + undelegates.length;

      if (eventsLength === 0) {
        break;
      }

      const formattedProposals: GovernanceProposalCreatedEvents[] = proposals.map(
        ({ blockNumber, logIndex, transactionHash, proposalId, proposer, target, startTime, endTime, description }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: 'ProposalCreated',
            id: Number(proposalId),
            proposer: getAddress(proposer),
            target: getAddress(target),
            startTime: Number(startTime),
            endTime: Number(endTime),
            description,
          };
        },
      );

      const formattedVotes: GovernanceVotedEvents[] = votes.map(
        ({ blockNumber, logIndex, transactionHash, proposalId, voter, support, votes, from, input }) => {
          // Filter spammy txs
          if (!input || input.length > 2048) {
            input = '';
          }

          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: 'Voted',
            proposalId: Number(proposalId),
            voter: getAddress(voter),
            support,
            votes,
            from: getAddress(from),
            input,
          };
        },
      );

      const formattedDelegates: GovernanceDelegatedEvents[] = delegates.map(
        ({ blockNumber, logIndex, transactionHash, account, delegateTo }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: 'Delegated',
            account: getAddress(account),
            delegateTo: getAddress(delegateTo),
          };
        },
      );

      const formattedUndelegates: GovernanceUndelegatedEvents[] = undelegates.map(
        ({ blockNumber, logIndex, transactionHash, account, delegateFrom }) => {
          return {
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            transactionHash,
            event: 'Undelegated',
            account: getAddress(account),
            delegateFrom: getAddress(delegateFrom),
          };
        },
      );

      let formattedEvents = [
        ...formattedProposals,
        ...formattedVotes,
        ...formattedDelegates,
        ...formattedUndelegates,
      ].sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          return a.logIndex - b.logIndex;
        }
        return a.blockNumber - b.blockNumber;
      });

      if (eventsLength < 900) {
        result.push(...formattedEvents);
        break;
      }

      const [firstEvent] = formattedEvents;
      const [lastEvent] = formattedEvents.slice(-1);

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'Governance Events',
          fromBlock: Number(firstEvent.blockNumber),
          toBlock: Number(lastEvent.blockNumber),
          count: eventsLength,
        });
      }

      formattedEvents = formattedEvents.filter(({ blockNumber }) => blockNumber !== lastEvent.blockNumber);

      fromBlock = Number(lastEvent.blockNumber);

      result.push(...formattedEvents);
    }

    const [lastEvent] = result.slice(-1);

    return {
      events: result,
      lastSyncBlock: lastEvent && lastEvent.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
    };
  } catch (err) {
    console.log('Error from getAllGovernance query');
    console.log(err);
    return {
      events: [],
      lastSyncBlock: fromBlock,
    };
  }
}
