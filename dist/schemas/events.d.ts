export declare const governanceEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly anyOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly id: {
                    readonly type: "number";
                };
                readonly proposer: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly target: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly startTime: {
                    readonly type: "number";
                };
                readonly endTime: {
                    readonly type: "number";
                };
                readonly description: {
                    readonly type: "string";
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "id", "proposer", "target", "startTime", "endTime", "description"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly proposalId: {
                    readonly type: "number";
                };
                readonly voter: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly support: {
                    readonly type: "boolean";
                };
                readonly votes: {
                    readonly type: "string";
                };
                readonly from: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly input: {
                    readonly type: "string";
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "proposalId", "voter", "support", "votes", "from", "input"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly account: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly delegateTo: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "account", "delegateTo"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly account: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly delegateFrom: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "account", "delegateFrom"];
            readonly additionalProperties: false;
        }];
    };
};
export declare const relayerRegistryEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly anyOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly ensName: {
                    readonly type: "string";
                };
                readonly relayerAddress: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly ensHash: {
                    readonly type: "string";
                };
                readonly stakedAmount: {
                    readonly type: "string";
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "ensName", "relayerAddress", "ensHash", "stakedAmount"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly relayerAddress: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "relayerAddress"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly relayerAddress: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly workerAddress: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "relayerAddress", "workerAddress"];
            readonly additionalProperties: false;
        }];
    };
};
export declare const stakeBurnedEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly relayerAddress: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{40}$";
                readonly isAddress: true;
            };
            readonly amountBurned: {
                readonly type: "string";
                readonly BN: true;
            };
            readonly instanceAddress: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{40}$";
                readonly isAddress: true;
            };
            readonly gasFee: {
                readonly type: "string";
                readonly BN: true;
            };
            readonly relayerFee: {
                readonly type: "string";
                readonly BN: true;
            };
            readonly timestamp: {
                readonly type: "number";
            };
            readonly blockNumber: {
                readonly type: "number";
            };
            readonly logIndex: {
                readonly type: "number";
            };
            readonly transactionHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
        };
        readonly required: readonly [...string[], "relayerAddress", "amountBurned", "instanceAddress", "gasFee", "relayerFee", "timestamp"];
        readonly additionalProperties: false;
    };
};
export declare const depositsEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly commitment: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
            readonly leafIndex: {
                readonly type: "number";
            };
            readonly timestamp: {
                readonly type: "number";
            };
            readonly from: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{40}$";
                readonly isAddress: true;
            };
            readonly blockNumber: {
                readonly type: "number";
            };
            readonly logIndex: {
                readonly type: "number";
            };
            readonly transactionHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
        };
        readonly required: readonly [...string[], "commitment", "leafIndex", "timestamp", "from"];
        readonly additionalProperties: false;
    };
};
export declare const withdrawalsEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly nullifierHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
            readonly to: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{40}$";
                readonly isAddress: true;
            };
            readonly fee: {
                readonly type: "string";
                readonly BN: true;
            };
            readonly timestamp: {
                readonly type: "number";
            };
            readonly blockNumber: {
                readonly type: "number";
            };
            readonly logIndex: {
                readonly type: "number";
            };
            readonly transactionHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
        };
        readonly required: readonly [...string[], "nullifierHash", "to", "fee", "timestamp"];
        readonly additionalProperties: false;
    };
};
export declare const tornadoEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly anyOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly instanceAddress: {
                    readonly type: "string";
                };
                readonly commitment: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
                readonly leafIndex: {
                    readonly type: "number";
                };
                readonly timestamp: {
                    readonly type: "number";
                };
                readonly from: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "instanceAddress", "commitment", "leafIndex", "timestamp", "from"];
            readonly additionalProperties: false;
        }, {
            readonly type: "object";
            readonly properties: {
                readonly event: {
                    readonly type: "string";
                };
                readonly instanceAddress: {
                    readonly type: "string";
                };
                readonly nullifierHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
                readonly to: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly relayerAddress: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{40}$";
                    readonly isAddress: true;
                };
                readonly fee: {
                    readonly type: "string";
                    readonly BN: true;
                };
                readonly timestamp: {
                    readonly type: "number";
                };
                readonly blockNumber: {
                    readonly type: "number";
                };
                readonly logIndex: {
                    readonly type: "number";
                };
                readonly transactionHash: {
                    readonly type: "string";
                    readonly pattern: "^0x[a-fA-F0-9]{64}$";
                };
            };
            readonly required: readonly [...string[], "event", "instanceAddress", "nullifierHash", "to", "relayerAddress", "fee", "timestamp"];
            readonly additionalProperties: false;
        }];
    };
};
export declare const echoEventsSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly address: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{40}$";
                readonly isAddress: true;
            };
            readonly encryptedAccount: {
                readonly type: "string";
            };
            readonly blockNumber: {
                readonly type: "number";
            };
            readonly logIndex: {
                readonly type: "number";
            };
            readonly transactionHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
        };
        readonly required: readonly [...string[], "address", "encryptedAccount"];
        readonly additionalProperties: false;
    };
};
export declare const encryptedNotesSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly encryptedNote: {
                readonly type: "string";
            };
            readonly blockNumber: {
                readonly type: "number";
            };
            readonly logIndex: {
                readonly type: "number";
            };
            readonly transactionHash: {
                readonly type: "string";
                readonly pattern: "^0x[a-fA-F0-9]{64}$";
            };
        };
        readonly required: readonly [...string[], "encryptedNote"];
        readonly additionalProperties: false;
    };
};
export declare function getEventsSchemaValidator(type: string): import("ajv").ValidateFunction<unknown>;
