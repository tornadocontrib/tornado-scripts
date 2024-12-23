'use strict';

var workerThreads = require('worker_threads');
var ffjavascript = require('ffjavascript');

var lib = {};

var FixedMerkleTree = {};

var simpleHash = {};

var hasRequiredSimpleHash;

function requireSimpleHash () {
	if (hasRequiredSimpleHash) return simpleHash;
	hasRequiredSimpleHash = 1;
	Object.defineProperty(simpleHash, "__esModule", { value: true });
	simpleHash.simpleHash = void 0;
	/***
	 * This is insecure hash function, just for example only
	 * @param data
	 * @param seed
	 * @param hashLength
	 */
	function simpleHash$1(data, seed, hashLength = 40) {
	    const str = data.join('');
	    let i, l, hval = seed !== null && seed !== void 0 ? seed : 0x811c9dcc5;
	    for (i = 0, l = str.length; i < l; i++) {
	        hval ^= str.charCodeAt(i);
	        hval += (hval << 1) + (hval << 4) + (hval << 6) + (hval << 8) + (hval << 24);
	    }
	    const hash = (hval >>> 0).toString(16);
	    return BigInt('0x' + hash.padEnd(hashLength - (hash.length - 1), '0')).toString(10);
	}
	simpleHash.simpleHash = simpleHash$1;
	simpleHash.default = (left, right) => simpleHash$1([left, right]);
	return simpleHash;
}

var BaseTree = {};

var hasRequiredBaseTree;

