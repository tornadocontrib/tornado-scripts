import {
  BaseContract,
  Provider,
  EventLog,
  TransactionResponse,
  getAddress,
  Block,
  ContractEventName,
  namehash,
  formatEther,
} from 'ethers';

import type {
  Tornado,
  TornadoRouter,
  TornadoProxyLight,
  Governance,
  RelayerRegistry,
  Echoer,
  Aggregator,
} from '@tornado/contracts';

import * as graph from '../graphql';

import {
  BatchEventsService,
  BatchBlockService,
  BatchTransactionService,
  BatchEventOnProgress,
  BatchBlockOnProgress,
} from '../batch';

import { fetchData, fetchDataOptions } from '../providers';
import { enabledChains, type NetIdType, type SubdomainMap } from '../networkConfig';
import { RelayerParams, MIN_STAKE_BALANCE } from '../relayerClient';
import type { TovarishClient } from '../tovarishClient';

import type {
  BaseEvents,
  CachedEvents,
  MinimalEvents,
  DepositsEvents,
  WithdrawalsEvents,
  EncryptedNotesEvents,
  AllGovernanceEvents,
  GovernanceProposalCreatedEvents,
  GovernanceVotedEvents,
  GovernanceDelegatedEvents,
  GovernanceUndelegatedEvents,
  RegistersEvents,
  BaseGraphEvents,
  EchoEvents,
} from './types';

export const DEPOSIT = 'deposit';
export const WITHDRAWAL = 'withdrawal';

export type BaseEventsServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  contract: BaseContract;
  type?: string;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export type BatchGraphOnProgress = ({
  type,
  fromBlock,
  toBlock,
  count,
}: {
  type?: ContractEventName;
  fromBlock?: number;
  toBlock?: number;
  count?: number;
}) => void;

export type BaseGraphParams = {
  graphApi: string;
  subgraphName: string;
  fetchDataOptions?: fetchDataOptions;
  onProgress?: BatchGraphOnProgress;
};

