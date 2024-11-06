import fetchMock from 'fetch-mock';
import { FetchRequest } from 'ethers';
import { expect } from 'chai';

import { getProvider } from '../src';

(globalThis as unknown as { useGlobalFetch?: boolean }).useGlobalFetch = true;

const ETHERS_DEFAULT_TIMEOUT = new FetchRequest('').timeout;

describe('provider', function () {
    it('getProvider', async function () {
        // https://ethereum.github.io/execution-apis/api-documentation/
        fetchMock.mockGlobal();
        fetchMock.postOnce(
            'http://localhost:8545/',
            {
                jsonrpc: '2.0',
                result: '0x1',
                id: 0,
            },
            {
                delay: 1000,
            },
        );

        const provider = await getProvider('http://localhost:8545', {
            netId: 1,
        });

        expect((await provider.getNetwork()).chainId).to.be.equal(1n);

        expect(provider._getConnection().timeout).to.be.equal(ETHERS_DEFAULT_TIMEOUT);

        fetchMock.unmockGlobal();
    });

    it('timeout', async function () {
        // https://ethereum.github.io/execution-apis/api-documentation/
        fetchMock.mockGlobal();
        fetchMock.postOnce(
            'http://localhost:8545/',
            {
                jsonrpc: '2.0',
                result: '0x1',
                id: 0,
            },
            {
                delay: 1000,
            },
        );

        try {
            await getProvider('http://localhost:8545', {
                netId: 1,
                timeout: 100,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            expect(err.message.includes('The operation was aborted')).to.be.true;
        }
    });
});
