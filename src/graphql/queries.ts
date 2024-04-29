export const GET_STATISTIC = `
  query getStatistic($currency: String!, $amount: String!, $first: Int, $orderBy: BigInt, $orderDirection: String) {
    deposits(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: { currency: $currency, amount: $amount }) {
      index
      timestamp
      blockNumber
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const _META = `
  query getMeta {
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_REGISTERED = `
  query getRegistered($first: Int, $fromBlock: Int) {
      relayers(first: $first, orderBy: blockRegistration, orderDirection: asc, where: {
        blockRegistration_gte: $fromBlock
      }) {
        id
        address
        ensName
        blockRegistration
      }
      _meta {
        block {
          number
        }
        hasIndexingErrors
      }
  }
`;

export const GET_DEPOSITS = `
  query getDeposits($currency: String!, $amount: String!, $first: Int, $fromBlock: Int) {
    deposits(first: $first, orderBy: index, orderDirection: asc, where: { 
      amount: $amount,
      currency: $currency,
      blockNumber_gte: $fromBlock
    }) {
      id
      blockNumber
      commitment
      index
      timestamp
      from
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_WITHDRAWALS = `
  query getWithdrawals($currency: String!, $amount: String!, $first: Int, $fromBlock: Int!) {
    withdrawals(first: $first, orderBy: blockNumber, orderDirection: asc, where: { 
      currency: $currency,
      amount: $amount,
      blockNumber_gte: $fromBlock
    }) {
      id
      blockNumber
      nullifier
      to
      fee
      timestamp
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_NOTE_ACCOUNTS = `
  query getNoteAccount($address: String!) {
    noteAccounts(where: { address: $address }) {
      id
      index
      address
      encryptedAccount
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_ECHO_EVENTS = `
  query getNoteAccounts($first: Int, $fromBlock: Int) {
    noteAccounts(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      id
      blockNumber
      address
      encryptedAccount
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_ENCRYPTED_NOTES = `
  query getEncryptedNotes($first: Int, $fromBlock: Int) {
    encryptedNotes(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      index
      transactionHash
      encryptedNote
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_GOVERNANCE_EVENTS = `
  query getGovernanceEvents($first: Int, $fromBlock: Int) {
    proposals(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      proposalId
      proposer
      target
      startTime
      endTime
      description
    }
    votes(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      proposalId
      voter
      support
      votes
      from
      input
    }
    delegates(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      account
      delegateTo
    }
    undelegates(first: $first, orderBy: blockNumber, orderDirection: asc, where: { blockNumber_gte: $fromBlock }) {
      blockNumber
      logIndex
      transactionHash
      account
      delegateFrom
    }
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

export const GET_GOVERNANCE_APY = `
  stakeDailyBurns(first: 30, orderBy: date, orderDirection: desc) {
    id
    date
    dailyAmountBurned
  }
`;
