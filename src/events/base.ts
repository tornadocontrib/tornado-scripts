import {
    BaseContract,
    Provider,
    EventLog,
    TransactionResponse,
    getAddress,
    namehash,
    formatEther,
    AbiCoder,
    dataLength,
    dataSlice,
} from 'ethers';

import {
    Tornado,
    TornadoRouter,
    TornadoProxyLight,
    Governance,
    RelayerRegistry,
    Echoer,
    Aggregator,
    Tornado__factory,
} from '@tornado/contracts';

import type { MerkleTree } from '@tornado/fixed-merkle-tree';
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

import type { ReverseRecords } from '../typechain';
import type { MerkleTreeService } from '../merkleTree';
import type { DepositType } from '../deposits';
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
    EchoEvents,
    RelayerRegisteredEvents,
    RelayerUnregisteredEvents,
    WorkerRegisteredEvents,
    WorkerUnregisteredEvents,
    AllRelayerRegistryEvents,
    StakeBurnedEvents,
    MultiDepositsEvents,
    MultiWithdrawalsEvents,
} from './types';

export interface BaseEventsServiceConstructor {
    netId: NetIdType;
    provider: Provider;
    contract: BaseContract;
    type: string;
    deployedBlock?: number;
    fetchDataOptions?: fetchDataOptions;
    tovarishClient?: TovarishClient;
}

export class BaseEventsService<EventType extends MinimalEvents> {
    netId: NetIdType;
    provider: Provider;
    contract: BaseContract;
    type: string;
    deployedBlock: number;
    batchEventsService: BatchEventsService;
    fetchDataOptions?: fetchDataOptions;
    tovarishClient?: TovarishClient;