function requireBaseTree () {
	if (hasRequiredBaseTree) return BaseTree;
	hasRequiredBaseTree = 1;
	Object.defineProperty(BaseTree, "__esModule", { value: true });
	BaseTree.BaseTree = void 0;
	let BaseTree$1 = class BaseTree {
	    get capacity() {
	        return 2 ** this.levels;
	    }
	    get layers() {
	        return this._layers.slice();
	    }
	    get zeros() {
	        return this._zeros.slice();
	    }
	    get elements() {
	        return this._layers[0].slice();
	    }
	    get root() {
	        var _a;
	        return (_a = this._layers[this.levels][0]) !== null && _a !== void 0 ? _a : this._zeros[this.levels];
	    }
	    /**
	     * Find an element in the tree
	     * @param elements elements of tree
	     * @param element An element to find
	     * @param comparator A function that checks leaf value equality
	     * @param fromIndex The index to start the search at. If the index is greater than or equal to the array's length, -1 is returned
	     * @returns {number} Index if element is found, otherwise -1
	     */
	    static indexOf(elements, element, fromIndex, comparator) {
	        if (comparator) {
	            return elements.findIndex((el) => comparator(element, el));
	        }
	        else {
	            return elements.indexOf(element, fromIndex);
	        }
	    }
	    /**
	     * Insert new element into the tree
	     * @param element Element to insert
	     */
	    insert(element) {
	        if (this._layers[0].length >= this.capacity) {
	            throw new Error('Tree is full');
	        }
	        this.update(this._layers[0].length, element);
	    }
	    /*
	     * Insert multiple elements into the tree.
	     * @param {Array} elements Elements to insert
	     */
	    bulkInsert(elements) {
	        if (!elements.length) {
	            return;
	        }
	        if (this._layers[0].length + elements.length > this.capacity) {
	            throw new Error('Tree is full');
	        }
	        // First we insert all elements except the last one
	        // updating only full subtree hashes (all layers where inserted element has odd index)
	        // the last element will update the full path to the root making the tree consistent again
	        for (let i = 0; i < elements.length - 1; i++) {
	            this._layers[0].push(elements[i]);
	            let level = 0;
	            let index = this._layers[0].length - 1;
	            while (index % 2 === 1) {
	                level++;
	                index >>= 1;
	                const left = this._layers[level - 1][index * 2];
	                const right = this._layers[level - 1][index * 2 + 1];
	                this._layers[level][index] = this._hashFn(left, right);
	            }
	        }
	        this.insert(elements[elements.length - 1]);
	    }
	    /**
	     * Change an element in the tree
	     * @param {number} index Index of element to change
	     * @param element Updated element value
	     */
	    update(index, element) {
	        if (isNaN(Number(index)) || index < 0 || index > this._layers[0].length || index >= this.capacity) {
	            throw new Error('Insert index out of bounds: ' + index);
	        }
	        this._layers[0][index] = element;
	        this._processUpdate(index);
	    }
	    /**
	     * Get merkle path to a leaf
	     * @param {number} index Leaf index to generate path for
	     * @returns {{pathElements: Object[], pathIndex: number[]}} An object containing adjacent elements and left-right index
	     */
	    path(index) {
	        if (isNaN(Number(index)) || index < 0 || index >= this._layers[0].length) {
	            throw new Error('Index out of bounds: ' + index);
	        }
	        let elIndex = +index;
	        const pathElements = [];
	        const pathIndices = [];
	        const pathPositions = [];
	        for (let level = 0; level < this.levels; level++) {
	            pathIndices[level] = elIndex % 2;
	            const leafIndex = elIndex ^ 1;
	            if (leafIndex < this._layers[level].length) {
	                pathElements[level] = this._layers[level][leafIndex];
	                pathPositions[level] = leafIndex;
	            }
	            else {
	                pathElements[level] = this._zeros[level];
	                pathPositions[level] = 0;
	            }
	            elIndex >>= 1;
	        }
	        return {
	            pathElements,
	            pathIndices,
	            pathPositions,
	            pathRoot: this.root,
	        };
	    }
	    _buildZeros() {
	        this._zeros = [this.zeroElement];
	        for (let i = 1; i <= this.levels; i++) {
	            this._zeros[i] = this._hashFn(this._zeros[i - 1], this._zeros[i - 1]);
	        }
	    }
	    _processNodes(nodes, layerIndex) {
	        const length = nodes.length;
	        let currentLength = Math.ceil(length / 2);
	        const currentLayer = new Array(currentLength);
	        currentLength--;
	        const starFrom = length - ((length % 2) ^ 1);
	        let j = 0;
	        for (let i = starFrom; i >= 0; i -= 2) {
	            if (nodes[i - 1] === undefined)
	                break;
	            const left = nodes[i - 1];
	            const right = (i === starFrom && length % 2 === 1) ? this._zeros[layerIndex - 1] : nodes[i];
	            currentLayer[currentLength - j] = this._hashFn(left, right);
	            j++;
	        }
	        return currentLayer;
	    }
	    _processUpdate(index) {
	        for (let level = 1; level <= this.levels; level++) {
	            index >>= 1;
	            const left = this._layers[level - 1][index * 2];
	            const right = index * 2 + 1 < this._layers[level - 1].length
	                ? this._layers[level - 1][index * 2 + 1]
	                : this._zeros[level - 1];
	            this._layers[level][index] = this._hashFn(left, right);
	        }
	    }
	};
	BaseTree.BaseTree = BaseTree$1;
	return BaseTree;
}

var hasRequiredFixedMerkleTree;

