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
  noteHex: string;
}

export interface parsedInvoiceExec extends DepositType {
  invoice: string;
  commitmentHex: string;
}

export function parseNote(noteString: string): parsedNoteExec | undefined {
  const noteRegex = /tornado-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<noteHex>[0-9a-fA-F]{124})/g;
  const match = noteRegex.exec(noteString);
  if (!match) {
    return;
  }

  const { currency, amount, netId, noteHex } = match.groups as unknown as parsedNoteExec;

  return {
    currency: currency.toLowerCase(),
    amount,
    netId: Number(netId),
    noteHex: '0x' + noteHex,
    note: noteString,
  };
}

export function parseInvoice(invoiceString: string): parsedInvoiceExec | undefined {
  const invoiceRegex =
    /tornadoInvoice-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<commitmentHex>[0-9a-fA-F]{64})/g;
  const match = invoiceRegex.exec(invoiceString);
  if (!match) {
    return;
  }

  const { currency, amount, netId, commitmentHex } = match.groups as unknown as parsedInvoiceExec;

  return {
    currency: currency.toLowerCase(),
    amount,
    netId: Number(netId),
    commitmentHex: '0x' + commitmentHex,
    invoice: invoiceString,
  };
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
    const parsedNote = parseNote(noteString);

    if (!parsedNote) {
      throw new Error('The note has invalid format');
    }

    const { currency, amount, netId, note, noteHex: parsedNoteHex } = parsedNote;

    const bytes = bnToBytes(parsedNoteHex);
    const nullifier = BigInt(leBuff2Int(bytes.slice(0, 31)).toString());
    const secret = BigInt(leBuff2Int(bytes.slice(31, 62)).toString());

    const { noteHex, commitmentHex, nullifierHex } = await createDeposit({ nullifier, secret });

    const invoice = `tornadoInvoice-${currency}-${amount}-${netId}-${commitmentHex}`;

    const newDeposit = new Deposit({
      currency,
      amount,
      netId,
      note,
      noteHex,
      invoice,
      nullifier,
      secret,
      commitmentHex,
      nullifierHex,
    });

    return newDeposit;
  }
}

export class Invoice {
  currency: string;
  amount: string;
  netId: NetIdType;
  commitmentHex: string;
  invoice: string;

  constructor(invoiceString: string) {
    const parsedInvoice = parseInvoice(invoiceString);

    if (!parsedInvoice) {
      throw new Error('The invoice has invalid format');
    }

    const { currency, amount, netId, invoice, commitmentHex } = parsedInvoice;

    this.currency = currency;
    this.amount = amount;
    this.netId = netId;

    this.commitmentHex = commitmentHex;
    this.invoice = invoice;
  }

  toString() {
    return JSON.stringify(
      {
        currency: this.currency,
        amount: this.amount,
        netId: this.netId,
        commitmentHex: this.commitmentHex,
        invoice: this.invoice,
      },
      null,
      2,
    );
  }
}