export class BaseEventsService<EventType extends MinimalEvents> {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  contract: BaseContract;
  type: string;
  deployedBlock: number;
  batchEventsService: BatchEventsService;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    contract,
    type = '',
    deployedBlock = 0,
    fetchDataOptions,
    tovarishClient,
  }: BaseEventsServiceConstructor) {
    this.netId = netId;
    this.provider = provider;
    this.graphApi = graphApi;
    this.subgraphName = subgraphName;
    this.fetchDataOptions = fetchDataOptions;

    this.contract = contract;
    this.type = type;
    this.deployedBlock = deployedBlock;

    this.batchEventsService = new BatchEventsService({
      provider,
      contract,
      onProgress: this.updateEventProgress,
    });

    this.tovarishClient = tovarishClient;
  }

  getInstanceName(): string {
    return '';
  }

  getType(): string {
    return this.type || '';
  }

  getTovarishType(): string {
    return String(this.getType() || '').toLowerCase();
  }

  getGraphMethod(): string {
    return '';
  }

  getGraphParams(): BaseGraphParams {
    return {
      graphApi: this.graphApi || '',
      subgraphName: this.subgraphName || '',
      fetchDataOptions: this.fetchDataOptions,
      onProgress: this.updateGraphProgress,
    };
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  updateEventProgress({ percentage, type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {}

  updateBlockProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {}

  updateTransactionProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {}

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchGraphOnProgress>[0]) {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  async formatEvents(events: EventLog[]): Promise<EventType[]> {
    // eslint-disable-next-line no-return-await
    return await new Promise((resolve) => resolve(events as unknown as EventType[]));
  }

  /**
   * Get saved or cached events
   */

  async getEventsFromDB(): Promise<BaseEvents<EventType>> {
    return {
      events: [],
      lastBlock: null,
    };
  }

  /**
   * Events from remote cache (Either from local cache, CDN, or from IPFS)
   */
  async getEventsFromCache(): Promise<CachedEvents<EventType>> {
    return {
      events: [],
      lastBlock: null,
      fromCache: true,
    };
  }

  async getSavedEvents(): Promise<BaseEvents<EventType> | CachedEvents<EventType>> {
    let cachedEvents = await this.getEventsFromDB();

    if (!cachedEvents || !cachedEvents.events.length) {
      cachedEvents = await this.getEventsFromCache();
    }

    return cachedEvents;
  }

  /**
   * Get latest events
   */

  async getEventsFromGraph({
    fromBlock,
    methodName = '',
  }: {
    fromBlock: number;
    methodName?: string;
  }): Promise<BaseEvents<EventType>> {
    if (!this.graphApi || !this.subgraphName) {
      return {
        events: [],
        lastBlock: fromBlock,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { events, lastSyncBlock } = (await (graph as any)[methodName || this.getGraphMethod()]({
      fromBlock,
      ...this.getGraphParams(),
    })) as BaseGraphEvents<EventType>;
    return {
      events,
      lastBlock: lastSyncBlock,
    };
  }

  async getEventsFromRpc({
    fromBlock,
    toBlock,
  }: {
    fromBlock: number;
    toBlock?: number;
  }): Promise<BaseEvents<EventType>> {
    try {
      if (!toBlock) {
        toBlock = await this.provider.getBlockNumber();
      }

      if (fromBlock >= toBlock) {
        return {
          events: [],
          lastBlock: toBlock,
        };
      }

      this.updateEventProgress({ percentage: 0, type: this.getType() });

      const events = await this.formatEvents(
        await this.batchEventsService.getBatchEvents({ fromBlock, toBlock, type: this.getType() }),
      );

      return {
        events,
        lastBlock: toBlock,
      };
    } catch (err) {
      console.log(err);
      return {
        events: [],
        lastBlock: fromBlock,
      };
    }
  }

  async getLatestEvents({ fromBlock }: { fromBlock: number }): Promise<BaseEvents<EventType>> {
    if (this.tovarishClient?.selectedRelayer && ![DEPOSIT, WITHDRAWAL].includes(this.type.toLowerCase())) {
      const { events, lastSyncBlock: lastBlock } = await this.tovarishClient.getEvents<EventType>({
        type: this.getTovarishType(),
        fromBlock,
      });

      return {
        events,
        lastBlock,
      };
    }

    const graphEvents = await this.getEventsFromGraph({ fromBlock });
    const lastSyncBlock =
      graphEvents.lastBlock && graphEvents.lastBlock >= fromBlock ? graphEvents.lastBlock : fromBlock;
    const rpcEvents = await this.getEventsFromRpc({ fromBlock: lastSyncBlock });
    return {
      events: [...graphEvents.events, ...rpcEvents.events],
      lastBlock: rpcEvents.lastBlock,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateEvents({ events, lastBlock }: BaseEvents<EventType>) {}

  /**
   * Handle saving events
   */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveEvents({ events, lastBlock }: BaseEvents<EventType>) {}

  /**
   * Trigger saving and receiving latest events
   */

  async updateEvents() {
    const savedEvents = await this.getSavedEvents();

    let fromBlock = this.deployedBlock;

    if (savedEvents && savedEvents.lastBlock) {
      fromBlock = savedEvents.lastBlock + 1;
    }

    const newEvents = await this.getLatestEvents({ fromBlock });

    const eventSet = new Set();

    const allEvents: EventType[] = [...savedEvents.events, ...newEvents.events]
      .sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          return a.logIndex - b.logIndex;
        }
        return a.blockNumber - b.blockNumber;
      })
      .filter(({ transactionHash, logIndex }) => {
        const eventKey = `${transactionHash}_${logIndex}`;
        const hasEvent = eventSet.has(eventKey);
        eventSet.add(eventKey);
        return !hasEvent;
      });

    const lastBlock = newEvents.lastBlock || allEvents[allEvents.length - 1]?.blockNumber;

    this.validateEvents({ events: allEvents, lastBlock });

    // If the events are loaded from cache or we have found new events, save them
    if ((savedEvents as CachedEvents<EventType>).fromCache || newEvents.events.length) {
      await this.saveEvents({ events: allEvents, lastBlock });
    }

    return {
      events: allEvents,
      lastBlock,
    };
  }
}

export type BaseTornadoServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  Tornado: Tornado;
  type: string;
  amount: string;
  currency: string;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export type DepositsGraphParams = BaseGraphParams & {
  amount: string;
  currency: string;
};

export class BaseTornadoService extends BaseEventsService<DepositsEvents | WithdrawalsEvents> {
  amount: string;
  currency: string;
  batchTransactionService: BatchTransactionService;
  batchBlockService: BatchBlockService;
  tovarishClient?: TovarishClient;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Tornado,
    type,
    amount,
    currency,
    deployedBlock,
    fetchDataOptions,
    tovarishClient,
  }: BaseTornadoServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      contract: Tornado,
      type,
      deployedBlock,
      fetchDataOptions,
      tovarishClient,
    });

    this.amount = amount;
    this.currency = currency;

    this.batchTransactionService = new BatchTransactionService({
      provider,
      onProgress: this.updateTransactionProgress,
    });

    this.batchBlockService = new BatchBlockService({
      provider,
      onProgress: this.updateBlockProgress,
    });
  }

  getInstanceName(): string {
    return `${this.getType().toLowerCase()}s_${this.netId}_${this.currency}_${this.amount}`;
  }

  getGraphMethod(): string {
    return `getAll${this.getType()}s`;
  }

  getGraphParams(): DepositsGraphParams {
    return {
      graphApi: this.graphApi || '',
      subgraphName: this.subgraphName || '',
      amount: this.amount,
      currency: this.currency,
      fetchDataOptions: this.fetchDataOptions,
      onProgress: this.updateGraphProgress,
    };
  }

  async formatEvents(events: EventLog[]): Promise<(DepositsEvents | WithdrawalsEvents)[]> {
    const type = this.getType().toLowerCase();
    if (type === DEPOSIT) {
      const formattedEvents = events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { commitment, leafIndex, timestamp } = args;

        return {
          blockNumber,
          logIndex,
          transactionHash,
          commitment: commitment as string,
          leafIndex: Number(leafIndex),
          timestamp: Number(timestamp),
        };
      });

      const txs = await this.batchTransactionService.getBatchTransactions([
        ...new Set(formattedEvents.map(({ transactionHash }) => transactionHash)),
      ]);

      return formattedEvents.map((event) => {
        const { from } = txs.find(({ hash }) => hash === event.transactionHash) as TransactionResponse;

        return {
          ...event,
          from,
        };
      });
    } else {
      const formattedEvents = events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { nullifierHash, to, fee } = args;

        return {
          blockNumber,
          logIndex,
          transactionHash,
          nullifierHash: String(nullifierHash),
          to: getAddress(to),
          fee: String(fee),
        };
      });

      const blocks = await this.batchBlockService.getBatchBlocks([
        ...new Set(formattedEvents.map(({ blockNumber }) => blockNumber)),
      ]);

      return formattedEvents.map((event) => {
        const { timestamp } = blocks.find(({ number }) => number === event.blockNumber) as Block;

        return {
          ...event,
          timestamp,
        };
      });
    }
  }

  validateEvents({ events }: { events: (DepositsEvents | WithdrawalsEvents)[] }) {
    if (events.length && this.getType().toLowerCase() === DEPOSIT) {
      const lastEvent = events[events.length - 1] as DepositsEvents;

      if (lastEvent.leafIndex !== events.length - 1) {
        const errMsg = `Deposit events invalid wants ${events.length - 1} leafIndex have ${lastEvent.leafIndex}`;
        throw new Error(errMsg);
      }
    }
  }

  async getLatestEvents({ fromBlock }: { fromBlock: number }): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>> {
    if (this.tovarishClient?.selectedRelayer) {
      const { events, lastSyncBlock: lastBlock } = await this.tovarishClient.getEvents<
        DepositsEvents | WithdrawalsEvents
      >({
        type: this.getTovarishType(),
        currency: this.currency,
        amount: this.amount,
        fromBlock,
      });

      return {
        events,
        lastBlock,
      };
    }

    return super.getLatestEvents({ fromBlock });
  }
}

