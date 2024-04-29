import { EthEncryptedData } from '@metamask/eth-sig-util';
import { Echoer } from '@tornado/contracts';
import { Wallet } from 'ethers';
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
    Echoer: Echoer;
}
export declare class NoteAccount {
    netId: NetIdType;
    blockNumber?: number;
    recoveryKey: string;
    recoveryAddress: string;
    recoveryPublicKey: string;
    Echoer: Echoer;
    constructor({ netId, blockNumber, recoveryKey, Echoer }: NoteAccountConstructor);
    /**
     * Intends to mock eth_getEncryptionPublicKey behavior from MetaMask
     * In order to make the recoveryKey retrival from Echoer possible from the bare private key
     */
    static getWalletPublicKey(wallet: Wallet): string;
    getEncryptedAccount(walletPublicKey: string): {
        encryptedData: EthEncryptedData;
        data: string;
    };
    /**
     * Decrypt Echoer backuped note encryption account with private keys
     */
    decryptAccountsWithWallet(wallet: Wallet, events: EchoEvents[]): NoteAccount[];
    decryptNotes(events: EncryptedNotesEvents[]): DecryptedNotes[];
    encryptNote({ address, noteHex }: NoteToEncrypt): string;
}
