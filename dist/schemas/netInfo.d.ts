export declare const netInfoSchemaV0: {
    type: string;
    properties: {
        chainId: {
            type: string;
        };
        name: {
            type: string;
        };
        symbol: {
            type: string;
        };
        decimals: {
            type: string;
        };
        nativeCurrency: {
            type: string;
        };
        explorer: {
            type: string;
        };
        homepage: {
            type: string;
        };
        blockTime: {
            type: string;
        };
        deployedBlock: {
            type: string;
        };
        merkleTreeHeight: {
            type: string;
        };
        emptyElement: {
            type: string;
        };
        stablecoin: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        multicallContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        routerContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        echoContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        offchainOracleContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        tornContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        governanceContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        stakingRewardsContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        registryContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        aggregatorContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        balanceAggregatorContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        reverseRecordsContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        ovmGasPriceOracleContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
            readonly isAddress: true;
        };
        tornadoSubgraph: {
            type: string;
        };
        registrySubgraph: {
            type: string;
        };
        governanceSubgraph: {
            type: string;
        };
        relayerEnsSubdomain: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: boolean;
};
export declare function getNetInfoSchema(revision?: number): import("ajv").ValidateFunction<{
    [x: string]: {};
}>;