export type BaseEchoServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  Echoer: Echoer;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export class BaseEchoService extends BaseEventsService<EchoEvents> {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Echoer,
    deployedBlock,
    fetchDataOptions,
    tovarishClient,
  }: BaseEchoServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      contract: Echoer,
      deployedBlock,
      fetchDataOptions,
      tovarishClient,
    });
  }

  getInstanceName(): string {
    return `echo_${this.netId}`;
  }

  getType(): string {
    return 'Echo';
  }

  getGraphMethod(): string {
    return 'getAllGraphEchoEvents';
  }

  async formatEvents(events: EventLog[]) {
    return events
      .map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { who, data } = args;

        if (who && data) {
          const eventObjects = {
            blockNumber,
            logIndex,
            transactionHash,
          };

          return {
            ...eventObjects,
            address: who,
            encryptedAccount: data,
          };
        }
      })
      .filter((e) => e) as EchoEvents[];
  }

  async getEventsFromGraph({ fromBlock }: { fromBlock: number }): Promise<BaseEvents<EchoEvents>> {
    // TheGraph doesn't support our batch sync due to missing blockNumber field
    if (!this.graphApi || this.graphApi.includes('api.thegraph.com')) {
      return {
        events: [],
        lastBlock: fromBlock,
      };
    }

    return super.getEventsFromGraph({ fromBlock });
  }
}