    constructor({
        netId,
        provider,
        contract,
        type = '',
        deployedBlock = 0,
        fetchDataOptions,
        tovarishClient,
    }: BaseEventsServiceConstructor) {
        this.netId = netId;
        this.provider = provider;
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

    /* eslint-disable @typescript-eslint/no-unused-vars */
    updateEventProgress({ percentage, type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {}

    updateBlockProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {}

    updateTransactionProgress({ percentage, currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {}

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
            lastBlock: 0,
        };
    }

    /**
     * Events from remote cache (Either from local cache, CDN, or from IPFS)
     */
    async getEventsFromCache(): Promise<CachedEvents<EventType>> {
        return {
            events: [],
            lastBlock: 0,
            fromCache: true,
        };
    }

    async getSavedEvents(): Promise<BaseEvents<EventType> | CachedEvents<EventType>> {
        let dbEvents = await this.getEventsFromDB();

        if (!dbEvents.lastBlock) {
            dbEvents = await this.getEventsFromCache();
        }

        return dbEvents;
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
                await this.batchEventsService.getBatchEvents({
                    fromBlock,
                    toBlock,
                    type: this.getType(),
                }),
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
        if (this.tovarishClient?.selectedRelayer) {
            const { events, lastSyncBlock: lastBlock } = await this.tovarishClient.getEvents<EventType>({
                type: this.getTovarishType(),
                fromBlock,
            });

            return {
                events,
                lastBlock,
            };
        }

        return await this.getEventsFromRpc({
            fromBlock,
        });
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    async validateEvents<S>({
        events,
        newEvents,
        lastBlock,
    }: BaseEvents<EventType> & { newEvents: EventType[] }): Promise<S> {
        return undefined as S;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */

    /**
     * Handle saving events
     */

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async saveEvents({ events, newEvents, lastBlock }: BaseEvents<EventType> & { newEvents: EventType[] }) {}

    /**
     * Trigger saving and receiving latest events
     */

    async updateEvents<S>() {
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

        const validateResult = await this.validateEvents<S>({
            events: allEvents,
            newEvents: newEvents.events,
            lastBlock,
        });

        // If the events are loaded from cache or we have found new events, save them
        if ((savedEvents as CachedEvents<EventType>).fromCache || newEvents.events.length) {
            await this.saveEvents({ events: allEvents, newEvents: newEvents.events, lastBlock });
        }

        return {
            events: allEvents,
            lastBlock,
            validateResult,
        };
    }
}

export interface BaseTornadoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract'> {
    Tornado: Tornado;
    amount: string;
    currency: string;
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
}

export class BaseTornadoService extends BaseEventsService<DepositsEvents | WithdrawalsEvents> {
    amount: string;
    currency: string;

    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;

    constructor(serviceConstructor: BaseTornadoServiceConstructor) {
        const { Tornado: contract, amount, currency, provider, optionalTree, merkleTreeService } = serviceConstructor;

        super({
            ...serviceConstructor,
            contract,
        });

        this.amount = amount;
        this.currency = currency;

        this.optionalTree = optionalTree;
        this.merkleTreeService = merkleTreeService;

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

    async formatEvents(events: EventLog[]): Promise<(DepositsEvents | WithdrawalsEvents)[]> {
        const type = this.getType();
        if (type === 'Deposit') {
            const txs = await this.batchTransactionService.getBatchTransactions([
                ...new Set(events.map(({ transactionHash }) => transactionHash)),
            ]);

            return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
                const { commitment, leafIndex, timestamp } = args;

                return {
                    blockNumber,
                    logIndex,
                    transactionHash,
                    commitment: commitment as string,
                    leafIndex: Number(leafIndex),
                    timestamp: Number(timestamp),
                    from: txs.find(({ hash }) => hash === transactionHash)?.from || '',
                };
            });
        } else {
            const blocks = await this.batchBlockService.getBatchBlocks([
                ...new Set(events.map(({ blockNumber }) => blockNumber)),
            ]);

            return events.map(({ blockNumber, index: logIndex, transactionHash, args }) => {
                const { nullifierHash, to, fee } = args;

                return {
                    blockNumber,
                    logIndex,
                    transactionHash,
                    nullifierHash: String(nullifierHash),
                    to: getAddress(to),
                    fee: String(fee),
                    timestamp: blocks.find(({ number }) => number === blockNumber)?.timestamp || 0,
                };
            });
        }
    }

    async validateEvents<S>({
        events,
        newEvents,
    }: BaseEvents<DepositsEvents | WithdrawalsEvents> & {
        newEvents: (DepositsEvents | WithdrawalsEvents)[];
    }) {
        if (events.length && this.getType() === 'Deposit') {
            const depositEvents = events as DepositsEvents[];

            const lastEvent = depositEvents[depositEvents.length - 1];

            if (lastEvent.leafIndex !== depositEvents.length - 1) {
                const errMsg = `Deposit events invalid wants ${depositEvents.length - 1} leafIndex have ${lastEvent.leafIndex}`;
                throw new Error(errMsg);
            }

            if (this.merkleTreeService && (!this.optionalTree || newEvents.length)) {
                return (await this.merkleTreeService.verifyTree(depositEvents)) as S;
            }
        }

        return undefined as S;
    }

    async getLatestEvents({
        fromBlock,
    }: {
        fromBlock: number;
    }): Promise<BaseEvents<DepositsEvents | WithdrawalsEvents>> {
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

        return await this.getEventsFromRpc({
            fromBlock,
        });
    }
}

export interface BaseMultiTornadoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    instances: {
        [key in string]: DepositType;
    };
    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
}

export class BaseMultiTornadoService extends BaseEventsService<MultiDepositsEvents | MultiWithdrawalsEvents> {
    instances: {
        [key in string]: DepositType;
    };

    optionalTree?: boolean;
    merkleTreeService?: MerkleTreeService;
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;

    constructor(serviceConstructor: BaseMultiTornadoServiceConstructor) {
        const { instances, provider, optionalTree, merkleTreeService } = serviceConstructor;

        const contract =
            merkleTreeService?.Tornado || Tornado__factory.connect(Object.keys(instances)[0] as string, provider);

        super({
            ...serviceConstructor,
            contract,
            type: '*',
        });

        this.batchEventsService = new BatchEventsService({
            provider,
            contract,
            address: Object.keys(instances),
            onProgress: this.updateEventProgress,
        });

        this.instances = instances;

        this.optionalTree = optionalTree;
        this.merkleTreeService = merkleTreeService;

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
        return `tornado_${this.netId}`;
    }

    getTovarishType(): string {
        return 'tornado';
    }

    async formatEvents(events: EventLog[]): Promise<(MultiDepositsEvents | MultiWithdrawalsEvents)[]> {
        const txs = await this.batchTransactionService.getBatchTransactions([
            ...new Set(
                events.filter(({ eventName }) => eventName === 'Deposit').map(({ transactionHash }) => transactionHash),
            ),
        ]);

        const blocks = await this.batchBlockService.getBatchBlocks([
            ...new Set(
                events.filter(({ eventName }) => eventName === 'Withdrawal').map(({ blockNumber }) => blockNumber),
            ),
        ]);

        return events
            .map(
                ({
                    address: instanceAddress,
                    blockNumber,
                    index: logIndex,
                    transactionHash,
                    args,
                    eventName: event,
                }) => {
                    const eventObjects = {
                        blockNumber,
                        logIndex,
                        transactionHash,
                        event,
                        instanceAddress,
                    };

                    if (event === 'Deposit') {
                        const { commitment, leafIndex, timestamp } = args;

                        return {
                            ...eventObjects,
                            commitment: commitment as string,
                            leafIndex: Number(leafIndex),
                            timestamp: Number(timestamp),
                            from: txs.find(({ hash }) => hash === transactionHash)?.from || '',
                        } as MultiDepositsEvents;
                    }

                    if (event === 'Withdrawal') {
                        const { nullifierHash, to, relayer: relayerAddress, fee } = args;

                        return {
                            ...eventObjects,
                            logIndex,
                            transactionHash,
                            nullifierHash: String(nullifierHash),
                            to,
                            relayerAddress,
                            fee: String(fee),
                            timestamp: blocks.find(({ number }) => number === blockNumber)?.timestamp || 0,
                        } as MultiWithdrawalsEvents;
                    }
                },
            )
            .filter((e) => e) as (MultiDepositsEvents | MultiWithdrawalsEvents)[];
    }

    async validateEvents<S>({
        events,
        newEvents,
    }: BaseEvents<MultiDepositsEvents | MultiWithdrawalsEvents> & {
        newEvents: (MultiDepositsEvents | MultiWithdrawalsEvents)[];
    }) {
        const instancesWithNewEvents = [
            ...new Set(
                newEvents.filter(({ event }) => event === 'Deposit').map(({ instanceAddress }) => instanceAddress),
            ),
        ];

        let tree: S | undefined;

        const requiredTree = this.merkleTreeService?.Tornado?.target as string | undefined;

        // Audit and create deposit tree
        if (requiredTree && !instancesWithNewEvents.includes(requiredTree)) {
            instancesWithNewEvents.push(requiredTree);
        }

        for (const instance of instancesWithNewEvents) {
            const depositEvents = events.filter(
                ({ instanceAddress, event }) => instanceAddress === instance && event === 'Deposit',
            ) as MultiDepositsEvents[];

            const lastEvent = depositEvents[depositEvents.length - 1];

            if (lastEvent.leafIndex !== depositEvents.length - 1) {
                const errMsg = `Invalid deposit events for ${instance} wants ${depositEvents.length - 1} leafIndex have ${lastEvent.leafIndex}`;
                throw new Error(errMsg);
            }

            if (requiredTree === instance && !this.optionalTree) {
                tree = (await this.merkleTreeService?.verifyTree(depositEvents)) as S;
            }
        }

        return tree as S;
    }

    async getEvents(instanceAddress: string) {
        const { events, validateResult: tree, lastBlock } = await this.updateEvents<MerkleTree | undefined>();

        const { depositEvents, withdrawalEvents } = events.reduce(
            (acc, curr) => {
                if (curr.instanceAddress === instanceAddress) {
                    if (curr.event === 'Deposit') {
                        acc.depositEvents.push(curr as MultiDepositsEvents);
                    } else if (curr.event === 'Withdrawal') {
                        acc.withdrawalEvents.push(curr as MultiWithdrawalsEvents);
                    }
                }
                return acc;
            },
            {} as {
                depositEvents: MultiDepositsEvents[];
                withdrawalEvents: MultiWithdrawalsEvents[];
            },
        );

        return {
            depositEvents,
            withdrawalEvents,
            tree,
            lastBlock,
        };
    }
}

export interface BaseEchoServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Echoer: Echoer;
}

export class BaseEchoService extends BaseEventsService<EchoEvents> {
    constructor(serviceConstructor: BaseEchoServiceConstructor) {
        super({
            ...serviceConstructor,
            contract: serviceConstructor.Echoer,
            type: 'Echo',
        });
    }

