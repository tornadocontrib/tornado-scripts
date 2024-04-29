export type jobsSchema = {
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
};

export const jobsSchema: jobsSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    id: { type: 'string' },
    type: { type: 'string' },
    status: { type: 'string' },
    contract: { type: 'string' },
    proof: { type: 'string' },
    args: {
      type: 'array',
      items: { type: 'string' },
    },
    txHash: { type: 'string' },
    confirmations: { type: 'number' },
    failedReason: { type: 'string' },
  },
  required: ['id', 'status'],
};