export type BaseEncryptedNotesServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  Router: TornadoRouter | TornadoProxyLight;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export class BaseEncryptedNotesService extends BaseEventsService<EncryptedNotesEvents> {
  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Router,
    deployedBlock,
    fetchDataOptions,
    tovarishClient,
  }: BaseEncryptedNotesServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      contract: Router,
      deployedBlock,
      fetchDataOptions,
      tovarishClient,
    });
  }

  getInstanceName(): string {
    return `encrypted_notes_${this.netId}`;
  }

  getType(): string {
    return 'EncryptedNote';
  }

  getTovarishType(): string {
    return 'encrypted_notes';
  }

  getGraphMethod(): string {
    return 'getAllEncryptedNotes';
  }

  async formatEvents(events: EventLog[]) {
    return events
      .map(({ blockNumber, index: logIndex, transactionHash, args }) => {
        const { encryptedNote } = args;

        if (encryptedNote && encryptedNote !== '0x') {
          const eventObjects = {
            blockNumber,
            logIndex,
            transactionHash,
          };

          return {
            ...eventObjects,
            encryptedNote,
          };
        }
      })
      .filter((e) => e) as EncryptedNotesEvents[];
  }
}

export type BaseGovernanceServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  Governance: Governance;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export class BaseGovernanceService extends BaseEventsService<AllGovernanceEvents> {
  batchTransactionService: BatchTransactionService;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Governance,
    deployedBlock,
    fetchDataOptions,
    tovarishClient,
  }: BaseGovernanceServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      contract: Governance,
      deployedBlock,
      fetchDataOptions,
      tovarishClient,
    });

    this.batchTransactionService = new BatchTransactionService({
      provider,
      onProgress: this.updateTransactionProgress,
    });
  }

  getInstanceName() {
    return `governance_${this.netId}`;
  }

  getType() {
    return '*';
  }

  getTovarishType(): string {
    return 'governance';
  }

  getGraphMethod() {
    return 'getAllGovernanceEvents';
  }

  async formatEvents(events: EventLog[]): Promise<AllGovernanceEvents[]> {
    const proposalEvents: GovernanceProposalCreatedEvents[] = [];
    const votedEvents: GovernanceVotedEvents[] = [];
    const delegatedEvents: GovernanceDelegatedEvents[] = [];
    const undelegatedEvents: GovernanceUndelegatedEvents[] = [];

    events.forEach(({ blockNumber, index: logIndex, transactionHash, args, eventName: event }) => {
      const eventObjects = {
        blockNumber,
        logIndex,
        transactionHash,
        event,
      };

      if (event === 'ProposalCreated') {
        const { id, proposer, target, startTime, endTime, description } = args;

        proposalEvents.push({
          ...eventObjects,
          id: Number(id),
          proposer,
          target,
          startTime: Number(startTime),
          endTime: Number(endTime),
          description,
        });
      }

      if (event === 'Voted') {
        const { proposalId, voter, support, votes } = args;

        votedEvents.push({
          ...eventObjects,
          proposalId: Number(proposalId),
          voter,
          support,
          votes,
          from: '',
          input: '',
        });
      }

      if (event === 'Delegated') {
        const { account, to: delegateTo } = args;

        delegatedEvents.push({
          ...eventObjects,
          account,
          delegateTo,
        });
      }

      if (event === 'Undelegated') {
        const { account, from: delegateFrom } = args;

        undelegatedEvents.push({
          ...eventObjects,
          account,
          delegateFrom,
        });
      }
    });

    if (votedEvents.length) {
      this.updateTransactionProgress({ percentage: 0 });

      const txs = await this.batchTransactionService.getBatchTransactions([
        ...new Set(votedEvents.map(({ transactionHash }) => transactionHash)),
      ]);

      votedEvents.forEach((event, index) => {
        // eslint-disable-next-line prefer-const
        let { data: input, from } = txs.find((t) => t.hash === event.transactionHash) as TransactionResponse;

        // Filter spammy txs
        if (!input || input.length > 2048) {
          input = '';
        }

        votedEvents[index].from = from;
        votedEvents[index].input = input;
      });
    }

    return [...proposalEvents, ...votedEvents, ...delegatedEvents, ...undelegatedEvents];
  }

  async getEventsFromGraph({ fromBlock }: { fromBlock: number }): Promise<BaseEvents<AllGovernanceEvents>> {
    // TheGraph doesn't support governance subgraphs
    if (!this.graphApi || !this.subgraphName || this.graphApi.includes('api.thegraph.com')) {
      return {
        events: [],
        lastBlock: fromBlock,
      };
    }

    return super.getEventsFromGraph({ fromBlock });
  }
}