function requireFixedMerkleTree () {
	if (hasRequiredFixedMerkleTree) return FixedMerkleTree;
	hasRequiredFixedMerkleTree = 1;
	var __importDefault = (FixedMerkleTree.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(FixedMerkleTree, "__esModule", { value: true });
	const simpleHash_1 = __importDefault(/*@__PURE__*/ requireSimpleHash());
	const BaseTree_1 = /*@__PURE__*/ requireBaseTree();
	class MerkleTree extends BaseTree_1.BaseTree {
	    constructor(levels, elements = [], { hashFunction = simpleHash_1.default, zeroElement = 0, } = {}) {
	        super();
	        this.levels = levels;
	        if (elements.length > this.capacity) {
	            throw new Error('Tree is full');
	        }
	        this._hashFn = hashFunction;
	        this.zeroElement = zeroElement;
	        this._layers = [];
	        const leaves = elements.slice();
	        this._layers = [leaves];
	        this._buildZeros();
	        this._buildHashes();
	    }
	    _buildHashes() {
	        for (let layerIndex = 1; layerIndex <= this.levels; layerIndex++) {
	            const nodes = this._layers[layerIndex - 1];
	            this._layers[layerIndex] = this._processNodes(nodes, layerIndex);
	        }
	    }
	    /**
	     * Insert multiple elements into the tree.
	     * @param {Array} elements Elements to insert
	     */
	    bulkInsert(elements) {
	        if (!elements.length) {
	            return;
	        }
	        if (this._layers[0].length + elements.length > this.capacity) {
	            throw new Error('Tree is full');
	        }
	        // First we insert all elements except the last one
	        // updating only full subtree hashes (all layers where inserted element has odd index)
	        // the last element will update the full path to the root making the tree consistent again
	        for (let i = 0; i < elements.length - 1; i++) {
	            this._layers[0].push(elements[i]);
	            let level = 0;
	            let index = this._layers[0].length - 1;
	            while (index % 2 === 1) {
	                level++;
	                index >>= 1;
	                this._layers[level][index] = this._hashFn(this._layers[level - 1][index * 2], this._layers[level - 1][index * 2 + 1]);
	            }
	        }
	        this.insert(elements[elements.length - 1]);
	    }
	    indexOf(element, comparator) {
	        return BaseTree_1.BaseTree.indexOf(this._layers[0], element, 0, comparator);
	    }
	    proof(element) {
	        const index = this.indexOf(element);
	        return this.path(index);
	    }
	    getTreeEdge(edgeIndex) {
	        const edgeElement = this._layers[0][edgeIndex];
	        if (edgeElement === undefined) {
	            throw new Error('Element not found');
	        }
	        const edgePath = this.path(edgeIndex);
	        return { edgePath, edgeElement, edgeIndex, edgeElementsCount: this._layers[0].length };
	    }
	    /**
	     * 🪓
	     * @param count
	     */
	    getTreeSlices(count = 4) {
	        const length = this._layers[0].length;
	        let size = Math.ceil(length / count);
	        if (size % 2)
	            size++;
	        const slices = [];
	        for (let i = 0; i < length; i += size) {
	            const edgeLeft = i;
	            const edgeRight = i + size;
	            slices.push({ edge: this.getTreeEdge(edgeLeft), elements: this.elements.slice(edgeLeft, edgeRight) });
	        }
	        return slices;
	    }
	    /**
	     * Serialize entire tree state including intermediate layers into a plain object
	     * Deserializing it back will not require to recompute any hashes
	     * Elements are not converted to a plain type, this is responsibility of the caller
	     */
	    serialize() {
	        return {
	            levels: this.levels,
	            _zeros: this._zeros,
	            _layers: this._layers,
	        };
	    }
	    /**
	     * Deserialize data into a MerkleTree instance
	     * Make sure to provide the same hashFunction as was used in the source tree,
	     * otherwise the tree state will be invalid
	     */
	    static deserialize(data, hashFunction) {
	        const instance = Object.assign(Object.create(this.prototype), data);
	        instance._hashFn = hashFunction || simpleHash_1.default;
	        instance.zeroElement = instance._zeros[0];
	        return instance;
	    }
	    toString() {
	        return JSON.stringify(this.serialize());
	    }
	}
	FixedMerkleTree.default = MerkleTree;
	return FixedMerkleTree;
}

var PartialMerkleTree = {};

var hasRequiredPartialMerkleTree;

function requirePartialMerkleTree () {
	if (hasRequiredPartialMerkleTree) return PartialMerkleTree;
	hasRequiredPartialMerkleTree = 1;
	var __importDefault = (PartialMerkleTree.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(PartialMerkleTree, "__esModule", { value: true });
	PartialMerkleTree.PartialMerkleTree = void 0;
	const simpleHash_1 = __importDefault(/*@__PURE__*/ requireSimpleHash());
	const BaseTree_1 = /*@__PURE__*/ requireBaseTree();
	let PartialMerkleTree$1 = class PartialMerkleTree extends BaseTree_1.BaseTree {
	    constructor(levels, { edgePath, edgeElement, edgeIndex, edgeElementsCount, }, leaves, { hashFunction, zeroElement } = {}) {
	        super();
	        if (edgeIndex + leaves.length !== edgeElementsCount)
	            throw new Error('Invalid number of elements');
	        this._edgeLeafProof = edgePath;
	        this._initialRoot = edgePath.pathRoot;
	        this.zeroElement = zeroElement !== null && zeroElement !== void 0 ? zeroElement : 0;
	        this._edgeLeaf = { data: edgeElement, index: edgeIndex };
	        this._leavesAfterEdge = leaves;
	        this.levels = levels;
	        this._hashFn = hashFunction || simpleHash_1.default;
	        this._createProofMap();
	        this._buildTree();
	    }
	    get edgeIndex() {
	        return this._edgeLeaf.index;
	    }
	    get edgeElement() {
	        return this._edgeLeaf.data;
	    }
	    get edgeLeafProof() {
	        return this._edgeLeafProof;
	    }
	    _createProofMap() {
	        this._proofMap = this.edgeLeafProof.pathPositions.reduce((p, c, i) => {
	            p.set(i, [c, this.edgeLeafProof.pathElements[i]]);
	            return p;
	        }, new Map());
	        this._proofMap.set(this.levels, [0, this.edgeLeafProof.pathRoot]);
	    }
	    _buildTree() {
	        const edgeLeafIndex = this._edgeLeaf.index;
	        this._leaves = Array(edgeLeafIndex).concat(this._leavesAfterEdge);
	        if (this._proofMap.has(0)) {
	            const [proofPos, proofEl] = this._proofMap.get(0);
	            this._leaves[proofPos] = proofEl;
	        }
	        this._layers = [this._leaves];
	        this._buildZeros();
	        this._buildHashes();
	    }
	    _buildHashes() {
	        for (let layerIndex = 1; layerIndex <= this.levels; layerIndex++) {
	            const nodes = this._layers[layerIndex - 1];
	            const currentLayer = this._processNodes(nodes, layerIndex);
	            if (this._proofMap.has(layerIndex)) {
	                const [proofPos, proofEl] = this._proofMap.get(layerIndex);
	                if (!currentLayer[proofPos])
	                    currentLayer[proofPos] = proofEl;
	            }
	            this._layers[layerIndex] = currentLayer;
	        }
	    }
	    /**
	     * Change an element in the tree
	     * @param {number} index Index of element to change
	     * @param element Updated element value
	     */
	    update(index, element) {
	        if (isNaN(Number(index)) || index < 0 || index > this._layers[0].length || index >= this.capacity) {
	            throw new Error('Insert index out of bounds: ' + index);
	        }
	        if (index < this._edgeLeaf.index) {
	            throw new Error(`Index ${index} is below the edge: ${this._edgeLeaf.index}`);
	        }
	        this._layers[0][index] = element;
	        this._processUpdate(index);
	    }
	    path(index) {
	        var _a;
	        if (isNaN(Number(index)) || index < 0 || index >= this._layers[0].length) {
	            throw new Error('Index out of bounds: ' + index);
	        }
	        if (index < this._edgeLeaf.index) {
	            throw new Error(`Index ${index} is below the edge: ${this._edgeLeaf.index}`);
	        }
	        let elIndex = Number(index);
	        const pathElements = [];
	        const pathIndices = [];
	        const pathPositions = [];
	        for (let level = 0; level < this.levels; level++) {
	            pathIndices[level] = elIndex % 2;
	            const leafIndex = elIndex ^ 1;
	            if (leafIndex < this._layers[level].length) {
	                pathElements[level] = this._layers[level][leafIndex];
	                pathPositions[level] = leafIndex;
	            }
	            else {
	                pathElements[level] = this._zeros[level];
	                pathPositions[level] = 0;
	            }
	            const [proofPos, proofEl] = this._proofMap.get(level);
	            pathElements[level] = (_a = pathElements[level]) !== null && _a !== void 0 ? _a : (proofPos === leafIndex ? proofEl : this._zeros[level]);
	            elIndex >>= 1;
	        }
	        return {
	            pathElements,
	            pathIndices,
	            pathPositions,
	            pathRoot: this.root,
	        };
	    }
	    indexOf(element, comparator) {
	        return BaseTree_1.BaseTree.indexOf(this._layers[0], element, this.edgeIndex, comparator);
	    }
	    proof(element) {
	        const index = this.indexOf(element);
	        return this.path(index);
	    }
	    /**
	     * Shifts edge of tree to left
	     * @param edge new TreeEdge below current edge
	     * @param elements leaves between old and new edge
	     */
	    shiftEdge(edge, elements) {
	        if (this._edgeLeaf.index <= edge.edgeIndex) {
	            throw new Error(`New edgeIndex should be smaller then ${this._edgeLeaf.index}`);
	        }
	        if (elements.length !== (this._edgeLeaf.index - edge.edgeIndex)) {
	            throw new Error(`Elements length should be ${this._edgeLeaf.index - edge.edgeIndex}`);
	        }
	        this._edgeLeafProof = edge.edgePath;
	        this._edgeLeaf = { index: edge.edgeIndex, data: edge.edgeElement };
	        this._leavesAfterEdge = [...elements, ...this._leavesAfterEdge];
	        this._createProofMap();
	        this._buildTree();
	    }
	    serialize() {
	        return {
	            _edgeLeafProof: this._edgeLeafProof,
	            _edgeLeaf: this._edgeLeaf,
	            _layers: this._layers,
	            _zeros: this._zeros,
	            levels: this.levels,
	        };
	    }
	    static deserialize(data, hashFunction) {
	        const instance = Object.assign(Object.create(this.prototype), data);
	        instance._hashFn = hashFunction || simpleHash_1.default;
	        instance._initialRoot = data._edgeLeafProof.pathRoot;
	        instance.zeroElement = instance._zeros[0];
	        instance._leavesAfterEdge = instance._layers[0].slice(data._edgeLeaf.index);
	        instance._createProofMap();
	        return instance;
	    }
	    toString() {
	        return JSON.stringify(this.serialize());
	    }
	};
	PartialMerkleTree.PartialMerkleTree = PartialMerkleTree$1;
	return PartialMerkleTree;
}

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	(function (exports) {
		var __importDefault = (lib.__importDefault) || function (mod) {
		    return (mod && mod.__esModule) ? mod : { "default": mod };
		};
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MerkleTree = exports.simpleHash = exports.PartialMerkleTree = void 0;
		const FixedMerkleTree_1 = __importDefault(/*@__PURE__*/ requireFixedMerkleTree());
		Object.defineProperty(exports, "MerkleTree", { enumerable: true, get: function () { return FixedMerkleTree_1.default; } });
		var PartialMerkleTree_1 = /*@__PURE__*/ requirePartialMerkleTree();
		Object.defineProperty(exports, "PartialMerkleTree", { enumerable: true, get: function () { return PartialMerkleTree_1.PartialMerkleTree; } });
		var simpleHash_1 = /*@__PURE__*/ requireSimpleHash();
		Object.defineProperty(exports, "simpleHash", { enumerable: true, get: function () { return simpleHash_1.simpleHash; } });
		exports.default = FixedMerkleTree_1.default; 
	} (lib));
	return lib;
}

var libExports = /*@__PURE__*/ requireLib();

function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}

