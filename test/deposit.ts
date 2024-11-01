import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { formatEther } from 'ethers';

import { ETHTornado__factory, Verifier__factory } from '@tornado/contracts';
import { Deposit, deployHasher } from '../src';

const { getSigners } = ethers;

const NOTES_COUNT = 100;

describe('./src/deposit.ts', function () {
    const instanceFixture = async () => {
        const [owner] = await getSigners();

        const Hasher = (await (await deployHasher(owner)).wait())?.contractAddress as string;

        const Verifier = await new Verifier__factory(owner).deploy();

        const Instance = await new ETHTornado__factory(owner).deploy(Verifier.target, Hasher, 1n, 20);

        return { Instance };
    };

    it('Deposit New Note', async function () {
        const { Instance } = await loadFixture(instanceFixture);

        const [owner] = await getSigners();

        const netId = Number((await owner.provider.getNetwork()).chainId);

        const deposit = await Deposit.createNote({
            currency: 'eth',
            amount: formatEther(1),
            netId,
        });

        const resp = await Instance.deposit(deposit.commitmentHex, {
            value: 1n,
        });

        await expect(resp).to.emit(Instance, 'Deposit').withArgs(deposit.commitmentHex, 0, anyValue);

        expect(await Instance.commitments(deposit.commitmentHex)).to.be.true;
    });

    xit(`Creating ${NOTES_COUNT} random notes`, async function () {
        const notes = (await Promise.all(
            // eslint-disable-next-line prefer-spread
            Array.apply(null, Array(NOTES_COUNT)).map(() =>
                Deposit.createNote({
                    currency: 'eth',
                    amount: '0.1',
                    netId: 31337,
                }),
            ),
        )) as Deposit[];

        notes.forEach(({ noteHex, commitmentHex, nullifierHex }) => {
            // ((secret.length: 31) + (nullifier.length: 31)) * 2 + (prefix: 2) = 126
            expect(noteHex.length === 126).to.be.true;
            expect(commitmentHex.length === 66).to.be.true;
            expect(nullifierHex.length === 66).to.be.true;
        });
    });
});
