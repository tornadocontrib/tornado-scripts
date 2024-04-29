/**
 * Create tree cache file from node.js
 *
 * Only works for node.js, modified from https://github.com/tornadocash/tornado-classic-ui/blob/master/scripts/updateTree.js
 */
import { MerkleTree } from '@tornado/fixed-merkle-tree';
import BloomFilter from 'bloomfilter.js';
import { saveUserFile } from './data';
import { DepositsEvents } from './events';
import type { NetIdType } from './networkConfig';

export interface TreeCacheConstructor {
  netId: NetIdType;
  amount: string;
  currency: string;
  userDirectory: string;
  PARTS_COUNT?: number;
  LEAVES?: number;
  zeroElement?: string;
}

export interface treeMetadata {
  blockNumber: number;
  logIndex: number;
  transactionHash: string;
  timestamp: number;
  from: string;
  leafIndex: number;
}

export class TreeCache {
  netId: NetIdType;
  amount: string;
  currency: string;
  userDirectory: string;

  PARTS_COUNT: number;

  constructor({ netId, amount, currency, userDirectory, PARTS_COUNT = 4 }: TreeCacheConstructor) {
    this.netId = netId;
    this.amount = amount;
    this.currency = currency;
    this.userDirectory = userDirectory;

    this.PARTS_COUNT = PARTS_COUNT;
  }

  getInstanceName(): string {
    return `deposits_${this.netId}_${this.currency}_${this.amount}`;
  }

  async createTree(events: DepositsEvents[], tree: MerkleTree) {
    const bloom = new BloomFilter(events.length);

    console.log(`Creating cached tree for ${this.getInstanceName()}\n`);

    // events indexed by commitment
    const eventsData = events.reduce(
      (acc, { leafIndex, commitment, ...rest }, i) => {
        if (leafIndex !== i) {
          throw new Error(`leafIndex (${leafIndex}) !== i (${i})`);
        }

        acc[commitment] = { ...rest, leafIndex };

        return acc;
      },
      {} as { [key in string]: treeMetadata },
    );

    const slices = tree.getTreeSlices(this.PARTS_COUNT);

    await Promise.all(
      slices.map(async (slice, index) => {
        const metadata = slice.elements.reduce((acc, curr) => {
          if (index < this.PARTS_COUNT - 1) {
            bloom.add(curr);
          }
          acc.push(eventsData[curr]);
          return acc;
        }, [] as treeMetadata[]);

        const dataString =
          JSON.stringify(
            {
              ...slice,
              metadata,
            },
            null,
            2,
          ) + '\n';

        const fileName = `${this.getInstanceName()}_slice${index + 1}.json`;

        await saveUserFile({
          fileName,
          userDirectory: this.userDirectory,
          dataString,
        });
      }),
    );

    const dataString = bloom.serialize() + '\n';

    const fileName = `${this.getInstanceName()}_bloom.json`;

    await saveUserFile({
      fileName,
      userDirectory: this.userDirectory,
      dataString,
    });
  }
}