export async function getTovarishNetworks(registryService: BaseRegistryService, relayers: CachedRelayerInfo[]) {
  await Promise.all(
    relayers
      .filter((r) => r.tovarishHost)
      .map(async (relayer) => {
        try {
          relayer.tovarishNetworks = await fetchData(relayer.tovarishHost as string, {
            ...registryService.fetchDataOptions,
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: registryService.fetchDataOptions?.torPort ? 10000 : 3000,
            maxRetry: registryService.fetchDataOptions?.torPort ? 2 : 0,
          });
        } catch {
          // Ignore error and disable relayer
          relayer.tovarishNetworks = [];
        }
      }),
  );
}

/**
 * Essential params:
 * ensName, relayerAddress, hostnames
 * Other data is for historic purpose from relayer registry
 */
export interface CachedRelayerInfo extends RelayerParams {
  isRegistered?: boolean;
  owner?: string;
  stakeBalance?: string;
  hostnames: SubdomainMap;
  tovarishHost?: string;
  tovarishNetworks?: number[];
}

/**
 * Static relayer provided by tornadowithdraw.eth
 * This relayer isn't compatible with the current UI (tornadocash.eth) and only works as experimental mode
 * Once DAO approves changes to UI to support new Tovarish Relayer software register relayer and remove static list
 */
const staticRelayers = [
  {
    ensName: 'tornadowithdraw.eth',
    relayerAddress: '0x40c3d1656a26C9266f4A10fed0D87EFf79F54E64',
    hostnames: {},
    tovarishHost: 'tornadowithdraw.com',
    tovarishNetworks: enabledChains,
  },
] as CachedRelayerInfo[];

export interface CachedRelayers {
  lastBlock: number;
  timestamp: number;
  relayers: CachedRelayerInfo[];
  fromCache?: boolean;
}

export type BaseRegistryServiceConstructor = {
  netId: NetIdType;
  provider: Provider;
  graphApi?: string;
  subgraphName?: string;
  RelayerRegistry: RelayerRegistry;
  Aggregator: Aggregator;
  relayerEnsSubdomains: SubdomainMap;
  deployedBlock?: number;
  fetchDataOptions?: fetchDataOptions;
  tovarishClient?: TovarishClient;
};

