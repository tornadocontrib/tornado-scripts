import { type ContractRunner } from "ethers";
import type { OffchainOracle, OffchainOracleInterface } from "../OffchainOracle";
export declare class OffchainOracle__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "contract MultiWrapper";
            readonly name: "_multiWrapper";
            readonly type: "address";
        }, {
            readonly internalType: "contract IOracle[]";
            readonly name: "existingOracles";
            readonly type: "address[]";
        }, {
            readonly internalType: "enum OffchainOracle.OracleType[]";
            readonly name: "oracleTypes";
            readonly type: "uint8[]";
        }, {
            readonly internalType: "contract IERC20[]";
            readonly name: "existingConnectors";
            readonly type: "address[]";
        }, {
            readonly internalType: "contract IERC20";
            readonly name: "wBase";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "owner";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly inputs: readonly [];
        readonly name: "ArraysLengthMismatch";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "ConnectorAlreadyAdded";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidOracleTokenKind";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "OracleAlreadyAdded";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "SameTokens";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "TooBigThreshold";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "UnknownConnector";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "UnknownOracle";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract IERC20";
            readonly name: "connector";
            readonly type: "address";
        }];
        readonly name: "ConnectorAdded";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract IERC20";
            readonly name: "connector";
            readonly type: "address";
        }];
        readonly name: "ConnectorRemoved";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract MultiWrapper";
            readonly name: "multiWrapper";
            readonly type: "address";
        }];
        readonly name: "MultiWrapperUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract IOracle";
            readonly name: "oracle";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "enum OffchainOracle.OracleType";
            readonly name: "oracleType";
            readonly type: "uint8";
        }];
        readonly name: "OracleAdded";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract IOracle";
            readonly name: "oracle";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "enum OffchainOracle.OracleType";
            readonly name: "oracleType";
            readonly type: "uint8";
        }];
        readonly name: "OracleRemoved";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "previousOwner";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "OwnershipTransferred";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "connector";
            readonly type: "address";
        }];
        readonly name: "addConnector";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IOracle";
            readonly name: "oracle";
            readonly type: "address";
        }, {
            readonly internalType: "enum OffchainOracle.OracleType";
            readonly name: "oracleKind";
            readonly type: "uint8";
        }];
        readonly name: "addOracle";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "connectors";
        readonly outputs: readonly [{
            readonly internalType: "contract IERC20[]";
            readonly name: "allConnectors";
            readonly type: "address[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "contract IERC20";
            readonly name: "dstToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useWrappers";
            readonly type: "bool";
        }];
        readonly name: "getRate";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useSrcWrappers";
            readonly type: "bool";
        }];
        readonly name: "getRateToEth";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useSrcWrappers";
            readonly type: "bool";
        }, {
            readonly internalType: "contract IERC20[]";
            readonly name: "customConnectors";
            readonly type: "address[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "thresholdFilter";
            readonly type: "uint256";
        }];
        readonly name: "getRateToEthWithCustomConnectors";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useSrcWrappers";
            readonly type: "bool";
        }, {
            readonly internalType: "uint256";
            readonly name: "thresholdFilter";
            readonly type: "uint256";
        }];
        readonly name: "getRateToEthWithThreshold";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "contract IERC20";
            readonly name: "dstToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useWrappers";
            readonly type: "bool";
        }, {
            readonly internalType: "contract IERC20[]";
            readonly name: "customConnectors";
            readonly type: "address[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "thresholdFilter";
            readonly type: "uint256";
        }];
        readonly name: "getRateWithCustomConnectors";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "srcToken";
            readonly type: "address";
        }, {
            readonly internalType: "contract IERC20";
            readonly name: "dstToken";
            readonly type: "address";
        }, {
            readonly internalType: "bool";
            readonly name: "useWrappers";
            readonly type: "bool";
        }, {
            readonly internalType: "uint256";
            readonly name: "thresholdFilter";
            readonly type: "uint256";
        }];
        readonly name: "getRateWithThreshold";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "weightedRate";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "multiWrapper";
        readonly outputs: readonly [{
            readonly internalType: "contract MultiWrapper";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "oracles";
        readonly outputs: readonly [{
            readonly internalType: "contract IOracle[]";
            readonly name: "allOracles";
            readonly type: "address[]";
        }, {
            readonly internalType: "enum OffchainOracle.OracleType[]";
            readonly name: "oracleTypes";
            readonly type: "uint8[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "owner";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "connector";
            readonly type: "address";
        }];
        readonly name: "removeConnector";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract IOracle";
            readonly name: "oracle";
            readonly type: "address";
        }, {
            readonly internalType: "enum OffchainOracle.OracleType";
            readonly name: "oracleKind";
            readonly type: "uint8";
        }];
        readonly name: "removeOracle";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "renounceOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "contract MultiWrapper";
            readonly name: "_multiWrapper";
            readonly type: "address";
        }];
        readonly name: "setMultiWrapper";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "transferOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): OffchainOracleInterface;
    static connect(address: string, runner?: ContractRunner | null): OffchainOracle;
}