const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.
const u8a = (a) => a instanceof Uint8Array;
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!isLE)
    throw new Error('Non little-endian hardware is not supported');
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes(data);
    if (!u8a(data))
        throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
}
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}

// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
// It's called a sponge function.
// Various per round constants calculations
const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(0x71);
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
    // Pi
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    // Rotational
    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
    // Iota
    let t = _0n;
    for (let j = 0; j < 7; j++) {
        R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
        if (R & _2n)
            t ^= _1n << ((_1n << /* @__PURE__ */ BigInt(j)) - _1n);
    }
    _SHA3_IOTA.push(t);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
// Left rotation (without 0, 32, 64)
const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
// Same as keccakf1600, but allows to skip some rounds
function keccakP(s, rounds = 24) {
    const B = new Uint32Array(5 * 2);
    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
    for (let round = 24 - rounds; round < 24; round++) {
        // Theta θ
        for (let x = 0; x < 10; x++)
            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
        for (let x = 0; x < 10; x += 2) {
            const idx1 = (x + 8) % 10;
            const idx0 = (x + 2) % 10;
            const B0 = B[idx0];
            const B1 = B[idx0 + 1];
            const Th = rotlH(B0, B1, 1) ^ B[idx1];
            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
            for (let y = 0; y < 50; y += 10) {
                s[x + y] ^= Th;
                s[x + y + 1] ^= Tl;
            }
        }
        // Rho (ρ) and Pi (π)
        let curH = s[2];
        let curL = s[3];
        for (let t = 0; t < 24; t++) {
            const shift = SHA3_ROTL[t];
            const Th = rotlH(curH, curL, shift);
            const Tl = rotlL(curH, curL, shift);
            const PI = SHA3_PI[t];
            curH = s[PI];
            curL = s[PI + 1];
            s[PI] = Th;
            s[PI + 1] = Tl;
        }
        // Chi (χ)
        for (let y = 0; y < 50; y += 10) {
            for (let x = 0; x < 10; x++)
                B[x] = s[y + x];
            for (let x = 0; x < 10; x++)
                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        }
        // Iota (ι)
        s[0] ^= SHA3_IOTA_H[round];
        s[1] ^= SHA3_IOTA_L[round];
    }
    B.fill(0);
}
class Keccak extends Hash {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        // Can be passed from user as dkLen
        number(outputLen);
        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
        if (0 >= this.blockLen || this.blockLen >= 200)
            throw new Error('Sha3 supports only keccak-f1600 function');
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
    }
    keccak() {
        keccakP(this.state32, this.rounds);
        this.posOut = 0;
        this.pos = 0;
    }
    update(data) {
        exists(this);
        const { blockLen, state } = this;
        data = toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            for (let i = 0; i < take; i++)
                state[this.pos++] ^= data[pos++];
            if (this.pos === blockLen)
                this.keccak();
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        // Do the padding
        state[pos] ^= suffix;
        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
            this.keccak();
        state[blockLen - 1] ^= 0x80;
        this.keccak();
    }
    writeInto(out) {
        exists(this, false);
        bytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len;) {
            if (this.posOut >= blockLen)
                this.keccak();
            const take = Math.min(blockLen - this.posOut, len - pos);
            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
            this.posOut += take;
            pos += take;
        }
        return out;
    }
    xofInto(out) {
        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
        if (!this.enableXOF)
            throw new Error('XOF is not possible for this instance');
        return this.writeInto(out);
    }
    xof(bytes) {
        number(bytes);
        return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
        output(out, this);
        if (this.finished)
            throw new Error('digest() was already called');
        this.writeInto(out);
        this.destroy();
        return out;
    }
    digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
        this.destroyed = true;
        this.state.fill(0);
    }
    _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        // Suffix can change in cSHAKE
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
    }
}
const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
/**
 * keccak-256 hash function. Different from SHA3-256.
 * @param message - that would be hashed
 */
