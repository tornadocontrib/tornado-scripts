import { BabyJub, PedersenHash, Point, buildPedersenHash } from 'circomlibjs';

export class Pedersen {
  pedersenHash?: PedersenHash;
  babyJub?: BabyJub;
  pedersenPromise: Promise<void>;

  constructor() {
    this.pedersenPromise = this.initPedersen();
  }

  async initPedersen() {
    this.pedersenHash = await buildPedersenHash();
    this.babyJub = this.pedersenHash.babyJub;
  }

  async unpackPoint(buffer: Uint8Array) {
    await this.pedersenPromise;
    return this.babyJub?.unpackPoint(this.pedersenHash?.hash(buffer) as Uint8Array);
  }

  toStringBuffer(buffer: Uint8Array): string {
    return this.babyJub?.F.toString(buffer);
  }
}

export const pedersen = new Pedersen();

export async function buffPedersenHash(buffer: Uint8Array): Promise<string> {
  const [hash] = (await pedersen.unpackPoint(buffer)) as Point;
  return pedersen.toStringBuffer(hash);
}
