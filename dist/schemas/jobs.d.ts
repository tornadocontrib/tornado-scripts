export interface jobsSchema {
    type: string;
    properties: {
        error: {
            type: string;
        };
        id: {
            type: string;
        };
        type: {
            type: string;
        };
        status: {
            type: string;
        };
        contract: {
            type: string;
        };
        proof: {
            type: string;
        };
        args: {
            type: string;
            items: {
                type: string;
            };
        };
        txHash: {
            type: string;
        };
        confirmations: {
            type: string;
        };
        failedReason: {
            type: string;
        };
    };
    required: string[];
}
export declare const jobsSchema: jobsSchema;
export declare const jobRequestSchema: jobsSchema;
