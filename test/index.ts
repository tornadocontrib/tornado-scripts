import { describe } from 'mocha';
import { ethers } from 'hardhat';

describe('Tornado Core', function () {
    it('Get Provider', async function () {
        const [owner] = await ethers.getSigners();

        console.log(owner);

        const { provider } = owner;

        console.log(await provider.getBlock('latest'));
    });
});
