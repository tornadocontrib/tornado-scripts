import Table from 'cli-table3';
import moment from 'moment';
import { BatchBlockOnProgress, BatchEventOnProgress } from '../batch';
import { saveUserFile, loadSavedEvents, loadCachedEvents } from '../data';
import {
  BaseDepositsService,
  BaseEncryptedNotesService,
  BaseGovernanceService,
  BaseRegistryService,
  BaseDepositsServiceConstructor,
  BaseEncryptedNotesServiceConstructor,
  BaseGovernanceServiceConstructor,
  BaseRegistryServiceConstructor,
  BaseEchoServiceConstructor,
  BaseEchoService,
} from './base';
import type {
  BaseEvents,
  DepositsEvents,
  WithdrawalsEvents,
  EncryptedNotesEvents,
  RegistersEvents,
  AllGovernanceEvents,
  EchoEvents,
} from './types';

export type NodeDepositsServiceConstructor = BaseDepositsServiceConstructor & {
  cacheDirectory?: string;
  userDirectory?: string;
};

export class NodeDepositsService extends BaseDepositsService {
  cacheDirectory?: string;
  userDirectory?: string;

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
    cacheDirectory,
    userDirectory,
  }: NodeDepositsServiceConstructor) {
    super({
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
    });

    this.cacheDirectory = cacheDirectory;
    this.userDirectory = userDirectory;
  }

  updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateTransactionProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {
    if (totalIndex) {
      console.log(`Fetched ${currentIndex} deposit txs of ${totalIndex}`);
    }
  }

  updateBlockProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {
    if (totalIndex) {
      console.log(`Fetched ${currentIndex} withdrawal blocks of ${totalIndex}`);
    }
  }

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events from graph node count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from graph node ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  async getEventsFromDB() {
    if (!this.userDirectory) {
      console.log(
        'Updating events for',
        this.amount,
        this.currency.toUpperCase(),
        `${this.getType().toLowerCase()}s\n`,
      );
      console.log(`savedEvents count - ${0}`);
      console.log(`savedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const savedEvents = await loadSavedEvents<DepositsEvents | WithdrawalsEvents>({
      name: this.getInstanceName(),
      userDirectory: this.userDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log('Updating events for', this.amount, this.currency.toUpperCase(), `${this.getType().toLowerCase()}s\n`);
    console.log(`savedEvents count - ${savedEvents.events.length}`);
    console.log(`savedEvents lastBlock - ${savedEvents.lastBlock}\n`);

    return savedEvents;
  }

  async getEventsFromCache() {
    if (!this.cacheDirectory) {
      console.log(`cachedEvents count - ${0}`);
      console.log(`cachedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const cachedEvents = await loadCachedEvents<DepositsEvents | WithdrawalsEvents>({
      name: this.getInstanceName(),
      cacheDirectory: this.cacheDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`cachedEvents count - ${cachedEvents.events.length}`);
    console.log(`cachedEvents lastBlock - ${cachedEvents.lastBlock}\n`);

    return cachedEvents;
  }

  async saveEvents({ events, lastBlock }: BaseEvents<DepositsEvents | WithdrawalsEvents>) {
    const instanceName = this.getInstanceName();

    console.log('\ntotalEvents count - ', events.length);
    console.log(
      `totalEvents lastBlock - ${events[events.length - 1] ? events[events.length - 1].blockNumber : lastBlock}\n`,
    );

    const eventTable = new Table();

    eventTable.push(
      [{ colSpan: 2, content: `${this.getType()}s`, hAlign: 'center' }],
      ['Instance', `${this.netId} chain ${this.amount} ${this.currency.toUpperCase()}`],
      ['Anonymity set', `${events.length} equal user ${this.getType().toLowerCase()}s`],
      [{ colSpan: 2, content: `Latest ${this.getType().toLowerCase()}s` }],
      ...events
        .slice(events.length - 10)
        .reverse()
        .map(({ timestamp }, index) => {
          const eventIndex = events.length - index;
          const eventTime = moment.unix(timestamp).fromNow();

          return [eventIndex, eventTime];
        }),
    );

    console.log(eventTable.toString() + '\n');

    if (this.userDirectory) {
      await saveUserFile({
        fileName: instanceName + '.json',
        userDirectory: this.userDirectory,
        dataString: JSON.stringify(events, null, 2) + '\n',
      });
    }
  }
}

export type NodeEchoServiceConstructor = BaseEchoServiceConstructor & {
  cacheDirectory?: string;
  userDirectory?: string;
};

export class NodeEchoService extends BaseEchoService {
  cacheDirectory?: string;
  userDirectory?: string;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Echoer,
    deployedBlock,
    fetchDataOptions,
    cacheDirectory,
    userDirectory,
  }: NodeEchoServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      Echoer,
      deployedBlock,
      fetchDataOptions,
    });

    this.cacheDirectory = cacheDirectory;
    this.userDirectory = userDirectory;
  }

  updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events from graph node count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from graph node ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  async getEventsFromDB() {
    if (!this.userDirectory) {
      console.log(`Updating events for ${this.netId} chain echo events\n`);
      console.log(`savedEvents count - ${0}`);
      console.log(`savedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const savedEvents = await loadSavedEvents<EchoEvents>({
      name: this.getInstanceName(),
      userDirectory: this.userDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`Updating events for ${this.netId} chain echo events\n`);
    console.log(`savedEvents count - ${savedEvents.events.length}`);
    console.log(`savedEvents lastBlock - ${savedEvents.lastBlock}\n`);

    return savedEvents;
  }

  async getEventsFromCache() {
    if (!this.cacheDirectory) {
      console.log(`cachedEvents count - ${0}`);
      console.log(`cachedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const cachedEvents = await loadCachedEvents<EchoEvents>({
      name: this.getInstanceName(),
      cacheDirectory: this.cacheDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`cachedEvents count - ${cachedEvents.events.length}`);
    console.log(`cachedEvents lastBlock - ${cachedEvents.lastBlock}\n`);

    return cachedEvents;
  }

  async saveEvents({ events, lastBlock }: BaseEvents<EchoEvents>) {
    const instanceName = this.getInstanceName();

    console.log('\ntotalEvents count - ', events.length);
    console.log(
      `totalEvents lastBlock - ${events[events.length - 1] ? events[events.length - 1].blockNumber : lastBlock}\n`,
    );

    const eventTable = new Table();

    eventTable.push(
      [{ colSpan: 2, content: 'Echo Accounts', hAlign: 'center' }],
      ['Network', `${this.netId} chain`],
      ['Events', `${events.length} events`],
      [{ colSpan: 2, content: 'Latest events' }],
      ...events
        .slice(events.length - 10)
        .reverse()
        .map(({ blockNumber }, index) => {
          const eventIndex = events.length - index;

          return [eventIndex, blockNumber];
        }),
    );

    console.log(eventTable.toString() + '\n');

    if (this.userDirectory) {
      await saveUserFile({
        fileName: instanceName + '.json',
        userDirectory: this.userDirectory,
        dataString: JSON.stringify(events, null, 2) + '\n',
      });
    }
  }
}

export type NodeEncryptedNotesServiceConstructor = BaseEncryptedNotesServiceConstructor & {
  cacheDirectory?: string;
  userDirectory?: string;
};

export class NodeEncryptedNotesService extends BaseEncryptedNotesService {
  cacheDirectory?: string;
  userDirectory?: string;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Router,
    deployedBlock,
    fetchDataOptions,
    cacheDirectory,
    userDirectory,
  }: NodeEncryptedNotesServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      Router,
      deployedBlock,
      fetchDataOptions,
    });

    this.cacheDirectory = cacheDirectory;
    this.userDirectory = userDirectory;
  }

  updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events from graph node count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from graph node ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  async getEventsFromDB() {
    if (!this.userDirectory) {
      console.log(`Updating events for ${this.netId} chain encrypted events\n`);
      console.log(`savedEvents count - ${0}`);
      console.log(`savedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const savedEvents = await loadSavedEvents<EncryptedNotesEvents>({
      name: this.getInstanceName(),
      userDirectory: this.userDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`Updating events for ${this.netId} chain encrypted events\n`);
    console.log(`savedEvents count - ${savedEvents.events.length}`);
    console.log(`savedEvents lastBlock - ${savedEvents.lastBlock}\n`);

    return savedEvents;
  }

  async getEventsFromCache() {
    if (!this.cacheDirectory) {
      console.log(`cachedEvents count - ${0}`);
      console.log(`cachedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const cachedEvents = await loadCachedEvents<EncryptedNotesEvents>({
      name: this.getInstanceName(),
      cacheDirectory: this.cacheDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`cachedEvents count - ${cachedEvents.events.length}`);
    console.log(`cachedEvents lastBlock - ${cachedEvents.lastBlock}\n`);

    return cachedEvents;
  }

  async saveEvents({ events, lastBlock }: BaseEvents<EncryptedNotesEvents>) {
    const instanceName = this.getInstanceName();

    console.log('\ntotalEvents count - ', events.length);
    console.log(
      `totalEvents lastBlock - ${events[events.length - 1] ? events[events.length - 1].blockNumber : lastBlock}\n`,
    );

    const eventTable = new Table();

    eventTable.push(
      [{ colSpan: 2, content: 'Encrypted Notes', hAlign: 'center' }],
      ['Network', `${this.netId} chain`],
      ['Events', `${events.length} events`],
      [{ colSpan: 2, content: 'Latest events' }],
      ...events
        .slice(events.length - 10)
        .reverse()
        .map(({ blockNumber }, index) => {
          const eventIndex = events.length - index;

          return [eventIndex, blockNumber];
        }),
    );

    console.log(eventTable.toString() + '\n');

    if (this.userDirectory) {
      await saveUserFile({
        fileName: instanceName + '.json',
        userDirectory: this.userDirectory,
        dataString: JSON.stringify(events, null, 2) + '\n',
      });
    }
  }
}

export type NodeGovernanceServiceConstructor = BaseGovernanceServiceConstructor & {
  cacheDirectory?: string;
  userDirectory?: string;
};

export class NodeGovernanceService extends BaseGovernanceService {
  cacheDirectory?: string;
  userDirectory?: string;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    Governance,
    deployedBlock,
    fetchDataOptions,
    cacheDirectory,
    userDirectory,
  }: NodeGovernanceServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      Governance,
      deployedBlock,
      fetchDataOptions,
    });

    this.cacheDirectory = cacheDirectory;
    this.userDirectory = userDirectory;
  }

  updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events from graph node count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from graph node ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateTransactionProgress({ currentIndex, totalIndex }: Parameters<BatchBlockOnProgress>[0]) {
    if (totalIndex) {
      console.log(`Fetched ${currentIndex} governance txs of ${totalIndex}`);
    }
  }

  async getEventsFromDB() {
    if (!this.userDirectory) {
      console.log(`Updating events for ${this.netId} chain governance events\n`);
      console.log(`savedEvents count - ${0}`);
      console.log(`savedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const savedEvents = await loadSavedEvents<AllGovernanceEvents>({
      name: this.getInstanceName(),
      userDirectory: this.userDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`Updating events for ${this.netId} chain governance events\n`);
    console.log(`savedEvents count - ${savedEvents.events.length}`);
    console.log(`savedEvents lastBlock - ${savedEvents.lastBlock}\n`);

    return savedEvents;
  }

  async getEventsFromCache() {
    if (!this.cacheDirectory) {
      console.log(`cachedEvents count - ${0}`);
      console.log(`cachedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const cachedEvents = await loadCachedEvents<AllGovernanceEvents>({
      name: this.getInstanceName(),
      cacheDirectory: this.cacheDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`cachedEvents count - ${cachedEvents.events.length}`);
    console.log(`cachedEvents lastBlock - ${cachedEvents.lastBlock}\n`);

    return cachedEvents;
  }

  async saveEvents({ events, lastBlock }: BaseEvents<AllGovernanceEvents>) {
    const instanceName = this.getInstanceName();

    console.log('\ntotalEvents count - ', events.length);
    console.log(
      `totalEvents lastBlock - ${events[events.length - 1] ? events[events.length - 1].blockNumber : lastBlock}\n`,
    );

    const eventTable = new Table();

    eventTable.push(
      [{ colSpan: 2, content: 'Governance Events', hAlign: 'center' }],
      ['Network', `${this.netId} chain`],
      ['Events', `${events.length} events`],
      [{ colSpan: 2, content: 'Latest events' }],
      ...events
        .slice(events.length - 10)
        .reverse()
        .map(({ blockNumber }, index) => {
          const eventIndex = events.length - index;

          return [eventIndex, blockNumber];
        }),
    );

    console.log(eventTable.toString() + '\n');

    if (this.userDirectory) {
      await saveUserFile({
        fileName: instanceName + '.json',
        userDirectory: this.userDirectory,
        dataString: JSON.stringify(events, null, 2) + '\n',
      });
    }
  }
}

export type NodeRegistryServiceConstructor = BaseRegistryServiceConstructor & {
  cacheDirectory?: string;
  userDirectory?: string;
};

export class NodeRegistryService extends BaseRegistryService {
  cacheDirectory?: string;
  userDirectory?: string;

  constructor({
    netId,
    provider,
    graphApi,
    subgraphName,
    RelayerRegistry,
    deployedBlock,
    fetchDataOptions,
    cacheDirectory,
    userDirectory,
  }: NodeRegistryServiceConstructor) {
    super({
      netId,
      provider,
      graphApi,
      subgraphName,
      RelayerRegistry,
      deployedBlock,
      fetchDataOptions,
    });

    this.cacheDirectory = cacheDirectory;
    this.userDirectory = userDirectory;
  }

  updateEventProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  updateGraphProgress({ type, fromBlock, toBlock, count }: Parameters<BatchEventOnProgress>[0]) {
    if (toBlock) {
      console.log(`fromBlock - ${fromBlock}`);
      console.log(`toBlock - ${toBlock}`);

      if (count) {
        console.log(`downloaded ${type} events from graph node count - ${count}`);
        console.log('____________________________________________');
        console.log(`Fetched ${type} events from graph node ${fromBlock} to ${toBlock}\n`);
      }
    }
  }

  async getEventsFromDB() {
    if (!this.userDirectory) {
      console.log(`Updating events for ${this.netId} chain registry events\n`);
      console.log(`savedEvents count - ${0}`);
      console.log(`savedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const savedEvents = await loadSavedEvents<RegistersEvents>({
      name: this.getInstanceName(),
      userDirectory: this.userDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`Updating events for ${this.netId} chain registry events\n`);
    console.log(`savedEvents count - ${savedEvents.events.length}`);
    console.log(`savedEvents lastBlock - ${savedEvents.lastBlock}\n`);

    return savedEvents;
  }

  async getEventsFromCache() {
    if (!this.cacheDirectory) {
      console.log(`cachedEvents count - ${0}`);
      console.log(`cachedEvents lastBlock - ${this.deployedBlock}\n`);

      return {
        events: [],
        lastBlock: this.deployedBlock,
      };
    }

    const cachedEvents = await loadCachedEvents<RegistersEvents>({
      name: this.getInstanceName(),
      cacheDirectory: this.cacheDirectory,
      deployedBlock: this.deployedBlock,
    });

    console.log(`cachedEvents count - ${cachedEvents.events.length}`);
    console.log(`cachedEvents lastBlock - ${cachedEvents.lastBlock}\n`);

    return cachedEvents;
  }

  async saveEvents({ events, lastBlock }: BaseEvents<RegistersEvents>) {
    const instanceName = this.getInstanceName();

    console.log('\ntotalEvents count - ', events.length);
    console.log(
      `totalEvents lastBlock - ${events[events.length - 1] ? events[events.length - 1].blockNumber : lastBlock}\n`,
    );

    const eventTable = new Table();

    eventTable.push(
      [{ colSpan: 2, content: 'Registered Relayers', hAlign: 'center' }],
      ['Network', `${this.netId} chain`],
      ['Events', `${events.length} events`],
      [{ colSpan: 2, content: 'Latest events' }],
      ...events
        .slice(events.length - 10)
        .reverse()
        .map(({ blockNumber }, index) => {
          const eventIndex = events.length - index;

          return [eventIndex, blockNumber];
        }),
    );

    console.log(eventTable.toString() + '\n');

    if (this.userDirectory) {
      await saveUserFile({
        fileName: instanceName + '.json',
        userDirectory: this.userDirectory,
        dataString: JSON.stringify(events, null, 2) + '\n',
      });
    }
  }
}
