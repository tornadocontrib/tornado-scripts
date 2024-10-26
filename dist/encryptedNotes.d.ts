import { EthEncryptedData } from '@metamask/eth-sig-util';
import { Signer, Wallet } from 'ethers';
import { EchoEvents, EncryptedNotesEvents } from './events';
import type { NetIdType } from './networkConfig';
export interface NoteToEncrypt {
    address: string;
    noteHex: string;
}
export interface DecryptedNotes {
    blockNumber: number;
    address: string;
    noteHex: string;
}
export declare function packEncryptedMessage({ nonce, ephemPublicKey, ciphertext }: EthEncryptedData): string;
export declare function unpackEncryptedMessage(encryptedMessage: string): EthEncryptedData & {
    messageBuff: string;
};
export interface NoteAccountConstructor {
    netId: NetIdType;
    blockNumber?: number;
    recoveryKey?: string;
}
export declare class NoteAccount {
    netId: NetIdType;
    blockNumber?: number;
    recoveryKey: string;
    recoveryAddress: string;
    recoveryPublicKey: string;
    constructor({ netId, blockNumber, recoveryKey }: NoteAccountConstructor);
    /**
     * Intends to mock eth_getEncryptionPublicKey behavior from MetaMask
     * In order to make the recoveryKey retrival from Echoer possible from the bare private key
     */
    static getSignerPublicKey(signer: Signer | Wallet): Promise<string>;
    getEncryptedAccount(walletPublicKey: string): {
        encryptedData: EthEncryptedData;
        data: string;
    };
    /**
     * Decrypt Echoer backuped note encryption account with private keys
     */
    decryptSignerNoteAccounts(signer: Signer | Wallet, events: EchoEvents[]): Promise<NoteAccount[]>;
    decryptNotes(events: EncryptedNotesEvents[]): DecryptedNotes[];
    encryptNote({ address, noteHex }: NoteToEncrypt): string;
}
