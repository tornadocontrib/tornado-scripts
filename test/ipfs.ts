import { expect } from 'chai';
import { toContentHash, fromContentHash } from '../src';

// https://etherscan.io/tx/0x6600d21cb35ab035a3d2137f9aa888f03a886890f5e8a473f836bf97c514630b

const IPFS_URL = 'bafybeiguio2xvl2h47zh2jfh3oa6inattoqcyjyhmryydkpnlty3mmqxs4';

const CONTENT_HASH = 'e30101701220d443b57aaf47e7f27d24a7db81e434139ba02c2707647181a9ed5cf1b6321797';

describe('ipfs', function () {
    it('contentHash', function () {
        expect(toContentHash(IPFS_URL)).to.equal(CONTENT_HASH);

        expect(fromContentHash(CONTENT_HASH)).to.equal(IPFS_URL);
    });
});