export class BaseRegistryService extends BaseEventsService<RegistersEvents> {
  Aggregator: Aggregator;
  relayerEnsSubdomains: SubdomainMap;
  updateInterval: number;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    RelayerRegistry,
    Aggregator,
    relayerEnsSubdomains,
    deployedBlock,
    fetchDataOptions,
    tovarishClient,
  }: BaseRegistryServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      contract: RelayerRegistry,
      deployedBlock,
      fetchDataOptions,
      tovarishClient,
    });

    this.Aggregator = Aggregator;
    this.relayerEnsSubdomains = relayerEnsSubdomains;

    this.updateInterval = 86400;
  }

  getInstanceName() {
    return `registered_${this.netId}`;
  }

  // Name of type used for events
  getType() {
    return 'RelayerRegistered';
  }

  getTovarishType(): string {
    return 'registered';
  }

  // Name of method used for graph
  getGraphMethod() {
    return 'getAllRegisters';
  }

  async formatEvents(events: EventLog[]) {
    return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
      const eventObjects = {
        blockNumber,
        logIndex,
        transactionHash,
      };

      return {
        ...eventObjects,
        ensName: args.ensName,
        relayerAddress: args.relayerAddress,
      };
    });
  }

  /**
   * Get saved or cached relayers
   */
  async getRelayersFromDB(): Promise<CachedRelayers> {
    return {
      lastBlock: 0,
      timestamp: 0,
      relayers: [],
    };
  }

  /**
   * Relayers from remote cache (Either from local cache, CDN, or from IPFS)
   */
  async getRelayersFromCache(): Promise<CachedRelayers> {
    return {
      lastBlock: 0,
      timestamp: 0,
      relayers: [],
      fromCache: true,
    };
  }

  async getSavedRelayers(): Promise<CachedRelayers> {
    let cachedRelayers = await this.getRelayersFromDB();

    if (!cachedRelayers || !cachedRelayers.relayers.length) {
      cachedRelayers = await this.getRelayersFromCache();
    }

    return cachedRelayers;
  }

  async getLatestRelayers(): Promise<CachedRelayers> {
    const { events, lastBlock } = await this.updateEvents();

    const subdomains = Object.values(this.relayerEnsSubdomains);

    const registerSet = new Set();

    const uniqueRegisters = events.filter(({ ensName }) => {
      if (!registerSet.has(ensName)) {
        registerSet.add(ensName);
        return true;
      }
      return false;
    });

    const relayerNameHashes = uniqueRegisters.map((r) => namehash(r.ensName));

    const [relayersData, timestamp] = await Promise.all([
      this.Aggregator.relayersData.staticCall(relayerNameHashes, subdomains.concat('tovarish-relayer')),
      this.provider.getBlock(lastBlock).then((b) => Number(b?.timestamp)),
    ]);

    const relayers = relayersData
      .map(({ owner, balance: stakeBalance, records, isRegistered }, index) => {
        const { ensName, relayerAddress } = uniqueRegisters[index];

        let tovarishHost = undefined;

        const hostnames = records.reduce((acc, record, recordIndex) => {
          if (record) {
            // tovarish-relayer.relayer.eth
            if (recordIndex === records.length - 1) {
              tovarishHost = record;
              return acc;
            }

            acc[Number(Object.keys(this.relayerEnsSubdomains)[recordIndex])] = record;
          }
          return acc;
        }, {} as SubdomainMap);

        const isOwner = !relayerAddress || relayerAddress === owner;
        const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;

        const preCondition = Object.keys(hostnames).length && isOwner && isRegistered && hasMinBalance;

        if (preCondition) {
          return {
            ensName,
            relayerAddress,
            isRegistered,
            owner,
            stakeBalance: formatEther(stakeBalance),
            hostnames,
            tovarishHost,
          } as CachedRelayerInfo;
        }
      })
      .filter((r) => r) as CachedRelayerInfo[];

    await getTovarishNetworks(this, relayers);

    return {
      lastBlock,
      timestamp,
      relayers: [...staticRelayers, ...relayers],
    };
  }

  /**
   * Handle saving relayers
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveRelayers({ lastBlock, timestamp, relayers }: CachedRelayers) {}

  /**
   * Get cached or latest relayer and save to local
   */
  async updateRelayers(): Promise<CachedRelayers> {
    // eslint-disable-next-line prefer-const
    let { lastBlock, timestamp, relayers, fromCache } = await this.getSavedRelayers();

    let shouldSave = fromCache ?? false;

    if (!relayers.length || timestamp + this.updateInterval < Math.floor(Date.now() / 1000)) {
      console.log('\nUpdating relayers from registry\n');

      ({ lastBlock, timestamp, relayers } = await this.getLatestRelayers());

      shouldSave = true;
    }

    if (shouldSave) {
      await this.saveRelayers({ lastBlock, timestamp, relayers });
    }

    return { lastBlock, timestamp, relayers };
  }
}
