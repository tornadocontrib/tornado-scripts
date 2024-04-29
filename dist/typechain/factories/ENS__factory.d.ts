import { type ContractRunner } from "ethers";
import type { ENS, ENSInterface } from "../ENS";
export declare class ENS__factory {
    static readonly abi: readonly [{
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "interfaceID";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly payable: false;
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "string";
            readonly name: "key";
            readonly type: "string";
        }, {
            readonly internalType: "string";
            readonly name: "value";
            readonly type: "string";
        }];
        readonly name: "setText";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes4";
            readonly name: "interfaceID";
            readonly type: "bytes4";
        }];
        readonly name: "interfaceImplementer";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "contentTypes";
            readonly type: "uint256";
        }];
        readonly name: "ABI";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "x";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "y";
            readonly type: "bytes32";
        }];
        readonly name: "setPubkey";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes";
            readonly name: "hash";
            readonly type: "bytes";
        }];
        readonly name: "setContenthash";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }];
        readonly name: "addr";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "target";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "isAuthorised";
            readonly type: "bool";
        }];
        readonly name: "setAuthorisation";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "string";
            readonly name: "key";
            readonly type: "string";
        }];
        readonly name: "text";
        readonly outputs: readonly [{
            readonly internalType: "string";
            readonly name: "";
            readonly type: "string";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "contentType";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "setABI";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }];
        readonly name: "name";
        readonly outputs: readonly [{
            readonly internalType: "string";
            readonly name: "";
            readonly type: "string";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "string";
            readonly name: "name";
            readonly type: "string";
        }];
        readonly name: "setName";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "coinType";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "a";
            readonly type: "bytes";
        }];
        readonly name: "setAddr";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }];
        readonly name: "contenthash";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }];
        readonly name: "pubkey";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "x";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "y";
            readonly type: "bytes32";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "setAddr";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes4";
            readonly name: "interfaceID";
            readonly type: "bytes4";
        }, {
            readonly internalType: "address";
            readonly name: "implementer";
            readonly type: "address";
        }];
        readonly name: "setInterface";
        readonly outputs: readonly [];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "coinType";
            readonly type: "uint256";
        }];
        readonly name: "addr";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "authorisations";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly payable: false;
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract ENS";
            readonly name: "_ens";
            readonly type: "address";
        }];
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "target";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "isAuthorised";
            readonly type: "bool";
        }];
        readonly name: "AuthorisationChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "string";
            readonly name: "indexedKey";
            readonly type: "string";
        }, {
            readonly indexed: false;
            readonly internalType: "string";
            readonly name: "key";
            readonly type: "string";
        }];
        readonly name: "TextChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "x";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "y";
            readonly type: "bytes32";
        }];
        readonly name: "PubkeyChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "string";
            readonly name: "name";
            readonly type: "string";
        }];
        readonly name: "NameChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes4";
            readonly name: "interfaceID";
            readonly type: "bytes4";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "implementer";
            readonly type: "address";
        }];
        readonly name: "InterfaceChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "hash";
            readonly type: "bytes";
        }];
        readonly name: "ContenthashChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "AddrChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "coinType";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "newAddress";
            readonly type: "bytes";
        }];
        readonly name: "AddressChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "node";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "uint256";
            readonly name: "contentType";
            readonly type: "uint256";
        }];
        readonly name: "ABIChanged";
        readonly type: "event";
    }];
    static createInterface(): ENSInterface;
    static connect(address: string, runner?: ContractRunner | null): ENS;
}
