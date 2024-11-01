import { Provider, ZeroAddress } from 'ethers';
import { ERC20__factory, Multicall } from './typechain';
import { chunk } from './utils';
import { Call3, multicall } from './multicall';

export interface tokenBalances {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: bigint;
}

export async function getTokenBalances({
    provider,
    Multicall,
    currencyName,
    userAddress,
    tokenAddresses = [],
}: {
    provider: Provider;
    Multicall: Multicall;
    currencyName: string;
    userAddress: string;
    tokenAddresses: string[];
}): Promise<tokenBalances[]> {
    const tokenCalls = tokenAddresses
        .map((tokenAddress) => {
            const Token = ERC20__factory.connect(tokenAddress, provider);

            return [
                {
                    contract: Token,
                    name: 'balanceOf',
                    params: [userAddress],
                },
                {
                    contract: Token,
                    name: 'name',
                },
                {
                    contract: Token,
                    name: 'symbol',
                },
                {
                    contract: Token,
                    name: 'decimals',
                },
            ];
        })
        .flat() as Call3[];

    const multicallResults = await multicall(Multicall, [
        {
            contract: Multicall,
            name: 'getEthBalance',
            params: [userAddress],
        },
        ...(tokenCalls.length ? tokenCalls : []),
    ]);

    const ethResults = multicallResults[0];
    const tokenResults = multicallResults.slice(1).length
        ? chunk(multicallResults.slice(1), tokenCalls.length / tokenAddresses.length)
        : [];

    const tokenBalances = tokenResults.map((tokenResult, index) => {
        const [tokenBalance, tokenName, tokenSymbol, tokenDecimals] = tokenResult;
        const tokenAddress = tokenAddresses[index];

        return {
            address: tokenAddress,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: Number(tokenDecimals),
            balance: tokenBalance,
        };
    });

    return [
        {
            address: ZeroAddress,
            name: currencyName,
            symbol: currencyName,
            decimals: 18,
            balance: ethResults,
        },
        ...tokenBalances,
    ];
}