    getInstanceName(): string {
        return `echo_${this.netId}`;
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
}

export interface BaseEncryptedNotesServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Router: TornadoRouter | TornadoProxyLight;
}

export class BaseEncryptedNotesService extends BaseEventsService<EncryptedNotesEvents> {
    constructor(serviceConstructor: BaseEncryptedNotesServiceConstructor) {
        super({
            ...serviceConstructor,
            contract: serviceConstructor.Router,
            type: 'EncryptedNote',
        });
    }

    getInstanceName(): string {
        return `encrypted_notes_${this.netId}`;
    }

    getTovarishType(): string {
        return 'encrypted_notes';
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

const abiCoder = AbiCoder.defaultAbiCoder();

export const proposalState: { [key: string]: string } = {
    0: 'Pending',
    1: 'Active',
    2: 'Defeated',
    3: 'Timelocked',
    4: 'AwaitingExecution',
    5: 'Executed',
    6: 'Expired',
};

function parseDescription(id: number, text: string): { title: string; description: string } {
    switch (id) {
        case 1:
            return {
                title: text,
                description: 'See: https://torn.community/t/proposal-1-enable-torn-transfers/38',
            };
        case 10:
            text = text.replace('\n', '\\n\\n');
            break;
        case 11:
            text = text.replace('"description"', ',"description"');
            break;
        case 13:
            text = text.replace(/\\\\n\\\\n(\s)?(\\n)?/g, '\\n');
            break;
        // Fix invalid JSON in proposal 15: replace single quotes with double and add comma before description
        case 15:
            // eslint-disable-next-line prettier/prettier
      text = text.replaceAll('\'', '"');
            text = text.replace('"description"', ',"description"');
            break;
        case 16:
            text = text.replace('#16: ', '');
            break;
        // Add title to empty (without title and description) hacker proposal 21
        case 21:
            return {
                title: 'Proposal #21: Restore Governance',
                description: '',
            };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let title: string, description: string, rest: any;
    try {
        ({ title, description } = JSON.parse(text));
    } catch {
        [title, ...rest] = text.split('\n', 2);
        description = rest.join('\n');
    }

    return {
        title,
        description,
    };
}

function parseComment(Governance: Governance, calldata: string): { contact: string; message: string } {
    try {
        const methodLength = 4;
        const result = abiCoder.decode(['address[]', 'uint256', 'bool'], dataSlice(calldata, methodLength));
        const data = Governance.interface.encodeFunctionData(
            // @ts-expect-error encodeFunctionData is broken lol
            'castDelegatedVote',
            result,
        );
        const length = dataLength(data);

        const str: string = abiCoder.decode(['string'], dataSlice(calldata, length))[0];
        const [contact, message] = JSON.parse(str) as string[];

        return {
            contact,
            message,
        };
    } catch {
        return {
            contact: '',
            message: '',
        };
    }
}

export interface GovernanceProposals extends GovernanceProposalCreatedEvents {
    title: string;
    proposerName?: string;
    forVotes: bigint;
    againstVotes: bigint;
    executed: boolean;
    extended: boolean;
    quorum: string;
    state: string;
}

export interface GovernanceVotes extends GovernanceVotedEvents {
    contact: string;
    message: string;
    fromName?: string;
    voterName?: string;
}

export interface BaseGovernanceServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    Governance: Governance;
    Aggregator: Aggregator;
    ReverseRecords: ReverseRecords;
}

export class BaseGovernanceService extends BaseEventsService<AllGovernanceEvents> {
    Governance: Governance;
    Aggregator: Aggregator;
    ReverseRecords: ReverseRecords;

    batchTransactionService: BatchTransactionService;

    constructor(serviceConstructor: BaseGovernanceServiceConstructor) {
        const { Governance, Aggregator, ReverseRecords, provider } = serviceConstructor;

        super({
            ...serviceConstructor,
            contract: Governance,
            type: '*',
        });

        this.Governance = Governance;
        this.Aggregator = Aggregator;
        this.ReverseRecords = ReverseRecords;

        this.batchTransactionService = new BatchTransactionService({
            provider,
            onProgress: this.updateTransactionProgress,
        });
    }

    getInstanceName() {
        return `governance_${this.netId}`;
    }

    getTovarishType(): string {
        return 'governance';
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

    async getAllProposals(): Promise<GovernanceProposals[]> {
        const { events } = await this.updateEvents();

        const proposalEvents = events.filter((e) => e.event === 'ProposalCreated') as GovernanceProposalCreatedEvents[];

        const allProposers = [...new Set(proposalEvents.map((e) => [e.proposer]).flat())];

        const [QUORUM_VOTES, proposalStatus, proposerNameRecords] = await Promise.all([
            this.Governance.QUORUM_VOTES(),
            this.Aggregator.getAllProposals(this.Governance.target),
            this.ReverseRecords.getNames(allProposers),
        ]);

        const proposerNames = allProposers.reduce(
            (acc, address, index) => {
                if (proposerNameRecords[index]) {
                    acc[address] = proposerNameRecords[index];
                }
                return acc;
            },
            {} as { [key: string]: string },
        );

        return proposalEvents.map((event, index) => {
            const { id, proposer, description: text } = event;

            const status = proposalStatus[index];

            const { forVotes, againstVotes, executed, extended, state } = status;

            const { title, description } = parseDescription(id, text);

            const quorum = ((Number(forVotes + againstVotes) / Number(QUORUM_VOTES)) * 100).toFixed(0) + '%';

            return {
                ...event,
                title,
                proposerName: proposerNames[proposer] || undefined,
                description,
                forVotes,
                againstVotes,
                executed,
                extended,
                quorum,
                state: proposalState[String(state)],
            };
        });
    }

    async getVotes(proposalId: number): Promise<GovernanceVotes[]> {
        const { events } = await this.getSavedEvents();

        const votedEvents = events.filter(
            (e) => e.event === 'Voted' && (e as GovernanceVotedEvents).proposalId === proposalId,
        ) as GovernanceVotedEvents[];

        const allVoters = [...new Set(votedEvents.map((e) => [e.from, e.voter]).flat())];

        const names = await this.ReverseRecords.getNames(allVoters);

        const ensNames = allVoters.reduce(
            (acc, address, index) => {
                if (names[index]) {
                    acc[address] = names[index];
                }
                return acc;
            },
            {} as { [key: string]: string },
        );

        const votes = votedEvents.map((event) => {
            const { from, voter } = event;

            const { contact, message } = parseComment(this.Governance, event.input);

            return {
                ...event,
                contact,
                message,
                fromName: ensNames[from] || undefined,
                voterName: ensNames[voter] || undefined,
            };
        });

        return votes;
    }

    async getDelegatedBalance(ethAccount: string) {
        const { events } = await this.getSavedEvents();

        const delegatedAccs = events
            .filter((e) => e.event === 'Delegated' && (e as GovernanceDelegatedEvents).delegateTo === ethAccount)
            .map((e) => (e as GovernanceDelegatedEvents).account);

        const undelegatedAccs = events
            .filter((e) => e.event === 'Undelegated' && (e as GovernanceUndelegatedEvents).delegateFrom === ethAccount)
            .map((e) => (e as GovernanceUndelegatedEvents).account);

        const undel = [...undelegatedAccs];

        const uniq = delegatedAccs.filter((acc) => {
            const indexUndelegated = undel.indexOf(acc);
            if (indexUndelegated !== -1) {
                undel.splice(indexUndelegated, 1);
                return false;
            }
            return true;
        });

        const [balances, uniqNameRecords] = await Promise.all([
            this.Aggregator.getGovernanceBalances(this.Governance.target, uniq),
            this.ReverseRecords.getNames(uniq),
        ]);

        const uniqNames = uniq.reduce(
            (acc, address, index) => {
                if (uniqNameRecords[index]) {
                    acc[address] = uniqNameRecords[index];
                }
                return acc;
            },
            {} as { [key: string]: string },
        );

        return {
            delegatedAccs,
            undelegatedAccs,
            uniq,
            uniqNames,
            balances,
            balance: balances.reduce((acc, curr) => acc + curr, BigInt(0)),
        };
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
                        timeout: 30000,
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
    registeredAddress?: string;
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
const staticRelayers: CachedRelayerInfo[] = [
    {
        ensName: 'tornadowithdraw.eth',
        relayerAddress: '0x40c3d1656a26C9266f4A10fed0D87EFf79F54E64',
        hostnames: {},
        tovarishHost: 'tornadowithdraw.com',
        tovarishNetworks: enabledChains,
    },
];

export interface CachedRelayers {
    lastBlock: number;
    timestamp: number;
    relayers: CachedRelayerInfo[];
    fromCache?: boolean;
}

export interface BaseRegistryServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    RelayerRegistry: RelayerRegistry;
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
}

export class BaseRegistryService extends BaseEventsService<AllRelayerRegistryEvents> {
    Aggregator: Aggregator;
    relayerEnsSubdomains: SubdomainMap;
    updateInterval: number;

    constructor(serviceConstructor: BaseRegistryServiceConstructor) {
        const { RelayerRegistry: contract, Aggregator, relayerEnsSubdomains } = serviceConstructor;

        super({
            ...serviceConstructor,
            contract,
            type: '*',
        });

        this.Aggregator = Aggregator;
        this.relayerEnsSubdomains = relayerEnsSubdomains;

        this.updateInterval = 86400;
    }

    getInstanceName() {
        return `registry_${this.netId}`;
    }

    getTovarishType(): string {
        return 'registry';
    }

    async formatEvents(events: EventLog[]): Promise<AllRelayerRegistryEvents[]> {
        const relayerRegisteredEvents: RelayerRegisteredEvents[] = [];
        const relayerUnregisteredEvents: RelayerUnregisteredEvents[] = [];
        const workerRegisteredEvents: WorkerRegisteredEvents[] = [];
        const workerUnregisteredEvents: WorkerUnregisteredEvents[] = [];

        events.forEach(({ blockNumber, index: logIndex, transactionHash, args, eventName: event }) => {
            const eventObjects = {
                blockNumber,
                logIndex,
                transactionHash,
                event,
            };

            if (event === 'RelayerRegistered') {
                const { relayer: ensHash, ensName, relayerAddress, stakedAmount } = args;

                relayerRegisteredEvents.push({
                    ...eventObjects,
                    ensName,
                    relayerAddress,
                    ensHash,
                    stakedAmount: formatEther(stakedAmount),
                });
            }

            if (event === 'RelayerUnregistered') {
                const { relayer: relayerAddress } = args;

                relayerUnregisteredEvents.push({
                    ...eventObjects,
                    relayerAddress,
                });
            }

            if (event === 'WorkerRegistered') {
                const { relayer: relayerAddress, worker: workerAddress } = args;

                workerRegisteredEvents.push({
                    ...eventObjects,
                    relayerAddress,
                    workerAddress,
                });
            }

            if (event === 'WorkerUnregistered') {
                const { relayer: relayerAddress, worker: workerAddress } = args;

                workerUnregisteredEvents.push({
                    ...eventObjects,
                    relayerAddress,
                    workerAddress,
                });
            }
        });

        return [
            ...relayerRegisteredEvents,
            ...relayerUnregisteredEvents,
            ...workerRegisteredEvents,
            ...workerUnregisteredEvents,
        ];
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
        const { events: allEvents, lastBlock } = await this.updateEvents();

        const events = allEvents.filter((e) => e.event === 'RelayerRegistered') as RelayerRegisteredEvents[];

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

                const hasMinBalance = stakeBalance >= MIN_STAKE_BALANCE;

                const preCondition = Object.keys(hostnames).length && isRegistered && hasMinBalance;

                if (preCondition) {
                    return {
                        ensName,
                        relayerAddress: owner,
                        registeredAddress: owner !== relayerAddress ? relayerAddress : undefined,
                        isRegistered,
                        stakeBalance: formatEther(stakeBalance),
                        hostnames,
                        tovarishHost,
                    } as CachedRelayerInfo;
                }
            })
            .filter((r) => r) as CachedRelayerInfo[];

        await getTovarishNetworks(this, relayers);

        const allRelayers = [...staticRelayers, ...relayers];
        const tovarishRelayers = allRelayers.filter((r) => r.tovarishHost);
        const classicRelayers = allRelayers.filter((r) => !r.tovarishHost);

        return {
            lastBlock,
            timestamp,
            relayers: [...tovarishRelayers, ...classicRelayers],
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

export interface BaseRevenueServiceConstructor extends Omit<BaseEventsServiceConstructor, 'contract' | 'type'> {
    RelayerRegistry: RelayerRegistry;
}

/**
 * Tracks TORN burned events from RelayerRegistry contract
 */

export class BaseRevenueService extends BaseEventsService<StakeBurnedEvents> {
    batchTransactionService: BatchTransactionService;
    batchBlockService: BatchBlockService;

    constructor(serviceConstructor: BaseRevenueServiceConstructor) {
        const { RelayerRegistry: contract, provider } = serviceConstructor;

        super({
            ...serviceConstructor,
            contract,
            type: 'StakeBurned',
        });

        this.batchTransactionService = new BatchTransactionService({
            provider,
            onProgress: this.updateTransactionProgress,
        });

        this.batchBlockService = new BatchBlockService({
            provider,
            onProgress: this.updateBlockProgress,
        });
    }

    getInstanceName() {
        return `revenue_${this.netId}`;
    }

    getTovarishType(): string {
        return 'revenue';
    }

    async formatEvents(events: EventLog[]): Promise<StakeBurnedEvents[]> {
        const blocks = await this.batchBlockService.getBatchBlocks([
            ...new Set(events.map(({ blockNumber }) => blockNumber)),
        ]);

        const receipts = await this.batchTransactionService.getBatchReceipt([
            ...new Set(events.map(({ transactionHash }) => transactionHash)),
        ]);

        const registeredRelayers = new Set(events.map(({ args }) => args.relayer));

        const tornadoInterface = Tornado__factory.createInterface();

        const withdrawHash = tornadoInterface.getEvent('Withdrawal').topicHash;

        const withdrawalLogs = receipts
            .map(
                (receipt) =>
                    receipt.logs
                        .map((log) => {
                            if (log.topics[0] === withdrawHash) {
                                const block = blocks.find((b) => b.number === log.blockNumber);

                                const parsedLog = tornadoInterface.parseLog(log);

                                if (parsedLog && registeredRelayers.has(parsedLog.args.relayer)) {
                                    return {
                                        instanceAddress: log.address,
                                        gasFee: (receipt.cumulativeGasUsed * receipt.gasPrice).toString(),
                                        relayerFee: parsedLog.args.fee.toString(),
                                        timestamp: block?.timestamp || 0,
                                    };
                                }
                            }
                        })
                        .filter((l) => l) as {
                        instanceAddress: string;
                        gasFee: string;
                        relayerFee: string;
                        timestamp: number;
                    }[],
            )
            .flat();

        if (withdrawalLogs.length !== events.length) {
            console.log(
                `\nRevenueService: Mismatch on withdrawal logs (${withdrawalLogs.length} ) and events logs (${events.length})\n`,
            );
        }

        return events.map(({ blockNumber, index: logIndex, transactionHash, args }, index) => {
            const eventObjects = {
                blockNumber,
                logIndex,
                transactionHash,
            };

            const { relayer: relayerAddress, amountBurned } = args;

            const { instanceAddress, gasFee, relayerFee, timestamp } = withdrawalLogs[index];

            return {
                ...eventObjects,
                relayerAddress,
                amountBurned: amountBurned.toString(),
                instanceAddress,
                gasFee,
                relayerFee,
                timestamp,
            };
        });
    }
}
