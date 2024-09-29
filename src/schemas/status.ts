import { Config, NetId, NetIdType } from '../networkConfig';

export type statusInstanceType = {
  type: string;
  properties: {
    instanceAddress: {
      type: string;
      properties: {
        [key in string]: typeof addressType;
      };
      required: string[];
    };
    tokenAddress?: typeof addressType;
    symbol?: { enum: string[] };
    decimals: { enum: number[] };
  };
  required: string[];
};

export type statusInstancesType = {
  type: string;
  properties: {
    [key in string]: statusInstanceType;
  };
  required: string[];
};

export type statusEthPricesType = {
  type: string;
  properties: {
    [key in string]: typeof bnType;
  };
  required?: string[];
};

export type statusSchema = {
  type: string;
  properties: {
    rewardAccount: typeof addressType;
    instances?: statusInstancesType;
    gasPrices: {
      type: string;
      properties: {
        [key in string]: {
          type: string;
        };
      };
      required: string[];
    };
    netId: {
      type: string;
    };
    ethPrices?: statusEthPricesType;
    tornadoServiceFee?: {
      type: string;
      maximum: number;
      minimum: number;
    };
    latestBlock?: {
      type: string;
    };
    version: {
      type: string;
    };
    health: {
      type: string;
      properties: {
        status: { const: string };
        error: { type: string };
      };
      required: string[];
    };
    syncStatus: {
      type: string;
      properties: {
        events: { type: string };
        tokenPrice: { type: string };
        gasPrice: { type: string };
      };
      required: string[];
    };
    onSyncEvents: { type: string };
    currentQueue: {
      type: string;
    };
  };
  required: string[];
};

const addressType = { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' };

const bnType = { type: 'string', BN: true };

const statusSchema: statusSchema = {
  type: 'object',
  properties: {
    rewardAccount: addressType,
    gasPrices: {
      type: 'object',
      properties: {
        fast: { type: 'number' },
        additionalProperties: { type: 'number' },
      },
      required: ['fast'],
    },
    netId: { type: 'integer' },
    tornadoServiceFee: { type: 'number', maximum: 20, minimum: 0 },
    latestBlock: { type: 'number' },
    version: { type: 'string' },
    health: {
      type: 'object',
      properties: {
        status: { const: 'true' },
        error: { type: 'string' },
      },
      required: ['status'],
    },
    syncStatus: {
      type: 'object',
      properties: {
        events: { type: 'boolean' },
        tokenPrice: { type: 'boolean' },
        gasPrice: { type: 'boolean' },
      },
      required: ['events', 'tokenPrice', 'gasPrice'],
    },
    onSyncEvents: { type: 'boolean' },
    currentQueue: { type: 'number' },
  },
  required: ['rewardAccount', 'instances', 'netId', 'tornadoServiceFee', 'version', 'health', 'currentQueue'],
};

export function getStatusSchema(netId: NetIdType, config: Config, tovarish: boolean) {
  const { tokens, optionalTokens, disabledTokens, nativeCurrency } = config;

  // deep copy schema
  const schema = JSON.parse(JSON.stringify(statusSchema)) as statusSchema;

  const instances = Object.keys(tokens).reduce(
    (acc: statusInstancesType, token) => {
      const { instanceAddress, tokenAddress, symbol, decimals, optionalInstances = [] } = tokens[token];
      const amounts = Object.keys(instanceAddress);

      const instanceProperties: statusInstanceType = {
        type: 'object',
        properties: {
          instanceAddress: {
            type: 'object',
            properties: amounts.reduce((acc: { [key in string]: typeof addressType }, cur) => {
              acc[cur] = addressType;
              return acc;
            }, {}),
            required: amounts.filter((amount) => !optionalInstances.includes(amount)),
          },
          decimals: { enum: [decimals] },
        },
        required: ['instanceAddress', 'decimals'].concat(
          tokenAddress ? ['tokenAddress'] : [],
          symbol ? ['symbol'] : [],
        ),
      };

      if (tokenAddress) {
        instanceProperties.properties.tokenAddress = addressType;
      }
      if (symbol) {
        instanceProperties.properties.symbol = { enum: [symbol] };
      }

      acc.properties[token] = instanceProperties;
      if (!optionalTokens?.includes(token) && !disabledTokens?.includes(token)) {
        acc.required.push(token);
      }
      return acc;
    },
    {
      type: 'object',
      properties: {},
      required: [],
    },
  );

  schema.properties.instances = instances;

  const _tokens = Object.keys(tokens).filter(
    (t) => t !== nativeCurrency && !config.optionalTokens?.includes(t) && !config.disabledTokens?.includes(t),
  );

  if (netId === NetId.MAINNET) {
    _tokens.push('torn');
  }

  if (_tokens.length) {
    const ethPrices: statusEthPricesType = {
      type: 'object',
      properties: _tokens.reduce((acc: { [key in string]: typeof bnType }, token: string) => {
        acc[token] = bnType;
        return acc;
      }, {}),
      required: _tokens,
    };
    schema.properties.ethPrices = ethPrices;
    schema.required.push('ethPrices');
  }

  if (tovarish) {
    schema.required.push('gasPrices', 'latestBlock', 'syncStatus', 'onSyncEvents');
  }

  return schema;
}
