import { bnToBytes, bytesToBN, leBuff2Int, leInt2Buff, rBigInt, toFixedHex } from './utils';
import { buffPedersenHash } from './pedersen';
import type { NetIdType } from './networkConfig';

export interface DepositType {
  currency: string;
  amount: string;
  netId: NetIdType;
}

export interface createDepositParams {
  nullifier: bigint;
  secret: bigint;
}

export interface createDepositObject {
  preimage: Uint8Array;
  noteHex: string;
  commitment: bigint;
  commitmentHex: string;
  nullifierHash: bigint;
  nullifierHex: string;
}

export interface createNoteParams extends DepositType {
  nullifier?: bigint;
  secret?: bigint;
}

export interface parsedNoteExec extends DepositType {
  note: string;
}

export async function createDeposit({ nullifier, secret }: createDepositParams): Promise<createDepositObject> {
  const preimage = new Uint8Array([...leInt2Buff(nullifier), ...leInt2Buff(secret)]);
  const noteHex = toFixedHex(bytesToBN(preimage), 62);
  const commitment = BigInt(await buffPedersenHash(preimage));
  const commitmentHex = toFixedHex(commitment);
  const nullifierHash = BigInt(await buffPedersenHash(leInt2Buff(nullifier)));
  const nullifierHex = toFixedHex(nullifierHash);

  return {
    preimage,
    noteHex,
    commitment,
    commitmentHex,
    nullifierHash,
    nullifierHex,
  };
}

export interface DepositConstructor {
  currency: string;
  amount: string;
  netId: NetIdType;
  nullifier: bigint;
  secret: bigint;
  note: string;
  noteHex: string;
  invoice: string;
  commitmentHex: string;
  nullifierHex: string;
}

export class Deposit {
  currency: string;
  amount: string;
  netId: NetIdType;

  nullifier: bigint;
  secret: bigint;

  note: string;
  noteHex: string;
  invoice: string;

  commitmentHex: string;
  nullifierHex: string;

  constructor({
    currency,
    amount,
    netId,
    nullifier,
    secret,
    note,
    noteHex,
    invoice,
    commitmentHex,
    nullifierHex,
  }: DepositConstructor) {
    this.currency = currency;
    this.amount = amount;
    this.netId = netId;

    this.nullifier = nullifier;
    this.secret = secret;

    this.note = note;
    this.noteHex = noteHex;
    this.invoice = invoice;

    this.commitmentHex = commitmentHex;
    this.nullifierHex = nullifierHex;
  }

  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        nullifier: this.nullifier,
        secret: this.secret,
        note: this.note,
        noteHex: this.noteHex,
        invoice: this.invoice,
        commitmentHex: this.commitmentHex,
        nullifierHex: this.nullifierHex,
      },
      null,
      2,
    );
  }

  static async createNote({ currency, amount, netId, nullifier, secret }: createNoteParams): Promise<Deposit> {
    if (!nullifier) {
      nullifier = rBigInt(31);
    }
    if (!secret) {
      secret = rBigInt(31);
    }

    const depositObject = await createDeposit({
      nullifier,
      secret,
    });

    const newDeposit = new Deposit({
      currency: currency.toLowerCase(),
      amount: amount,
      netId,
      note: `tornado-${currency.toLowerCase()}-${amount}-${netId}-${depositObject.noteHex}`,
      noteHex: depositObject.noteHex,
      invoice: `tornadoInvoice-${currency.toLowerCase()}-${amount}-${netId}-${depositObject.commitmentHex}`,
      nullifier: nullifier,
      secret: secret,
      commitmentHex: depositObject.commitmentHex,
      nullifierHex: depositObject.nullifierHex,
    });

    return newDeposit;
  }

  static async parseNote(noteString: string): Promise<Deposit> {
    const noteRegex = /tornado-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
    const match = noteRegex.exec(noteString);
    if (!match) {
      throw new Error('The note has invalid format');
    }
    const matchGroup = match?.groups as unknown as parsedNoteExec;

    const currency = matchGroup.currency.toLowerCase();
    const amount = matchGroup.amount;
    const netId = Number(matchGroup.netId);

    const bytes = bnToBytes('0x' + matchGroup.note);
    const nullifier = BigInt(leBuff2Int(bytes.slice(0, 31)).toString());
    const secret = BigInt(leBuff2Int(bytes.slice(31, 62)).toString());

    const depositObject = await createDeposit({ nullifier, secret });

    const invoice = `tornadoInvoice-${currency}-${amount}-${netId}-${depositObject.commitmentHex}`;

    const newDeposit = new Deposit({
      currency,
      amount,
      netId,
      note: noteString,
      noteHex: depositObject.noteHex,
      invoice,
      nullifier,
      secret,
      commitmentHex: depositObject.commitmentHex,
      nullifierHex: depositObject.nullifierHex,
    });

    return newDeposit;
  }
}

export interface parsedInvoiceExec extends DepositType {
  commitment: string;
}

export class Invoice {
  currency: string;
  amount: string;
  netId: NetIdType;
  commitment: string;
  invoice: string;

  constructor(invoiceString: string) {
    const invoiceRegex =
      /tornadoInvoice-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<commitment>[0-9a-fA-F]{64})/g;
    const match = invoiceRegex.exec(invoiceString);
    if (!match) {
      throw new Error('The note has invalid format');
    }
    const matchGroup = match?.groups as unknown as parsedInvoiceExec;

    const currency = matchGroup.currency.toLowerCase();
    const amount = matchGroup.amount;
    const netId = Number(matchGroup.netId);

    this.currency = currency;
    this.amount = amount;
    this.netId = netId;

    this.commitment = '0x' + matchGroup.commitment;
    this.invoice = invoiceString;
  }

  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        commitment: this.commitment,
        invoice: this.invoice,
      },
      null,
      2,
    );
  }
}