const keccak_256 = /* @__PURE__ */ gen(0x01, 136, 256 / 8);

function toHexString(value) {
    return `0x${Array.from(value).map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function toUtf8Bytes(str) {
    let result = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);

        if (c < 0x80) {
            result.push(c);

        } else if (c < 0x800) {
            result.push((c >> 6) | 0xc0);
            result.push((c & 0x3f) | 0x80);

        } else if ((c & 0xfc00) == 0xd800) {
            i++;
            const c2 = str.charCodeAt(i);

            if (i >= str.length || (c2 & 0xfc00) !== 0xdc00) {
                throw new Error("invalid utf-8 string");
            }

            // Surrogate Pair
            const pair = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
            result.push((pair >> 18) | 0xf0);
            result.push(((pair >> 12) & 0x3f) | 0x80);
            result.push(((pair >> 6) & 0x3f) | 0x80);
            result.push((pair & 0x3f) | 0x80);

        } else {
            result.push((c >> 12) | 0xe0);
            result.push(((c >> 6) & 0x3f) | 0x80);
            result.push((c & 0x3f) | 0x80);
        }
    }

    return Uint8Array.from(result);
}

const SEED = "mimcsponge";
const NROUNDS = 220;

async function buildMimcSponge() {
    const bn128 = await ffjavascript.getCurveFromName("bn128", true);
    return new MimcSponge(bn128.Fr);
}

class MimcSponge {
    constructor (F) {
        this.F = F;
        this.cts = this.getConstants(SEED, NROUNDS);
    }

    getIV (seed)  {
        const F = this.F;
        if (typeof seed === "undefined") seed = SEED;
        const c = keccak_256(toUtf8Bytes(seed+"_iv"));
        const cn = ffjavascript.Scalar.e(toHexString(c));
        const iv = cn.mod(F.p);
        return iv;
    };

    getConstants (seed, nRounds)  {
        const F = this.F;
        if (typeof nRounds === "undefined") nRounds = NROUNDS;
        const cts = new Array(nRounds);
        let c = keccak_256(toUtf8Bytes(SEED));        for (let i=1; i<nRounds; i++) {
            c = keccak_256(c);

            cts[i] = F.e(toHexString(c));
        }
        cts[0] = F.e(0);
        cts[cts.length - 1] = F.e(0);
        return cts;
    };


    hash(_xL_in, _xR_in, _k) {
        const F = this.F;
        let xL = F.e(_xL_in);
        let xR = F.e(_xR_in);
        const k = F.e(_k);
        for (let i=0; i<NROUNDS; i++) {
            const c = this.cts[i];
            const t = (i==0) ? F.add(xL, k) : F.add(F.add(xL, k), c);
            const t2 = F.square(t);
            const t4 = F.square(t2);
            const t5 = F.mul(t4, t);
            const xR_tmp = F.e(xR);
            if (i < (NROUNDS - 1)) {
                xR = xL;
                xL = F.add(xR_tmp, t5);
            } else {
                xR = F.add(xR_tmp, t5);
            }
        }
        return {
            xL: xL,
            xR: xR
        };
    }

    multiHash(arr, key, numOutputs)  {
        const F = this.F;
        if (typeof(numOutputs) === "undefined") {
            numOutputs = 1;
        }
        if (typeof(key) === "undefined") {
            key = F.zero;
        }

        let R = F.zero;
        let C = F.zero;

        for (let i=0; i<arr.length; i++) {
            R = F.add(R, F.e(arr[i]));
            const S = this.hash(R, C, key);
            R = S.xL;
            C = S.xR;
        }
        let outputs = [R];
        for (let i=1; i < numOutputs; i++) {
            const S = this.hash(R, C, key);
            R = S.xL;
            C = S.xR;
            outputs.push(R);
        }
        if (numOutputs == 1) {
            return outputs[0];
        } else {
            return outputs;
        }
    }
}

class Mimc {
  sponge;
  hash;
  mimcPromise;
  constructor() {
    this.mimcPromise = this.initMimc();
  }
  async initMimc() {
    this.sponge = await buildMimcSponge();
    this.hash = (left, right) => this.sponge?.F.toString(this.sponge?.multiHash([BigInt(left), BigInt(right)]));
  }
  async getHash() {
    await this.mimcPromise;
    return {
      sponge: this.sponge,
      hash: this.hash
    };
  }
}
const mimc = new Mimc();

BigInt.prototype.toJSON = function() {
  return this.toString();
};
const isNode = !process.browser && typeof globalThis.window === "undefined";

async function nodePostWork() {
  const { hash: hashFunction } = await mimc.getHash();
  const { merkleTreeHeight, edge, elements, zeroElement } = workerThreads.workerData;
  if (edge) {
    const merkleTree2 = new libExports.PartialMerkleTree(merkleTreeHeight, edge, elements, {
      zeroElement,
      hashFunction
    });
    workerThreads.parentPort.postMessage(merkleTree2.toString());
    return;
  }
  const merkleTree = new libExports.MerkleTree(merkleTreeHeight, elements, {
    zeroElement,
    hashFunction
  });
  workerThreads.parentPort.postMessage(merkleTree.toString());
}
if (isNode && workerThreads) {
  nodePostWork();
} else if (!isNode && typeof addEventListener === "function" && typeof postMessage === "function") {
  addEventListener("message", async (e) => {
    let data;
    if (e.data) {
      data = e.data;
    } else {
      data = e;
    }
    const { hash: hashFunction } = await mimc.getHash();
    const { merkleTreeHeight, edge, elements, zeroElement } = data;
    if (edge) {
      const merkleTree2 = new libExports.PartialMerkleTree(merkleTreeHeight, edge, elements, {
        zeroElement,
        hashFunction
      });
      postMessage(merkleTree2.toString());
      return;
    }
    const merkleTree = new libExports.MerkleTree(merkleTreeHeight, elements, {
      zeroElement,
      hashFunction
    });
    postMessage(merkleTree.toString());
  });
} else {
  throw new Error("This browser / environment does not support workers!");
}
