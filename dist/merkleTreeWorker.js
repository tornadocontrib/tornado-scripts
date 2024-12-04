'use strict';

var threads = require('worker_threads');
var crypto = require('crypto');
var os = require('os');
var URL = require('url');
var VM = require('vm');

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

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
	var __importDefault = (FixedMerkleTree && FixedMerkleTree.__importDefault) || function (mod) {
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
	var __importDefault = (PartialMerkleTree && PartialMerkleTree.__importDefault) || function (mod) {
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
		var __importDefault = (lib && lib.__importDefault) || function (mod) {
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

/* global BigInt */
const hexLen = [ 0, 1, 2, 2, 3, 3, 3, 3, 4 ,4 ,4 ,4 ,4 ,4 ,4 ,4];

function fromString$2(s, radix) {
    if ((!radix)||(radix==10)) {
        return BigInt(s);
    } else if (radix==16) {
        if (s.slice(0,2) == "0x") {
            return BigInt(s);
        } else {
            return BigInt("0x"+s);
        }
    }
}

const e$2 = fromString$2;

function fromArray$2(a, radix) {
    let acc =BigInt(0);
    radix = BigInt(radix);
    for (let i=0; i<a.length; i++) {
        acc = acc*radix + BigInt(a[i]);
    }
    return acc;
}

function bitLength$2(a) {
    const aS =a.toString(16);
    return (aS.length-1)*4 +hexLen[parseInt(aS[0], 16)];
}

function isNegative$2(a) {
    return BigInt(a) < BigInt(0);
}

function isZero$2(a) {
    return !a;
}

function shiftLeft$2(a, n) {
    return BigInt(a) << BigInt(n);
}

function shiftRight$2(a, n) {
    return BigInt(a) >> BigInt(n);
}

const shl$2 = shiftLeft$2;
const shr$2 = shiftRight$2;

function isOdd$2(a) {
    return (BigInt(a) & BigInt(1)) == BigInt(1);
}


function naf$2(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            const z = 2 - Number(E % BigInt(4));
            res.push( z );
            E = E - BigInt(z);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}


function bits$2(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}

function toNumber$2(s) {
    if (s>BigInt(Number.MAX_SAFE_INTEGER )) {
        throw new Error("Number too big");
    }
    return Number(s);
}

function toArray$2(s, radix) {
    const res = [];
    let rem = BigInt(s);
    radix = BigInt(radix);
    while (rem) {
        res.unshift( Number(rem % radix));
        rem = rem / radix;
    }
    return res;
}


function add$2(a, b) {
    return BigInt(a) + BigInt(b);
}

function sub$2(a, b) {
    return BigInt(a) - BigInt(b);
}

function neg$2(a) {
    return -BigInt(a);
}

function mul$2(a, b) {
    return BigInt(a) * BigInt(b);
}

function square$2(a) {
    return BigInt(a) * BigInt(a);
}

function pow$2(a, b) {
    return BigInt(a) ** BigInt(b);
}

function exp$2(a, b) {
    return BigInt(a) ** BigInt(b);
}

function abs$2(a) {
    return BigInt(a) >= 0 ? BigInt(a) : -BigInt(a);
}

function div$2(a, b) {
    return BigInt(a) / BigInt(b);
}

function mod$2(a, b) {
    return BigInt(a) % BigInt(b);
}

function eq$2(a, b) {
    return BigInt(a) == BigInt(b);
}

function neq$2(a, b) {
    return BigInt(a) != BigInt(b);
}

function lt$2(a, b) {
    return BigInt(a) < BigInt(b);
}

function gt$2(a, b) {
    return BigInt(a) > BigInt(b);
}

function leq$2(a, b) {
    return BigInt(a) <= BigInt(b);
}

function geq$2(a, b) {
    return BigInt(a) >= BigInt(b);
}

function band$2(a, b) {
    return BigInt(a) & BigInt(b);
}

function bor$2(a, b) {
    return BigInt(a) | BigInt(b);
}

function bxor$2(a, b) {
    return BigInt(a) ^ BigInt(b);
}

function land$2(a, b) {
    return BigInt(a) && BigInt(b);
}

function lor$2(a, b) {
    return BigInt(a) || BigInt(b);
}

function lnot$2(a) {
    return !BigInt(a);
}

var Scalar_native = /*#__PURE__*/Object.freeze({
	__proto__: null,
	abs: abs$2,
	add: add$2,
	band: band$2,
	bitLength: bitLength$2,
	bits: bits$2,
	bor: bor$2,
	bxor: bxor$2,
	div: div$2,
	e: e$2,
	eq: eq$2,
	exp: exp$2,
	fromArray: fromArray$2,
	fromString: fromString$2,
	geq: geq$2,
	gt: gt$2,
	isNegative: isNegative$2,
	isOdd: isOdd$2,
	isZero: isZero$2,
	land: land$2,
	leq: leq$2,
	lnot: lnot$2,
	lor: lor$2,
	lt: lt$2,
	mod: mod$2,
	mul: mul$2,
	naf: naf$2,
	neg: neg$2,
	neq: neq$2,
	pow: pow$2,
	shiftLeft: shiftLeft$2,
	shiftRight: shiftRight$2,
	shl: shl$2,
	shr: shr$2,
	square: square$2,
	sub: sub$2,
	toArray: toArray$2,
	toNumber: toNumber$2
});

var BigInteger = {exports: {}};

var hasRequiredBigInteger;

function requireBigInteger () {
	if (hasRequiredBigInteger) return BigInteger.exports;
	hasRequiredBigInteger = 1;
	(function (module) {
		var bigInt = (function (undefined$1) {

		    var BASE = 1e7,
		        LOG_BASE = 7,
		        MAX_INT = 9007199254740992,
		        MAX_INT_ARR = smallToArray(MAX_INT),
		        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

		    var supportsNativeBigInt = typeof BigInt === "function";

		    function Integer(v, radix, alphabet, caseSensitive) {
		        if (typeof v === "undefined") return Integer[0];
		        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
		        return parseValue(v);
		    }

		    function BigInteger(value, sign) {
		        this.value = value;
		        this.sign = sign;
		        this.isSmall = false;
		    }
		    BigInteger.prototype = Object.create(Integer.prototype);

		    function SmallInteger(value) {
		        this.value = value;
		        this.sign = value < 0;
		        this.isSmall = true;
		    }
		    SmallInteger.prototype = Object.create(Integer.prototype);

		    function NativeBigInt(value) {
		        this.value = value;
		    }
		    NativeBigInt.prototype = Object.create(Integer.prototype);

		    function isPrecise(n) {
		        return -MAX_INT < n && n < MAX_INT;
		    }

		    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
		        if (n < 1e7)
		            return [n];
		        if (n < 1e14)
		            return [n % 1e7, Math.floor(n / 1e7)];
		        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
		    }

		    function arrayToSmall(arr) { // If BASE changes this function may need to change
		        trim(arr);
		        var length = arr.length;
		        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
		            switch (length) {
		                case 0: return 0;
		                case 1: return arr[0];
		                case 2: return arr[0] + arr[1] * BASE;
		                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
		            }
		        }
		        return arr;
		    }

		    function trim(v) {
		        var i = v.length;
		        while (v[--i] === 0);
		        v.length = i + 1;
		    }

		    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
		        var x = new Array(length);
		        var i = -1;
		        while (++i < length) {
		            x[i] = 0;
		        }
		        return x;
		    }

		    function truncate(n) {
		        if (n > 0) return Math.floor(n);
		        return Math.ceil(n);
		    }

		    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
		        var l_a = a.length,
		            l_b = b.length,
		            r = new Array(l_a),
		            carry = 0,
		            base = BASE,
		            sum, i;
		        for (i = 0; i < l_b; i++) {
		            sum = a[i] + b[i] + carry;
		            carry = sum >= base ? 1 : 0;
		            r[i] = sum - carry * base;
		        }
		        while (i < l_a) {
		            sum = a[i] + carry;
		            carry = sum === base ? 1 : 0;
		            r[i++] = sum - carry * base;
		        }
		        if (carry > 0) r.push(carry);
		        return r;
		    }

		    function addAny(a, b) {
		        if (a.length >= b.length) return add(a, b);
		        return add(b, a);
		    }

		    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
		        var l = a.length,
		            r = new Array(l),
		            base = BASE,
		            sum, i;
		        for (i = 0; i < l; i++) {
		            sum = a[i] - base + carry;
		            carry = Math.floor(sum / base);
		            r[i] = sum - carry * base;
		            carry += 1;
		        }
		        while (carry > 0) {
		            r[i++] = carry % base;
		            carry = Math.floor(carry / base);
		        }
		        return r;
		    }

		    BigInteger.prototype.add = function (v) {
		        var n = parseValue(v);
		        if (this.sign !== n.sign) {
		            return this.subtract(n.negate());
		        }
		        var a = this.value, b = n.value;
		        if (n.isSmall) {
		            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
		        }
		        return new BigInteger(addAny(a, b), this.sign);
		    };
		    BigInteger.prototype.plus = BigInteger.prototype.add;

		    SmallInteger.prototype.add = function (v) {
		        var n = parseValue(v);
		        var a = this.value;
		        if (a < 0 !== n.sign) {
		            return this.subtract(n.negate());
		        }
		        var b = n.value;
		        if (n.isSmall) {
		            if (isPrecise(a + b)) return new SmallInteger(a + b);
		            b = smallToArray(Math.abs(b));
		        }
		        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
		    };
		    SmallInteger.prototype.plus = SmallInteger.prototype.add;

		    NativeBigInt.prototype.add = function (v) {
		        return new NativeBigInt(this.value + parseValue(v).value);
		    };
		    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

		    function subtract(a, b) { // assumes a and b are arrays with a >= b
		        var a_l = a.length,
		            b_l = b.length,
		            r = new Array(a_l),
		            borrow = 0,
		            base = BASE,
		            i, difference;
		        for (i = 0; i < b_l; i++) {
		            difference = a[i] - borrow - b[i];
		            if (difference < 0) {
		                difference += base;
		                borrow = 1;
		            } else borrow = 0;
		            r[i] = difference;
		        }
		        for (i = b_l; i < a_l; i++) {
		            difference = a[i] - borrow;
		            if (difference < 0) difference += base;
		            else {
		                r[i++] = difference;
		                break;
		            }
		            r[i] = difference;
		        }
		        for (; i < a_l; i++) {
		            r[i] = a[i];
		        }
		        trim(r);
		        return r;
		    }

		    function subtractAny(a, b, sign) {
		        var value;
		        if (compareAbs(a, b) >= 0) {
		            value = subtract(a, b);
		        } else {
		            value = subtract(b, a);
		            sign = !sign;
		        }
		        value = arrayToSmall(value);
		        if (typeof value === "number") {
		            if (sign) value = -value;
		            return new SmallInteger(value);
		        }
		        return new BigInteger(value, sign);
		    }

		    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
		        var l = a.length,
		            r = new Array(l),
		            carry = -b,
		            base = BASE,
		            i, difference;
		        for (i = 0; i < l; i++) {
		            difference = a[i] + carry;
		            carry = Math.floor(difference / base);
		            difference %= base;
		            r[i] = difference < 0 ? difference + base : difference;
		        }
		        r = arrayToSmall(r);
		        if (typeof r === "number") {
		            if (sign) r = -r;
		            return new SmallInteger(r);
		        } return new BigInteger(r, sign);
		    }

		    BigInteger.prototype.subtract = function (v) {
		        var n = parseValue(v);
		        if (this.sign !== n.sign) {
		            return this.add(n.negate());
		        }
		        var a = this.value, b = n.value;
		        if (n.isSmall)
		            return subtractSmall(a, Math.abs(b), this.sign);
		        return subtractAny(a, b, this.sign);
		    };
		    BigInteger.prototype.minus = BigInteger.prototype.subtract;

		    SmallInteger.prototype.subtract = function (v) {
		        var n = parseValue(v);
		        var a = this.value;
		        if (a < 0 !== n.sign) {
		            return this.add(n.negate());
		        }
		        var b = n.value;
		        if (n.isSmall) {
		            return new SmallInteger(a - b);
		        }
		        return subtractSmall(b, Math.abs(a), a >= 0);
		    };
		    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

		    NativeBigInt.prototype.subtract = function (v) {
		        return new NativeBigInt(this.value - parseValue(v).value);
		    };
		    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

		    BigInteger.prototype.negate = function () {
		        return new BigInteger(this.value, !this.sign);
		    };
		    SmallInteger.prototype.negate = function () {
		        var sign = this.sign;
		        var small = new SmallInteger(-this.value);
		        small.sign = !sign;
		        return small;
		    };
		    NativeBigInt.prototype.negate = function () {
		        return new NativeBigInt(-this.value);
		    };

		    BigInteger.prototype.abs = function () {
		        return new BigInteger(this.value, false);
		    };
		    SmallInteger.prototype.abs = function () {
		        return new SmallInteger(Math.abs(this.value));
		    };
		    NativeBigInt.prototype.abs = function () {
		        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
		    };


		    function multiplyLong(a, b) {
		        var a_l = a.length,
		            b_l = b.length,
		            l = a_l + b_l,
		            r = createArray(l),
		            base = BASE,
		            product, carry, i, a_i, b_j;
		        for (i = 0; i < a_l; ++i) {
		            a_i = a[i];
		            for (var j = 0; j < b_l; ++j) {
		                b_j = b[j];
		                product = a_i * b_j + r[i + j];
		                carry = Math.floor(product / base);
		                r[i + j] = product - carry * base;
		                r[i + j + 1] += carry;
		            }
		        }
		        trim(r);
		        return r;
		    }

		    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
		        var l = a.length,
		            r = new Array(l),
		            base = BASE,
		            carry = 0,
		            product, i;
		        for (i = 0; i < l; i++) {
		            product = a[i] * b + carry;
		            carry = Math.floor(product / base);
		            r[i] = product - carry * base;
		        }
		        while (carry > 0) {
		            r[i++] = carry % base;
		            carry = Math.floor(carry / base);
		        }
		        return r;
		    }

		    function shiftLeft(x, n) {
		        var r = [];
		        while (n-- > 0) r.push(0);
		        return r.concat(x);
		    }

		    function multiplyKaratsuba(x, y) {
		        var n = Math.max(x.length, y.length);

		        if (n <= 30) return multiplyLong(x, y);
		        n = Math.ceil(n / 2);

		        var b = x.slice(n),
		            a = x.slice(0, n),
		            d = y.slice(n),
		            c = y.slice(0, n);

		        var ac = multiplyKaratsuba(a, c),
		            bd = multiplyKaratsuba(b, d),
		            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

		        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
		        trim(product);
		        return product;
		    }

		    // The following function is derived from a surface fit of a graph plotting the performance difference
		    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
		    function useKaratsuba(l1, l2) {
		        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
		    }

		    BigInteger.prototype.multiply = function (v) {
		        var n = parseValue(v),
		            a = this.value, b = n.value,
		            sign = this.sign !== n.sign,
		            abs;
		        if (n.isSmall) {
		            if (b === 0) return Integer[0];
		            if (b === 1) return this;
		            if (b === -1) return this.negate();
		            abs = Math.abs(b);
		            if (abs < BASE) {
		                return new BigInteger(multiplySmall(a, abs), sign);
		            }
		            b = smallToArray(abs);
		        }
		        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
		            return new BigInteger(multiplyKaratsuba(a, b), sign);
		        return new BigInteger(multiplyLong(a, b), sign);
		    };

		    BigInteger.prototype.times = BigInteger.prototype.multiply;

		    function multiplySmallAndArray(a, b, sign) { // a >= 0
		        if (a < BASE) {
		            return new BigInteger(multiplySmall(b, a), sign);
		        }
		        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
		    }
		    SmallInteger.prototype._multiplyBySmall = function (a) {
		        if (isPrecise(a.value * this.value)) {
		            return new SmallInteger(a.value * this.value);
		        }
		        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
		    };
		    BigInteger.prototype._multiplyBySmall = function (a) {
		        if (a.value === 0) return Integer[0];
		        if (a.value === 1) return this;
		        if (a.value === -1) return this.negate();
		        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
		    };
		    SmallInteger.prototype.multiply = function (v) {
		        return parseValue(v)._multiplyBySmall(this);
		    };
		    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

		    NativeBigInt.prototype.multiply = function (v) {
		        return new NativeBigInt(this.value * parseValue(v).value);
		    };
		    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

		    function square(a) {
		        //console.assert(2 * BASE * BASE < MAX_INT);
		        var l = a.length,
		            r = createArray(l + l),
		            base = BASE,
		            product, carry, i, a_i, a_j;
		        for (i = 0; i < l; i++) {
		            a_i = a[i];
		            carry = 0 - a_i * a_i;
		            for (var j = i; j < l; j++) {
		                a_j = a[j];
		                product = 2 * (a_i * a_j) + r[i + j] + carry;
		                carry = Math.floor(product / base);
		                r[i + j] = product - carry * base;
		            }
		            r[i + l] = carry;
		        }
		        trim(r);
		        return r;
		    }

		    BigInteger.prototype.square = function () {
		        return new BigInteger(square(this.value), false);
		    };

		    SmallInteger.prototype.square = function () {
		        var value = this.value * this.value;
		        if (isPrecise(value)) return new SmallInteger(value);
		        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
		    };

		    NativeBigInt.prototype.square = function (v) {
		        return new NativeBigInt(this.value * this.value);
		    };

		    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
		        var a_l = a.length,
		            b_l = b.length,
		            base = BASE,
		            result = createArray(b.length),
		            divisorMostSignificantDigit = b[b_l - 1],
		            // normalization
		            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
		            remainder = multiplySmall(a, lambda),
		            divisor = multiplySmall(b, lambda),
		            quotientDigit, shift, carry, borrow, i, l, q;
		        if (remainder.length <= a_l) remainder.push(0);
		        divisor.push(0);
		        divisorMostSignificantDigit = divisor[b_l - 1];
		        for (shift = a_l - b_l; shift >= 0; shift--) {
		            quotientDigit = base - 1;
		            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
		                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
		            }
		            // quotientDigit <= base - 1
		            carry = 0;
		            borrow = 0;
		            l = divisor.length;
		            for (i = 0; i < l; i++) {
		                carry += quotientDigit * divisor[i];
		                q = Math.floor(carry / base);
		                borrow += remainder[shift + i] - (carry - q * base);
		                carry = q;
		                if (borrow < 0) {
		                    remainder[shift + i] = borrow + base;
		                    borrow = -1;
		                } else {
		                    remainder[shift + i] = borrow;
		                    borrow = 0;
		                }
		            }
		            while (borrow !== 0) {
		                quotientDigit -= 1;
		                carry = 0;
		                for (i = 0; i < l; i++) {
		                    carry += remainder[shift + i] - base + divisor[i];
		                    if (carry < 0) {
		                        remainder[shift + i] = carry + base;
		                        carry = 0;
		                    } else {
		                        remainder[shift + i] = carry;
		                        carry = 1;
		                    }
		                }
		                borrow += carry;
		            }
		            result[shift] = quotientDigit;
		        }
		        // denormalization
		        remainder = divModSmall(remainder, lambda)[0];
		        return [arrayToSmall(result), arrayToSmall(remainder)];
		    }

		    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
		        // Performs faster than divMod1 on larger input sizes.
		        var a_l = a.length,
		            b_l = b.length,
		            result = [],
		            part = [],
		            base = BASE,
		            guess, xlen, highx, highy, check;
		        while (a_l) {
		            part.unshift(a[--a_l]);
		            trim(part);
		            if (compareAbs(part, b) < 0) {
		                result.push(0);
		                continue;
		            }
		            xlen = part.length;
		            highx = part[xlen - 1] * base + part[xlen - 2];
		            highy = b[b_l - 1] * base + b[b_l - 2];
		            if (xlen > b_l) {
		                highx = (highx + 1) * base;
		            }
		            guess = Math.ceil(highx / highy);
		            do {
		                check = multiplySmall(b, guess);
		                if (compareAbs(check, part) <= 0) break;
		                guess--;
		            } while (guess);
		            result.push(guess);
		            part = subtract(part, check);
		        }
		        result.reverse();
		        return [arrayToSmall(result), arrayToSmall(part)];
		    }

		    function divModSmall(value, lambda) {
		        var length = value.length,
		            quotient = createArray(length),
		            base = BASE,
		            i, q, remainder, divisor;
		        remainder = 0;
		        for (i = length - 1; i >= 0; --i) {
		            divisor = remainder * base + value[i];
		            q = truncate(divisor / lambda);
		            remainder = divisor - q * lambda;
		            quotient[i] = q | 0;
		        }
		        return [quotient, remainder | 0];
		    }

		    function divModAny(self, v) {
		        var value, n = parseValue(v);
		        if (supportsNativeBigInt) {
		            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
		        }
		        var a = self.value, b = n.value;
		        var quotient;
		        if (b === 0) throw new Error("Cannot divide by zero");
		        if (self.isSmall) {
		            if (n.isSmall) {
		                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
		            }
		            return [Integer[0], self];
		        }
		        if (n.isSmall) {
		            if (b === 1) return [self, Integer[0]];
		            if (b == -1) return [self.negate(), Integer[0]];
		            var abs = Math.abs(b);
		            if (abs < BASE) {
		                value = divModSmall(a, abs);
		                quotient = arrayToSmall(value[0]);
		                var remainder = value[1];
		                if (self.sign) remainder = -remainder;
		                if (typeof quotient === "number") {
		                    if (self.sign !== n.sign) quotient = -quotient;
		                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
		                }
		                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
		            }
		            b = smallToArray(abs);
		        }
		        var comparison = compareAbs(a, b);
		        if (comparison === -1) return [Integer[0], self];
		        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

		        // divMod1 is faster on smaller input sizes
		        if (a.length + b.length <= 200)
		            value = divMod1(a, b);
		        else value = divMod2(a, b);

		        quotient = value[0];
		        var qSign = self.sign !== n.sign,
		            mod = value[1],
		            mSign = self.sign;
		        if (typeof quotient === "number") {
		            if (qSign) quotient = -quotient;
		            quotient = new SmallInteger(quotient);
		        } else quotient = new BigInteger(quotient, qSign);
		        if (typeof mod === "number") {
		            if (mSign) mod = -mod;
		            mod = new SmallInteger(mod);
		        } else mod = new BigInteger(mod, mSign);
		        return [quotient, mod];
		    }

		    BigInteger.prototype.divmod = function (v) {
		        var result = divModAny(this, v);
		        return {
		            quotient: result[0],
		            remainder: result[1]
		        };
		    };
		    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


		    BigInteger.prototype.divide = function (v) {
		        return divModAny(this, v)[0];
		    };
		    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
		        return new NativeBigInt(this.value / parseValue(v).value);
		    };
		    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

		    BigInteger.prototype.mod = function (v) {
		        return divModAny(this, v)[1];
		    };
		    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
		        return new NativeBigInt(this.value % parseValue(v).value);
		    };
		    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

		    BigInteger.prototype.pow = function (v) {
		        var n = parseValue(v),
		            a = this.value,
		            b = n.value,
		            value, x, y;
		        if (b === 0) return Integer[1];
		        if (a === 0) return Integer[0];
		        if (a === 1) return Integer[1];
		        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
		        if (n.sign) {
		            return Integer[0];
		        }
		        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
		        if (this.isSmall) {
		            if (isPrecise(value = Math.pow(a, b)))
		                return new SmallInteger(truncate(value));
		        }
		        x = this;
		        y = Integer[1];
		        while (true) {
		            if (b & 1 === 1) {
		                y = y.times(x);
		                --b;
		            }
		            if (b === 0) break;
		            b /= 2;
		            x = x.square();
		        }
		        return y;
		    };
		    SmallInteger.prototype.pow = BigInteger.prototype.pow;

		    NativeBigInt.prototype.pow = function (v) {
		        var n = parseValue(v);
		        var a = this.value, b = n.value;
		        var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
		        if (b === _0) return Integer[1];
		        if (a === _0) return Integer[0];
		        if (a === _1) return Integer[1];
		        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
		        if (n.isNegative()) return new NativeBigInt(_0);
		        var x = this;
		        var y = Integer[1];
		        while (true) {
		            if ((b & _1) === _1) {
		                y = y.times(x);
		                --b;
		            }
		            if (b === _0) break;
		            b /= _2;
		            x = x.square();
		        }
		        return y;
		    };

		    BigInteger.prototype.modPow = function (exp, mod) {
		        exp = parseValue(exp);
		        mod = parseValue(mod);
		        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
		        var r = Integer[1],
		            base = this.mod(mod);
		        if (exp.isNegative()) {
		            exp = exp.multiply(Integer[-1]);
		            base = base.modInv(mod);
		        }
		        while (exp.isPositive()) {
		            if (base.isZero()) return Integer[0];
		            if (exp.isOdd()) r = r.multiply(base).mod(mod);
		            exp = exp.divide(2);
		            base = base.square().mod(mod);
		        }
		        return r;
		    };
		    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

		    function compareAbs(a, b) {
		        if (a.length !== b.length) {
		            return a.length > b.length ? 1 : -1;
		        }
		        for (var i = a.length - 1; i >= 0; i--) {
		            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
		        }
		        return 0;
		    }

		    BigInteger.prototype.compareAbs = function (v) {
		        var n = parseValue(v),
		            a = this.value,
		            b = n.value;
		        if (n.isSmall) return 1;
		        return compareAbs(a, b);
		    };
		    SmallInteger.prototype.compareAbs = function (v) {
		        var n = parseValue(v),
		            a = Math.abs(this.value),
		            b = n.value;
		        if (n.isSmall) {
		            b = Math.abs(b);
		            return a === b ? 0 : a > b ? 1 : -1;
		        }
		        return -1;
		    };
		    NativeBigInt.prototype.compareAbs = function (v) {
		        var a = this.value;
		        var b = parseValue(v).value;
		        a = a >= 0 ? a : -a;
		        b = b >= 0 ? b : -b;
		        return a === b ? 0 : a > b ? 1 : -1;
		    };

		    BigInteger.prototype.compare = function (v) {
		        // See discussion about comparison with Infinity:
		        // https://github.com/peterolson/BigInteger.js/issues/61
		        if (v === Infinity) {
		            return -1;
		        }
		        if (v === -Infinity) {
		            return 1;
		        }

		        var n = parseValue(v),
		            a = this.value,
		            b = n.value;
		        if (this.sign !== n.sign) {
		            return n.sign ? 1 : -1;
		        }
		        if (n.isSmall) {
		            return this.sign ? -1 : 1;
		        }
		        return compareAbs(a, b) * (this.sign ? -1 : 1);
		    };
		    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

		    SmallInteger.prototype.compare = function (v) {
		        if (v === Infinity) {
		            return -1;
		        }
		        if (v === -Infinity) {
		            return 1;
		        }

		        var n = parseValue(v),
		            a = this.value,
		            b = n.value;
		        if (n.isSmall) {
		            return a == b ? 0 : a > b ? 1 : -1;
		        }
		        if (a < 0 !== n.sign) {
		            return a < 0 ? -1 : 1;
		        }
		        return a < 0 ? 1 : -1;
		    };
		    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

		    NativeBigInt.prototype.compare = function (v) {
		        if (v === Infinity) {
		            return -1;
		        }
		        if (v === -Infinity) {
		            return 1;
		        }
		        var a = this.value;
		        var b = parseValue(v).value;
		        return a === b ? 0 : a > b ? 1 : -1;
		    };
		    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

		    BigInteger.prototype.equals = function (v) {
		        return this.compare(v) === 0;
		    };
		    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

		    BigInteger.prototype.notEquals = function (v) {
		        return this.compare(v) !== 0;
		    };
		    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

		    BigInteger.prototype.greater = function (v) {
		        return this.compare(v) > 0;
		    };
		    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

		    BigInteger.prototype.lesser = function (v) {
		        return this.compare(v) < 0;
		    };
		    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

		    BigInteger.prototype.greaterOrEquals = function (v) {
		        return this.compare(v) >= 0;
		    };
		    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

		    BigInteger.prototype.lesserOrEquals = function (v) {
		        return this.compare(v) <= 0;
		    };
		    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

		    BigInteger.prototype.isEven = function () {
		        return (this.value[0] & 1) === 0;
		    };
		    SmallInteger.prototype.isEven = function () {
		        return (this.value & 1) === 0;
		    };
		    NativeBigInt.prototype.isEven = function () {
		        return (this.value & BigInt(1)) === BigInt(0);
		    };

		    BigInteger.prototype.isOdd = function () {
		        return (this.value[0] & 1) === 1;
		    };
		    SmallInteger.prototype.isOdd = function () {
		        return (this.value & 1) === 1;
		    };
		    NativeBigInt.prototype.isOdd = function () {
		        return (this.value & BigInt(1)) === BigInt(1);
		    };

		    BigInteger.prototype.isPositive = function () {
		        return !this.sign;
		    };
		    SmallInteger.prototype.isPositive = function () {
		        return this.value > 0;
		    };
		    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

		    BigInteger.prototype.isNegative = function () {
		        return this.sign;
		    };
		    SmallInteger.prototype.isNegative = function () {
		        return this.value < 0;
		    };
		    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

		    BigInteger.prototype.isUnit = function () {
		        return false;
		    };
		    SmallInteger.prototype.isUnit = function () {
		        return Math.abs(this.value) === 1;
		    };
		    NativeBigInt.prototype.isUnit = function () {
		        return this.abs().value === BigInt(1);
		    };

		    BigInteger.prototype.isZero = function () {
		        return false;
		    };
		    SmallInteger.prototype.isZero = function () {
		        return this.value === 0;
		    };
		    NativeBigInt.prototype.isZero = function () {
		        return this.value === BigInt(0);
		    };

		    BigInteger.prototype.isDivisibleBy = function (v) {
		        var n = parseValue(v);
		        if (n.isZero()) return false;
		        if (n.isUnit()) return true;
		        if (n.compareAbs(2) === 0) return this.isEven();
		        return this.mod(n).isZero();
		    };
		    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

		    function isBasicPrime(v) {
		        var n = v.abs();
		        if (n.isUnit()) return false;
		        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
		        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
		        if (n.lesser(49)) return true;
		        // we don't know if it's prime: let the other functions figure it out
		    }

		    function millerRabinTest(n, a) {
		        var nPrev = n.prev(),
		            b = nPrev,
		            r = 0,
		            d, i, x;
		        while (b.isEven()) b = b.divide(2), r++;
		        next: for (i = 0; i < a.length; i++) {
		            if (n.lesser(a[i])) continue;
		            x = bigInt(a[i]).modPow(b, n);
		            if (x.isUnit() || x.equals(nPrev)) continue;
		            for (d = r - 1; d != 0; d--) {
		                x = x.square().mod(n);
		                if (x.isUnit()) return false;
		                if (x.equals(nPrev)) continue next;
		            }
		            return false;
		        }
		        return true;
		    }

		    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
		    BigInteger.prototype.isPrime = function (strict) {
		        var isPrime = isBasicPrime(this);
		        if (isPrime !== undefined$1) return isPrime;
		        var n = this.abs();
		        var bits = n.bitLength();
		        if (bits <= 64)
		            return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
		        var logN = Math.log(2) * bits.toJSNumber();
		        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
		        for (var a = [], i = 0; i < t; i++) {
		            a.push(bigInt(i + 2));
		        }
		        return millerRabinTest(n, a);
		    };
		    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

		    BigInteger.prototype.isProbablePrime = function (iterations, rng) {
		        var isPrime = isBasicPrime(this);
		        if (isPrime !== undefined$1) return isPrime;
		        var n = this.abs();
		        var t = iterations === undefined$1 ? 5 : iterations;
		        for (var a = [], i = 0; i < t; i++) {
		            a.push(bigInt.randBetween(2, n.minus(2), rng));
		        }
		        return millerRabinTest(n, a);
		    };
		    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

		    BigInteger.prototype.modInv = function (n) {
		        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
		        while (!newR.isZero()) {
		            q = r.divide(newR);
		            lastT = t;
		            lastR = r;
		            t = newT;
		            r = newR;
		            newT = lastT.subtract(q.multiply(newT));
		            newR = lastR.subtract(q.multiply(newR));
		        }
		        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
		        if (t.compare(0) === -1) {
		            t = t.add(n);
		        }
		        if (this.isNegative()) {
		            return t.negate();
		        }
		        return t;
		    };

		    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

		    BigInteger.prototype.next = function () {
		        var value = this.value;
		        if (this.sign) {
		            return subtractSmall(value, 1, this.sign);
		        }
		        return new BigInteger(addSmall(value, 1), this.sign);
		    };
		    SmallInteger.prototype.next = function () {
		        var value = this.value;
		        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
		        return new BigInteger(MAX_INT_ARR, false);
		    };
		    NativeBigInt.prototype.next = function () {
		        return new NativeBigInt(this.value + BigInt(1));
		    };

		    BigInteger.prototype.prev = function () {
		        var value = this.value;
		        if (this.sign) {
		            return new BigInteger(addSmall(value, 1), true);
		        }
		        return subtractSmall(value, 1, this.sign);
		    };
		    SmallInteger.prototype.prev = function () {
		        var value = this.value;
		        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
		        return new BigInteger(MAX_INT_ARR, true);
		    };
		    NativeBigInt.prototype.prev = function () {
		        return new NativeBigInt(this.value - BigInt(1));
		    };

		    var powersOfTwo = [1];
		    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
		    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

		    function shift_isSmall(n) {
		        return Math.abs(n) <= BASE;
		    }

		    BigInteger.prototype.shiftLeft = function (v) {
		        var n = parseValue(v).toJSNumber();
		        if (!shift_isSmall(n)) {
		            throw new Error(String(n) + " is too large for shifting.");
		        }
		        if (n < 0) return this.shiftRight(-n);
		        var result = this;
		        if (result.isZero()) return result;
		        while (n >= powers2Length) {
		            result = result.multiply(highestPower2);
		            n -= powers2Length - 1;
		        }
		        return result.multiply(powersOfTwo[n]);
		    };
		    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

		    BigInteger.prototype.shiftRight = function (v) {
		        var remQuo;
		        var n = parseValue(v).toJSNumber();
		        if (!shift_isSmall(n)) {
		            throw new Error(String(n) + " is too large for shifting.");
		        }
		        if (n < 0) return this.shiftLeft(-n);
		        var result = this;
		        while (n >= powers2Length) {
		            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
		            remQuo = divModAny(result, highestPower2);
		            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
		            n -= powers2Length - 1;
		        }
		        remQuo = divModAny(result, powersOfTwo[n]);
		        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
		    };
		    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

		    function bitwise(x, y, fn) {
		        y = parseValue(y);
		        var xSign = x.isNegative(), ySign = y.isNegative();
		        var xRem = xSign ? x.not() : x,
		            yRem = ySign ? y.not() : y;
		        var xDigit = 0, yDigit = 0;
		        var xDivMod = null, yDivMod = null;
		        var result = [];
		        while (!xRem.isZero() || !yRem.isZero()) {
		            xDivMod = divModAny(xRem, highestPower2);
		            xDigit = xDivMod[1].toJSNumber();
		            if (xSign) {
		                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
		            }

		            yDivMod = divModAny(yRem, highestPower2);
		            yDigit = yDivMod[1].toJSNumber();
		            if (ySign) {
		                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
		            }

		            xRem = xDivMod[0];
		            yRem = yDivMod[0];
		            result.push(fn(xDigit, yDigit));
		        }
		        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
		        for (var i = result.length - 1; i >= 0; i -= 1) {
		            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
		        }
		        return sum;
		    }

		    BigInteger.prototype.not = function () {
		        return this.negate().prev();
		    };
		    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

		    BigInteger.prototype.and = function (n) {
		        return bitwise(this, n, function (a, b) { return a & b; });
		    };
		    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

		    BigInteger.prototype.or = function (n) {
		        return bitwise(this, n, function (a, b) { return a | b; });
		    };
		    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

		    BigInteger.prototype.xor = function (n) {
		        return bitwise(this, n, function (a, b) { return a ^ b; });
		    };
		    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

		    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
		    function roughLOB(n) { // get lowestOneBit (rough)
		        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
		        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
		        var v = n.value,
		            x = typeof v === "number" ? v | LOBMASK_I :
		                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
		                    v[0] + v[1] * BASE | LOBMASK_BI;
		        return x & -x;
		    }

		    function integerLogarithm(value, base) {
		        if (base.compareTo(value) <= 0) {
		            var tmp = integerLogarithm(value, base.square(base));
		            var p = tmp.p;
		            var e = tmp.e;
		            var t = p.multiply(base);
		            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
		        }
		        return { p: bigInt(1), e: 0 };
		    }

		    BigInteger.prototype.bitLength = function () {
		        var n = this;
		        if (n.compareTo(bigInt(0)) < 0) {
		            n = n.negate().subtract(bigInt(1));
		        }
		        if (n.compareTo(bigInt(0)) === 0) {
		            return bigInt(0);
		        }
		        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
		    };
		    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

		    function max(a, b) {
		        a = parseValue(a);
		        b = parseValue(b);
		        return a.greater(b) ? a : b;
		    }
		    function min(a, b) {
		        a = parseValue(a);
		        b = parseValue(b);
		        return a.lesser(b) ? a : b;
		    }
		    function gcd(a, b) {
		        a = parseValue(a).abs();
		        b = parseValue(b).abs();
		        if (a.equals(b)) return a;
		        if (a.isZero()) return b;
		        if (b.isZero()) return a;
		        var c = Integer[1], d, t;
		        while (a.isEven() && b.isEven()) {
		            d = min(roughLOB(a), roughLOB(b));
		            a = a.divide(d);
		            b = b.divide(d);
		            c = c.multiply(d);
		        }
		        while (a.isEven()) {
		            a = a.divide(roughLOB(a));
		        }
		        do {
		            while (b.isEven()) {
		                b = b.divide(roughLOB(b));
		            }
		            if (a.greater(b)) {
		                t = b; b = a; a = t;
		            }
		            b = b.subtract(a);
		        } while (!b.isZero());
		        return c.isUnit() ? a : a.multiply(c);
		    }
		    function lcm(a, b) {
		        a = parseValue(a).abs();
		        b = parseValue(b).abs();
		        return a.divide(gcd(a, b)).multiply(b);
		    }
		    function randBetween(a, b, rng) {
		        a = parseValue(a);
		        b = parseValue(b);
		        var usedRNG = rng || Math.random;
		        var low = min(a, b), high = max(a, b);
		        var range = high.subtract(low).add(1);
		        if (range.isSmall) return low.add(Math.floor(usedRNG() * range));
		        var digits = toBase(range, BASE).value;
		        var result = [], restricted = true;
		        for (var i = 0; i < digits.length; i++) {
		            var top = restricted ? digits[i] + (i + 1 < digits.length ? digits[i + 1] / BASE : 0) : BASE;
		            var digit = truncate(usedRNG() * top);
		            result.push(digit);
		            if (digit < digits[i]) restricted = false;
		        }
		        return low.add(Integer.fromArray(result, BASE, false));
		    }

		    var parseBase = function (text, base, alphabet, caseSensitive) {
		        alphabet = alphabet || DEFAULT_ALPHABET;
		        text = String(text);
		        if (!caseSensitive) {
		            text = text.toLowerCase();
		            alphabet = alphabet.toLowerCase();
		        }
		        var length = text.length;
		        var i;
		        var absBase = Math.abs(base);
		        var alphabetValues = {};
		        for (i = 0; i < alphabet.length; i++) {
		            alphabetValues[alphabet[i]] = i;
		        }
		        for (i = 0; i < length; i++) {
		            var c = text[i];
		            if (c === "-") continue;
		            if (c in alphabetValues) {
		                if (alphabetValues[c] >= absBase) {
		                    if (c === "1" && absBase === 1) continue;
		                    throw new Error(c + " is not a valid digit in base " + base + ".");
		                }
		            }
		        }
		        base = parseValue(base);
		        var digits = [];
		        var isNegative = text[0] === "-";
		        for (i = isNegative ? 1 : 0; i < text.length; i++) {
		            var c = text[i];
		            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
		            else if (c === "<") {
		                var start = i;
		                do { i++; } while (text[i] !== ">" && i < text.length);
		                digits.push(parseValue(text.slice(start + 1, i)));
		            }
		            else throw new Error(c + " is not a valid character");
		        }
		        return parseBaseFromArray(digits, base, isNegative);
		    };

		    function parseBaseFromArray(digits, base, isNegative) {
		        var val = Integer[0], pow = Integer[1], i;
		        for (i = digits.length - 1; i >= 0; i--) {
		            val = val.add(digits[i].times(pow));
		            pow = pow.times(base);
		        }
		        return isNegative ? val.negate() : val;
		    }

		    function stringify(digit, alphabet) {
		        alphabet = alphabet || DEFAULT_ALPHABET;
		        if (digit < alphabet.length) {
		            return alphabet[digit];
		        }
		        return "<" + digit + ">";
		    }

		    function toBase(n, base) {
		        base = bigInt(base);
		        if (base.isZero()) {
		            if (n.isZero()) return { value: [0], isNegative: false };
		            throw new Error("Cannot convert nonzero numbers to base 0.");
		        }
		        if (base.equals(-1)) {
		            if (n.isZero()) return { value: [0], isNegative: false };
		            if (n.isNegative())
		                return {
		                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
		                        .map(Array.prototype.valueOf, [1, 0])
		                    ),
		                    isNegative: false
		                };

		            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
		                .map(Array.prototype.valueOf, [0, 1]);
		            arr.unshift([1]);
		            return {
		                value: [].concat.apply([], arr),
		                isNegative: false
		            };
		        }

		        var neg = false;
		        if (n.isNegative() && base.isPositive()) {
		            neg = true;
		            n = n.abs();
		        }
		        if (base.isUnit()) {
		            if (n.isZero()) return { value: [0], isNegative: false };

		            return {
		                value: Array.apply(null, Array(n.toJSNumber()))
		                    .map(Number.prototype.valueOf, 1),
		                isNegative: neg
		            };
		        }
		        var out = [];
		        var left = n, divmod;
		        while (left.isNegative() || left.compareAbs(base) >= 0) {
		            divmod = left.divmod(base);
		            left = divmod.quotient;
		            var digit = divmod.remainder;
		            if (digit.isNegative()) {
		                digit = base.minus(digit).abs();
		                left = left.next();
		            }
		            out.push(digit.toJSNumber());
		        }
		        out.push(left.toJSNumber());
		        return { value: out.reverse(), isNegative: neg };
		    }

		    function toBaseString(n, base, alphabet) {
		        var arr = toBase(n, base);
		        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
		            return stringify(x, alphabet);
		        }).join('');
		    }

		    BigInteger.prototype.toArray = function (radix) {
		        return toBase(this, radix);
		    };

		    SmallInteger.prototype.toArray = function (radix) {
		        return toBase(this, radix);
		    };

		    NativeBigInt.prototype.toArray = function (radix) {
		        return toBase(this, radix);
		    };

		    BigInteger.prototype.toString = function (radix, alphabet) {
		        if (radix === undefined$1) radix = 10;
		        if (radix !== 10 || alphabet) return toBaseString(this, radix, alphabet);
		        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
		        while (--l >= 0) {
		            digit = String(v[l]);
		            str += zeros.slice(digit.length) + digit;
		        }
		        var sign = this.sign ? "-" : "";
		        return sign + str;
		    };

		    SmallInteger.prototype.toString = function (radix, alphabet) {
		        if (radix === undefined$1) radix = 10;
		        if (radix != 10 || alphabet) return toBaseString(this, radix, alphabet);
		        return String(this.value);
		    };

		    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

		    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); };

		    BigInteger.prototype.valueOf = function () {
		        return parseInt(this.toString(), 10);
		    };
		    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

		    SmallInteger.prototype.valueOf = function () {
		        return this.value;
		    };
		    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
		    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
		        return parseInt(this.toString(), 10);
		    };

		    function parseStringValue(v) {
		        if (isPrecise(+v)) {
		            var x = +v;
		            if (x === truncate(x))
		                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
		            throw new Error("Invalid integer: " + v);
		        }
		        var sign = v[0] === "-";
		        if (sign) v = v.slice(1);
		        var split = v.split(/e/i);
		        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
		        if (split.length === 2) {
		            var exp = split[1];
		            if (exp[0] === "+") exp = exp.slice(1);
		            exp = +exp;
		            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
		            var text = split[0];
		            var decimalPlace = text.indexOf(".");
		            if (decimalPlace >= 0) {
		                exp -= text.length - decimalPlace - 1;
		                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
		            }
		            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
		            text += (new Array(exp + 1)).join("0");
		            v = text;
		        }
		        var isValid = /^([0-9][0-9]*)$/.test(v);
		        if (!isValid) throw new Error("Invalid integer: " + v);
		        if (supportsNativeBigInt) {
		            return new NativeBigInt(BigInt(sign ? "-" + v : v));
		        }
		        var r = [], max = v.length, l = LOG_BASE, min = max - l;
		        while (max > 0) {
		            r.push(+v.slice(min, max));
		            min -= l;
		            if (min < 0) min = 0;
		            max -= l;
		        }
		        trim(r);
		        return new BigInteger(r, sign);
		    }

		    function parseNumberValue(v) {
		        if (supportsNativeBigInt) {
		            return new NativeBigInt(BigInt(v));
		        }
		        if (isPrecise(v)) {
		            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
		            return new SmallInteger(v);
		        }
		        return parseStringValue(v.toString());
		    }

		    function parseValue(v) {
		        if (typeof v === "number") {
		            return parseNumberValue(v);
		        }
		        if (typeof v === "string") {
		            return parseStringValue(v);
		        }
		        if (typeof v === "bigint") {
		            return new NativeBigInt(v);
		        }
		        return v;
		    }
		    // Pre-define numbers in range [-999,999]
		    for (var i = 0; i < 1000; i++) {
		        Integer[i] = parseValue(i);
		        if (i > 0) Integer[-i] = parseValue(-i);
		    }
		    // Backwards compatibility
		    Integer.one = Integer[1];
		    Integer.zero = Integer[0];
		    Integer.minusOne = Integer[-1];
		    Integer.max = max;
		    Integer.min = min;
		    Integer.gcd = gcd;
		    Integer.lcm = lcm;
		    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
		    Integer.randBetween = randBetween;

		    Integer.fromArray = function (digits, base, isNegative) {
		        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
		    };

		    return Integer;
		})();

		// Node.js check
		if (module.hasOwnProperty("exports")) {
		    module.exports = bigInt;
		}
	} (BigInteger));
	return BigInteger.exports;
}

var BigIntegerExports = /*@__PURE__*/ requireBigInteger();
var bigInt = /*@__PURE__*/getDefaultExportFromCjs(BigIntegerExports);

function fromString$1(s, radix) {
    if (typeof s == "string") {
        if (s.slice(0,2) == "0x") {
            return bigInt(s.slice(2), 16);
        } else {
            return bigInt(s,radix);
        }
    } else {
        return bigInt(s, radix);
    }
}

const e$1 = fromString$1;

function fromArray$1(a, radix) {
    return bigInt.fromArray(a, radix);
}

function bitLength$1(a) {
    return bigInt(a).bitLength();
}

function isNegative$1(a) {
    return bigInt(a).isNegative();
}

function isZero$1(a) {
    return bigInt(a).isZero();
}

function shiftLeft$1(a, n) {
    return bigInt(a).shiftLeft(n);
}

function shiftRight$1(a, n) {
    return bigInt(a).shiftRight(n);
}

const shl$1 = shiftLeft$1;
const shr$1 = shiftRight$1;

function isOdd$1(a) {
    return bigInt(a).isOdd();
}


function naf$1(n) {
    let E = bigInt(n);
    const res = [];
    while (E.gt(bigInt.zero)) {
        if (E.isOdd()) {
            const z = 2 - E.mod(4).toJSNumber();
            res.push( z );
            E = E.minus(z);
        } else {
            res.push( 0 );
        }
        E = E.shiftRight(1);
    }
    return res;
}

function bits$1(n) {
    let E = bigInt(n);
    const res = [];
    while (E.gt(bigInt.zero)) {
        if (E.isOdd()) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E.shiftRight(1);
    }
    return res;
}

function toNumber$1(s) {
    if (!s.lt(bigInt("9007199254740992", 10))) {
        throw new Error("Number too big");
    }
    return s.toJSNumber();
}

function toArray$1(s, radix) {
    return bigInt(s).toArray(radix);
}

function add$1(a, b) {
    return bigInt(a).add(bigInt(b));
}

function sub$1(a, b) {
    return bigInt(a).minus(bigInt(b));
}

function neg$1(a) {
    return bigInt.zero.minus(bigInt(a));
}

function mul$1(a, b) {
    return bigInt(a).times(bigInt(b));
}

function square$1(a) {
    return bigInt(a).square();
}

function pow$1(a, b) {
    return bigInt(a).pow(bigInt(b));
}

function exp$1(a, b) {
    return bigInt(a).pow(bigInt(b));
}

function abs$1(a) {
    return bigInt(a).abs();
}

function div$1(a, b) {
    return bigInt(a).divide(bigInt(b));
}

function mod$1(a, b) {
    return bigInt(a).mod(bigInt(b));
}

function eq$1(a, b) {
    return bigInt(a).eq(bigInt(b));
}

function neq$1(a, b) {
    return bigInt(a).neq(bigInt(b));
}

function lt$1(a, b) {
    return bigInt(a).lt(bigInt(b));
}

function gt$1(a, b) {
    return bigInt(a).gt(bigInt(b));
}

function leq$1(a, b) {
    return bigInt(a).leq(bigInt(b));
}

function geq$1(a, b) {
    return bigInt(a).geq(bigInt(b));
}

function band$1(a, b) {
    return bigInt(a).and(bigInt(b));
}

function bor$1(a, b) {
    return bigInt(a).or(bigInt(b));
}

function bxor$1(a, b) {
    return bigInt(a).xor(bigInt(b));
}

function land$1(a, b) {
    return (!bigInt(a).isZero()) && (!bigInt(b).isZero());
}

function lor$1(a, b) {
    return (!bigInt(a).isZero()) || (!bigInt(b).isZero());
}

function lnot$1(a) {
    return bigInt(a).isZero();
}

var Scalar_bigint = /*#__PURE__*/Object.freeze({
	__proto__: null,
	abs: abs$1,
	add: add$1,
	band: band$1,
	bitLength: bitLength$1,
	bits: bits$1,
	bor: bor$1,
	bxor: bxor$1,
	div: div$1,
	e: e$1,
	eq: eq$1,
	exp: exp$1,
	fromArray: fromArray$1,
	fromString: fromString$1,
	geq: geq$1,
	gt: gt$1,
	isNegative: isNegative$1,
	isOdd: isOdd$1,
	isZero: isZero$1,
	land: land$1,
	leq: leq$1,
	lnot: lnot$1,
	lor: lor$1,
	lt: lt$1,
	mod: mod$1,
	mul: mul$1,
	naf: naf$1,
	neg: neg$1,
	neq: neq$1,
	pow: pow$1,
	shiftLeft: shiftLeft$1,
	shiftRight: shiftRight$1,
	shl: shl$1,
	shr: shr$1,
	square: square$1,
	sub: sub$1,
	toArray: toArray$1,
	toNumber: toNumber$1
});

const supportsNativeBigInt$1 = typeof BigInt === "function";

let Scalar$1 = {};
if (supportsNativeBigInt$1) {
    Object.assign(Scalar$1, Scalar_native);
} else {
    Object.assign(Scalar$1, Scalar_bigint);
}


// Returns a buffer with Little Endian Representation
Scalar$1.toRprLE = function rprBE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new Uint32Array(buff.buffer, o, n8/4);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v[i] = parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16);
    for (let i=l; i<v.length; i++) v[i] = 0;
    for (let i=v.length*4; i<n8; i++) buff[i] = Scalar$1.toNumber(Scalar$1.band(Scalar$1.shiftRight(e, i*8), 0xFF));
};

// Returns a buffer with Big Endian Representation
Scalar$1.toRprBE = function rprLEM(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v.setUint32(n8-i*4 -4, parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16), false);
    for (let i=0; i<n8/4-l; i++) v[i] = 0;
};

// Pases a buffer with Little Endian Representation
Scalar$1.fromRprLE = function rprLEM(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new Uint32Array(buff.buffer, o, n8/4);
    const a = new Array(n8/4);
    v.forEach( (ch,i) => a[a.length-i-1] = ch.toString(16).padStart(8,"0") );
    return Scalar$1.fromString(a.join(""), 16);
};

// Pases a buffer with Big Endian Representation
Scalar$1.fromRprBE = function rprLEM(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const a = new Array(n8/4);
    for (let i=0; i<n8/4; i++) {
        a[i] = v.getUint32(i*4, false).toString(16).padStart(8, "0");
    }
    return Scalar$1.fromString(a.join(""), 16);
};

Scalar$1.toString = function toString(a, radix) {
    return a.toString(radix);
};

Scalar$1.toLEBuff = function toLEBuff(a) {
    const buff = new Uint8Array(Math.floor((Scalar$1.bitLength(a) - 1) / 8) +1);
    Scalar$1.toRprLE(buff, 0, a, buff.byteLength);
    return buff;
};


Scalar$1.zero = Scalar$1.e(0);
Scalar$1.one = Scalar$1.e(1);

let {
    toRprLE,
    toRprBE,
    fromRprLE,
    fromRprBE,
    toString,
    toLEBuff,
    zero,
    one,
    fromString,
    e,
    fromArray,
    bitLength,
    isNegative,
    isZero,
    shiftLeft,
    shiftRight,
    shl,
    shr,
    isOdd,
    naf,
    bits,
    toNumber,
    toArray,
    add,
    sub,
    neg,
    mul,
    square,
    pow,
    exp,
    abs,
    div,
    mod,
    eq,
    neq,
    lt,
    gt,
    leq,
    geq,
    band,
    bor,
    bxor,
    land,
    lor,
    lnot,
} = Scalar$1;

var _Scalar = /*#__PURE__*/Object.freeze({
	__proto__: null,
	abs: abs,
	add: add,
	band: band,
	bitLength: bitLength,
	bits: bits,
	bor: bor,
	bxor: bxor,
	div: div,
	e: e,
	eq: eq,
	exp: exp,
	fromArray: fromArray,
	fromRprBE: fromRprBE,
	fromRprLE: fromRprLE,
	fromString: fromString,
	geq: geq,
	gt: gt,
	isNegative: isNegative,
	isOdd: isOdd,
	isZero: isZero,
	land: land,
	leq: leq,
	lnot: lnot,
	lor: lor,
	lt: lt,
	mod: mod,
	mul: mul,
	naf: naf,
	neg: neg,
	neq: neq,
	one: one,
	pow: pow,
	shiftLeft: shiftLeft,
	shiftRight: shiftRight,
	shl: shl,
	shr: shr,
	square: square,
	sub: sub,
	toArray: toArray,
	toLEBuff: toLEBuff,
	toNumber: toNumber,
	toRprBE: toRprBE,
	toRprLE: toRprLE,
	toString: toString,
	zero: zero
});

function quarterRound(st, a, b, c, d) {

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 16) | ((st[d]>>>16) & 0xFFFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 12) | ((st[b]>>>20) & 0xFFF)) >>> 0;

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 8) | ((st[d]>>>24) & 0xFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 7) | ((st[b]>>>25) & 0x7F)) >>> 0;
}

function doubleRound(st) {
    quarterRound(st, 0, 4, 8,12);
    quarterRound(st, 1, 5, 9,13);
    quarterRound(st, 2, 6,10,14);
    quarterRound(st, 3, 7,11,15);

    quarterRound(st, 0, 5,10,15);
    quarterRound(st, 1, 6,11,12);
    quarterRound(st, 2, 7, 8,13);
    quarterRound(st, 3, 4, 9,14);
}

class ChaCha {

    constructor(seed) {
        seed = seed || [0,0,0,0,0,0,0,0];
        this.state = [
            0x61707865,
            0x3320646E,
            0x79622D32,
            0x6B206574,
            seed[0],
            seed[1],
            seed[2],
            seed[3],
            seed[4],
            seed[5],
            seed[6],
            seed[7],
            0,
            0,
            0,
            0
        ];
        this.idx = 16;
        this.buff = new Array(16);
    }

    nextU32() {
        if (this.idx == 16) this.update();
        return this.buff[this.idx++];
    }

    nextU64() {
        return add(mul(this.nextU32(), 0x100000000), this.nextU32());
    }

    nextBool() {
        return (this.nextU32() & 1) == 1;
    }

    update() {
        // Copy the state
        for (let i=0; i<16; i++) this.buff[i] = this.state[i];

        // Apply the rounds
        for (let i=0; i<10; i++) doubleRound(this.buff);

        // Add to the initial
        for (let i=0; i<16; i++) this.buff[i] = (this.buff[i] + this.state[i]) >>> 0;

        this.idx = 0;

        this.state[12] = (this.state[12] + 1) >>> 0;
        if (this.state[12] != 0) return;
        this.state[13] = (this.state[13] + 1) >>> 0;
        if (this.state[13] != 0) return;
        this.state[14] = (this.state[14] + 1) >>> 0;
        if (this.state[14] != 0) return;
        this.state[15] = (this.state[15] + 1) >>> 0;
    }
}

function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (process.browser) { // Browser
        if (typeof globalThis.crypto !== "undefined") { // Supported
            globalThis.crypto.getRandomValues(array);
        } else { // fallback
            for (let i=0; i<n; i++) {
                array[i] = (Math.random()*4294967296)>>>0;
            }
        }
    }
    else { // NodeJS
        crypto.randomFillSync(array);
    }
    return array;
}

function getRandomSeed() {
    const arr = getRandomBytes(32);
    const arrV = new Uint32Array(arr.buffer);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed.push(arrV[i]);
    }
    return seed;
}

let threadRng = null;

function getThreadRng() {
    if (threadRng) return threadRng;
    threadRng = new ChaCha(getRandomSeed());
    return threadRng;
}

var wasmcurves = {};

var utils$2 = {};

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var hasRequiredUtils$1;

function requireUtils$1 () {
	if (hasRequiredUtils$1) return utils$2;
	hasRequiredUtils$1 = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();

	utils$2.bigInt2BytesLE = function bigInt2BytesLE(_a, len) {
	    const b = Array(len);
	    let v = bigInt(_a);
	    for (let i=0; i<len; i++) {
	        b[i] = v.and(0xFF).toJSNumber();
	        v = v.shiftRight(8);
	    }
	    return b;
	};

	utils$2.bigInt2U32LE = function bigInt2BytesLE(_a, len) {
	    const b = Array(len);
	    let v = bigInt(_a);
	    for (let i=0; i<len; i++) {
	        b[i] = v.and(0xFFFFFFFF).toJSNumber();
	        v = v.shiftRight(32);
	    }
	    return b;
	};

	utils$2.isOcamNum = function(a) {
	    if (!Array.isArray(a)) return false;
	    if (a.length != 3) return false;
	    if (typeof a[0] !== "number") return false;
	    if (typeof a[1] !== "number") return false;
	    if (!Array.isArray(a[2])) return false;
	    return true;
	};
	return utils$2;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_int;
var hasRequiredBuild_int;

function requireBuild_int () {
	if (hasRequiredBuild_int) return build_int;
	hasRequiredBuild_int = 1;
	const utils = /*@__PURE__*/ requireUtils$1();

	build_int = function buildInt(module, n64, _prefix) {

	    const prefix = _prefix || "int";
	    if (module.modules[prefix]) return prefix;  // already builded
	    module.modules[prefix] = {};

	    const n32 = n64*2;
	    const n8 = n64*8;

	    module.alloc(n8, utils.bigInt2BytesLE(1, n8));

	    function buildCopy() {
	        const f = module.addFunction(prefix+"_copy");
	        f.addParam("px", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<n64; i++) {
	            f.addCode(
	                c.i64_store(
	                    c.getLocal("pr"),
	                    i*8,
	                    c.i64_load(
	                        c.getLocal("px"),
	                        i*8
	                    )
	                )
	            );
	        }
	    }

	    function buildZero() {
	        const f = module.addFunction(prefix+"_zero");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<n64; i++) {
	            f.addCode(
	                c.i64_store(
	                    c.getLocal("pr"),
	                    i*8,
	                    c.i64_const(0)
	                )
	            );
	        }
	    }

	    function buildOne() {
	        const f = module.addFunction(prefix+"_one");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.i64_store(
	                c.getLocal("pr"),
	                0,
	                c.i64_const(1)
	            )
	        );
	        for (let i=1; i<n64; i++) {
	            f.addCode(
	                c.i64_store(
	                    c.getLocal("pr"),
	                    i*8,
	                    c.i64_const(0)
	                )
	            );
	        }
	    }

	    function buildIsZero() {
	        const f = module.addFunction(prefix+"_isZero");
	        f.addParam("px", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        function getCompCode(n) {
	            if (n==0) {
	                return  c.ret(c.i64_eqz(
	                    c.i64_load(c.getLocal("px"))
	                ));
	            }
	            return c.if(
	                c.i64_eqz(
	                    c.i64_load(c.getLocal("px"), n*8 )
	                ),
	                getCompCode(n-1),
	                c.ret(c.i32_const(0))
	            );
	        }

	        f.addCode(getCompCode(n64-1));
	        f.addCode(c.ret(c.i32_const(0)));
	    }

	    function buildEq() {
	        const f = module.addFunction(prefix+"_eq");
	        f.addParam("px", "i32");
	        f.addParam("py", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        function getCompCode(n) {
	            if (n==0) {
	                return  c.ret(c.i64_eq(
	                    c.i64_load(c.getLocal("px")),
	                    c.i64_load(c.getLocal("py"))
	                ));
	            }
	            return c.if(
	                c.i64_eq(
	                    c.i64_load(c.getLocal("px"), n*8 ),
	                    c.i64_load(c.getLocal("py"), n*8 )
	                ),
	                getCompCode(n-1),
	                c.ret(c.i32_const(0))
	            );
	        }

	        f.addCode(getCompCode(n64-1));
	        f.addCode(c.ret(c.i32_const(0)));
	    }



	    function buildGte() {
	        const f = module.addFunction(prefix+"_gte");
	        f.addParam("px", "i32");
	        f.addParam("py", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        function getCompCode(n) {
	            if (n==0) {
	                return  c.ret(c.i64_ge_u(
	                    c.i64_load(c.getLocal("px")),
	                    c.i64_load(c.getLocal("py"))
	                ));
	            }
	            return c.if(
	                c.i64_lt_u(
	                    c.i64_load(c.getLocal("px"), n*8 ),
	                    c.i64_load(c.getLocal("py"), n*8 )
	                ),
	                c.ret(c.i32_const(0)),
	                c.if(
	                    c.i64_gt_u(
	                        c.i64_load(c.getLocal("px"), n*8 ),
	                        c.i64_load(c.getLocal("py"), n*8 )
	                    ),
	                    c.ret(c.i32_const(1)),
	                    getCompCode(n-1)
	                )
	            );
	        }

	        f.addCode(getCompCode(n64-1));
	        f.addCode(c.ret(c.i32_const(0)));
	    }



	    function buildAdd() {

	        const f = module.addFunction(prefix+"_add");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");
	        f.setReturnType("i32");
	        f.addLocal("c", "i64");

	        const c = f.getCodeBuilder();

	        f.addCode(c.setLocal(
	            "c",
	            c.i64_add(
	                c.i64_load32_u(c.getLocal("x")),
	                c.i64_load32_u(c.getLocal("y"))
	            )
	        ));

	        f.addCode(c.i64_store32(
	            c.getLocal("r"),
	            c.getLocal("c"),
	        ));

	        for (let i=1; i<n32; i++) {
	            f.addCode(c.setLocal( "c",
	                c.i64_add(
	                    c.i64_add(
	                        c.i64_load32_u(c.getLocal("x"), 4*i),
	                        c.i64_load32_u(c.getLocal("y"), 4*i)
	                    ),
	                    c.i64_shr_u (c.getLocal("c"), c.i64_const(32))
	                )
	            ));

	            f.addCode(c.i64_store32(
	                c.getLocal("r"),
	                i*4,
	                c.getLocal("c")
	            ));
	        }

	        f.addCode(c.i32_wrap_i64(c.i64_shr_u (c.getLocal("c"), c.i64_const(32))));
	    }


	    function buildSub() {

	        const f = module.addFunction(prefix+"_sub");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");
	        f.setReturnType("i32");
	        f.addLocal("c", "i64");

	        const c = f.getCodeBuilder();

	        f.addCode(c.setLocal(
	            "c",
	            c.i64_sub(
	                c.i64_load32_u(c.getLocal("x")),
	                c.i64_load32_u(c.getLocal("y"))
	            )
	        ));

	        f.addCode(c.i64_store32(
	            c.getLocal("r"),
	            c.i64_and(
	                c.getLocal("c"),
	                c.i64_const("0xFFFFFFFF")
	            )
	        ));

	        for (let i=1; i<n32; i++) {
	            f.addCode(c.setLocal( "c",
	                c.i64_add(
	                    c.i64_sub(
	                        c.i64_load32_u(c.getLocal("x"), 4*i),
	                        c.i64_load32_u(c.getLocal("y"), 4*i)
	                    ),
	                    c.i64_shr_s (c.getLocal("c"), c.i64_const(32))
	                )
	            ));

	            f.addCode(c.i64_store32(
	                c.getLocal("r"),
	                i*4,
	                c.i64_and( c.getLocal("c"), c.i64_const("0xFFFFFFFF"))
	            ));
	        }

	        f.addCode(c.i32_wrap_i64 ( c.i64_shr_s (c.getLocal("c"), c.i64_const(32))));
	    }


	    function buildMul() {

	        const f = module.addFunction(prefix+"_mul");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("c0", "i64");
	        f.addLocal("c1", "i64");


	        for (let i=0;i<n32; i++) {
	            f.addLocal("x"+i, "i64");
	            f.addLocal("y"+i, "i64");
	        }

	        const c = f.getCodeBuilder();

	        const loadX = [];
	        const loadY = [];
	        function mulij(i, j) {
	            let X,Y;
	            if (!loadX[i]) {
	                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
	                loadX[i] = true;
	            } else {
	                X = c.getLocal("x"+i);
	            }
	            if (!loadY[j]) {
	                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
	                loadY[j] = true;
	            } else {
	                Y = c.getLocal("y"+j);
	            }

	            return c.i64_mul( X, Y );
	        }

	        let c0 = "c0";
	        let c1 = "c1";

	        for (let k=0; k<n32*2-1; k++) {
	            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );

	            }

	            f.addCode(
	                c.i64_store32(
	                    c.getLocal("r"),
	                    k*4,
	                    c.getLocal(c0)
	                )
	            );
	            [c0, c1] = [c1, c0];
	            f.addCode(
	                c.setLocal(c1,
	                    c.i64_shr_u(
	                        c.getLocal(c0),
	                        c.i64_const(32)
	                    )
	                )
	            );
	        }
	        f.addCode(
	            c.i64_store32(
	                c.getLocal("r"),
	                n32*4*2-4,
	                c.getLocal(c0)
	            )
	        );

	    }



	    function buildSquare() {

	        const f = module.addFunction(prefix+"_square");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("c0", "i64");
	        f.addLocal("c1", "i64");
	        f.addLocal("c0_old", "i64");
	        f.addLocal("c1_old", "i64");


	        for (let i=0;i<n32; i++) {
	            f.addLocal("x"+i, "i64");
	        }

	        const c = f.getCodeBuilder();

	        const loadX = [];
	        function mulij(i, j) {
	            let X,Y;
	            if (!loadX[i]) {
	                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
	                loadX[i] = true;
	            } else {
	                X = c.getLocal("x"+i);
	            }
	            if (!loadX[j]) {
	                Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
	                loadX[j] = true;
	            } else {
	                Y = c.getLocal("x"+j);
	            }

	            return c.i64_mul( X, Y );
	        }

	        let c0 = "c0";
	        let c1 = "c1";
	        let c0_old = "c0_old";
	        let c1_old = "c1_old";

	        for (let k=0; k<n32*2-1; k++) {
	            f.addCode(
	                c.setLocal(c0, c.i64_const(0)),
	                c.setLocal(c1, c.i64_const(0)),
	            );

	            for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }

	            // Multiply by 2
	            f.addCode(
	                c.setLocal(c0,
	                    c.i64_shl(
	                        c.i64_and(
	                            c.getLocal(c0),
	                            c.i64_const(0xFFFFFFFF)
	                        ),
	                        c.i64_const(1)
	                    )
	                )
	            );

	            f.addCode(
	                c.setLocal(c1,
	                    c.i64_add(
	                        c.i64_shl(
	                            c.getLocal(c1),
	                            c.i64_const(1)
	                        ),
	                        c.i64_shr_u(
	                            c.getLocal(c0),
	                            c.i64_const(32)
	                        )
	                    )
	                )
	            );

	            if (k%2 == 0) {
	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(k>>1, k>>1)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }

	            // Add the old carry

	            if (k>0) {
	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            c.i64_and(
	                                c.getLocal(c0_old),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.i64_add(
	                                c.getLocal(c1),
	                                c.i64_shr_u(
	                                    c.getLocal(c0),
	                                    c.i64_const(32)
	                                )
	                            ),
	                            c.getLocal(c1_old)
	                        )
	                    )
	                );
	            }

	            f.addCode(
	                c.i64_store32(
	                    c.getLocal("r"),
	                    k*4,
	                    c.getLocal(c0)
	                )
	            );

	            f.addCode(
	                c.setLocal(
	                    c0_old,
	                    c.getLocal(c1)
	                ),
	                c.setLocal(
	                    c1_old,
	                    c.i64_shr_u(
	                        c.getLocal(c0_old),
	                        c.i64_const(32)
	                    )
	                )
	            );

	        }
	        f.addCode(
	            c.i64_store32(
	                c.getLocal("r"),
	                n32*4*2-4,
	                c.getLocal(c0_old)
	            )
	        );

	    }


	    function buildSquareOld() {
	        const f = module.addFunction(prefix+"_squareOld");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
	    }

	    function _buildMul1() {
	        const f = module.addFunction(prefix+"__mul1");
	        f.addParam("px", "i32");
	        f.addParam("y", "i64");
	        f.addParam("pr", "i32");
	        f.addLocal("c", "i64");

	        const c = f.getCodeBuilder();

	        f.addCode(c.setLocal(
	            "c",
	            c.i64_mul(
	                c.i64_load32_u(c.getLocal("px"), 0, 0),
	                c.getLocal("y")
	            )
	        ));

	        f.addCode(c.i64_store32(
	            c.getLocal("pr"),
	            0,
	            0,
	            c.getLocal("c"),
	        ));

	        for (let i=1; i<n32; i++) {
	            f.addCode(c.setLocal( "c",
	                c.i64_add(
	                    c.i64_mul(
	                        c.i64_load32_u(c.getLocal("px"), 4*i, 0),
	                        c.getLocal("y")
	                    ),
	                    c.i64_shr_u (c.getLocal("c"), c.i64_const(32))
	                )
	            ));

	            f.addCode(c.i64_store32(
	                c.getLocal("pr"),
	                i*4,
	                0,
	                c.getLocal("c")
	            ));
	        }
	    }

	    function _buildAdd1() {
	        const f = module.addFunction(prefix+"__add1");
	        f.addParam("x", "i32");
	        f.addParam("y", "i64");
	        f.addLocal("c", "i64");
	        f.addLocal("px", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.setLocal("px", c.getLocal("x")));

	        f.addCode(c.setLocal(
	            "c",
	            c.i64_add(
	                c.i64_load32_u(c.getLocal("px"), 0, 0),
	                c.getLocal("y")
	            )
	        ));

	        f.addCode(c.i64_store32(
	            c.getLocal("px"),
	            0,
	            0,
	            c.getLocal("c"),
	        ));

	        f.addCode(c.setLocal(
	            "c",
	            c.i64_shr_u(
	                c.getLocal("c"),
	                c.i64_const(32)
	            )
	        ));

	        f.addCode(c.block(c.loop(
	            c.br_if(
	                1,
	                c.i64_eqz(c.getLocal("c"))
	            ),
	            c.setLocal(
	                "px",
	                c.i32_add(
	                    c.getLocal("px"),
	                    c.i32_const(4)
	                )
	            ),

	            c.setLocal(
	                "c",
	                c.i64_add(
	                    c.i64_load32_u(c.getLocal("px"), 0, 0),
	                    c.getLocal("c")
	                )
	            ),

	            c.i64_store32(
	                c.getLocal("px"),
	                0,
	                0,
	                c.getLocal("c"),
	            ),

	            c.setLocal(
	                "c",
	                c.i64_shr_u(
	                    c.getLocal("c"),
	                    c.i64_const(32)
	                )
	            ),

	            c.br(0)
	        )));
	    }


	    function buildDiv() {
	        _buildMul1();
	        _buildAdd1();

	        const f = module.addFunction(prefix+"_div");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("c", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("rr", "i32");
	        f.addLocal("cc", "i32");
	        f.addLocal("eX", "i32");
	        f.addLocal("eY", "i32");
	        f.addLocal("sy", "i64");
	        f.addLocal("sx", "i64");
	        f.addLocal("ec", "i32");

	        const c = f.getCodeBuilder();

	        const Y = c.i32_const(module.alloc(n8));
	        const Caux = c.i32_const(module.alloc(n8));
	        const Raux = c.i32_const(module.alloc(n8));
	        const C = c.getLocal("cc");
	        const R = c.getLocal("rr");
	        const pr1 = module.alloc(n8*2);
	        const R1 = c.i32_const(pr1);
	        const R2 = c.i32_const(pr1+n8);

	        // Ic c is 0 then store it in an auxiliary buffer
	        f.addCode(c.if(
	            c.getLocal("c"),
	            c.setLocal("cc", c.getLocal("c")),
	            c.setLocal("cc", Caux)
	        ));

	        // Ic r is 0 then store it in an auxiliary buffer
	        f.addCode(c.if(
	            c.getLocal("r"),
	            c.setLocal("rr", c.getLocal("r")),
	            c.setLocal("rr", Raux)
	        ));

	        // Copy
	        f.addCode(c.call(prefix + "_copy", c.getLocal("x"), R));
	        f.addCode(c.call(prefix + "_copy", c.getLocal("y"), Y));
	        f.addCode(c.call(prefix + "_zero", C));
	        f.addCode(c.call(prefix + "_zero", R1));


	        f.addCode(c.setLocal("eX", c.i32_const(n8-1)));
	        f.addCode(c.setLocal("eY", c.i32_const(n8-1)));

	        // while (eY>3)&&(Y[eY]==0) ey--;
	        f.addCode(c.block(c.loop(
	            c.br_if(
	                1,
	                c.i32_or(
	                    c.i32_load8_u(
	                        c.i32_add(Y , c.getLocal("eY")),
	                        0,
	                        0
	                    ),
	                    c.i32_eq(
	                        c.getLocal("eY"),
	                        c.i32_const(3)
	                    )
	                )
	            ),
	            c.setLocal("eY", c.i32_sub(c.getLocal("eY"), c.i32_const(1))),
	            c.br(0)
	        )));

	        f.addCode(
	            c.setLocal(
	                "sy",
	                c.i64_add(
	                    c.i64_load32_u(
	                        c.i32_sub(
	                            c.i32_add( Y, c.getLocal("eY")),
	                            c.i32_const(3)
	                        ),
	                        0,
	                        0
	                    ),
	                    c.i64_const(1)
	                )
	            )
	        );

	        // Force a divide by 0 if quotien is 0
	        f.addCode(
	            c.if(
	                c.i64_eq(
	                    c.getLocal("sy"),
	                    c.i64_const(1)
	                ),
	                c.drop(c.i64_div_u(c.i64_const(0), c.i64_const(0)))
	            )
	        );

	        f.addCode(c.block(c.loop(

	            // while (eX>7)&&(Y[eX]==0) ex--;
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_or(
	                        c.i32_load8_u(
	                            c.i32_add(R , c.getLocal("eX")),
	                            0,
	                            0
	                        ),
	                        c.i32_eq(
	                            c.getLocal("eX"),
	                            c.i32_const(7)
	                        )
	                    )
	                ),
	                c.setLocal("eX", c.i32_sub(c.getLocal("eX"), c.i32_const(1))),
	                c.br(0)
	            )),

	            c.setLocal(
	                "sx",
	                c.i64_load(
	                    c.i32_sub(
	                        c.i32_add( R, c.getLocal("eX")),
	                        c.i32_const(7)
	                    ),
	                    0,
	                    0
	                )
	            ),

	            c.setLocal(
	                "sx",
	                c.i64_div_u(
	                    c.getLocal("sx"),
	                    c.getLocal("sy")
	                )
	            ),
	            c.setLocal(
	                "ec",
	                c.i32_sub(
	                    c.i32_sub(
	                        c.getLocal("eX"),
	                        c.getLocal("eY")
	                    ),
	                    c.i32_const(4)
	                )
	            ),

	            // While greater than 32 bits or ec is neg, shr and inc exp
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_and(
	                        c.i64_eqz(
	                            c.i64_and(
	                                c.getLocal("sx"),
	                                c.i64_const("0xFFFFFFFF00000000")
	                            )
	                        ),
	                        c.i32_ge_s(
	                            c.getLocal("ec"),
	                            c.i32_const(0)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "sx",
	                    c.i64_shr_u(
	                        c.getLocal("sx"),
	                        c.i64_const(8)
	                    )
	                ),

	                c.setLocal(
	                    "ec",
	                    c.i32_add(
	                        c.getLocal("ec"),
	                        c.i32_const(1)
	                    )
	                ),
	                c.br(0)
	            )),

	            c.if(
	                c.i64_eqz(c.getLocal("sx")),
	                [
	                    ...c.br_if(
	                        2,
	                        c.i32_eqz(c.call(prefix + "_gte", R, Y))
	                    ),
	                    ...c.setLocal("sx", c.i64_const(1)),
	                    ...c.setLocal("ec", c.i32_const(0))
	                ]
	            ),

	            c.call(prefix + "__mul1", Y, c.getLocal("sx"), R2),
	            c.drop(c.call(
	                prefix + "_sub",
	                R,
	                c.i32_sub(R2, c.getLocal("ec")),
	                R
	            )),
	            c.call(
	                prefix + "__add1",
	                c.i32_add(C, c.getLocal("ec")),
	                c.getLocal("sx")
	            ),
	            c.br(0)
	        )));
	    }

	    function buildInverseMod() {

	        const f = module.addFunction(prefix+"_inverseMod");
	        f.addParam("px", "i32");
	        f.addParam("pm", "i32");
	        f.addParam("pr", "i32");
	        f.addLocal("t", "i32");
	        f.addLocal("newt", "i32");
	        f.addLocal("r", "i32");
	        f.addLocal("qq", "i32");
	        f.addLocal("qr", "i32");
	        f.addLocal("newr", "i32");
	        f.addLocal("swp", "i32");
	        f.addLocal("x", "i32");
	        f.addLocal("signt", "i32");
	        f.addLocal("signnewt", "i32");
	        f.addLocal("signx", "i32");

	        const c = f.getCodeBuilder();

	        const aux1 = c.i32_const(module.alloc(n8));
	        const aux2 = c.i32_const(module.alloc(n8));
	        const aux3 = c.i32_const(module.alloc(n8));
	        const aux4 = c.i32_const(module.alloc(n8));
	        const aux5 = c.i32_const(module.alloc(n8));
	        const aux6 = c.i32_const(module.alloc(n8));
	        const mulBuff = c.i32_const(module.alloc(n8*2));
	        const aux7 = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.setLocal("t", aux1),
	            c.call(prefix + "_zero", aux1),
	            c.setLocal("signt", c.i32_const(0)),
	        );

	        f.addCode(
	            c.setLocal("r", aux2),
	            c.call(prefix + "_copy", c.getLocal("pm"), aux2)
	        );

	        f.addCode(
	            c.setLocal("newt", aux3),
	            c.call(prefix + "_one", aux3),
	            c.setLocal("signnewt", c.i32_const(0)),
	        );

	        f.addCode(
	            c.setLocal("newr", aux4),
	            c.call(prefix + "_copy", c.getLocal("px"), aux4)
	        );




	        f.addCode(c.setLocal("qq", aux5));
	        f.addCode(c.setLocal("qr", aux6));
	        f.addCode(c.setLocal("x", aux7));

	        f.addCode(c.block(c.loop(
	            c.br_if(
	                1,
	                c.call(prefix + "_isZero", c.getLocal("newr") )
	            ),
	            c.call(prefix + "_div", c.getLocal("r"), c.getLocal("newr"), c.getLocal("qq"), c.getLocal("qr")),

	            c.call(prefix + "_mul", c.getLocal("qq"), c.getLocal("newt"), mulBuff),

	            c.if(
	                c.getLocal("signt"),
	                c.if(
	                    c.getLocal("signnewt"),
	                    c.if (
	                        c.call(prefix + "_gte", mulBuff, c.getLocal("t")),
	                        [
	                            ...c.drop(c.call(prefix + "_sub", mulBuff, c.getLocal("t"), c.getLocal("x"))),
	                            ...c.setLocal("signx", c.i32_const(0))
	                        ],
	                        [
	                            ...c.drop(c.call(prefix + "_sub", c.getLocal("t"), mulBuff, c.getLocal("x"))),
	                            ...c.setLocal("signx", c.i32_const(1))
	                        ],
	                    ),
	                    [
	                        ...c.drop(c.call(prefix + "_add", mulBuff, c.getLocal("t"), c.getLocal("x"))),
	                        ...c.setLocal("signx", c.i32_const(1))
	                    ]
	                ),
	                c.if(
	                    c.getLocal("signnewt"),
	                    [
	                        ...c.drop(c.call(prefix + "_add", mulBuff, c.getLocal("t"), c.getLocal("x"))),
	                        ...c.setLocal("signx", c.i32_const(0))
	                    ],
	                    c.if (
	                        c.call(prefix + "_gte", c.getLocal("t"), mulBuff),
	                        [
	                            ...c.drop(c.call(prefix + "_sub", c.getLocal("t"), mulBuff, c.getLocal("x"))),
	                            ...c.setLocal("signx", c.i32_const(0))
	                        ],
	                        [
	                            ...c.drop(c.call(prefix + "_sub", mulBuff, c.getLocal("t"), c.getLocal("x"))),
	                            ...c.setLocal("signx", c.i32_const(1))
	                        ]
	                    )
	                )
	            ),

	            c.setLocal("swp", c.getLocal("t")),
	            c.setLocal("t", c.getLocal("newt")),
	            c.setLocal("newt", c.getLocal("x")),
	            c.setLocal("x", c.getLocal("swp")),

	            c.setLocal("signt", c.getLocal("signnewt")),
	            c.setLocal("signnewt", c.getLocal("signx")),

	            c.setLocal("swp", c.getLocal("r")),
	            c.setLocal("r", c.getLocal("newr")),
	            c.setLocal("newr", c.getLocal("qr")),
	            c.setLocal("qr", c.getLocal("swp")),

	            c.br(0)
	        )));

	        f.addCode(c.if(
	            c.getLocal("signt"),
	            c.drop(c.call(prefix + "_sub", c.getLocal("pm"), c.getLocal("t"), c.getLocal("pr"))),
	            c.call(prefix + "_copy", c.getLocal("t"), c.getLocal("pr"))
	        ));
	    }


	    buildCopy();
	    buildZero();
	    buildIsZero();
	    buildOne();
	    buildEq();
	    buildGte();
	    buildAdd();
	    buildSub();
	    buildMul();
	    buildSquare();
	    buildSquareOld();
	    buildDiv();
	    buildInverseMod();
	    module.exportFunction(prefix+"_copy");
	    module.exportFunction(prefix+"_zero");
	    module.exportFunction(prefix+"_one");
	    module.exportFunction(prefix+"_isZero");
	    module.exportFunction(prefix+"_eq");
	    module.exportFunction(prefix+"_gte");
	    module.exportFunction(prefix+"_add");
	    module.exportFunction(prefix+"_sub");
	    module.exportFunction(prefix+"_mul");
	    module.exportFunction(prefix+"_square");
	    module.exportFunction(prefix+"_squareOld");
	    module.exportFunction(prefix+"_div");
	    module.exportFunction(prefix+"_inverseMod");

	    return prefix;
	};
	return build_int;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_timesscalar;
var hasRequiredBuild_timesscalar;

function requireBuild_timesscalar () {
	if (hasRequiredBuild_timesscalar) return build_timesscalar;
	hasRequiredBuild_timesscalar = 1;
	build_timesscalar = function buildTimesScalar(module, fnName, elementLen, opAB, opAA, opCopy, opInit) {

	    const f = module.addFunction(fnName);
	    f.addParam("base", "i32");
	    f.addParam("scalar", "i32");
	    f.addParam("scalarLength", "i32");
	    f.addParam("r", "i32");
	    f.addLocal("i", "i32");
	    f.addLocal("b", "i32");

	    const c = f.getCodeBuilder();

	    const aux = c.i32_const(module.alloc(elementLen));

	    f.addCode(
	        c.if(
	            c.i32_eqz(c.getLocal("scalarLength")),
	            [
	                ...c.call(opInit, c.getLocal("r")),
	                ...c.ret([])
	            ]
	        )
	    );
	    f.addCode(c.call(opCopy, c.getLocal("base"), aux));
	    f.addCode(c.call(opInit, c.getLocal("r")));
	    f.addCode(c.setLocal("i", c.getLocal("scalarLength")));
	    f.addCode(c.block(c.loop(
	        c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),

	        c.setLocal(
	            "b",
	            c.i32_load8_u(
	                c.i32_add(
	                    c.getLocal("scalar"),
	                    c.getLocal("i")
	                )
	            )
	        ),
	        ...innerLoop(),
	        c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	        c.br(0)
	    )));


	    function innerLoop() {
	        const code = [];
	        for (let i=0; i<8; i++) {
	            code.push(
	                ...c.call(opAA, c.getLocal("r"), c.getLocal("r")),
	                ...c.if(
	                    c.i32_ge_u( c.getLocal("b"), c.i32_const(0x80 >> i)),
	                    [
	                        ...c.setLocal(
	                            "b",
	                            c.i32_sub(
	                                c.getLocal("b"),
	                                c.i32_const(0x80 >> i)
	                            )
	                        ),
	                        ...c.call(opAB, c.getLocal("r"),aux, c.getLocal("r"))
	                    ]
	                )
	            );
	        }
	        return code;
	    }

	};
	return build_timesscalar;
}

var build_batchinverse;
var hasRequiredBuild_batchinverse;

function requireBuild_batchinverse () {
	if (hasRequiredBuild_batchinverse) return build_batchinverse;
	hasRequiredBuild_batchinverse = 1;
	build_batchinverse = buildBatchInverse;

	function buildBatchInverse(module, prefix) {


	    const n8 = module.modules[prefix].n64*8;

	    const f = module.addFunction(prefix+"_batchInverse");
	    f.addParam("pIn", "i32");
	    f.addParam("inStep", "i32");
	    f.addParam("n", "i32");
	    f.addParam("pOut", "i32");
	    f.addParam("outStep", "i32");
	    f.addLocal("itAux", "i32");
	    f.addLocal("itIn", "i32");
	    f.addLocal("itOut","i32");
	    f.addLocal("i","i32");

	    const c = f.getCodeBuilder();

	    const AUX = c.i32_const(module.alloc(n8));


	    // Alloc Working space for accumulated umltiplications
	    f.addCode(
	        c.setLocal("itAux", c.i32_load( c.i32_const(0) )),
	        c.i32_store(
	            c.i32_const(0),
	            c.i32_add(
	                c.getLocal("itAux"),
	                c.i32_mul(
	                    c.i32_add(
	                        c.getLocal("n"),
	                        c.i32_const(1)
	                    ),
	                    c.i32_const(n8)
	                )
	            )
	        )
	    );

	    f.addCode(

	        // aux[0] = a;
	        c.call(prefix+"_one", c.getLocal("itAux")),
	        // for (i=0;i<n;i++) aux[i] = aux[i-1]*in[i]
	        c.setLocal("itIn", c.getLocal("pIn")),
	        c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
	        c.setLocal("i", c.i32_const(0)),

	        c.block(c.loop(
	            c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),
	            c.if(
	                c.call(prefix+"_isZero", c.getLocal("itIn")),
	                c.call(
	                    prefix + "_copy",
	                    c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
	                    c.getLocal("itAux")
	                ),
	                c.call(
	                    prefix+"_mul",
	                    c.getLocal("itIn"),
	                    c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
	                    c.getLocal("itAux")
	                )
	            ),
	            c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.getLocal("inStep"))),
	            c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
	            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	            c.br(0)
	        )),

	        // point to the last
	        c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.getLocal("inStep"))),
	        c.setLocal("itAux", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8))),
	        // itOut = pOut + (n-1)*stepOut   // Point to the last
	        c.setLocal(
	            "itOut",
	            c.i32_add(
	                c.getLocal("pOut"),
	                c.i32_mul(
	                    c.i32_sub(c.getLocal("n"), c.i32_const(1)),
	                    c.getLocal("outStep"),
	                )
	            )
	        ),

	        // aux[n-1] = 1/aux[n-1]
	        c.call(prefix+"_inverse", c.getLocal("itAux"), c.getLocal("itAux") ),

	        c.block(c.loop(
	            c.br_if(1, c.i32_eqz( c.getLocal("i"))),
	            c.if(
	                c.call(prefix+"_isZero", c.getLocal("itIn")),
	                [
	                    ...c.call(
	                        prefix + "_copy",
	                        c.getLocal("itAux"),
	                        c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
	                    ),
	                    ...c.call(
	                        prefix + "_zero",
	                        c.getLocal("itOut")
	                    )
	                ],[
	                    ...c.call(prefix + "_copy", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)), AUX),
	                    ...c.call(
	                        prefix+"_mul",
	                        c.getLocal("itAux"),
	                        c.getLocal("itIn"),
	                        c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
	                    ),
	                    ...c.call(
	                        prefix+"_mul",
	                        c.getLocal("itAux"),
	                        AUX,
	                        c.getLocal("itOut")
	                    )
	                ]
	            ),
	            c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.getLocal("inStep"))),
	            c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.getLocal("outStep"))),
	            c.setLocal("itAux", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8))),
	            c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	            c.br(0)
	        ))

	    );


	    // Recover Old memory
	    f.addCode(
	        c.i32_store(
	            c.i32_const(0),
	            c.getLocal("itAux")
	        )
	    );

	}
	return build_batchinverse;
}

var build_batchconvertion;
var hasRequiredBuild_batchconvertion;

function requireBuild_batchconvertion () {
	if (hasRequiredBuild_batchconvertion) return build_batchconvertion;
	hasRequiredBuild_batchconvertion = 1;
	build_batchconvertion = buildBatchConvertion;

	function buildBatchConvertion(module, fnName, internalFnName, sizeIn, sizeOut, reverse) {
	    if (typeof reverse === "undefined") {
	        // Set the reverse in a way that allows to use the same buffer as in/out.
	        if (sizeIn < sizeOut) {
	            reverse = true;
	        } else {
	            reverse = false;
	        }
	    }

	    const f = module.addFunction(fnName);
	    f.addParam("pIn", "i32");
	    f.addParam("n", "i32");
	    f.addParam("pOut", "i32");
	    f.addLocal("i", "i32");
	    f.addLocal("itIn", "i32");
	    f.addLocal("itOut", "i32");

	    const c = f.getCodeBuilder();

	    if (reverse) {
	        f.addCode(
	            c.setLocal("itIn",
	                c.i32_add(
	                    c.getLocal("pIn"),
	                    c.i32_mul(
	                        c.i32_sub(
	                            c.getLocal("n"),
	                            c.i32_const(1)
	                        ),
	                        c.i32_const(sizeIn)
	                    )
	                )
	            ),
	            c.setLocal("itOut",
	                c.i32_add(
	                    c.getLocal("pOut"),
	                    c.i32_mul(
	                        c.i32_sub(
	                            c.getLocal("n"),
	                            c.i32_const(1)
	                        ),
	                        c.i32_const(sizeOut)
	                    )
	                )
	            ),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	                c.call(internalFnName, c.getLocal("itIn"), c.getLocal("itOut")),

	                c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.i32_const(sizeIn))),
	                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(sizeOut))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	        );
	    } else {
	        f.addCode(
	            c.setLocal("itIn", c.getLocal("pIn")),
	            c.setLocal("itOut", c.getLocal("pOut")),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	                c.call(internalFnName, c.getLocal("itIn"), c.getLocal("itOut")),

	                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(sizeIn))),
	                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(sizeOut))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	        );
	    }
	}
	return build_batchconvertion;
}

var build_batchop;
var hasRequiredBuild_batchop;

function requireBuild_batchop () {
	if (hasRequiredBuild_batchop) return build_batchop;
	hasRequiredBuild_batchop = 1;
	build_batchop = buildBatchConvertion;

	function buildBatchConvertion(module, fnName, internalFnName, sizeIn, sizeOut, reverse) {
	    if (typeof reverse === "undefined") {
	        // Set the reverse in a way that allows to use the same buffer as in/out.
	        if (sizeIn < sizeOut) {
	            reverse = true;
	        } else {
	            reverse = false;
	        }
	    }

	    const f = module.addFunction(fnName);
	    f.addParam("pIn1", "i32");
	    f.addParam("pIn2", "i32");
	    f.addParam("n", "i32");
	    f.addParam("pOut", "i32");
	    f.addLocal("i", "i32");
	    f.addLocal("itIn1", "i32");
	    f.addLocal("itIn2", "i32");
	    f.addLocal("itOut", "i32");

	    const c = f.getCodeBuilder();

	    if (reverse) {
	        f.addCode(
	            c.setLocal("itIn1",
	                c.i32_add(
	                    c.getLocal("pIn1"),
	                    c.i32_mul(
	                        c.i32_sub(
	                            c.getLocal("n"),
	                            c.i32_const(1)
	                        ),
	                        c.i32_const(sizeIn)
	                    )
	                )
	            ),
	            c.setLocal("itIn2",
	                c.i32_add(
	                    c.getLocal("pIn2"),
	                    c.i32_mul(
	                        c.i32_sub(
	                            c.getLocal("n"),
	                            c.i32_const(1)
	                        ),
	                        c.i32_const(sizeIn)
	                    )
	                )
	            ),
	            c.setLocal("itOut",
	                c.i32_add(
	                    c.getLocal("pOut"),
	                    c.i32_mul(
	                        c.i32_sub(
	                            c.getLocal("n"),
	                            c.i32_const(1)
	                        ),
	                        c.i32_const(sizeOut)
	                    )
	                )
	            ),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	                c.call(internalFnName, c.getLocal("itIn1"), c.getLocal("itIn2"), c.getLocal("itOut")),

	                c.setLocal("itIn1", c.i32_sub(c.getLocal("itIn1"), c.i32_const(sizeIn))),
	                c.setLocal("itIn2", c.i32_sub(c.getLocal("itIn2"), c.i32_const(sizeIn))),
	                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(sizeOut))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	        );
	    } else {
	        f.addCode(
	            c.setLocal("itIn1", c.getLocal("pIn1")),
	            c.setLocal("itIn2", c.getLocal("pIn2")),
	            c.setLocal("itOut", c.getLocal("pOut")),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	                c.call(internalFnName, c.getLocal("itIn1"), c.getLocal("itIn2"), c.getLocal("itOut")),

	                c.setLocal("itIn1", c.i32_add(c.getLocal("itIn1"), c.i32_const(sizeIn))),
	                c.setLocal("itIn2", c.i32_add(c.getLocal("itIn2"), c.i32_const(sizeIn))),
	                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(sizeOut))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	        );
	    }
	}
	return build_batchop;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_f1m;
var hasRequiredBuild_f1m;

function requireBuild_f1m () {
	if (hasRequiredBuild_f1m) return build_f1m;
	hasRequiredBuild_f1m = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const buildInt = /*@__PURE__*/ requireBuild_int();
	const utils = /*@__PURE__*/ requireUtils$1();
	const buildExp = /*@__PURE__*/ requireBuild_timesscalar();
	const buildBatchInverse = /*@__PURE__*/ requireBuild_batchinverse();
	const buildBatchConvertion = /*@__PURE__*/ requireBuild_batchconvertion();
	const buildBatchOp = /*@__PURE__*/ requireBuild_batchop();

	build_f1m = function buildF1m(module, _q, _prefix, _intPrefix) {
	    const q = bigInt(_q);
	    const n64 = Math.floor((q.minus(1).bitLength() - 1)/64) +1;
	    const n32 = n64*2;
	    const n8 = n64*8;

	    const prefix = _prefix || "f1m";
	    if (module.modules[prefix]) return prefix;  // already builded

	    const intPrefix = buildInt(module, n64, _intPrefix);
	    const pq = module.alloc(n8, utils.bigInt2BytesLE(q, n8));

	    module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).mod(q), n8));
	    const pR2 = module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).square().mod(q), n8));
	    const pOne = module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).mod(q), n8));
	    const pZero = module.alloc(utils.bigInt2BytesLE(bigInt.zero, n8));
	    const _minusOne = q.minus(bigInt.one);
	    const _e = _minusOne.shiftRight(1); // e = (p-1)/2
	    const pe = module.alloc(n8, utils.bigInt2BytesLE(_e, n8));

	    const _ePlusOne = _e.add(bigInt.one); // e = (p-1)/2
	    const pePlusOne = module.alloc(n8, utils.bigInt2BytesLE(_ePlusOne, n8));

	    module.modules[prefix] = {
	        pq: pq,
	        pR2: pR2,
	        n64: n64,
	        q: q,
	        pOne: pOne,
	        pZero: pZero,
	        pePlusOne: pePlusOne
	    };

	    function buildOne() {
	        const f = module.addFunction(prefix+"_one");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(intPrefix + "_copy", c.i32_const(pOne), c.getLocal("pr")));
	    }

	    function buildAdd() {
	        const f = module.addFunction(prefix+"_add");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.if(
	                c.call(intPrefix+"_add", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
	                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                c.if(
	                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
	                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                )
	            )
	        );
	    }

	    function buildSub() {
	        const f = module.addFunction(prefix+"_sub");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.if(
	                c.call(intPrefix+"_sub", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
	                c.drop(c.call(intPrefix+"_add", c.getLocal("r"),  c.i32_const(pq), c.getLocal("r")))
	            )
	        );
	    }

	    function buildNeg() {
	        const f = module.addFunction(prefix+"_neg");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(prefix + "_sub", c.i32_const(pZero), c.getLocal("x"), c.getLocal("r"))
	        );
	    }


	    function buildIsNegative() {
	        const f = module.addFunction(prefix+"_isNegative");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
	            c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne) )
	        );
	    }


	/*
	    function buildIsNegative() {
	        const f = module.addFunction(prefix+"_isNegative");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
	            c.i32_and(
	                c.i32_load(AUX),
	                c.i32_const(1)
	            )
	        );
	    }
	*/

	    function buildSign() {
	        const f = module.addFunction(prefix+"_sign");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if (
	                c.call(intPrefix + "_isZero", c.getLocal("x")),
	                c.ret(c.i32_const(0))
	            ),
	            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
	            c.if(
	                c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne)),
	                c.ret(c.i32_const(-1))
	            ),
	            c.ret(c.i32_const(1))
	        );
	    }


	    function buildMReduct() {
	        const carries = module.alloc(n32*n32*8);

	        const f = module.addFunction(prefix+"_mReduct");
	        f.addParam("t", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("np32", "i64");
	        f.addLocal("c", "i64");
	        f.addLocal("m", "i64");

	        const c = f.getCodeBuilder();

	        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();

	        f.addCode(c.setLocal("np32", c.i64_const(np32)));

	        for (let i=0; i<n32; i++) {
	            f.addCode(c.setLocal("c", c.i64_const(0)));

	            f.addCode(
	                c.setLocal(
	                    "m",
	                    c.i64_and(
	                        c.i64_mul(
	                            c.i64_load32_u(c.getLocal("t"), i*4),
	                            c.getLocal("np32")
	                        ),
	                        c.i64_const("0xFFFFFFFF")
	                    )
	                )
	            );

	            for (let j=0; j<n32; j++) {

	                f.addCode(
	                    c.setLocal("c",
	                        c.i64_add(
	                            c.i64_add(
	                                c.i64_load32_u(c.getLocal("t"), (i+j)*4),
	                                c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
	                            ),
	                            c.i64_mul(
	                                c.i64_load32_u(c.i32_const(pq), j*4),
	                                c.getLocal("m")
	                            )
	                        )
	                    )
	                );

	                f.addCode(
	                    c.i64_store32(
	                        c.getLocal("t"),
	                        (i+j)*4,
	                        c.getLocal("c")
	                    )
	                );
	            }

	            f.addCode(
	                c.i64_store32(
	                    c.i32_const(carries),
	                    i*4,
	                    c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
	                )
	            );
	        }

	        f.addCode(
	            c.call(
	                prefix+"_add",
	                c.i32_const(carries),
	                c.i32_add(
	                    c.getLocal("t"),
	                    c.i32_const(n32*4)
	                ),
	                c.getLocal("r")
	            )
	        );
	    }



	    function buildMul() {

	        const f = module.addFunction(prefix+"_mul");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("c0", "i64");
	        f.addLocal("c1", "i64");
	        f.addLocal("np32", "i64");


	        for (let i=0;i<n32; i++) {
	            f.addLocal("x"+i, "i64");
	            f.addLocal("y"+i, "i64");
	            f.addLocal("m"+i, "i64");
	            f.addLocal("q"+i, "i64");
	        }

	        const c = f.getCodeBuilder();

	        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();

	        f.addCode(c.setLocal("np32", c.i64_const(np32)));


	        const loadX = [];
	        const loadY = [];
	        const loadQ = [];
	        function mulij(i, j) {
	            let X,Y;
	            if (!loadX[i]) {
	                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
	                loadX[i] = true;
	            } else {
	                X = c.getLocal("x"+i);
	            }
	            if (!loadY[j]) {
	                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
	                loadY[j] = true;
	            } else {
	                Y = c.getLocal("y"+j);
	            }

	            return c.i64_mul( X, Y );
	        }

	        function mulqm(i, j) {
	            let Q,M;
	            if (!loadQ[i]) {
	                Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
	                loadQ[i] = true;
	            } else {
	                Q = c.getLocal("q"+i);
	            }
	            M = c.getLocal("m"+j);

	            return c.i64_mul( Q, M );
	        }


	        let c0 = "c0";
	        let c1 = "c1";

	        for (let k=0; k<n32*2-1; k++) {
	            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }


	            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulqm(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }
	            if (k<n32) {
	                f.addCode(
	                    c.setLocal(
	                        "m"+k,
	                        c.i64_and(
	                            c.i64_mul(
	                                c.i64_and(
	                                    c.getLocal(c0),
	                                    c.i64_const(0xFFFFFFFF)
	                                ),
	                                c.getLocal("np32")
	                            ),
	                            c.i64_const("0xFFFFFFFF")
	                        )
	                    )
	                );


	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulqm(0,k)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }


	            if (k>=n32) {
	                f.addCode(
	                    c.i64_store32(
	                        c.getLocal("r"),
	                        (k-n32)*4,
	                        c.getLocal(c0)
	                    )
	                );
	            }
	            [c0, c1] = [c1, c0];
	            f.addCode(
	                c.setLocal(c1,
	                    c.i64_shr_u(
	                        c.getLocal(c0),
	                        c.i64_const(32)
	                    )
	                )
	            );
	        }
	        f.addCode(
	            c.i64_store32(
	                c.getLocal("r"),
	                n32*4-4,
	                c.getLocal(c0)
	            )
	        );

	        f.addCode(
	            c.if(
	                c.i32_wrap_i64(c.getLocal(c1)),
	                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                c.if(
	                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
	                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                )
	            )
	        );
	    }


	    function buildSquare() {

	        const f = module.addFunction(prefix+"_square");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("c0", "i64");
	        f.addLocal("c1", "i64");
	        f.addLocal("c0_old", "i64");
	        f.addLocal("c1_old", "i64");
	        f.addLocal("np32", "i64");


	        for (let i=0;i<n32; i++) {
	            f.addLocal("x"+i, "i64");
	            f.addLocal("m"+i, "i64");
	            f.addLocal("q"+i, "i64");
	        }

	        const c = f.getCodeBuilder();

	        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();

	        f.addCode(c.setLocal("np32", c.i64_const(np32)));


	        const loadX = [];
	        const loadQ = [];
	        function mulij(i, j) {
	            let X,Y;
	            if (!loadX[i]) {
	                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
	                loadX[i] = true;
	            } else {
	                X = c.getLocal("x"+i);
	            }
	            if (!loadX[j]) {
	                Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
	                loadX[j] = true;
	            } else {
	                Y = c.getLocal("x"+j);
	            }

	            return c.i64_mul( X, Y );
	        }

	        function mulqm(i, j) {
	            let Q,M;
	            if (!loadQ[i]) {
	                Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
	                loadQ[i] = true;
	            } else {
	                Q = c.getLocal("q"+i);
	            }
	            M = c.getLocal("m"+j);

	            return c.i64_mul( Q, M );
	        }


	        let c0 = "c0";
	        let c1 = "c1";
	        let c0_old = "c0_old";
	        let c1_old = "c1_old";

	        for (let k=0; k<n32*2-1; k++) {
	            f.addCode(
	                c.setLocal(c0, c.i64_const(0)),
	                c.setLocal(c1, c.i64_const(0)),
	            );
	            for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }

	            // Multiply by 2
	            f.addCode(
	                c.setLocal(c0,
	                    c.i64_shl(
	                        c.i64_and(
	                            c.getLocal(c0),
	                            c.i64_const(0xFFFFFFFF)
	                        ),
	                        c.i64_const(1)
	                    )
	                )
	            );

	            f.addCode(
	                c.setLocal(c1,
	                    c.i64_add(
	                        c.i64_shl(
	                            c.getLocal(c1),
	                            c.i64_const(1)
	                        ),
	                        c.i64_shr_u(
	                            c.getLocal(c0),
	                            c.i64_const(32)
	                        )
	                    )
	                )
	            );

	            if (k%2 == 0) {
	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulij(k>>1, k>>1)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }

	            // Add the old carry

	            if (k>0) {
	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            c.i64_and(
	                                c.getLocal(c0_old),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.i64_add(
	                                c.getLocal(c1),
	                                c.i64_shr_u(
	                                    c.getLocal(c0),
	                                    c.i64_const(32)
	                                )
	                            ),
	                            c.getLocal(c1_old)
	                        )
	                    )
	                );
	            }


	            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
	                const j= k-i;

	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulqm(i,j)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }
	            if (k<n32) {
	                f.addCode(
	                    c.setLocal(
	                        "m"+k,
	                        c.i64_and(
	                            c.i64_mul(
	                                c.i64_and(
	                                    c.getLocal(c0),
	                                    c.i64_const(0xFFFFFFFF)
	                                ),
	                                c.getLocal("np32")
	                            ),
	                            c.i64_const("0xFFFFFFFF")
	                        )
	                    )
	                );


	                f.addCode(
	                    c.setLocal(c0,
	                        c.i64_add(
	                            c.i64_and(
	                                c.getLocal(c0),
	                                c.i64_const(0xFFFFFFFF)
	                            ),
	                            mulqm(0,k)
	                        )
	                    )
	                );

	                f.addCode(
	                    c.setLocal(c1,
	                        c.i64_add(
	                            c.getLocal(c1),
	                            c.i64_shr_u(
	                                c.getLocal(c0),
	                                c.i64_const(32)
	                            )
	                        )
	                    )
	                );
	            }

	            if (k>=n32) {
	                f.addCode(
	                    c.i64_store32(
	                        c.getLocal("r"),
	                        (k-n32)*4,
	                        c.getLocal(c0)
	                    )
	                );
	            }
	            f.addCode(
	                c.setLocal(
	                    c0_old,
	                    c.getLocal(c1)
	                ),
	                c.setLocal(
	                    c1_old,
	                    c.i64_shr_u(
	                        c.getLocal(c0_old),
	                        c.i64_const(32)
	                    )
	                )
	            );
	        }
	        f.addCode(
	            c.i64_store32(
	                c.getLocal("r"),
	                n32*4-4,
	                c.getLocal(c0_old)
	            )
	        );

	        f.addCode(
	            c.if(
	                c.i32_wrap_i64(c.getLocal(c1_old)),
	                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                c.if(
	                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
	                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
	                )
	            )
	        );
	    }


	    function buildSquareOld() {
	        const f = module.addFunction(prefix+"_squareOld");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
	    }

	    function buildToMontgomery() {
	        const f = module.addFunction(prefix+"_toMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pR2), c.getLocal("r")));
	    }

	    function buildFromMontgomery() {

	        const pAux2 = module.alloc(n8*2);

	        const f = module.addFunction(prefix+"_fromMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(intPrefix + "_copy", c.getLocal("x"), c.i32_const(pAux2) ));
	        f.addCode(c.call(intPrefix + "_zero", c.i32_const(pAux2 + n8) ));
	        f.addCode(c.call(prefix+"_mReduct", c.i32_const(pAux2), c.getLocal("r")));
	    }

	    function buildInverse() {

	        const f = module.addFunction(prefix+ "_inverse");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(prefix + "_fromMontgomery", c.getLocal("x"), c.getLocal("r")));
	        f.addCode(c.call(intPrefix + "_inverseMod", c.getLocal("r"), c.i32_const(pq), c.getLocal("r")));
	        f.addCode(c.call(prefix + "_toMontgomery", c.getLocal("r"), c.getLocal("r")));
	    }

	    // Calculate various valuse needed for sqrt


	    let _nqr = bigInt(2);
	    if (q.isPrime()) {
	        while (!_nqr.modPow(_e, q).equals(_minusOne)) _nqr = _nqr.add(bigInt.one);
	    }

	    module.alloc(utils.bigInt2BytesLE(_nqr.shiftLeft(n64*64).mod(q), n8));

	    let s2 = 0;
	    let _t = _minusOne;

	    while ((!_t.isOdd())&&(!_t.isZero())) {
	        s2++;
	        _t = _t.shiftRight(1);
	    }
	    const pt = module.alloc(n8, utils.bigInt2BytesLE(_t, n8));

	    const _nqrToT = _nqr.modPow(_t, q);
	    const pNqrToT = module.alloc(utils.bigInt2BytesLE(_nqrToT.shiftLeft(n64*64).mod(q), n8));

	    const _tPlusOneOver2 = _t.add(1).shiftRight(1);
	    const ptPlusOneOver2 = module.alloc(n8, utils.bigInt2BytesLE(_tPlusOneOver2, n8));

	    function buildSqrt() {

	        const f = module.addFunction(prefix+ "_sqrt");
	        f.addParam("n", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("m", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");

	        const c = f.getCodeBuilder();

	        const ONE = c.i32_const(pOne);
	        const C = c.i32_const(module.alloc(n8));
	        const T = c.i32_const(module.alloc(n8));
	        const R = c.i32_const(module.alloc(n8));
	        const SQ = c.i32_const(module.alloc(n8));
	        const B = c.i32_const(module.alloc(n8));

	        f.addCode(

	            // If (n==0) return 0
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("n")),
	                c.ret(
	                    c.call(prefix + "_zero", c.getLocal("r"))
	                )
	            ),

	            c.setLocal("m", c.i32_const(s2)),
	            c.call(prefix + "_copy", c.i32_const(pNqrToT), C),
	            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pt), c.i32_const(n8), T),
	            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(ptPlusOneOver2), c.i32_const(n8), R),

	            c.block(c.loop(
	                c.br_if(1, c.call(prefix + "_eq", T, ONE)),

	                c.call(prefix + "_square", T, SQ),
	                c.setLocal("i", c.i32_const(1)),
	                c.block(c.loop(
	                    c.br_if(1, c.call(prefix + "_eq", SQ, ONE)),
	                    c.call(prefix + "_square", SQ, SQ),
	                    c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                    c.br(0)
	                )),

	                c.call(prefix + "_copy", C, B),
	                c.setLocal("j", c.i32_sub(c.i32_sub( c.getLocal("m"), c.getLocal("i")), c.i32_const(1)) ),
	                c.block(c.loop(
	                    c.br_if(1, c.i32_eqz(c.getLocal("j"))),
	                    c.call(prefix + "_square", B, B),
	                    c.setLocal("j", c.i32_sub(c.getLocal("j"), c.i32_const(1))),
	                    c.br(0)
	                )),

	                c.setLocal("m", c.getLocal("i")),
	                c.call(prefix + "_square", B, C),
	                c.call(prefix + "_mul", T, C, T),
	                c.call(prefix + "_mul", R, B, R),

	                c.br(0)
	            )),

	            c.if(
	                c.call(prefix + "_isNegative", R),
	                c.call(prefix + "_neg", R, c.getLocal("r")),
	                c.call(prefix + "_copy", R, c.getLocal("r")),
	            )
	        );
	    }

	    function buildIsSquare() {
	        const f = module.addFunction(prefix+"_isSquare");
	        f.addParam("n", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const ONE = c.i32_const(pOne);
	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("n")),
	                c.ret(c.i32_const(1))
	            ),
	            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pe), c.i32_const(n8), AUX),
	            c.call(prefix + "_eq", AUX, ONE)
	        );
	    }


	    function buildLoad() {
	        const f = module.addFunction(prefix+"_load");
	        f.addParam("scalar", "i32");
	        f.addParam("scalarLen", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("p", "i32");
	        f.addLocal("l", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");
	        const c = f.getCodeBuilder();

	        const R = c.i32_const(module.alloc(n8));
	        const pAux = module.alloc(n8);
	        const AUX = c.i32_const(pAux);

	        f.addCode(
	            c.call(intPrefix + "_zero", c.getLocal("r")),
	            c.setLocal("i", c.i32_const(n8)),
	            c.setLocal("p", c.getLocal("scalar")),
	            c.block(c.loop(
	                c.br_if(1, c.i32_gt_u(c.getLocal("i"), c.getLocal("scalarLen"))),

	                c.if(
	                    c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
	                    c.call(prefix + "_one", R),
	                    c.call(prefix + "_mul", R, c.i32_const(pR2), R)
	                ),
	                c.call(prefix + "_mul", c.getLocal("p"), R, AUX),
	                c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),

	                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(n8))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(n8))),
	                c.br(0)
	            )),

	            c.setLocal("l", c.i32_rem_u( c.getLocal("scalarLen"), c.i32_const(n8))),
	            c.if(c.i32_eqz(c.getLocal("l")), c.ret([])),
	            c.call(intPrefix + "_zero", AUX),
	            c.setLocal("j", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("l"))),

	                c.i32_store8(
	                    c.getLocal("j"),
	                    pAux,
	                    c.i32_load8_u(c.getLocal("p")),
	                ),
	                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(1))),
	                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                c.br(0)
	            )),

	            c.if(
	                c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
	                c.call(prefix + "_one", R),
	                c.call(prefix + "_mul", R, c.i32_const(pR2), R)
	            ),
	            c.call(prefix + "_mul", AUX, R, AUX),
	            c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),
	        );
	    }

	    function buildTimesScalar() {
	        const f = module.addFunction(prefix+"_timesScalar");
	        f.addParam("x", "i32");
	        f.addParam("scalar", "i32");
	        f.addParam("scalarLen", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.call(prefix + "_load", c.getLocal("scalar"), c.getLocal("scalarLen"), AUX),
	            c.call(prefix + "_toMontgomery", AUX, AUX),
	            c.call(prefix + "_mul", c.getLocal("x"), AUX, c.getLocal("r")),
	        );
	    }

	    function buildIsOne() {
	        const f = module.addFunction(prefix+"_isOne");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();
	        f.addCode(
	            c.ret(c.call(intPrefix + "_eq", c.getLocal("x"), c.i32_const(pOne)))
	        );
	    }


	    module.exportFunction(intPrefix + "_copy", prefix+"_copy");
	    module.exportFunction(intPrefix + "_zero", prefix+"_zero");
	    module.exportFunction(intPrefix + "_isZero", prefix+"_isZero");
	    module.exportFunction(intPrefix + "_eq", prefix+"_eq");

	    buildIsOne();
	    buildAdd();
	    buildSub();
	    buildNeg();
	    buildMReduct();
	    buildMul();
	    buildSquare();
	    buildSquareOld();
	    buildToMontgomery();
	    buildFromMontgomery();
	    buildIsNegative();
	    buildSign();
	    buildInverse();
	    buildOne();
	    buildLoad();
	    buildTimesScalar();
	    buildBatchInverse(module, prefix);
	    buildBatchConvertion(module, prefix + "_batchToMontgomery", prefix + "_toMontgomery", n8, n8);
	    buildBatchConvertion(module, prefix + "_batchFromMontgomery", prefix + "_fromMontgomery", n8, n8);
	    buildBatchConvertion(module, prefix + "_batchNeg", prefix + "_neg", n8, n8);
	    buildBatchOp(module, prefix + "_batchAdd", prefix + "_add", n8, n8);
	    buildBatchOp(module, prefix + "_batchSub", prefix + "_sub", n8, n8);
	    buildBatchOp(module, prefix + "_batchMul", prefix + "_mul", n8, n8);

	    module.exportFunction(prefix + "_add");
	    module.exportFunction(prefix + "_sub");
	    module.exportFunction(prefix + "_neg");
	    module.exportFunction(prefix + "_isNegative");
	    module.exportFunction(prefix + "_isOne");
	    module.exportFunction(prefix + "_sign");
	    module.exportFunction(prefix + "_mReduct");
	    module.exportFunction(prefix + "_mul");
	    module.exportFunction(prefix + "_square");
	    module.exportFunction(prefix + "_squareOld");
	    module.exportFunction(prefix + "_fromMontgomery");
	    module.exportFunction(prefix + "_toMontgomery");
	    module.exportFunction(prefix + "_inverse");
	    module.exportFunction(prefix + "_one");
	    module.exportFunction(prefix + "_load");
	    module.exportFunction(prefix + "_timesScalar");
	    buildExp(
	        module,
	        prefix + "_exp",
	        n8,
	        prefix + "_mul",
	        prefix + "_square",
	        intPrefix + "_copy",
	        prefix + "_one",
	    );
	    module.exportFunction(prefix + "_exp");
	    module.exportFunction(prefix + "_batchInverse");
	    if (q.isPrime()) {
	        buildSqrt();
	        buildIsSquare();
	        module.exportFunction(prefix + "_sqrt");
	        module.exportFunction(prefix + "_isSquare");
	    }
	    module.exportFunction(prefix + "_batchToMontgomery");
	    module.exportFunction(prefix + "_batchFromMontgomery");
	    // console.log(module.functionIdxByName);

	    return prefix;
	};
	return build_f1m;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_f1;
var hasRequiredBuild_f1;

function requireBuild_f1 () {
	if (hasRequiredBuild_f1) return build_f1;
	hasRequiredBuild_f1 = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();

	const buildF1m =/*@__PURE__*/ requireBuild_f1m();

	build_f1 = function buildF1(module, _q, _prefix, _f1mPrefix, _intPrefix) {

	    const q = bigInt(_q);
	    const n64 = Math.floor((q.minus(1).bitLength() - 1)/64) +1;
	    const n8 = n64*8;

	    const prefix = _prefix || "f1";
	    if (module.modules[prefix]) return prefix;  // already builded
	    module.modules[prefix] = {
	        n64: n64
	    };

	    const intPrefix = _intPrefix || "int";
	    const f1mPrefix = buildF1m(module, q, _f1mPrefix, intPrefix);


	    const pR2 =     module.modules[f1mPrefix].pR2;
	    const pq =     module.modules[f1mPrefix].pq;
	    const pePlusOne = module.modules[f1mPrefix].pePlusOne;

	    function buildMul() {
	        const pAux1 = module.alloc(n8);

	        const f = module.addFunction(prefix+ "_mul");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(f1mPrefix + "_mul", c.getLocal("x"), c.getLocal("y"), c.i32_const(pAux1)));
	        f.addCode(c.call(f1mPrefix + "_mul", c.i32_const(pAux1), c.i32_const(pR2), c.getLocal("r")));
	    }

	    function buildSquare() {
	        const f = module.addFunction(prefix+"_square");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
	    }


	    function buildInverse() {

	        const f = module.addFunction(prefix+ "_inverse");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(intPrefix + "_inverseMod", c.getLocal("x"), c.i32_const(pq), c.getLocal("r")));
	    }

	    function buildIsNegative() {
	        const f = module.addFunction(prefix+"_isNegative");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(intPrefix + "_gte", c.getLocal("x"), c.i32_const(pePlusOne) )
	        );
	    }


	    buildMul();
	    buildSquare();
	    buildInverse();
	    buildIsNegative();
	    module.exportFunction(f1mPrefix + "_add", prefix + "_add");
	    module.exportFunction(f1mPrefix + "_sub", prefix + "_sub");
	    module.exportFunction(f1mPrefix + "_neg", prefix + "_neg");
	    module.exportFunction(prefix + "_mul");
	    module.exportFunction(prefix + "_square");
	    module.exportFunction(prefix + "_inverse");
	    module.exportFunction(prefix + "_isNegative");
	    module.exportFunction(f1mPrefix + "_copy", prefix+"_copy");
	    module.exportFunction(f1mPrefix + "_zero", prefix+"_zero");
	    module.exportFunction(f1mPrefix + "_one", prefix+"_one");
	    module.exportFunction(f1mPrefix + "_isZero", prefix+"_isZero");
	    module.exportFunction(f1mPrefix + "_eq", prefix+"_eq");

	    return prefix;
	};
	return build_f1;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_f2m;
var hasRequiredBuild_f2m;

function requireBuild_f2m () {
	if (hasRequiredBuild_f2m) return build_f2m;
	hasRequiredBuild_f2m = 1;
	const buildExp = /*@__PURE__*/ requireBuild_timesscalar();
	const buildBatchInverse = /*@__PURE__*/ requireBuild_batchinverse();
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const utils = /*@__PURE__*/ requireUtils$1();

	build_f2m = function buildF2m(module, mulNonResidueFn, prefix, f1mPrefix) {

	    if (module.modules[prefix]) return prefix;  // already builded

	    const f1n8 = module.modules[f1mPrefix].n64*8;
	    const q = module.modules[f1mPrefix].q;

	    module.modules[prefix] = {
	        n64: module.modules[f1mPrefix].n64*2
	    };

	    function buildAdd() {
	        const f = module.addFunction(prefix+"_add");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_add", x0, y0, r0),
	            c.call(f1mPrefix+"_add", x1, y1, r1),
	        );
	    }

	    function buildTimesScalar() {
	        const f = module.addFunction(prefix+"_timesScalar");
	        f.addParam("x", "i32");
	        f.addParam("scalar", "i32");
	        f.addParam("scalarLen", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_timesScalar", x0, c.getLocal("scalar"), c.getLocal("scalarLen"), r0),
	            c.call(f1mPrefix+"_timesScalar", x1, c.getLocal("scalar"), c.getLocal("scalarLen"), r1),
	        );
	    }

	    function buildSub() {
	        const f = module.addFunction(prefix+"_sub");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_sub", x0, y0, r0),
	            c.call(f1mPrefix+"_sub", x1, y1, r1),
	        );
	    }

	    function buildNeg() {
	        const f = module.addFunction(prefix+"_neg");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_neg", x0, r0),
	            c.call(f1mPrefix+"_neg", x1, r1),
	        );
	    }

	    function buildConjugate() {
	        const f = module.addFunction(prefix+"_conjugate");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_copy", x0, r0),
	            c.call(f1mPrefix+"_neg", x1, r1),
	        );
	    }


	    function buildIsNegative() {
	        const f = module.addFunction(prefix+"_isNegative");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.if(
	                c.call(f1mPrefix+"_isZero", x1),
	                c.ret(c.call(f1mPrefix+"_isNegative", x0))
	            ),
	            c.ret(c.call(f1mPrefix+"_isNegative", x1))
	        );
	    }

	    function buildMul() {
	        const f = module.addFunction(prefix+"_mul");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        const A = c.i32_const(module.alloc(f1n8));
	        const B = c.i32_const(module.alloc(f1n8));
	        const C = c.i32_const(module.alloc(f1n8));
	        const D = c.i32_const(module.alloc(f1n8));


	        f.addCode(
	            c.call(f1mPrefix + "_mul", x0, y0, A),             // A = x0*y0
	            c.call(f1mPrefix + "_mul", x1, y1, B),             // B = x1*y1

	            c.call(f1mPrefix + "_add", x0, x1, C),             // C = x0 + x1
	            c.call(f1mPrefix + "_add", y0, y1, D),             // D = y0 + y1
	            c.call(f1mPrefix + "_mul", C, D, C),               // C = (x0 + x1)*(y0 + y1) = x0*y0+x0*y1+x1*y0+x1*y1

	            //  c.call(f1mPrefix + "_mul", B, c.i32_const(pNonResidue), r0),  // r0 = nr*(x1*y1)
	            c.call(mulNonResidueFn, B, r0),  // r0 = nr*(x1*y1)
	            c.call(f1mPrefix + "_add", A, r0, r0),             // r0 = x0*y0 + nr*(x1*y1)
	            c.call(f1mPrefix + "_add", A, B, r1),             // r1 = x0*y0+x1*y1
	            c.call(f1mPrefix + "_sub", C, r1, r1)              // r1 = x0*y0+x0*y1+x1*y0+x1*y1 - x0*y0+x1*y1 = x0*y1+x1*y0
	        );

	    }

	    function buildMul1() {
	        const f = module.addFunction(prefix+"_mul1");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const y = c.getLocal("y");
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));


	        f.addCode(
	            c.call(f1mPrefix + "_mul", x0, y, r0),             // A = x0*y
	            c.call(f1mPrefix + "_mul", x1, y, r1),             // B = x1*y
	        );
	    }

	    function buildSquare() {
	        const f = module.addFunction(prefix+"_square");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        const AB = c.i32_const(module.alloc(f1n8));
	        const APB = c.i32_const(module.alloc(f1n8));
	        const APNB = c.i32_const(module.alloc(f1n8));
	        const ABPNAB = c.i32_const(module.alloc(f1n8));


	        f.addCode(
	            // AB = x0*y1
	            c.call(f1mPrefix + "_mul", x0, x1, AB),

	            // APB = x0+y1
	            c.call(f1mPrefix + "_add", x0, x1, APB),

	            // APBN0 = x0 + nr*x1
	            c.call(mulNonResidueFn, x1, APNB),
	            c.call(f1mPrefix + "_add", x0, APNB, APNB),

	            // ABPNAB = ab + nr*ab
	            c.call(mulNonResidueFn, AB, ABPNAB),
	            c.call(f1mPrefix + "_add", ABPNAB, AB, ABPNAB),

	            // r0 = APB * APNB - ABPNAB
	            c.call(f1mPrefix + "_mul", APB, APNB, r0),
	            c.call(f1mPrefix + "_sub", r0, ABPNAB, r0),

	            // r1 = AB + AB
	            c.call(f1mPrefix + "_add", AB, AB, r1),
	        );

	    }


	    function buildToMontgomery() {
	        const f = module.addFunction(prefix+"_toMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_toMontgomery", x0, r0),
	            c.call(f1mPrefix+"_toMontgomery", x1, r1)
	        );
	    }

	    function buildFromMontgomery() {
	        const f = module.addFunction(prefix+"_fromMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_fromMontgomery", x0, r0),
	            c.call(f1mPrefix+"_fromMontgomery", x1, r1)
	        );
	    }

	    function buildCopy() {
	        const f = module.addFunction(prefix+"_copy");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_copy", x0, r0),
	            c.call(f1mPrefix+"_copy", x1, r1)
	        );
	    }

	    function buildZero() {
	        const f = module.addFunction(prefix+"_zero");
	        f.addParam("x", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_zero", x0),
	            c.call(f1mPrefix+"_zero", x1)
	        );
	    }

	    function buildOne() {
	        const f = module.addFunction(prefix+"_one");
	        f.addParam("x", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_one", x0),
	            c.call(f1mPrefix+"_zero", x1)
	        );
	    }

	    function buildEq() {
	        const f = module.addFunction(prefix+"_eq");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));

	        f.addCode(
	            c.i32_and(
	                c.call(f1mPrefix+"_eq", x0, y0),
	                c.call(f1mPrefix+"_eq", x1, y1)
	            )
	        );
	    }

	    function buildIsZero() {
	        const f = module.addFunction(prefix+"_isZero");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.i32_and(
	                c.call(f1mPrefix+"_isZero", x0),
	                c.call(f1mPrefix+"_isZero", x1)
	            )
	        );
	    }

	    function buildInverse() {
	        const f = module.addFunction(prefix+"_inverse");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

	        const t0 = c.i32_const(module.alloc(f1n8));
	        const t1 = c.i32_const(module.alloc(f1n8));
	        const t2 = c.i32_const(module.alloc(f1n8));
	        const t3 = c.i32_const(module.alloc(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_square", x0, t0),
	            c.call(f1mPrefix+"_square", x1, t1),
	            // c.call(f1mPrefix+"_mul", t1, c.i32_const(pNonResidue), t2),
	            c.call(mulNonResidueFn, t1, t2),

	            c.call(f1mPrefix+"_sub", t0, t2, t2),
	            c.call(f1mPrefix+"_inverse", t2, t3),

	            c.call(f1mPrefix+"_mul", x0, t3, r0),
	            c.call(f1mPrefix+"_mul", x1, t3, r1),
	            c.call(f1mPrefix+"_neg", r1, r1),
	        );
	    }


	    function buildSign() {
	        const f = module.addFunction(prefix+"_sign");
	        f.addParam("x", "i32");
	        f.addLocal("s", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.setLocal("s" , c.call( f1mPrefix + "_sign", x1)),
	            c.if(
	                c.getLocal("s"),
	                c.ret(c.getLocal("s"))
	            ),
	            c.ret(c.call( f1mPrefix + "_sign", x0))
	        );
	    }

	    function buildIsOne() {
	        const f = module.addFunction(prefix+"_isOne");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

	        f.addCode(
	            c.ret(c.i32_and(
	                c.call(f1mPrefix + "_isOne", x0),
	                c.call(f1mPrefix + "_isZero", x1),
	            ))
	        );
	    }


	    // Check here: https://eprint.iacr.org/2012/685.pdf
	    // Alg 9adj
	    function buildSqrt() {

	        const f = module.addFunction(prefix+"_sqrt");
	        f.addParam("a", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const e34 = c.i32_const(module.alloc(utils.bigInt2BytesLE(bigInt(q).minus(bigInt(3)).divide(4), f1n8 )));
	        const e12 = c.i32_const(module.alloc(utils.bigInt2BytesLE(bigInt(q).minus(bigInt(1)).divide(2), f1n8 )));

	        const a = c.getLocal("a");
	        const a1 = c.i32_const(module.alloc(f1n8*2));
	        const alpha = c.i32_const(module.alloc(f1n8*2));
	        const a0 = c.i32_const(module.alloc(f1n8*2));
	        const pn1 = module.alloc(f1n8*2);
	        const n1 = c.i32_const(pn1);
	        const n1a = c.i32_const(pn1);
	        const n1b = c.i32_const(pn1+f1n8);
	        const x0 = c.i32_const(module.alloc(f1n8*2));
	        const b = c.i32_const(module.alloc(f1n8*2));

	        f.addCode(

	            c.call(prefix + "_one", n1),
	            c.call(prefix + "_neg", n1, n1),

	            // const a1 = F.pow(a, F.sqrt_e34);
	            c.call(prefix + "_exp", a, e34, c.i32_const(f1n8), a1),

	            // const a1 = F.pow(a, F.sqrt_e34);
	            c.call(prefix + "_square", a1, alpha),
	            c.call(prefix + "_mul", a, alpha, alpha),

	            // const a0 = F.mul(F.frobenius(1, alfa), alfa);
	            c.call(prefix + "_conjugate", alpha, a0),
	            c.call(prefix + "_mul", a0, alpha, a0),

	            // if (F.eq(a0, F.negone)) return null;
	            c.if(c.call(prefix + "_eq",a0,n1), c.unreachable() ),

	            // const x0 = F.mul(a1, a);
	            c.call(prefix + "_mul", a1, a, x0),

	            // if (F.eq(alfa, F.negone)) {
	            c.if(
	                c.call(prefix + "_eq", alpha, n1),
	                [
	                    // x = F.mul(x0, [F.F.zero, F.F.one]);
	                    ...c.call(f1mPrefix + "_zero", n1a),
	                    ...c.call(f1mPrefix + "_one", n1b),
	                    ...c.call(prefix + "_mul", n1, x0, c.getLocal("pr")),
	                ],
	                [
	                    // const b = F.pow(F.add(F.one, alfa), F.sqrt_e12);
	                    ...c.call(prefix + "_one", b),
	                    ...c.call(prefix + "_add", b, alpha, b),
	                    ...c.call(prefix + "_exp", b, e12, c.i32_const(f1n8), b),

	                    // x = F.mul(b, x0);
	                    ...c.call(prefix + "_mul", b, x0, c.getLocal("pr")),
	                ]
	            )
	        );

	    }


	    function buildIsSquare() {

	        const f = module.addFunction(prefix+"_isSquare");
	        f.addParam("a", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const e34 = c.i32_const(module.alloc(utils.bigInt2BytesLE(bigInt(q).minus(bigInt(3)).divide(4), f1n8 )));

	        const a = c.getLocal("a");
	        const a1 = c.i32_const(module.alloc(f1n8*2));
	        const alpha = c.i32_const(module.alloc(f1n8*2));
	        const a0 = c.i32_const(module.alloc(f1n8*2));
	        const pn1 = module.alloc(f1n8*2);
	        const n1 = c.i32_const(pn1);

	        f.addCode(

	            c.call(prefix + "_one", n1),
	            c.call(prefix + "_neg", n1, n1),

	            // const a1 = F.pow(a, F.sqrt_e34);
	            c.call(prefix + "_exp", a, e34, c.i32_const(f1n8), a1),

	            // const a1 = F.pow(a, F.sqrt_e34);
	            c.call(prefix + "_square", a1, alpha),
	            c.call(prefix + "_mul", a, alpha, alpha),

	            // const a0 = F.mul(F.frobenius(1, alfa), alfa);
	            c.call(prefix + "_conjugate", alpha, a0),
	            c.call(prefix + "_mul", a0, alpha, a0),

	            // if (F.eq(a0, F.negone)) return null;
	            c.if(
	                c.call(
	                    prefix + "_eq",
	                    a0,
	                    n1
	                ),
	                c.ret(c.i32_const(0))
	            ),
	            c.ret(c.i32_const(1))
	        );

	    }


	    buildIsZero();
	    buildIsOne();
	    buildZero();
	    buildOne();
	    buildCopy();
	    buildMul();
	    buildMul1();
	    buildSquare();
	    buildAdd();
	    buildSub();
	    buildNeg();
	    buildConjugate();
	    buildToMontgomery();
	    buildFromMontgomery();
	    buildEq();
	    buildInverse();
	    buildTimesScalar();
	    buildSign();
	    buildIsNegative();

	    module.exportFunction(prefix + "_isZero");
	    module.exportFunction(prefix + "_isOne");
	    module.exportFunction(prefix + "_zero");
	    module.exportFunction(prefix + "_one");
	    module.exportFunction(prefix + "_copy");
	    module.exportFunction(prefix + "_mul");
	    module.exportFunction(prefix + "_mul1");
	    module.exportFunction(prefix + "_square");
	    module.exportFunction(prefix + "_add");
	    module.exportFunction(prefix + "_sub");
	    module.exportFunction(prefix + "_neg");
	    module.exportFunction(prefix + "_sign");
	    module.exportFunction(prefix + "_conjugate");
	    module.exportFunction(prefix + "_fromMontgomery");
	    module.exportFunction(prefix + "_toMontgomery");
	    module.exportFunction(prefix + "_eq");
	    module.exportFunction(prefix + "_inverse");
	    buildBatchInverse(module, prefix);
	    buildExp(
	        module,
	        prefix + "_exp",
	        f1n8*2,
	        prefix + "_mul",
	        prefix + "_square",
	        prefix + "_copy",
	        prefix + "_one",
	    );
	    buildSqrt();
	    buildIsSquare();

	    module.exportFunction(prefix + "_exp");
	    module.exportFunction(prefix + "_timesScalar");
	    module.exportFunction(prefix + "_batchInverse");
	    module.exportFunction(prefix + "_sqrt");
	    module.exportFunction(prefix + "_isSquare");
	    module.exportFunction(prefix + "_isNegative");


	    return prefix;
	};
	return build_f2m;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_f3m;
var hasRequiredBuild_f3m;

function requireBuild_f3m () {
	if (hasRequiredBuild_f3m) return build_f3m;
	hasRequiredBuild_f3m = 1;
	const buildExp = /*@__PURE__*/ requireBuild_timesscalar();
	const buildBatchInverse = /*@__PURE__*/ requireBuild_batchinverse();

	build_f3m = function buildF3m(module, mulNonResidueFn, prefix, f1mPrefix) {

	    if (module.modules[prefix]) return prefix;  // already builded

	    const f1n8 = module.modules[f1mPrefix].n64*8;
	    module.modules[prefix] = {
	        n64: module.modules[f1mPrefix].n64*3
	    };

	    function buildAdd() {
	        const f = module.addFunction(prefix+"_add");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_add", x0, y0, r0),
	            c.call(f1mPrefix+"_add", x1, y1, r1),
	            c.call(f1mPrefix+"_add", x2, y2, r2),
	        );
	    }

	    function buildTimesScalar() {
	        const f = module.addFunction(prefix+"_timesScalar");
	        f.addParam("x", "i32");
	        f.addParam("scalar", "i32");
	        f.addParam("scalarLen", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_timesScalar", x0, c.getLocal("scalar"), c.getLocal("scalarLen"), r0),
	            c.call(f1mPrefix+"_timesScalar", x1, c.getLocal("scalar"), c.getLocal("scalarLen"), r1),
	            c.call(f1mPrefix+"_timesScalar", x2, c.getLocal("scalar"), c.getLocal("scalarLen"), r2),
	        );
	    }


	    function buildSub() {
	        const f = module.addFunction(prefix+"_sub");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_sub", x0, y0, r0),
	            c.call(f1mPrefix+"_sub", x1, y1, r1),
	            c.call(f1mPrefix+"_sub", x2, y2, r2),
	        );
	    }

	    function buildNeg() {
	        const f = module.addFunction(prefix+"_neg");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_neg", x0, r0),
	            c.call(f1mPrefix+"_neg", x1, r1),
	            c.call(f1mPrefix+"_neg", x2, r2),
	        );
	    }

	    function buildIsNegative() {
	        const f = module.addFunction(prefix+"_isNegative");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.if(
	                c.call(f1mPrefix+"_isZero", x2),
	                c.if(
	                    c.call(f1mPrefix+"_isZero", x1),
	                    c.ret(c.call(f1mPrefix+"_isNegative", x0)),
	                    c.ret(c.call(f1mPrefix+"_isNegative", x1))
	                )
	            ),
	            c.ret(c.call(f1mPrefix+"_isNegative", x2))
	        );
	    }


	    function buildMul() {
	        const f = module.addFunction(prefix+"_mul");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.addParam("r", "i32");

	        const cd = f.getCodeBuilder();

	        const a = cd.getLocal("x");
	        const b = cd.i32_add(cd.getLocal("x"), cd.i32_const(f1n8));
	        const c = cd.i32_add(cd.getLocal("x"), cd.i32_const(2*f1n8));
	        const A = cd.getLocal("y");
	        const B = cd.i32_add(cd.getLocal("y"), cd.i32_const(f1n8));
	        const C = cd.i32_add(cd.getLocal("y"), cd.i32_const(2*f1n8));
	        const r0 = cd.getLocal("r");
	        const r1 = cd.i32_add(cd.getLocal("r"), cd.i32_const(f1n8));
	        const r2 = cd.i32_add(cd.getLocal("r"), cd.i32_const(2*f1n8));

	        const aA = cd.i32_const(module.alloc(f1n8));
	        const bB = cd.i32_const(module.alloc(f1n8));
	        const cC = cd.i32_const(module.alloc(f1n8));
	        const a_b = cd.i32_const(module.alloc(f1n8));
	        const A_B = cd.i32_const(module.alloc(f1n8));
	        const a_c = cd.i32_const(module.alloc(f1n8));
	        const A_C = cd.i32_const(module.alloc(f1n8));
	        const b_c = cd.i32_const(module.alloc(f1n8));
	        const B_C = cd.i32_const(module.alloc(f1n8));
	        const aA_bB = cd.i32_const(module.alloc(f1n8));
	        const aA_cC = cd.i32_const(module.alloc(f1n8));
	        const bB_cC = cd.i32_const(module.alloc(f1n8));
	        const AUX = cd.i32_const(module.alloc(f1n8));


	        f.addCode(
	            cd.call(f1mPrefix + "_mul", a, A, aA),
	            cd.call(f1mPrefix + "_mul", b, B, bB),
	            cd.call(f1mPrefix + "_mul", c, C, cC),

	            cd.call(f1mPrefix + "_add", a, b, a_b),
	            cd.call(f1mPrefix + "_add", A, B, A_B),
	            cd.call(f1mPrefix + "_add", a, c, a_c),
	            cd.call(f1mPrefix + "_add", A, C, A_C),
	            cd.call(f1mPrefix + "_add", b, c, b_c),
	            cd.call(f1mPrefix + "_add", B, C, B_C),

	            cd.call(f1mPrefix + "_add", aA, bB, aA_bB),
	            cd.call(f1mPrefix + "_add", aA, cC, aA_cC),
	            cd.call(f1mPrefix + "_add", bB, cC, bB_cC),

	            cd.call(f1mPrefix + "_mul", b_c, B_C, r0),
	            cd.call(f1mPrefix + "_sub", r0, bB_cC, r0),
	            cd.call(mulNonResidueFn, r0, r0),
	            cd.call(f1mPrefix + "_add", aA, r0, r0),

	            cd.call(f1mPrefix + "_mul", a_b, A_B, r1),
	            cd.call(f1mPrefix + "_sub", r1, aA_bB, r1),
	            cd.call(mulNonResidueFn, cC, AUX),
	            cd.call(f1mPrefix + "_add", r1, AUX, r1),

	            cd.call(f1mPrefix + "_mul", a_c, A_C, r2),
	            cd.call(f1mPrefix + "_sub", r2, aA_cC, r2),
	            cd.call(f1mPrefix + "_add", r2, bB, r2),
	        );

	    }

	    function buildSquare() {
	        const f = module.addFunction(prefix+"_square");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const A = c.getLocal("x");
	        const B = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const C = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        const s0 = c.i32_const(module.alloc(f1n8));
	        const ab = c.i32_const(module.alloc(f1n8));
	        const s1 = c.i32_const(module.alloc(f1n8));
	        const s2 = c.i32_const(module.alloc(f1n8));
	        const bc = c.i32_const(module.alloc(f1n8));
	        const s3 = c.i32_const(module.alloc(f1n8));
	        const s4 = c.i32_const(module.alloc(f1n8));


	        f.addCode(

	            c.call(f1mPrefix + "_square", A, s0),
	            c.call(f1mPrefix + "_mul", A, B, ab),
	            c.call(f1mPrefix + "_add", ab, ab, s1),

	            c.call(f1mPrefix + "_sub", A, B, s2),
	            c.call(f1mPrefix + "_add", s2, C, s2),
	            c.call(f1mPrefix + "_square", s2, s2),

	            c.call(f1mPrefix + "_mul", B, C, bc),
	            c.call(f1mPrefix + "_add", bc, bc, s3),

	            c.call(f1mPrefix + "_square", C, s4),

	            c.call(mulNonResidueFn, s3, r0),
	            c.call(f1mPrefix + "_add", s0, r0, r0),

	            c.call(mulNonResidueFn, s4, r1),
	            c.call(f1mPrefix + "_add", s1, r1, r1),

	            c.call(f1mPrefix + "_add", s0, s4, r2),
	            c.call(f1mPrefix + "_sub", s3, r2, r2),
	            c.call(f1mPrefix + "_add", s2, r2, r2),
	            c.call(f1mPrefix + "_add", s1, r2, r2),
	        );

	    }


	    function buildToMontgomery() {
	        const f = module.addFunction(prefix+"_toMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_toMontgomery", x0, r0),
	            c.call(f1mPrefix+"_toMontgomery", x1, r1),
	            c.call(f1mPrefix+"_toMontgomery", x2, r2)
	        );
	    }

	    function buildFromMontgomery() {
	        const f = module.addFunction(prefix+"_fromMontgomery");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_fromMontgomery", x0, r0),
	            c.call(f1mPrefix+"_fromMontgomery", x1, r1),
	            c.call(f1mPrefix+"_fromMontgomery", x2, r2)
	        );
	    }

	    function buildCopy() {
	        const f = module.addFunction(prefix+"_copy");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_copy", x0, r0),
	            c.call(f1mPrefix+"_copy", x1, r1),
	            c.call(f1mPrefix+"_copy", x2, r2),
	        );
	    }

	    function buildZero() {
	        const f = module.addFunction(prefix+"_zero");
	        f.addParam("x", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_zero", x0),
	            c.call(f1mPrefix+"_zero", x1),
	            c.call(f1mPrefix+"_zero", x2),
	        );
	    }

	    function buildOne() {
	        const f = module.addFunction(prefix+"_one");
	        f.addParam("x", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_one", x0),
	            c.call(f1mPrefix+"_zero", x1),
	            c.call(f1mPrefix+"_zero", x2),
	        );
	    }

	    function buildEq() {
	        const f = module.addFunction(prefix+"_eq");
	        f.addParam("x", "i32");
	        f.addParam("y", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const y0 = c.getLocal("y");
	        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
	        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.i32_and(
	                c.i32_and(
	                    c.call(f1mPrefix+"_eq", x0, y0),
	                    c.call(f1mPrefix+"_eq", x1, y1),
	                ),
	                c.call(f1mPrefix+"_eq", x2, y2)
	            )
	        );
	    }

	    function buildIsZero() {
	        const f = module.addFunction(prefix+"_isZero");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.i32_and(
	                c.i32_and(
	                    c.call(f1mPrefix+"_isZero", x0),
	                    c.call(f1mPrefix+"_isZero", x1)
	                ),
	                c.call(f1mPrefix+"_isZero", x2)
	            )
	        );
	    }

	    function buildInverse() {
	        const f = module.addFunction(prefix+"_inverse");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
	        const r0 = c.getLocal("r");
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

	        const t0 = c.i32_const(module.alloc(f1n8));
	        const t1 = c.i32_const(module.alloc(f1n8));
	        const t2 = c.i32_const(module.alloc(f1n8));
	        const t3 = c.i32_const(module.alloc(f1n8));
	        const t4 = c.i32_const(module.alloc(f1n8));
	        const t5 = c.i32_const(module.alloc(f1n8));
	        const c0 = c.i32_const(module.alloc(f1n8));
	        const c1 = c.i32_const(module.alloc(f1n8));
	        const c2 = c.i32_const(module.alloc(f1n8));
	        const t6 = c.i32_const(module.alloc(f1n8));
	        const AUX = c.i32_const(module.alloc(f1n8));

	        f.addCode(
	            c.call(f1mPrefix+"_square", x0, t0),
	            c.call(f1mPrefix+"_square", x1, t1),
	            c.call(f1mPrefix+"_square", x2, t2),
	            c.call(f1mPrefix+"_mul", x0, x1, t3),
	            c.call(f1mPrefix+"_mul", x0, x2, t4),
	            c.call(f1mPrefix+"_mul", x1, x2, t5),

	            c.call(mulNonResidueFn, t5, c0),
	            c.call(f1mPrefix+"_sub", t0, c0, c0),

	            c.call(mulNonResidueFn, t2, c1),
	            c.call(f1mPrefix+"_sub", c1, t3, c1),

	            c.call(f1mPrefix+"_sub", t1, t4, c2),

	            c.call(f1mPrefix+"_mul", x2, c1, t6),
	            c.call(f1mPrefix+"_mul", x1, c2, AUX),
	            c.call(f1mPrefix+"_add", t6, AUX, t6),
	            c.call(mulNonResidueFn, t6, t6),
	            c.call(f1mPrefix+"_mul", x0, c0, AUX),
	            c.call(f1mPrefix+"_add", AUX, t6, t6),

	            c.call(f1mPrefix+"_inverse", t6, t6),

	            c.call(f1mPrefix+"_mul", t6, c0, r0),
	            c.call(f1mPrefix+"_mul", t6, c1, r1),
	            c.call(f1mPrefix+"_mul", t6, c2, r2)
	        );
	    }


	    function buildSign() {
	        const f = module.addFunction(prefix+"_sign");
	        f.addParam("x", "i32");
	        f.addLocal("s", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

	        f.addCode(
	            c.setLocal("s" , c.call( f1mPrefix + "_sign", x2)),
	            c.if(
	                c.getLocal("s"),
	                c.ret(c.getLocal("s"))
	            ),
	            c.setLocal("s" , c.call( f1mPrefix + "_sign", x1)),
	            c.if(
	                c.getLocal("s"),
	                c.ret(c.getLocal("s"))
	            ),
	            c.ret(c.call( f1mPrefix + "_sign", x0))
	        );
	    }

	    function buildIsOne() {
	        const f = module.addFunction(prefix+"_isOne");
	        f.addParam("x", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8*2));

	        f.addCode(
	            c.ret(
	                c.i32_and(
	                    c.i32_and(
	                        c.call(f1mPrefix + "_isOne", x0),
	                        c.call(f1mPrefix + "_isZero", x1)
	                    ),
	                    c.call(f1mPrefix + "_isZero", x2)
	                )
	            )
	        );
	    }

	    buildIsZero();
	    buildIsOne();
	    buildZero();
	    buildOne();
	    buildCopy();
	    buildMul();
	    buildSquare();
	    buildAdd();
	    buildSub();
	    buildNeg();
	    buildSign();
	    buildToMontgomery();
	    buildFromMontgomery();
	    buildEq();
	    buildInverse();
	    buildTimesScalar();
	    buildIsNegative();

	    module.exportFunction(prefix + "_isZero");
	    module.exportFunction(prefix + "_isOne");
	    module.exportFunction(prefix + "_zero");
	    module.exportFunction(prefix + "_one");
	    module.exportFunction(prefix + "_copy");
	    module.exportFunction(prefix + "_mul");
	    module.exportFunction(prefix + "_square");
	    module.exportFunction(prefix + "_add");
	    module.exportFunction(prefix + "_sub");
	    module.exportFunction(prefix + "_neg");
	    module.exportFunction(prefix + "_sign");
	    module.exportFunction(prefix + "_fromMontgomery");
	    module.exportFunction(prefix + "_toMontgomery");
	    module.exportFunction(prefix + "_eq");
	    module.exportFunction(prefix + "_inverse");
	    buildBatchInverse(module, prefix);
	    buildExp(
	        module,
	        prefix + "_exp",
	        f1n8*3,
	        prefix + "_mul",
	        prefix + "_square",
	        prefix + "_copy",
	        prefix + "_one"
	    );
	    module.exportFunction(prefix + "_exp");
	    module.exportFunction(prefix + "_timesScalar");
	    module.exportFunction(prefix + "_batchInverse");
	    module.exportFunction(prefix + "_isNegative");

	    return prefix;
	};
	return build_f3m;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_timesscalarnaf;
var hasRequiredBuild_timesscalarnaf;

function requireBuild_timesscalarnaf () {
	if (hasRequiredBuild_timesscalarnaf) return build_timesscalarnaf;
	hasRequiredBuild_timesscalarnaf = 1;
	build_timesscalarnaf = function buildTimesScalarNAF(module, fnName, elementLen, opAB, opAA, opAmB, opCopy, opInit) {

	    const f = module.addFunction(fnName);
	    f.addParam("base", "i32");
	    f.addParam("scalar", "i32");
	    f.addParam("scalarLength", "i32");
	    f.addParam("r", "i32");
	    f.addLocal("old0", "i32");
	    f.addLocal("nbits", "i32");
	    f.addLocal("i", "i32");
	    f.addLocal("last", "i32");
	    f.addLocal("cur", "i32");
	    f.addLocal("carry", "i32");
	    f.addLocal("p", "i32");

	    const c = f.getCodeBuilder();

	    const aux = c.i32_const(module.alloc(elementLen));

	    function getBit(IDX) {
	        return c.i32_and(
	            c.i32_shr_u(
	                c.i32_load(
	                    c.i32_add(
	                        c.getLocal("scalar"),
	                        c.i32_and(
	                            c.i32_shr_u(
	                                IDX,
	                                c.i32_const(3)
	                            ),
	                            c.i32_const(0xFFFFFFFC)
	                        )
	                    )
	                ),
	                c.i32_and(
	                    IDX,
	                    c.i32_const(0x1F)
	                )
	            ),
	            c.i32_const(1)
	        );
	    }

	    function pushBit(b) {
	        return [
	            ...c.i32_store8(
	                c.getLocal("p"),
	                c.i32_const(b)
	            ),
	            ...c.setLocal(
	                "p",
	                c.i32_add(
	                    c.getLocal("p"),
	                    c.i32_const(1)
	                )
	            )
	        ];
	    }

	    f.addCode(
	        c.if(
	            c.i32_eqz(c.getLocal("scalarLength")),
	            [
	                ...c.call(opInit, c.getLocal("r")),
	                ...c.ret([])
	            ]
	        ),
	        c.setLocal("nbits", c.i32_shl(c.getLocal("scalarLength"), c.i32_const(3))),
	        c.setLocal("old0", c.i32_load(c.i32_const(0))),
	        c.setLocal("p", c.getLocal("old0")),
	        c.i32_store(
	            c.i32_const(0),
	            c.i32_and(
	                c.i32_add(
	                    c.i32_add(
	                        c.getLocal("old0"),
	                        c.i32_const(32)
	                    ),
	                    c.getLocal("nbits")
	                ),
	                c.i32_const(0xFFFFFFF8)
	            )
	        ),
	        c.setLocal("i", c.i32_const(1)),

	        c.setLocal("last",getBit(c.i32_const(0))),
	        c.setLocal("carry",c.i32_const(0)),

	        c.block(c.loop(
	            c.br_if(1, c.i32_eq( c.getLocal("i"), c.getLocal("nbits"))),

	            c.setLocal("cur", getBit(c.getLocal("i"))),
	            c.if( c.getLocal("last"),
	                c.if( c.getLocal("cur"),
	                    c.if(c.getLocal("carry"),
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(1)),
	                            ...pushBit(1)
	                        ]
	                        ,
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(1)),
	                            ...pushBit(255)
	                        ],
	                    ),
	                    c.if(c.getLocal("carry"),
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(1)),
	                            ...pushBit(255)
	                        ]
	                        ,
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(0)),
	                            ...pushBit(1)
	                        ],
	                    ),
	                ),
	                c.if( c.getLocal("cur"),
	                    c.if(c.getLocal("carry"),
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(1)),
	                            ...pushBit(0)
	                        ]
	                        ,
	                        [
	                            ...c.setLocal("last", c.i32_const(1)),
	                            ...c.setLocal("carry", c.i32_const(0)),
	                            ...pushBit(0)
	                        ],
	                    ),
	                    c.if(c.getLocal("carry"),
	                        [
	                            ...c.setLocal("last", c.i32_const(1)),
	                            ...c.setLocal("carry", c.i32_const(0)),
	                            ...pushBit(0)
	                        ]
	                        ,
	                        [
	                            ...c.setLocal("last", c.i32_const(0)),
	                            ...c.setLocal("carry", c.i32_const(0)),
	                            ...pushBit(0)
	                        ],
	                    ),
	                )
	            ),
	            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	            c.br(0)
	        )),

	        c.if( c.getLocal("last"),
	            c.if(c.getLocal("carry"),
	                [
	                    ...pushBit(255),
	                    ...pushBit(0),
	                    ...pushBit(1)
	                ]
	                ,
	                [
	                    ...pushBit(1)
	                ],
	            ),
	            c.if(c.getLocal("carry"),
	                [
	                    ...pushBit(0),
	                    ...pushBit(1)
	                ]
	            ),
	        ),

	        c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),

	        // p already points to the last bit

	        c.call(opCopy, c.getLocal("base"), aux),

	        c.call(opInit, c.getLocal("r")),

	        c.block(c.loop(


	            c.call(opAA, c.getLocal("r"), c.getLocal("r")),


	            c.setLocal("cur",
	                c.i32_load8_u(
	                    c.getLocal("p")
	                )
	            ),

	            c.if(
	                c.getLocal("cur"),
	                c.if(
	                    c.i32_eq(c.getLocal("cur"), c.i32_const(1)),
	                    c.call(opAB,  c.getLocal("r"), aux, c.getLocal("r")),
	                    c.call(opAmB, c.getLocal("r"), aux, c.getLocal("r")),
	                )
	            ),

	            c.br_if(1, c.i32_eq( c.getLocal("old0"), c.getLocal("p"))),
	            c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
	            c.br(0)

	        )),

	        c.i32_store( c.i32_const(0), c.getLocal("old0"))

	    );

	};
	return build_timesscalarnaf;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_multiexp;
var hasRequiredBuild_multiexp;

function requireBuild_multiexp () {
	if (hasRequiredBuild_multiexp) return build_multiexp;
	hasRequiredBuild_multiexp = 1;
	build_multiexp = function buildMultiexp(module, prefix, fnName, opAdd, n8b) {

	    const n64g = module.modules[prefix].n64;
	    const n8g = n64g*8;

	    function buildGetChunk() {
	        const f = module.addFunction(fnName + "_getChunk");
	        f.addParam("pScalar", "i32");
	        f.addParam("scalarSize", "i32");  // Number of bytes of the scalar
	        f.addParam("startBit", "i32");  // Bit to start extract
	        f.addParam("chunkSize", "i32");  // Chunk size in bits
	        f.addLocal("bitsToEnd", "i32");
	        f.addLocal("mask", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal("bitsToEnd",
	                c.i32_sub(
	                    c.i32_mul(
	                        c.getLocal("scalarSize"),
	                        c.i32_const(8)
	                    ),
	                    c.getLocal("startBit")
	                )
	            ),
	            c.if(
	                c.i32_gt_s(
	                    c.getLocal("chunkSize"),
	                    c.getLocal("bitsToEnd")
	                ),
	                c.setLocal(
	                    "mask",
	                    c.i32_sub(
	                        c.i32_shl(
	                            c.i32_const(1),
	                            c.getLocal("bitsToEnd")
	                        ),
	                        c.i32_const(1)
	                    )
	                ),
	                c.setLocal(
	                    "mask",
	                    c.i32_sub(
	                        c.i32_shl(
	                            c.i32_const(1),
	                            c.getLocal("chunkSize")
	                        ),
	                        c.i32_const(1)
	                    )
	                )
	            ),
	            c.i32_and(
	                c.i32_shr_u(
	                    c.i32_load(
	                        c.i32_add(
	                            c.getLocal("pScalar"),
	                            c.i32_shr_u(
	                                c.getLocal("startBit"),
	                                c.i32_const(3)
	                            )
	                        ),
	                        0,  // offset
	                        0   // align to byte.
	                    ),
	                    c.i32_and(
	                        c.getLocal("startBit"),
	                        c.i32_const(0x7)
	                    )
	                ),
	                c.getLocal("mask")
	            )
	        );
	    }

	    function buildMutiexpChunk() {
	        const f = module.addFunction(fnName + "_chunk");
	        f.addParam("pBases", "i32");
	        f.addParam("pScalars", "i32");
	        f.addParam("scalarSize", "i32");  // Number of points
	        f.addParam("n", "i32");  // Number of points
	        f.addParam("startBit", "i32");  // bit where it starts the chunk
	        f.addParam("chunkSize", "i32");  // bit where it starts the chunk
	        f.addParam("pr", "i32");
	        f.addLocal("nChunks", "i32");
	        f.addLocal("itScalar", "i32");
	        f.addLocal("endScalar", "i32");
	        f.addLocal("itBase", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");
	        f.addLocal("nTable", "i32");
	        f.addLocal("pTable", "i32");
	        f.addLocal("idx", "i32");
	        f.addLocal("pIdxTable", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.if(
	                c.i32_eqz(c.getLocal("n")),
	                [
	                    ...c.call(prefix + "_zero", c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),

	            // Allocate memory

	            c.setLocal(
	                "nTable",
	                c.i32_shl(
	                    c.i32_const(1),
	                    c.getLocal("chunkSize")
	                )
	            ),
	            c.setLocal("pTable", c.i32_load( c.i32_const(0) )),
	            c.i32_store(
	                c.i32_const(0),
	                c.i32_add(
	                    c.getLocal("pTable"),
	                    c.i32_mul(
	                        c.getLocal("nTable"),
	                        c.i32_const(n8g)
	                    )
	                )
	            ),

	            // Reset Table
	            c.setLocal("j", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("j"),
	                        c.getLocal("nTable")
	                    )
	                ),

	                c.call(
	                    prefix + "_zero",
	                    c.i32_add(
	                        c.getLocal("pTable"),
	                        c.i32_mul(
	                            c.getLocal("j"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                c.br(0)
	            )),

	            // Distribute elements
	            c.setLocal("itBase", c.getLocal("pBases")),
	            c.setLocal("itScalar", c.getLocal("pScalars")),
	            c.setLocal("endScalar",
	                c.i32_add(
	                    c.getLocal("pScalars"),
	                    c.i32_mul(
	                        c.getLocal("n"),
	                        c.getLocal("scalarSize")
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("itScalar"),
	                        c.getLocal("endScalar")
	                    )
	                ),

	                c.setLocal(
	                    "idx",
	                    c.call(fnName + "_getChunk",
	                        c.getLocal("itScalar"),
	                        c.getLocal("scalarSize"),
	                        c.getLocal("startBit"),
	                        c.getLocal("chunkSize")
	                    )
	                ),

	                c.if(
	                    c.getLocal("idx"),
	                    [
	                        ...c.setLocal(
	                            "pIdxTable",
	                            c.i32_add(
	                                c.getLocal("pTable"),
	                                c.i32_mul(
	                                    c.i32_sub(
	                                        c.getLocal("idx"),
	                                        c.i32_const(1)
	                                    ),
	                                    c.i32_const(n8g)
	                                )
	                            )
	                        ),
	                        ...c.call(
	                            opAdd,
	                            c.getLocal("pIdxTable"),
	                            c.getLocal("itBase"),
	                            c.getLocal("pIdxTable"),
	                        )
	                    ]
	                ),

	                c.setLocal("itScalar", c.i32_add(c.getLocal("itScalar"), c.getLocal("scalarSize"))),
	                c.setLocal("itBase", c.i32_add(c.getLocal("itBase"), c.i32_const(n8b))),
	                c.br(0)
	            )),

	            c.call(fnName + "_reduceTable", c.getLocal("pTable"), c.getLocal("chunkSize")),
	            c.call(
	                prefix + "_copy",
	                c.getLocal("pTable"),
	                c.getLocal("pr")
	            ),


	            c.i32_store(
	                c.i32_const(0),
	                c.getLocal("pTable")
	            )

	        );
	    }

	    function buildMultiexp() {
	        const f = module.addFunction(fnName);
	        f.addParam("pBases", "i32");
	        f.addParam("pScalars", "i32");
	        f.addParam("scalarSize", "i32");  // Number of points
	        f.addParam("n", "i32");  // Number of points
	        f.addParam("pr", "i32");
	        f.addLocal("chunkSize", "i32");
	        f.addLocal("nChunks", "i32");
	        f.addLocal("itScalar", "i32");
	        f.addLocal("endScalar", "i32");
	        f.addLocal("itBase", "i32");
	        f.addLocal("itBit", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");
	        f.addLocal("nTable", "i32");
	        f.addLocal("pTable", "i32");
	        f.addLocal("idx", "i32");
	        f.addLocal("pIdxTable", "i32");

	        const c = f.getCodeBuilder();

	        const aux = c.i32_const(module.alloc(n8g));

	        const pTSizes = module.alloc([
	            17, 17, 17, 17,   17, 17, 17, 17,
	            17, 17, 16, 16,   15, 14, 13, 13,
	            12, 11, 10,  9,    8,  7,  7,  6,
	            5 ,  4,  3,  2,    1,  1,  1,  1
	        ]);

	        f.addCode(
	            c.call(prefix + "_zero", c.getLocal("pr")),
	            c.if(
	                c.i32_eqz(c.getLocal("n")),
	                c.ret([])
	            ),
	            c.setLocal("chunkSize", c.i32_load8_u( c.i32_clz(c.getLocal("n")),  pTSizes )),
	            c.setLocal(
	                "nChunks",
	                c.i32_add(
	                    c.i32_div_u(
	                        c.i32_sub(
	                            c.i32_shl(
	                                c.getLocal("scalarSize"),
	                                c.i32_const(3)
	                            ),
	                            c.i32_const(1)
	                        ),
	                        c.getLocal("chunkSize")
	                    ),
	                    c.i32_const(1)
	                )
	            ),


	            // Allocate memory

	            c.setLocal(
	                "itBit",
	                c.i32_mul(
	                    c.i32_sub(
	                        c.getLocal("nChunks"),
	                        c.i32_const(1)
	                    ),
	                    c.getLocal("chunkSize")
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_lt_s(
	                        c.getLocal("itBit"),
	                        c.i32_const(0)
	                    )
	                ),

	                // Double nChunk times
	                c.if(
	                    c.i32_eqz(c.call(prefix + "_isZero", c.getLocal("pr"))),
	                    [
	                        ...c.setLocal("j", c.i32_const(0)),
	                        ...c.block(c.loop(
	                            c.br_if(
	                                1,
	                                c.i32_eq(
	                                    c.getLocal("j"),
	                                    c.getLocal("chunkSize")
	                                )
	                            ),

	                            c.call(prefix + "_double", c.getLocal("pr"), c.getLocal("pr")),

	                            c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                            c.br(0)
	                        ))
	                    ]
	                ),

	                c.call(
	                    fnName + "_chunk",
	                    c.getLocal("pBases"),
	                    c.getLocal("pScalars"),
	                    c.getLocal("scalarSize"),
	                    c.getLocal("n"),
	                    c.getLocal("itBit"),
	                    c.getLocal("chunkSize"),
	                    aux
	                ),

	                c.call(
	                    prefix + "_add",
	                    c.getLocal("pr"),
	                    aux,
	                    c.getLocal("pr")
	                ),
	                c.setLocal("itBit", c.i32_sub(c.getLocal("itBit"), c.getLocal("chunkSize"))),
	                c.br(0)
	            ))
	        );
	    }

	    function buildReduceTable() {
	        const f = module.addFunction(fnName + "_reduceTable");
	        f.addParam("pTable", "i32");
	        f.addParam("p", "i32");  // Number of bits of the table
	        f.addLocal("half", "i32");
	        f.addLocal("it1", "i32");
	        f.addLocal("it2", "i32");
	        f.addLocal("pAcc", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.if(
	                c.i32_eq(c.getLocal("p"), c.i32_const(1)),
	                c.ret([])
	            ),
	            c.setLocal(
	                "half",
	                c.i32_shl(
	                    c.i32_const(1),
	                    c.i32_sub(
	                        c.getLocal("p"),
	                        c.i32_const(1)
	                    )
	                )
	            ),

	            c.setLocal("it1", c.getLocal("pTable")),
	            c.setLocal(
	                "it2",
	                c.i32_add(
	                    c.getLocal("pTable"),
	                    c.i32_mul(
	                        c.getLocal("half"),
	                        c.i32_const(n8g)
	                    )
	                )
	            ),
	            c.setLocal("pAcc",
	                c.i32_sub(
	                    c.getLocal("it2"),
	                    c.i32_const(n8g)
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("it1"),
	                        c.getLocal("pAcc")
	                    )
	                ),
	                c.call(
	                    prefix + "_add",
	                    c.getLocal("it1"),
	                    c.getLocal("it2"),
	                    c.getLocal("it1")
	                ),
	                c.call(
	                    prefix + "_add",
	                    c.getLocal("pAcc"),
	                    c.getLocal("it2"),
	                    c.getLocal("pAcc")
	                ),
	                c.setLocal("it1", c.i32_add(c.getLocal("it1"), c.i32_const(n8g))),
	                c.setLocal("it2", c.i32_add(c.getLocal("it2"), c.i32_const(n8g))),
	                c.br(0)
	            )),

	            c.call(
	                fnName + "_reduceTable",
	                c.getLocal("pTable"),
	                c.i32_sub(
	                    c.getLocal("p"),
	                    c.i32_const(1)
	                )
	            ),

	            c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eqz(c.getLocal("p"))),
	                c.call(prefix + "_double", c.getLocal("pAcc"), c.getLocal("pAcc")),
	                c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
	                c.br(0)
	            )),

	            c.call(prefix + "_add", c.getLocal("pTable"), c.getLocal("pAcc"), c.getLocal("pTable"))
	        );
	    }

	    buildGetChunk();
	    buildReduceTable();
	    buildMutiexpChunk();
	    buildMultiexp();

	    module.exportFunction(fnName);
	    module.exportFunction(fnName +"_chunk");


	};
	return build_multiexp;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_curve_jacobian_a0;
var hasRequiredBuild_curve_jacobian_a0;

function requireBuild_curve_jacobian_a0 () {
	if (hasRequiredBuild_curve_jacobian_a0) return build_curve_jacobian_a0;
	hasRequiredBuild_curve_jacobian_a0 = 1;
	const buildTimesScalarNAF = /*@__PURE__*/ requireBuild_timesscalarnaf();
	//const buildTimesScalar = require("./build_timesscalar");
	const buildBatchConvertion = /*@__PURE__*/ requireBuild_batchconvertion();
	const buildMultiexp = /*@__PURE__*/ requireBuild_multiexp();

	build_curve_jacobian_a0 = function buildCurve(module, prefix, prefixField, pB) {


	    const n64 = module.modules[prefixField].n64;
	    const n8 = n64*8;

	    if (module.modules[prefix]) return prefix;  // already builded
	    module.modules[prefix] = {
	        n64: n64*3
	    };

	    function buildIsZero() {
	        const f = module.addFunction(prefix + "_isZero");
	        f.addParam("p1", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_isZero",
	            c.i32_add(
	                c.getLocal("p1"),
	                c.i32_const(n8*2)
	            )
	        ));
	    }
	    function buildIsZeroAffine() {
	        const f = module.addFunction(prefix + "_isZeroAffine");
	        f.addParam("p1", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.i32_and(
	                c.call(
	                    prefixField + "_isZero",
	                    c.getLocal("p1")
	                ),
	                c.call(
	                    prefixField + "_isZero",
	                    c.i32_add(
	                        c.getLocal("p1"),
	                        c.i32_const(n8)
	                    )
	                )
	            )
	        );
	    }

	    function buildCopy() {
	        const f = module.addFunction(prefix + "_copy");
	        f.addParam("ps", "i32");
	        f.addParam("pd", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<n64*3; i++) {
	            f.addCode(
	                c.i64_store(
	                    c.getLocal("pd"),
	                    i*8,
	                    c.i64_load(
	                        c.getLocal("ps"),
	                        i*8
	                    )
	                )
	            );
	        }
	    }


	    function buildCopyAffine() {
	        const f = module.addFunction(prefix + "_copyAffine");
	        f.addParam("ps", "i32");
	        f.addParam("pd", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<n64*2; i++) {
	            f.addCode(
	                c.i64_store(
	                    c.getLocal("pd"),
	                    i*8,
	                    c.i64_load(
	                        c.getLocal("ps"),
	                        i*8
	                    )
	                )
	            );
	        }

	    }


	    function buildZero() {
	        const f = module.addFunction(prefix + "_zero");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_zero",
	            c.getLocal("pr")
	        ));

	        f.addCode(c.call(
	            prefixField + "_one",
	            c.i32_add(
	                c.getLocal("pr"),
	                c.i32_const(n8)
	            )
	        ));

	        f.addCode(c.call(
	            prefixField + "_zero",
	            c.i32_add(
	                c.getLocal("pr"),
	                c.i32_const(n8*2)
	            )
	        ));
	    }


	    function buildZeroAffine() {
	        const f = module.addFunction(prefix + "_zeroAffine");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_zero",
	            c.getLocal("pr")
	        ));

	        f.addCode(c.call(
	            prefixField + "_zero",
	            c.i32_add(
	                c.getLocal("pr"),
	                c.i32_const(n8)
	            )
	        ));
	    }

	    function buildEq() {
	        const f = module.addFunction(prefix + "_eq");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.setReturnType("i32");
	        f.addLocal("z1", "i32");
	        f.addLocal("z2", "i32");

	        const c = f.getCodeBuilder();

	        const x1 = c.getLocal("p1");
	        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
	        const z1 = c.getLocal("z1");
	        const x2 = c.getLocal("p2");
	        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
	        f.addCode(c.setLocal("z2", c.i32_add(c.getLocal("p2"), c.i32_const(n8*2))));
	        const z2 = c.getLocal("z2");

	        const Z1Z1 = c.i32_const(module.alloc(n8));
	        const Z2Z2 = c.i32_const(module.alloc(n8));
	        const U1 = c.i32_const(module.alloc(n8));
	        const U2 = c.i32_const(module.alloc(n8));
	        const Z1_cubed = c.i32_const(module.alloc(n8));
	        const Z2_cubed = c.i32_const(module.alloc(n8));
	        const S1 = c.i32_const(module.alloc(n8));
	        const S2 = c.i32_const(module.alloc(n8));


	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                c.ret( c.call(prefix + "_isZero", c.getLocal("p2"))),
	            ),
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p2")),
	                c.ret(c.i32_const(0))
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z1),
	                c.ret(c.call(prefix + "_eqMixed", c.getLocal("p2"), c.getLocal("p1")))
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z2),
	                c.ret(c.call(prefix + "_eqMixed", c.getLocal("p1"), c.getLocal("p2")))
	            ),

	            c.call(prefixField + "_square", z1, Z1Z1),
	            c.call(prefixField + "_square", z2, Z2Z2),
	            c.call(prefixField + "_mul", x1, Z2Z2, U1),
	            c.call(prefixField + "_mul", x2, Z1Z1, U2),
	            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
	            c.call(prefixField + "_mul", z2, Z2Z2, Z2_cubed),
	            c.call(prefixField + "_mul", y1, Z2_cubed, S1),
	            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

	            c.if(
	                c.call(prefixField + "_eq", U1, U2),
	                c.if(
	                    c.call(prefixField + "_eq", S1, S2),
	                    c.ret(c.i32_const(1))
	                )
	            ),
	            c.ret(c.i32_const(0))
	        );
	    }


	    function buildEqMixed() {
	        const f = module.addFunction(prefix + "_eqMixed");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.setReturnType("i32");
	        f.addLocal("z1", "i32");

	        const c = f.getCodeBuilder();

	        const x1 = c.getLocal("p1");
	        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
	        const z1 = c.getLocal("z1");
	        const x2 = c.getLocal("p2");
	        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));

	        const Z1Z1 = c.i32_const(module.alloc(n8));
	        const U2 = c.i32_const(module.alloc(n8));
	        const Z1_cubed = c.i32_const(module.alloc(n8));
	        const S2 = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                c.ret( c.call(prefix + "_isZeroAffine", c.getLocal("p2"))),
	            ),
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
	                c.ret(c.i32_const(0))
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z1),
	                c.ret(c.call(prefix + "_eqAffine", c.getLocal("p1"), c.getLocal("p2")))
	            ),
	            c.call(prefixField + "_square", z1, Z1Z1),
	            c.call(prefixField + "_mul", x2, Z1Z1, U2),
	            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
	            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

	            c.if(
	                c.call(prefixField + "_eq", x1, U2),
	                c.if(
	                    c.call(prefixField + "_eq", y1, S2),
	                    c.ret(c.i32_const(1))
	                )
	            ),
	            c.ret(c.i32_const(0))
	        );
	    }

	    function buildDouble() {
	        const f = module.addFunction(prefix + "_double");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        const A = c.i32_const(module.alloc(n8));
	        const B = c.i32_const(module.alloc(n8));
	        const C = c.i32_const(module.alloc(n8));
	        const D = c.i32_const(module.alloc(n8));
	        const E = c.i32_const(module.alloc(n8));
	        const F = c.i32_const(module.alloc(n8));
	        const G = c.i32_const(module.alloc(n8));
	        const eightC = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                [
	                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z),
	                [
	                    ...c.ret(c.call(prefix + "_doubleAffine", c.getLocal("p1"), c.getLocal("pr"))),
	                    ...c.ret([])
	                ]
	            ),

	            c.call(prefixField + "_square", x, A),
	            c.call(prefixField + "_square", y, B),
	            c.call(prefixField + "_square", B, C),

	            c.call(prefixField + "_add", x, B, D),
	            c.call(prefixField + "_square", D, D),
	            c.call(prefixField + "_sub", D, A, D),
	            c.call(prefixField + "_sub", D, C, D),
	            c.call(prefixField + "_add", D, D, D),

	            c.call(prefixField + "_add", A, A, E),
	            c.call(prefixField + "_add", E, A, E),
	            c.call(prefixField + "_square", E, F),

	            c.call(prefixField + "_mul", y, z, G),

	            c.call(prefixField + "_add", D, D, x3),
	            c.call(prefixField + "_sub", F, x3, x3),

	            c.call(prefixField + "_add", C, C, eightC),
	            c.call(prefixField + "_add", eightC, eightC, eightC),
	            c.call(prefixField + "_add", eightC, eightC, eightC),

	            c.call(prefixField + "_sub", D, x3, y3),
	            c.call(prefixField + "_mul", y3, E, y3),
	            c.call(prefixField + "_sub", y3, eightC, y3),

	            c.call(prefixField + "_add", G, G, z3),
	        );
	    }


	    function buildDoubleAffine() {
	        const f = module.addFunction(prefix + "_doubleAffine");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        const XX = c.i32_const(module.alloc(n8));
	        const YY = c.i32_const(module.alloc(n8));
	        const YYYY = c.i32_const(module.alloc(n8));
	        const S = c.i32_const(module.alloc(n8));
	        const M = c.i32_const(module.alloc(n8));
	        const eightYYYY = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
	                [
	                    ...c.call(prefix + "_toJacobian", c.getLocal("p1"), c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),

	            // XX = X1^2
	            c.call(prefixField + "_square", x, XX),

	            // YY = Y1^2
	            c.call(prefixField + "_square", y, YY),

	            // YYYY = YY^2
	            c.call(prefixField + "_square", YY, YYYY),

	            // S = 2*((X1+YY)^2-XX-YYYY)
	            c.call(prefixField + "_add", x, YY, S),
	            c.call(prefixField + "_square", S, S),
	            c.call(prefixField + "_sub", S, XX, S),
	            c.call(prefixField + "_sub", S, YYYY, S),
	            c.call(prefixField + "_add", S, S, S),

	            // M = 3*XX+a  (Hera a=0)
	            c.call(prefixField + "_add", XX, XX, M),
	            c.call(prefixField + "_add", M, XX, M),

	            // Z3 = 2*Y1
	            c.call(prefixField + "_add", y, y, z3),

	            // T = M^2-2*S
	            // X3 = T
	            c.call(prefixField + "_square", M, x3),
	            c.call(prefixField + "_sub", x3, S, x3),
	            c.call(prefixField + "_sub", x3, S, x3),

	            // Y3 = M*(S-T)-8*YYYY
	            c.call(prefixField + "_add", YYYY, YYYY, eightYYYY),
	            c.call(prefixField + "_add", eightYYYY, eightYYYY, eightYYYY),
	            c.call(prefixField + "_add", eightYYYY, eightYYYY, eightYYYY),
	            c.call(prefixField + "_sub", S, x3, y3),
	            c.call(prefixField + "_mul", y3, M, y3),
	            c.call(prefixField + "_sub", y3, eightYYYY, y3),
	        );
	    }


	    function buildEqAffine() {
	        const f = module.addFunction(prefix + "_eqAffine");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.setReturnType("i32");
	        f.addLocal("z1", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.ret(c.i32_and(
	                c.call(
	                    prefixField + "_eq",
	                    c.getLocal("p1"),
	                    c.getLocal("p2")
	                ),
	                c.call(
	                    prefixField + "_eq",
	                    c.i32_add(c.getLocal("p1"), c.i32_const(n8)),
	                    c.i32_add(c.getLocal("p2"), c.i32_const(n8))
	                )
	            ))
	        );
	    }

	    function buildToMontgomery() {
	        const f = module.addFunction(prefix + "_toMontgomery");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_toMontgomery",
	            c.getLocal("p1"),
	            c.getLocal("pr")
	        ));
	        for (let i=1; i<3; i++) {
	            f.addCode(c.call(
	                prefixField + "_toMontgomery",
	                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
	            ));
	        }
	    }

	    function buildToMontgomeryAffine() {
	        const f = module.addFunction(prefix + "_toMontgomeryAffine");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_toMontgomery",
	            c.getLocal("p1"),
	            c.getLocal("pr")
	        ));
	        for (let i=1; i<2; i++) {
	            f.addCode(c.call(
	                prefixField + "_toMontgomery",
	                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
	            ));
	        }
	    }

	    function buildFromMontgomery() {
	        const f = module.addFunction(prefix + "_fromMontgomery");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_fromMontgomery",
	            c.getLocal("p1"),
	            c.getLocal("pr")
	        ));
	        for (let i=1; i<3; i++) {
	            f.addCode(c.call(
	                prefixField + "_fromMontgomery",
	                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
	            ));
	        }
	    }


	    function buildFromMontgomeryAffine() {
	        const f = module.addFunction(prefix + "_fromMontgomeryAffine");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(c.call(
	            prefixField + "_fromMontgomery",
	            c.getLocal("p1"),
	            c.getLocal("pr")
	        ));
	        for (let i=1; i<2; i++) {
	            f.addCode(c.call(
	                prefixField + "_fromMontgomery",
	                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
	            ));
	        }
	    }

	    function buildAdd() {

	        const f = module.addFunction(prefix + "_add");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");
	        f.addLocal("z1", "i32");
	        f.addLocal("z2", "i32");

	        const c = f.getCodeBuilder();

	        const x1 = c.getLocal("p1");
	        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
	        const z1 = c.getLocal("z1");
	        const x2 = c.getLocal("p2");
	        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
	        f.addCode(c.setLocal("z2", c.i32_add(c.getLocal("p2"), c.i32_const(n8*2))));
	        const z2 = c.getLocal("z2");
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        const Z1Z1 = c.i32_const(module.alloc(n8));
	        const Z2Z2 = c.i32_const(module.alloc(n8));
	        const U1 = c.i32_const(module.alloc(n8));
	        const U2 = c.i32_const(module.alloc(n8));
	        const Z1_cubed = c.i32_const(module.alloc(n8));
	        const Z2_cubed = c.i32_const(module.alloc(n8));
	        const S1 = c.i32_const(module.alloc(n8));
	        const S2 = c.i32_const(module.alloc(n8));
	        const H = c.i32_const(module.alloc(n8));
	        const S2_minus_S1 = c.i32_const(module.alloc(n8));
	        const I = c.i32_const(module.alloc(n8));
	        const J = c.i32_const(module.alloc(n8));
	        const r = c.i32_const(module.alloc(n8));
	        const r2 = c.i32_const(module.alloc(n8));
	        const V = c.i32_const(module.alloc(n8));
	        const V2 = c.i32_const(module.alloc(n8));
	        const S1_J2 = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                [
	                    ...c.call(prefix + "_copy", c.getLocal("p2"), c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p2")),
	                [
	                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z1),
	                [
	                    ...c.call(prefix + "_addMixed", x2, x1, x3),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z2),
	                [
	                    ...c.call(prefix + "_addMixed", x1, x2, x3),
	                    ...c.ret([])
	                ]
	            ),
	            c.call(prefixField + "_square", z1, Z1Z1),
	            c.call(prefixField + "_square", z2, Z2Z2),
	            c.call(prefixField + "_mul", x1, Z2Z2, U1),
	            c.call(prefixField + "_mul", x2, Z1Z1, U2),
	            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
	            c.call(prefixField + "_mul", z2, Z2Z2, Z2_cubed),
	            c.call(prefixField + "_mul", y1, Z2_cubed, S1),
	            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

	            c.if(
	                c.call(prefixField + "_eq", U1, U2),
	                c.if(
	                    c.call(prefixField + "_eq", S1, S2),
	                    [
	                        ...c.call(prefix + "_double", c.getLocal("p1"), c.getLocal("pr")),
	                        ...c.ret([])
	                    ]
	                )
	            ),

	            c.call(prefixField + "_sub", U2, U1, H),
	            c.call(prefixField + "_sub", S2, S1, S2_minus_S1),
	            c.call(prefixField + "_add", H, H, I),
	            c.call(prefixField + "_square", I, I),
	            c.call(prefixField + "_mul", H, I, J),
	            c.call(prefixField + "_add", S2_minus_S1, S2_minus_S1, r),
	            c.call(prefixField + "_mul", U1, I, V),
	            c.call(prefixField + "_square", r, r2),
	            c.call(prefixField + "_add", V, V, V2),

	            c.call(prefixField + "_sub", r2, J, x3),
	            c.call(prefixField + "_sub", x3, V2, x3),

	            c.call(prefixField + "_mul", S1, J, S1_J2),
	            c.call(prefixField + "_add", S1_J2, S1_J2, S1_J2),

	            c.call(prefixField + "_sub", V, x3, y3),
	            c.call(prefixField + "_mul", y3, r, y3),
	            c.call(prefixField + "_sub", y3, S1_J2, y3),

	            c.call(prefixField + "_add", z1, z2, z3),
	            c.call(prefixField + "_square", z3, z3),
	            c.call(prefixField + "_sub", z3, Z1Z1, z3),
	            c.call(prefixField + "_sub", z3, Z2Z2, z3),
	            c.call(prefixField + "_mul", z3, H, z3),
	        );

	    }


	    function buildAddMixed() {

	        const f = module.addFunction(prefix + "_addMixed");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");
	        f.addLocal("z1", "i32");

	        const c = f.getCodeBuilder();

	        const x1 = c.getLocal("p1");
	        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
	        const z1 = c.getLocal("z1");
	        const x2 = c.getLocal("p2");
	        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        const Z1Z1 = c.i32_const(module.alloc(n8));
	        const U2 = c.i32_const(module.alloc(n8));
	        const Z1_cubed = c.i32_const(module.alloc(n8));
	        const S2 = c.i32_const(module.alloc(n8));
	        const H = c.i32_const(module.alloc(n8));
	        const HH = c.i32_const(module.alloc(n8));
	        const S2_minus_y1 = c.i32_const(module.alloc(n8));
	        const I = c.i32_const(module.alloc(n8));
	        const J = c.i32_const(module.alloc(n8));
	        const r = c.i32_const(module.alloc(n8));
	        const r2 = c.i32_const(module.alloc(n8));
	        const V = c.i32_const(module.alloc(n8));
	        const V2 = c.i32_const(module.alloc(n8));
	        const y1_J2 = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                [
	                    ...c.call(prefix + "_copyAffine", c.getLocal("p2"), c.getLocal("pr")),
	                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
	                [
	                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefixField + "_isOne", z1),
	                [
	                    ...c.call(prefix + "_addAffine", x1, x2, x3),
	                    ...c.ret([])
	                ]
	            ),
	            c.call(prefixField + "_square", z1, Z1Z1),
	            c.call(prefixField + "_mul", x2, Z1Z1, U2),
	            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
	            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

	            c.if(
	                c.call(prefixField + "_eq", x1, U2),
	                c.if(
	                    c.call(prefixField + "_eq", y1, S2),
	                    [
	                        ...c.call(prefix + "_doubleAffine", c.getLocal("p2"), c.getLocal("pr")),
	                        ...c.ret([])
	                    ]
	                )
	            ),

	            c.call(prefixField + "_sub", U2, x1, H),
	            c.call(prefixField + "_sub", S2, y1, S2_minus_y1),
	            c.call(prefixField + "_square", H, HH),
	            c.call(prefixField + "_add", HH , HH, I),
	            c.call(prefixField + "_add", I , I, I),
	            c.call(prefixField + "_mul", H, I, J),
	            c.call(prefixField + "_add", S2_minus_y1, S2_minus_y1, r),
	            c.call(prefixField + "_mul", x1, I, V),
	            c.call(prefixField + "_square", r, r2),
	            c.call(prefixField + "_add", V, V, V2),

	            c.call(prefixField + "_sub", r2, J, x3),
	            c.call(prefixField + "_sub", x3, V2, x3),

	            c.call(prefixField + "_mul", y1, J, y1_J2),
	            c.call(prefixField + "_add", y1_J2, y1_J2, y1_J2),

	            c.call(prefixField + "_sub", V, x3, y3),
	            c.call(prefixField + "_mul", y3, r, y3),
	            c.call(prefixField + "_sub", y3, y1_J2, y3),

	            c.call(prefixField + "_add", z1, H, z3),
	            c.call(prefixField + "_square", z3, z3),
	            c.call(prefixField + "_sub", z3, Z1Z1, z3),
	            c.call(prefixField + "_sub", z3, HH, z3),
	        );
	    }


	    function buildAddAffine() {

	        const f = module.addFunction(prefix + "_addAffine");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");
	        f.addLocal("z1", "i32");

	        const c = f.getCodeBuilder();

	        const x1 = c.getLocal("p1");
	        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
	        const x2 = c.getLocal("p2");
	        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        const H = c.i32_const(module.alloc(n8));
	        const HH = c.i32_const(module.alloc(n8));
	        const y2_minus_y1 = c.i32_const(module.alloc(n8));
	        const I = c.i32_const(module.alloc(n8));
	        const J = c.i32_const(module.alloc(n8));
	        const r = c.i32_const(module.alloc(n8));
	        const r2 = c.i32_const(module.alloc(n8));
	        const V = c.i32_const(module.alloc(n8));
	        const V2 = c.i32_const(module.alloc(n8));
	        const y1_J2 = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
	                [
	                    ...c.call(prefix + "_copyAffine", c.getLocal("p2"), c.getLocal("pr")),
	                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
	                    ...c.ret([])
	                ]
	            ),
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
	                [
	                    ...c.call(prefix + "_copyAffine", c.getLocal("p1"), c.getLocal("pr")),
	                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
	                    ...c.ret([])
	                ]
	            ),


	            c.if(
	                c.call(prefixField + "_eq", x1, x2),
	                c.if(
	                    c.call(prefixField + "_eq", y1, y2),
	                    [
	                        ...c.call(prefix + "_doubleAffine", c.getLocal("p2"), c.getLocal("pr")),
	                        ...c.ret([])
	                    ]
	                )
	            ),

	            c.call(prefixField + "_sub", x2, x1, H),
	            c.call(prefixField + "_sub", y2, y1, y2_minus_y1),
	            c.call(prefixField + "_square", H, HH),
	            c.call(prefixField + "_add", HH , HH, I),
	            c.call(prefixField + "_add", I , I, I),
	            c.call(prefixField + "_mul", H, I, J),
	            c.call(prefixField + "_add", y2_minus_y1, y2_minus_y1, r),
	            c.call(prefixField + "_mul", x1, I, V),
	            c.call(prefixField + "_square", r, r2),
	            c.call(prefixField + "_add", V, V, V2),

	            c.call(prefixField + "_sub", r2, J, x3),
	            c.call(prefixField + "_sub", x3, V2, x3),

	            c.call(prefixField + "_mul", y1, J, y1_J2),
	            c.call(prefixField + "_add", y1_J2, y1_J2, y1_J2),

	            c.call(prefixField + "_sub", V, x3, y3),
	            c.call(prefixField + "_mul", y3, r, y3),
	            c.call(prefixField + "_sub", y3, y1_J2, y3),

	            c.call(prefixField + "_add", H, H, z3),
	        );
	    }

	    function buildNeg() {
	        const f = module.addFunction(prefix + "_neg");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        f.addCode(
	            c.call(prefixField + "_copy", x, x3),
	            c.call(prefixField + "_neg", y, y3),
	            c.call(prefixField + "_copy", z, z3)
	        );
	    }


	    function buildNegAffine() {
	        const f = module.addFunction(prefix + "_negAffine");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));

	        f.addCode(
	            c.call(prefixField + "_copy", x, x3),
	            c.call(prefixField + "_neg", y, y3),
	        );
	    }


	    function buildSub() {
	        const f = module.addFunction(prefix + "_sub");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8*3));

	        f.addCode(
	            c.call(prefix + "_neg", c.getLocal("p2"), AUX),
	            c.call(prefix + "_add", c.getLocal("p1"), AUX, c.getLocal("pr")),
	        );
	    }

	    function buildSubMixed() {
	        const f = module.addFunction(prefix + "_subMixed");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8*3));

	        f.addCode(
	            c.call(prefix + "_negAffine", c.getLocal("p2"), AUX),
	            c.call(prefix + "_addMixed", c.getLocal("p1"), AUX, c.getLocal("pr")),
	        );
	    }


	    function buildSubAffine() {
	        const f = module.addFunction(prefix + "_subAffine");
	        f.addParam("p1", "i32");
	        f.addParam("p2", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8*3));

	        f.addCode(
	            c.call(prefix + "_negAffine", c.getLocal("p2"), AUX),
	            c.call(prefix + "_addAffine", c.getLocal("p1"), AUX, c.getLocal("pr")),
	        );
	    }

	    // This sets Z to One
	    function buildNormalize() {
	        const f = module.addFunction(prefix + "_normalize");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));


	        const Z_inv = c.i32_const(module.alloc(n8));
	        const Z2_inv = c.i32_const(module.alloc(n8));
	        const Z3_inv = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                c.call(prefix + "_zero", c.getLocal("pr")),
	                [
	                    ...c.call(prefixField + "_inverse", z, Z_inv),
	                    ...c.call(prefixField + "_square", Z_inv, Z2_inv),
	                    ...c.call(prefixField + "_mul", Z_inv, Z2_inv, Z3_inv),
	                    ...c.call(prefixField + "_mul", x, Z2_inv, x3),
	                    ...c.call(prefixField + "_mul", y, Z3_inv, y3),
	                    ...c.call(prefixField + "_one", z3),
	                ]
	            )
	        );
	    }


	    // Does not set Z.
	    function buildToAffine() {
	        const f = module.addFunction(prefix + "_toAffine");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));


	        const Z_inv = c.i32_const(module.alloc(n8));
	        const Z2_inv = c.i32_const(module.alloc(n8));
	        const Z3_inv = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("p1")),
	                [
	                    ...c.call(prefixField + "_zero", x3),
	                    ...c.call(prefixField + "_zero", y3),
	                ],
	                [
	                    ...c.call(prefixField + "_inverse", z, Z_inv),
	                    ...c.call(prefixField + "_square", Z_inv, Z2_inv),
	                    ...c.call(prefixField + "_mul", Z_inv, Z2_inv, Z3_inv),
	                    ...c.call(prefixField + "_mul", x, Z2_inv, x3),
	                    ...c.call(prefixField + "_mul", y, Z3_inv, y3),
	                ]
	            )
	        );
	    }


	    function buildToJacobian() {
	        const f = module.addFunction(prefix + "_toJacobian");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
	                c.call(prefix + "_zero", c.getLocal("pr")),
	                [
	                    ...c.call(prefixField + "_one", z3),
	                    ...c.call(prefixField + "_copy", y, y3),
	                    ...c.call(prefixField + "_copy", x, x3)
	                ]
	            )
	        );
	    }

	    function buildBatchToAffine() {
	        const f = module.addFunction(prefix + "_batchToAffine");
	        f.addParam("pIn", "i32");
	        f.addParam("n", "i32");
	        f.addParam("pOut", "i32");
	        f.addLocal("pAux", "i32");
	        f.addLocal("itIn", "i32");
	        f.addLocal("itAux", "i32");
	        f.addLocal("itOut", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const tmp = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.setLocal("pAux", c.i32_load( c.i32_const(0) )),
	            c.i32_store(
	                c.i32_const(0),
	                c.i32_add(
	                    c.getLocal("pAux"),
	                    c.i32_mul(c.getLocal("n"), c.i32_const(n8))
	                )
	            ),

	            c.call(
	                prefixField + "_batchInverse",
	                c.i32_add(c.getLocal("pIn"), c.i32_const(n8*2)),
	                c.i32_const(n8*3),
	                c.getLocal("n"),
	                c.getLocal("pAux"),
	                c.i32_const(n8)
	            ),

	            c.setLocal("itIn", c.getLocal("pIn")),
	            c.setLocal("itAux", c.getLocal("pAux")),
	            c.setLocal("itOut", c.getLocal("pOut")),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	                c.if(
	                    c.call(prefixField + "_isZero", c.getLocal("itAux")),
	                    [
	                        ...c.call(prefixField + "_zero", c.getLocal("itOut")),
	                        ...c.call(prefixField + "_zero", c.i32_add(c.getLocal("itOut"), c.i32_const(n8)))
	                    ],
	                    [
	                        ...c.call(
	                            prefixField+"_mul",
	                            c.getLocal("itAux"),
	                            c.i32_add(c.getLocal("itIn"), c.i32_const(n8)),
	                            tmp,
	                        ),
	                        ...c.call(
	                            prefixField+"_square",
	                            c.getLocal("itAux"),
	                            c.getLocal("itAux")
	                        ),
	                        ...c.call(
	                            prefixField+"_mul",
	                            c.getLocal("itAux"),
	                            c.getLocal("itIn"),
	                            c.getLocal("itOut"),
	                        ),
	                        ...c.call(
	                            prefixField+"_mul",
	                            c.getLocal("itAux"),
	                            tmp,
	                            c.i32_add(c.getLocal("itOut"), c.i32_const(n8)),
	                        ),
	                    ]
	                ),

	                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(n8*3))),
	                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(n8*2))),
	                c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	            c.i32_store(
	                c.i32_const(0),
	                c.getLocal("pAux")
	            )
	        );
	    }


	    // This function is private and does not allow to OVERLAP buffers.
	    function buildReverseBytes() {
	        const f = module.addFunction(prefix + "__reverseBytes");
	        f.addParam("pIn", "i32");
	        f.addParam("n", "i32");
	        f.addParam("pOut", "i32");
	        f.addLocal("itOut", "i32");
	        f.addLocal("itIn", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal(
	                "itOut",
	                c.i32_sub(
	                    c.i32_add(
	                        c.getLocal("pOut"),
	                        c.getLocal("n")
	                    ),
	                    c.i32_const(1)
	                )
	            ),
	            c.setLocal(
	                "itIn",
	                c.getLocal("pIn")
	            ),
	            c.block(c.loop(
	                c.br_if(1, c.i32_lt_s( c.getLocal("itOut"), c.getLocal("pOut") )),
	                c.i32_store8(
	                    c.getLocal("itOut"),
	                    c.i32_load8_u(c.getLocal("itIn")),
	                ),
	                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(1))),
	                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(1))),
	                c.br(0)
	            )),
	        );

	    }

	    function buildLEMtoC() {
	        const f = module.addFunction(prefix + "_LEMtoC");
	        f.addParam("pIn", "i32");
	        f.addParam("pOut", "i32");

	        const c = f.getCodeBuilder();

	        const tmp = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZero", c.getLocal("pIn")),
	                [
	                    ...c.call(prefixField + "_zero", c.getLocal("pOut")),
	                    ...c.i32_store8(
	                        c.getLocal("pOut"),
	                        c.i32_const(0x40)
	                    ),
	                    ...c.ret([])
	                ]
	            ),
	            c.call(prefixField + "_fromMontgomery", c.getLocal("pIn"), tmp),
	            c.call(prefix + "__reverseBytes", tmp, c.i32_const(n8), c.getLocal("pOut")),
	            c.if(
	                c.i32_eq(
	                    c.call(prefixField + "_sign", c.i32_add(c.getLocal("pIn"), c.i32_const(n8))),
	                    c.i32_const(-1)
	                ),
	                c.i32_store8(
	                    c.getLocal("pOut"),
	                    c.i32_or(
	                        c.i32_load8_u(c.getLocal("pOut")),
	                        c.i32_const(0x80)
	                    )
	                )
	            ),
	        );
	    }

	    function buildLEMtoU() {
	        const f = module.addFunction(prefix + "_LEMtoU");
	        f.addParam("pIn", "i32");
	        f.addParam("pOut", "i32");

	        const c = f.getCodeBuilder();

	        const pTmp = module.alloc(n8*2);
	        const tmp = c.i32_const(pTmp);
	        const tmpX = c.i32_const(pTmp);
	        const tmpY = c.i32_const(pTmp + n8);

	        f.addCode(
	            c.if(
	                c.call(prefix + "_isZeroAffine", c.getLocal("pIn")),
	                [
	                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
	                    ...c.i32_store8(
	                        c.getLocal("pOut"),
	                        c.i32_const(0x40)
	                    ),
	                    ...c.ret([])
	                ]
	            ),

	            c.call(prefix + "_fromMontgomeryAffine", c.getLocal("pIn"), tmp),

	            c.call(prefix + "__reverseBytes", tmpX, c.i32_const(n8), c.getLocal("pOut")),
	            c.call(prefix + "__reverseBytes", tmpY, c.i32_const(n8), c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
	        );
	    }

	    function buildUtoLEM() {
	        const f = module.addFunction(prefix + "_UtoLEM");
	        f.addParam("pIn", "i32");
	        f.addParam("pOut", "i32");

	        const c = f.getCodeBuilder();

	        const pTmp = module.alloc(n8*2);
	        const tmp = c.i32_const(pTmp);
	        const tmpX = c.i32_const(pTmp);
	        const tmpY = c.i32_const(pTmp + n8);

	        f.addCode(
	            c.if(
	                c.i32_and(c.i32_load8_u(c.getLocal("pIn")), c.i32_const(0x40)),
	                [
	                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
	                    ...c.ret([])
	                ]
	            ),
	            c.call(prefix + "__reverseBytes", c.getLocal("pIn"), c.i32_const(n8), tmpX),
	            c.call(prefix + "__reverseBytes", c.i32_add(c.getLocal("pIn"), c.i32_const(n8)), c.i32_const(n8), tmpY),
	            c.call(prefix + "_toMontgomeryAffine", tmp,  c.getLocal("pOut"))
	        );
	    }

	    function buildCtoLEM() {
	        const f = module.addFunction(prefix + "_CtoLEM");
	        f.addParam("pIn", "i32");
	        f.addParam("pOut", "i32");
	        f.addLocal("firstByte", "i32");
	        f.addLocal("greatest", "i32");

	        const c = f.getCodeBuilder();

	        const pTmp = module.alloc(n8*2);
	        const tmpX = c.i32_const(pTmp);
	        const tmpY = c.i32_const(pTmp + n8);

	        f.addCode(
	            c.setLocal("firstByte", c.i32_load8_u(c.getLocal("pIn"))),
	            c.if(
	                c.i32_and(
	                    c.getLocal("firstByte"),
	                    c.i32_const(0x40)
	                ),
	                [
	                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
	                    ...c.ret([])
	                ]
	            ),
	            c.setLocal(
	                "greatest",
	                c.i32_and(
	                    c.getLocal("firstByte"),
	                    c.i32_const(0x80)
	                )
	            ),

	            c.call(prefixField + "_copy", c.getLocal("pIn"), tmpY),
	            c.i32_store8(tmpY, c.i32_and(c.getLocal("firstByte"), c.i32_const(0x3F))),
	            c.call(prefix + "__reverseBytes", tmpY, c.i32_const(n8), tmpX),
	            c.call(prefixField + "_toMontgomery", tmpX, c.getLocal("pOut")),

	            c.call(prefixField + "_square", c.getLocal("pOut"), tmpY),
	            c.call(prefixField + "_mul", c.getLocal("pOut"), tmpY,  tmpY),
	            c.call(prefixField + "_add", tmpY, c.i32_const(pB),  tmpY),

	            c.call(prefixField + "_sqrt", tmpY, tmpY),
	            c.call(prefixField + "_neg", tmpY, tmpX),

	            c.if(
	                c.i32_eq(
	                    c.call(prefixField + "_sign", tmpY),
	                    c.i32_const(-1)
	                ),
	                c.if(
	                    c.getLocal("greatest"),
	                    c.call(prefixField + "_copy", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
	                    c.call(prefixField + "_neg", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8)))
	                ),
	                c.if(
	                    c.getLocal("greatest"),
	                    c.call(prefixField + "_neg", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
	                    c.call(prefixField + "_copy", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8)))
	                ),
	            )

	        );
	    }


	    function buildInCurveAffine() {
	        const f = module.addFunction(prefix + "_inCurveAffine");
	        f.addParam("pIn", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("pIn");
	        const y = c.i32_add(c.getLocal("pIn"), n8);

	        const y2 = module.alloc(n8*2);
	        const x3b = module.alloc(n8*2);

	        f.addCode(
	            c.call(prefixField + "_square", y, y2),
	            c.call(prefixField + "_square", x, x3b),
	            c.call(prefixField + "_mul", x, x3b, x3b),
	            c.call(prefixField + "_add", x3b, c.i32_const(pB), x3b),

	            c.ret(
	                c.call(prefixField + "_eq", y2, x3b)
	            )
	        );
	    }

	    function buildInCurveAffine() {
	        const f = module.addFunction(prefix + "_inCurveAffine");
	        f.addParam("pIn", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("pIn");
	        const y = c.i32_add(c.getLocal("pIn"), c.i32_const(n8));

	        const y2 = c.i32_const(module.alloc(n8));
	        const x3b = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.call(prefixField + "_square", y, y2),
	            c.call(prefixField + "_square", x, x3b),
	            c.call(prefixField + "_mul", x, x3b, x3b),
	            c.call(prefixField + "_add", x3b, c.i32_const(pB), x3b),

	            c.ret(
	                c.call(prefixField + "_eq", y2, x3b)
	            )
	        );
	    }

	    function buildInCurve() {
	        const f = module.addFunction(prefix + "_inCurve");
	        f.addParam("pIn", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const aux = c.i32_const(module.alloc(n8*2));

	        f.addCode(
	            c.call(prefix + "_toAffine", c.getLocal("pIn"), aux),

	            c.ret(
	                c.call(prefix + "_inCurveAffine", aux),
	            )
	        );
	    }

	    buildIsZeroAffine();
	    buildIsZero();
	    buildZeroAffine();
	    buildZero();
	    buildCopyAffine();
	    buildCopy();
	    buildToJacobian();
	    buildEqAffine();
	    buildEqMixed();
	    buildEq();
	    buildDoubleAffine();
	    buildDouble();
	    buildAddAffine();
	    buildAddMixed();
	    buildAdd();
	    buildNegAffine();
	    buildNeg();
	    buildSubAffine();
	    buildSubMixed();
	    buildSub();
	    buildFromMontgomeryAffine();
	    buildFromMontgomery();
	    buildToMontgomeryAffine();
	    buildToMontgomery();
	    buildToAffine();
	    buildInCurveAffine();
	    buildInCurve();

	    buildBatchToAffine();

	    buildNormalize();


	    buildReverseBytes();

	    buildLEMtoU();
	    buildLEMtoC();
	    buildUtoLEM();
	    buildCtoLEM();

	    buildBatchConvertion(module, prefix + "_batchLEMtoU", prefix + "_LEMtoU", n8*2, n8*2);
	    buildBatchConvertion(module, prefix + "_batchLEMtoC", prefix + "_LEMtoC", n8*2, n8);
	    buildBatchConvertion(module, prefix + "_batchUtoLEM", prefix + "_UtoLEM", n8*2, n8*2);
	    buildBatchConvertion(module, prefix + "_batchCtoLEM", prefix + "_CtoLEM", n8, n8*2, true);

	    buildBatchConvertion(module, prefix + "_batchToJacobian", prefix + "_toJacobian", n8*2, n8*3, true);

	    buildMultiexp(module, prefix, prefix + "_multiexp", prefix + "_add", n8*3);
	    buildMultiexp(module, prefix, prefix + "_multiexpAffine", prefix + "_addMixed", n8*2);

	    /*
	    buildTimesScalar(
	        module,
	        prefix + "_timesScalarOld",
	        n8*3,
	        prefix + "_add",
	        prefix + "_double",
	        prefix + "_copy",
	        prefix + "_zero",
	    );
	    */
	    buildTimesScalarNAF(
	        module,
	        prefix + "_timesScalar",
	        n8*3,
	        prefix + "_add",
	        prefix + "_double",
	        prefix + "_sub",
	        prefix + "_copy",
	        prefix + "_zero"
	    );

	    buildTimesScalarNAF(
	        module,
	        prefix + "_timesScalarAffine",
	        n8*2,
	        prefix + "_addMixed",
	        prefix + "_double",
	        prefix + "_subMixed",
	        prefix + "_copyAffine",
	        prefix + "_zero"
	    );

	    module.exportFunction(prefix + "_isZero");
	    module.exportFunction(prefix + "_isZeroAffine");

	    module.exportFunction(prefix + "_eq");
	    module.exportFunction(prefix + "_eqMixed");
	    module.exportFunction(prefix + "_eqAffine");

	    module.exportFunction(prefix + "_copy");
	    module.exportFunction(prefix + "_copyAffine");

	    module.exportFunction(prefix + "_zero");
	    module.exportFunction(prefix + "_zeroAffine");

	    module.exportFunction(prefix + "_double");
	    module.exportFunction(prefix + "_doubleAffine");

	    module.exportFunction(prefix + "_add");
	    module.exportFunction(prefix + "_addMixed");
	    module.exportFunction(prefix + "_addAffine");

	    module.exportFunction(prefix + "_neg");
	    module.exportFunction(prefix + "_negAffine");

	    module.exportFunction(prefix + "_sub");
	    module.exportFunction(prefix + "_subMixed");
	    module.exportFunction(prefix + "_subAffine");

	    module.exportFunction(prefix + "_fromMontgomery");
	    module.exportFunction(prefix + "_fromMontgomeryAffine");

	    module.exportFunction(prefix + "_toMontgomery");
	    module.exportFunction(prefix + "_toMontgomeryAffine");

	    module.exportFunction(prefix + "_timesScalar");
	    module.exportFunction(prefix + "_timesScalarAffine");

	    module.exportFunction(prefix + "_normalize");

	    // Convertion functions
	    module.exportFunction(prefix + "_LEMtoU");
	    module.exportFunction(prefix + "_LEMtoC");
	    module.exportFunction(prefix + "_UtoLEM");
	    module.exportFunction(prefix + "_CtoLEM");

	    module.exportFunction(prefix + "_batchLEMtoU");
	    module.exportFunction(prefix + "_batchLEMtoC");
	    module.exportFunction(prefix + "_batchUtoLEM");
	    module.exportFunction(prefix + "_batchCtoLEM");

	    module.exportFunction(prefix + "_toAffine");
	    module.exportFunction(prefix + "_toJacobian");

	    module.exportFunction(prefix + "_batchToAffine");
	    module.exportFunction(prefix + "_batchToJacobian");

	    module.exportFunction(prefix + "_inCurve");
	    module.exportFunction(prefix + "_inCurveAffine");

	    /*
	    buildG1MulScalar(module, zq);
	    module.exportFunction("g1MulScalar");
	    */

	    return prefix;
	};
	return build_curve_jacobian_a0;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_fft;
var hasRequiredBuild_fft;

function requireBuild_fft () {
	if (hasRequiredBuild_fft) return build_fft;
	hasRequiredBuild_fft = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const utils = /*@__PURE__*/ requireUtils$1();

	build_fft = function buildFFT(module, prefix, gPrefix, fPrefix, opGtimesF) {

	    const n64f = module.modules[fPrefix].n64;
	    const n8f = n64f*8;

	    const n64g = module.modules[gPrefix].n64;
	    const n8g = n64g*8;

	    const q = module.modules[fPrefix].q;

	    let rem = q.minus(bigInt(1));
	    let maxBits = 0;
	    while (!rem.isOdd()) {
	        maxBits ++;
	        rem = rem.shiftRight(1);
	    }

	    let nr = bigInt(2);

	    while ( nr.modPow(q.shiftRight(1), q).equals(1) ) nr = nr.add(1);

	    // console.log(nr);

	    const w = new Array(maxBits+1);
	    w[maxBits] = nr.modPow(rem, q);

	    let n=maxBits-1;
	    while (n>=0) {
	        w[n] = w[n+1].modPow(2, q);
	        n--;
	    }

	    const bytes = [];
	    const R = bigInt(1).shiftLeft(n8f*8).mod(q);

	    for (let i=0; i<w.length; i++) {
	        const m = w[i].times(R).mod(q);
	        bytes.push(...utils.bigInt2BytesLE(m, n8f));
	    }

	    const ROOTs = module.alloc(bytes);

	    const i2 = new Array(maxBits+1);
	    i2[0] = bigInt(1);

	    for (let i=1; i<=maxBits; i++) {
	        i2[i] = i2[i-1].times(2);
	    }

	    const bytesi2 =[];
	    for (let i=0; i<=maxBits; i++) {
	        const m = i2[i].modInv(q).times(R).mod(q);
	        bytesi2.push(...utils.bigInt2BytesLE(m, n8f));
	    }

	    const INV2 = module.alloc(bytesi2);

	    const shift = nr.modPow(2, q);
	    const bytesShiftToSmallM =[];
	    const bytesSConst =[];
	    for (let i=0; i<=maxBits; i++) {
	        const shiftToSmallM = shift.modPow(bigInt(2).pow(i), q);
	        const sConst = q.add(bigInt.one).minus(shiftToSmallM).modInv(q);
	        bytesShiftToSmallM.push(...utils.bigInt2BytesLE(shiftToSmallM.times(R).mod(q), n8f));
	        bytesSConst.push(...utils.bigInt2BytesLE(sConst.times(R).mod(q), n8f));
	    }

	    const SHIFT_TO_M = module.alloc( bytesShiftToSmallM  );
	    const SCONST = module.alloc( bytesSConst  );

	    function rev(x) {
	        let r=0;
	        for (let i=0; i<8; i++) {
	            if (x & (1 << i)) {
	                r = r | (0x80 >> i);
	            }
	        }
	        return r;
	    }

	    const rtable = Array(256);
	    for (let i=0; i<256; i++) {
	        rtable[i] = rev(i);
	    }

	    const REVTABLE = module.alloc(rtable);


	    function buildLog2() {
	        const f = module.addFunction(prefix+"__log2");
	        f.addParam("n", "i32");
	        f.setReturnType("i32");
	        f.addLocal("bits", "i32");
	        f.addLocal("aux", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal(
	                "aux",
	                c.i32_shr_u(
	                    c.getLocal("n"),
	                    c.i32_const(1)
	                )
	            )
	        );
	        f.addCode(c.setLocal("bits", c.i32_const(0)));

	        f.addCode(c.block(c.loop(
	            c.br_if(
	                1,
	                c.i32_eqz(c.getLocal("aux"))
	            ),

	            c.setLocal(
	                "aux",
	                c.i32_shr_u(
	                    c.getLocal("aux"),
	                    c.i32_const(1)
	                )
	            ),

	            c.setLocal(
	                "bits",
	                c.i32_add(
	                    c.getLocal("bits"),
	                    c.i32_const(1)
	                )
	            ),

	            c.br(0)
	        )));

	        f.addCode(c.if(
	            c.i32_ne(
	                c.getLocal("n"),
	                c.i32_shl(
	                    c.i32_const(1),
	                    c.getLocal("bits")
	                )
	            ),
	            c.unreachable()
	        ));

	        f.addCode(c.if(
	            c.i32_gt_u(
	                c.getLocal("bits"),
	                c.i32_const(maxBits)
	            ),
	            c.unreachable()
	        ));

	        f.addCode(c.getLocal("bits"));
	    }

	    function buildFFT() {
	        const f = module.addFunction(prefix+"_fft");
	        f.addParam("px", "i32");
	        f.addParam("n", "i32");

	        f.addLocal("bits", "i32");

	        const c = f.getCodeBuilder();

	        const One = c.i32_const(module.alloc(n8f));

	        f.addCode(
	            c.setLocal(
	                "bits",
	                c.call(
	                    prefix + "__log2",
	                    c.getLocal("n")
	                )
	            ),
	            c.call(fPrefix + "_one", One),
	            c.call(
	                prefix+"_rawfft",
	                c.getLocal("px"),
	                c.getLocal("bits"),
	                c.i32_const(0),
	                One
	            )
	        );

	    }

	    function buildIFFT() {
	        const f = module.addFunction(prefix+"_ifft");
	        f.addParam("px", "i32");
	        f.addParam("n", "i32");
	        f.addLocal("bits", "i32");
	        f.addLocal("pInv2", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal(
	                "bits",
	                c.call(
	                    prefix + "__log2",
	                    c.getLocal("n")
	                )
	            ),
	            c.setLocal(
	                "pInv2",
	                c.i32_add(
	                    c.i32_const(INV2),
	                    c.i32_mul(
	                        c.getLocal("bits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),

	            c.call(
	                prefix+"_rawfft",
	                c.getLocal("px"),
	                c.getLocal("bits"),
	                c.i32_const(1),
	                c.getLocal("pInv2")
	            ),
	        );
	    }

	    function buildRawFFT() {
	        const f = module.addFunction(prefix+"_rawfft");
	        f.addParam("px", "i32");
	        f.addParam("bits", "i32"); // 2 power
	        f.addParam("reverse", "i32");
	        f.addParam("mulFactor", "i32");

	        f.addLocal("s", "i32");
	        f.addLocal("k", "i32");
	        f.addLocal("j", "i32");
	        f.addLocal("m", "i32");
	        f.addLocal("mdiv2", "i32");
	        f.addLocal("n", "i32");
	        f.addLocal("pwm", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const T = c.i32_const(module.alloc(n8g));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.call(prefix + "__reversePermutation", c.getLocal("px"), c.getLocal("bits")),
	            c.setLocal("n", c.i32_shl(c.i32_const(1), c.getLocal("bits"))),
	            c.setLocal("s", c.i32_const(1)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_gt_u(
	                        c.getLocal("s"),
	                        c.getLocal("bits")
	                    )
	                ),
	                c.setLocal("m", c.i32_shl(c.i32_const(1), c.getLocal("s"))),
	                c.setLocal("pwm",
	                    c.i32_add(
	                        c.i32_const(ROOTs),
	                        c.i32_mul(
	                            c.getLocal("s"),
	                            c.i32_const(n8f)
	                        )
	                    )
	                ),
	                c.setLocal("k", c.i32_const(0)),
	                c.block(c.loop(
	                    c.br_if(
	                        1,
	                        c.i32_ge_u(
	                            c.getLocal("k"),
	                            c.getLocal("n")
	                        )
	                    ),

	                    c.call(fPrefix + "_one", W),

	                    c.setLocal("mdiv2", c.i32_shr_u(c.getLocal("m"), c.i32_const(1)) ),
	                    c.setLocal("j", c.i32_const(0)),
	                    c.block(c.loop(
	                        c.br_if(
	                            1,
	                            c.i32_ge_u(
	                                c.getLocal("j"),
	                                c.getLocal("mdiv2")
	                            )
	                        ),

	                        c.setLocal(
	                            "idx1",
	                            c.i32_add(
	                                c.getLocal("px"),
	                                c.i32_mul(
	                                    c.i32_add(
	                                        c.getLocal("k"),
	                                        c.getLocal("j")
	                                    ),
	                                    c.i32_const(n8g)
	                                )
	                            )
	                        ),

	                        c.setLocal(
	                            "idx2",
	                            c.i32_add(
	                                c.getLocal("idx1"),
	                                c.i32_mul(
	                                    c.getLocal("mdiv2"),
	                                    c.i32_const(n8g)
	                                )
	                            )
	                        ),

	                        c.call(
	                            opGtimesF,
	                            c.getLocal("idx2"),
	                            W,
	                            T
	                        ),

	                        c.call(
	                            gPrefix + "_copy",
	                            c.getLocal("idx1"),
	                            U
	                        ),

	                        c.call(
	                            gPrefix + "_add",
	                            U,
	                            T,
	                            c.getLocal("idx1"),
	                        ),

	                        c.call(
	                            gPrefix + "_sub",
	                            U,
	                            T,
	                            c.getLocal("idx2"),
	                        ),

	                        c.call(
	                            fPrefix + "_mul",
	                            W,
	                            c.getLocal("pwm"),
	                            W,
	                        ),

	                        c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                        c.br(0)
	                    )),

	                    c.setLocal("k", c.i32_add(c.getLocal("k"), c.getLocal("m"))),
	                    c.br(0)
	                )),

	                c.setLocal("s", c.i32_add(c.getLocal("s"), c.i32_const(1))),
	                c.br(0)
	            )),
	            c.call(
	                prefix + "__fftFinal",
	                c.getLocal("px"),
	                c.getLocal("bits"),
	                c.getLocal("reverse"),
	                c.getLocal("mulFactor")
	            )
	        );
	    }


	    function buildFinalInverse() {
	        const f = module.addFunction(prefix+"__fftFinal");
	        f.addParam("px", "i32");
	        f.addParam("bits", "i32");
	        f.addParam("reverse", "i32");
	        f.addParam("mulFactor", "i32");
	        f.addLocal("n", "i32");
	        f.addLocal("ndiv2", "i32");
	        f.addLocal("pInv2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("mask", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");

	        const c = f.getCodeBuilder();

	        const T = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.if(
	                c.i32_and(
	                    c.i32_eqz(c.getLocal("reverse")),
	                    c.call(fPrefix + "_isOne", c.getLocal("mulFactor"))
	                ),
	                c.ret([])
	            ),
	            c.setLocal("n", c.i32_shl( c.i32_const(1), c.getLocal("bits"))),

	            c.setLocal("mask", c.i32_sub( c.getLocal("n") , c.i32_const(1))),
	            c.setLocal("i", c.i32_const(1)),
	            c.setLocal(
	                "ndiv2",
	                c.i32_shr_u(
	                    c.getLocal("n"),
	                    c.i32_const(1)
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_ge_u(
	                        c.getLocal("i"),
	                        c.getLocal("ndiv2")
	                    )
	                ),

	                c.setLocal("idx1",
	                    c.i32_add(
	                        c.getLocal("px"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal("idx2",
	                    c.i32_add(
	                        c.getLocal("px"),
	                        c.i32_mul(
	                            c.i32_sub(
	                                c.getLocal("n"),
	                                c.getLocal("i")
	                            ),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.if(
	                    c.getLocal("reverse"),
	                    c.if(
	                        c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
	                        [
	                            ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
	                            ...c.call(gPrefix + "_copy", c.getLocal("idx2") , c.getLocal("idx1") ),
	                            ...c.call(gPrefix + "_copy", T , c.getLocal("idx2")),
	                        ],
	                        [
	                            ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
	                            ...c.call(opGtimesF , c.getLocal("idx2") , c.getLocal("mulFactor"), c.getLocal("idx1") ),
	                            ...c.call(opGtimesF , T , c.getLocal("mulFactor"), c.getLocal("idx2")),
	                        ]
	                    ),
	                    c.if(
	                        c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
	                        [
	                            // Do nothing (It should not be here)
	                        ],
	                        [
	                            ...c.call(opGtimesF , c.getLocal("idx1") , c.getLocal("mulFactor"), c.getLocal("idx1") ),
	                            ...c.call(opGtimesF , c.getLocal("idx2") , c.getLocal("mulFactor"), c.getLocal("idx2")),
	                        ]
	                    )
	                ),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),

	                c.br(0)
	            )),

	            c.if(
	                c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
	                [
	                    // Do nothing (It should not be here)
	                ],
	                [
	                    ...c.call(opGtimesF, c.getLocal("px") , c.getLocal("mulFactor"), c.getLocal("px")),
	                    ...c.setLocal("idx2",
	                        c.i32_add(
	                            c.getLocal("px"),
	                            c.i32_mul(
	                                c.getLocal("ndiv2"),
	                                c.i32_const(n8g)
	                            )
	                        )
	                    ),
	                    ...c.call(opGtimesF, c.getLocal("idx2"),c.getLocal("mulFactor"), c.getLocal("idx2"))
	                ]
	            )
	        );
	    }

	    function buildReversePermutation() {
	        const f = module.addFunction(prefix+"__reversePermutation");
	        f.addParam("px", "i32");
	        f.addParam("bits", "i32");
	        f.addLocal("n", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("ri", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");

	        const c = f.getCodeBuilder();

	        const T = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.setLocal("n", c.i32_shl( c.i32_const(1), c.getLocal("bits"))),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("n")
	                    )
	                ),

	                c.setLocal("idx1",
	                    c.i32_add(
	                        c.getLocal("px"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal("ri", c.call(prefix + "__rev", c.getLocal("i"), c.getLocal("bits"))),

	                c.setLocal("idx2",
	                    c.i32_add(
	                        c.getLocal("px"),
	                        c.i32_mul(
	                            c.getLocal("ri"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.if(
	                    c.i32_lt_u(
	                        c.getLocal("i"),
	                        c.getLocal("ri")
	                    ),
	                    [
	                        ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
	                        ...c.call(gPrefix + "_copy", c.getLocal("idx2") , c.getLocal("idx1")),
	                        ...c.call(gPrefix + "_copy", T , c.getLocal("idx2"))
	                    ]
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),

	                c.br(0)
	            ))
	        );
	    }

	    function buildRev() {
	        const f = module.addFunction(prefix+"__rev");
	        f.addParam("x", "i32");
	        f.addParam("bits", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.i32_rotl(
	                c.i32_add(
	                    c.i32_add(
	                        c.i32_shl(
	                            c.i32_load8_u(
	                                c.i32_and(
	                                    c.getLocal("x"),
	                                    c.i32_const(0xFF)
	                                ),
	                                REVTABLE,
	                                0
	                            ),
	                            c.i32_const(24)
	                        ),
	                        c.i32_shl(
	                            c.i32_load8_u(
	                                c.i32_and(
	                                    c.i32_shr_u(
	                                        c.getLocal("x"),
	                                        c.i32_const(8)
	                                    ),
	                                    c.i32_const(0xFF)
	                                ),
	                                REVTABLE,
	                                0
	                            ),
	                            c.i32_const(16)
	                        ),
	                    ),
	                    c.i32_add(
	                        c.i32_shl(
	                            c.i32_load8_u(
	                                c.i32_and(
	                                    c.i32_shr_u(
	                                        c.getLocal("x"),
	                                        c.i32_const(16)
	                                    ),
	                                    c.i32_const(0xFF)
	                                ),
	                                REVTABLE,
	                                0
	                            ),
	                            c.i32_const(8)
	                        ),
	                        c.i32_load8_u(
	                            c.i32_and(
	                                c.i32_shr_u(
	                                    c.getLocal("x"),
	                                    c.i32_const(24)
	                                ),
	                                c.i32_const(0xFF)
	                            ),
	                            REVTABLE,
	                            0
	                        ),
	                    )
	                ),
	                c.getLocal("bits")
	            )
	        );
	    }


	    function buildFFTJoin() {
	        const f = module.addFunction(prefix+"_fftJoin");
	        f.addParam("pBuff1", "i32");
	        f.addParam("pBuff2", "i32");
	        f.addParam("n", "i32");
	        f.addParam("first", "i32");
	        f.addParam("inc", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const T = c.i32_const(module.alloc(n8g));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.call( fPrefix + "_copy", c.getLocal("first"), W),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("n")
	                    )
	                ),

	                c.setLocal(
	                    "idx1",
	                    c.i32_add(
	                        c.getLocal("pBuff1"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "idx2",
	                    c.i32_add(
	                        c.getLocal("pBuff2"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    W,
	                    T
	                ),

	                c.call(
	                    gPrefix + "_copy",
	                    c.getLocal("idx1"),
	                    U
	                ),

	                c.call(
	                    gPrefix + "_add",
	                    U,
	                    T,
	                    c.getLocal("idx1"),
	                ),

	                c.call(
	                    gPrefix + "_sub",
	                    U,
	                    T,
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    fPrefix + "_mul",
	                    W,
	                    c.getLocal("inc"),
	                    W,
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }


	    function buildFFTJoinExt() {
	        const f = module.addFunction(prefix+"_fftJoinExt");
	        f.addParam("pBuff1", "i32");
	        f.addParam("pBuff2", "i32");
	        f.addParam("n", "i32");
	        f.addParam("first", "i32");
	        f.addParam("inc", "i32");
	        f.addParam("totalBits", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("pShiftToM", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(

	            c.setLocal("pShiftToM",
	                c.i32_add(
	                    c.i32_const(SHIFT_TO_M),
	                    c.i32_mul(
	                        c.getLocal("totalBits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),


	            c.call( fPrefix + "_copy", c.getLocal("first"), W),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("n")
	                    )
	                ),

	                c.setLocal(
	                    "idx1",
	                    c.i32_add(
	                        c.getLocal("pBuff1"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "idx2",
	                    c.i32_add(
	                        c.getLocal("pBuff2"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.call(
	                    gPrefix + "_add",
	                    c.getLocal("idx1"),
	                    c.getLocal("idx2"),
	                    U
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    c.getLocal("pShiftToM"),
	                    c.getLocal("idx2")
	                ),

	                c.call(
	                    gPrefix + "_add",
	                    c.getLocal("idx1"),
	                    c.getLocal("idx2"),
	                    c.getLocal("idx2")
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    W,
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    gPrefix + "_copy",
	                    U,
	                    c.getLocal("idx1")
	                ),

	                c.call(
	                    fPrefix + "_mul",
	                    W,
	                    c.getLocal("inc"),
	                    W
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }

	    function buildFFTJoinExtInv() {
	        const f = module.addFunction(prefix+"_fftJoinExtInv");
	        f.addParam("pBuff1", "i32");
	        f.addParam("pBuff2", "i32");
	        f.addParam("n", "i32");
	        f.addParam("first", "i32");
	        f.addParam("inc", "i32");
	        f.addParam("totalBits", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("pShiftToM", "i32");
	        f.addLocal("pSConst", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(

	            c.setLocal("pShiftToM",
	                c.i32_add(
	                    c.i32_const(SHIFT_TO_M),
	                    c.i32_mul(
	                        c.getLocal("totalBits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),
	            c.setLocal("pSConst",
	                c.i32_add(
	                    c.i32_const(SCONST),
	                    c.i32_mul(
	                        c.getLocal("totalBits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),


	            c.call( fPrefix + "_copy", c.getLocal("first"), W),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("n")
	                    )
	                ),

	                c.setLocal(
	                    "idx1",
	                    c.i32_add(
	                        c.getLocal("pBuff1"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "idx2",
	                    c.i32_add(
	                        c.getLocal("pBuff2"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    W,
	                    U
	                ),

	                c.call(
	                    gPrefix + "_sub",
	                    c.getLocal("idx1"),
	                    U,
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    c.getLocal("pSConst"),
	                    c.getLocal("idx2")
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx1"),
	                    c.getLocal("pShiftToM"),
	                    c.getLocal("idx1")
	                ),

	                c.call(
	                    gPrefix + "_sub",
	                    U,
	                    c.getLocal("idx1"),
	                    c.getLocal("idx1")
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx1"),
	                    c.getLocal("pSConst"),
	                    c.getLocal("idx1")
	                ),

	                c.call(
	                    fPrefix + "_mul",
	                    W,
	                    c.getLocal("inc"),
	                    W
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }



	    function buildPrepareLagrangeEvaluation() {
	        const f = module.addFunction(prefix+"_prepareLagrangeEvaluation");
	        f.addParam("pBuff1", "i32");
	        f.addParam("pBuff2", "i32");
	        f.addParam("n", "i32");
	        f.addParam("first", "i32");
	        f.addParam("inc", "i32");
	        f.addParam("totalBits", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("pShiftToM", "i32");
	        f.addLocal("pSConst", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(

	            c.setLocal("pShiftToM",
	                c.i32_add(
	                    c.i32_const(SHIFT_TO_M),
	                    c.i32_mul(
	                        c.getLocal("totalBits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),
	            c.setLocal("pSConst",
	                c.i32_add(
	                    c.i32_const(SCONST),
	                    c.i32_mul(
	                        c.getLocal("totalBits"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),


	            c.call( fPrefix + "_copy", c.getLocal("first"), W),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("n")
	                    )
	                ),

	                c.setLocal(
	                    "idx1",
	                    c.i32_add(
	                        c.getLocal("pBuff1"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "idx2",
	                    c.i32_add(
	                        c.getLocal("pBuff2"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),


	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx1"),
	                    c.getLocal("pShiftToM"),
	                    U
	                ),

	                c.call(
	                    gPrefix + "_sub",
	                    c.getLocal("idx2"),
	                    U,
	                    U
	                ),

	                c.call(
	                    gPrefix + "_sub",
	                    c.getLocal("idx1"),
	                    c.getLocal("idx2"),
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    opGtimesF,
	                    U,
	                    c.getLocal("pSConst"),
	                    c.getLocal("idx1"),
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    W,
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    fPrefix + "_mul",
	                    W,
	                    c.getLocal("inc"),
	                    W
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }

	    function buildFFTMix() {
	        const f = module.addFunction(prefix+"_fftMix");
	        f.addParam("pBuff", "i32");
	        f.addParam("n", "i32");
	        f.addParam("exp", "i32");
	        f.addLocal("nGroups", "i32");
	        f.addLocal("nPerGroup", "i32");
	        f.addLocal("nPerGroupDiv2", "i32");
	        f.addLocal("pairOffset", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");
	        f.addLocal("pwm", "i32");

	        const c = f.getCodeBuilder();

	        const W = c.i32_const(module.alloc(n8f));
	        const T = c.i32_const(module.alloc(n8g));
	        const U = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.setLocal("nPerGroup", c.i32_shl(c.i32_const(1), c.getLocal("exp"))),
	            c.setLocal("nPerGroupDiv2", c.i32_shr_u(c.getLocal("nPerGroup"), c.i32_const(1))),
	            c.setLocal("nGroups", c.i32_shr_u(c.getLocal("n"), c.getLocal("exp"))),
	            c.setLocal("pairOffset", c.i32_mul(c.getLocal("nPerGroupDiv2"), c.i32_const(n8g))),
	            c.setLocal("pwm",
	                c.i32_add(
	                    c.i32_const(ROOTs),
	                    c.i32_mul(
	                        c.getLocal("exp"),
	                        c.i32_const(n8f)
	                    )
	                )
	            ),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("nGroups")
	                    )
	                ),
	                c.call( fPrefix + "_one", W),
	                c.setLocal("j", c.i32_const(0)),
	                c.block(c.loop(
	                    c.br_if(
	                        1,
	                        c.i32_eq(
	                            c.getLocal("j"),
	                            c.getLocal("nPerGroupDiv2")
	                        )
	                    ),

	                    c.setLocal(
	                        "idx1",
	                        c.i32_add(
	                            c.getLocal("pBuff"),
	                            c.i32_mul(
	                                c.i32_add(
	                                    c.i32_mul(
	                                        c.getLocal("i"),
	                                        c.getLocal("nPerGroup")
	                                    ),
	                                    c.getLocal("j")
	                                ),
	                                c.i32_const(n8g)
	                            )
	                        )
	                    ),

	                    c.setLocal(
	                        "idx2",
	                        c.i32_add(
	                            c.getLocal("idx1"),
	                            c.getLocal("pairOffset")
	                        )
	                    ),

	                    c.call(
	                        opGtimesF,
	                        c.getLocal("idx2"),
	                        W,
	                        T
	                    ),

	                    c.call(
	                        gPrefix + "_copy",
	                        c.getLocal("idx1"),
	                        U
	                    ),

	                    c.call(
	                        gPrefix + "_add",
	                        U,
	                        T,
	                        c.getLocal("idx1"),
	                    ),

	                    c.call(
	                        gPrefix + "_sub",
	                        U,
	                        T,
	                        c.getLocal("idx2"),
	                    ),

	                    c.call(
	                        fPrefix + "_mul",
	                        W,
	                        c.getLocal("pwm"),
	                        W,
	                    ),
	                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                    c.br(0)
	                )),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }


	    // Reverse all and multiply by factor
	    function buildFFTFinal() {
	        const f = module.addFunction(prefix+"_fftFinal");
	        f.addParam("pBuff", "i32");
	        f.addParam("n", "i32");
	        f.addParam("factor", "i32");
	        f.addLocal("idx1", "i32");
	        f.addLocal("idx2", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("ndiv2", "i32");

	        const c = f.getCodeBuilder();

	        const T = c.i32_const(module.alloc(n8g));

	        f.addCode(
	            c.setLocal("ndiv2", c.i32_shr_u(c.getLocal("n"), c.i32_const(1))),
	            c.if(
	                c.i32_and(
	                    c.getLocal("n"),
	                    c.i32_const(1)
	                ),
	                c.call(
	                    opGtimesF,
	                    c.i32_add(
	                        c.getLocal("pBuff"),
	                        c.i32_mul(
	                            c.getLocal("ndiv2"),
	                            c.i32_const(n8g)
	                        )
	                    ),
	                    c.getLocal("factor"),
	                    c.i32_add(
	                        c.getLocal("pBuff"),
	                        c.i32_mul(
	                            c.getLocal("ndiv2"),
	                            c.i32_const(n8g)
	                        )
	                    ),
	                ),
	            ),
	            c.setLocal("i", c.i32_const(0)),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_ge_u(
	                        c.getLocal("i"),
	                        c.getLocal("ndiv2")
	                    )
	                ),

	                c.setLocal(
	                    "idx1",
	                    c.i32_add(
	                        c.getLocal("pBuff"),
	                        c.i32_mul(
	                            c.getLocal("i"),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.setLocal(
	                    "idx2",
	                    c.i32_add(
	                        c.getLocal("pBuff"),
	                        c.i32_mul(
	                            c.i32_sub(
	                                c.i32_sub(
	                                    c.getLocal("n"),
	                                    c.i32_const(1)
	                                ),
	                                c.getLocal("i")
	                            ),
	                            c.i32_const(n8g)
	                        )
	                    )
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx2"),
	                    c.getLocal("factor"),
	                    T
	                ),

	                c.call(
	                    opGtimesF,
	                    c.getLocal("idx1"),
	                    c.getLocal("factor"),
	                    c.getLocal("idx2"),
	                ),

	                c.call(
	                    gPrefix + "_copy",
	                    T,
	                    c.getLocal("idx1"),
	                ),

	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }

	    buildRev();
	    buildReversePermutation();
	    buildFinalInverse();
	    buildRawFFT();
	    buildLog2();
	    buildFFT();
	    buildIFFT();
	    buildFFTJoin();
	    buildFFTJoinExt();
	    buildFFTJoinExtInv();
	    buildFFTMix();
	    buildFFTFinal();
	    buildPrepareLagrangeEvaluation();

	    module.exportFunction(prefix+"_fft");
	    module.exportFunction(prefix+"_ifft");
	    module.exportFunction(prefix+"_rawfft");
	    module.exportFunction(prefix+"_fftJoin");
	    module.exportFunction(prefix+"_fftJoinExt");
	    module.exportFunction(prefix+"_fftJoinExtInv");
	    module.exportFunction(prefix+"_fftMix");
	    module.exportFunction(prefix+"_fftFinal");
	    module.exportFunction(prefix+"_prepareLagrangeEvaluation");

	};
	return build_fft;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var build_pol;
var hasRequiredBuild_pol;

function requireBuild_pol () {
	if (hasRequiredBuild_pol) return build_pol;
	hasRequiredBuild_pol = 1;
	build_pol = function buildPol(module, prefix, prefixField) {

	    const n64 = module.modules[prefixField].n64;
	    const n8 = n64*8;


	    function buildZero() {
	        const f = module.addFunction(prefix+"_zero");
	        f.addParam("px", "i32");
	        f.addParam("n", "i32");
	        f.addLocal("lastp", "i32");
	        f.addLocal("p", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal("p", c.getLocal("px")),
	            c.setLocal(
	                "lastp",
	                c.i32_add(
	                    c.getLocal("px"),
	                    c.i32_mul(
	                        c.getLocal("n"),
	                        c.i32_const(n8)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("p"),
	                        c.getLocal("lastp")
	                    )
	                ),
	                c.call(prefixField + "_zero", c.getLocal("p")),
	                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(n8))),
	                c.br(0)
	            ))
	        );
	    }

	    function buildConstructLC() {
	        const f = module.addFunction(prefix+"_constructLC");
	        f.addParam("ppolynomials", "i32");
	        f.addParam("psignals", "i32");
	        f.addParam("nSignals", "i32");
	        f.addParam("pres", "i32");
	        f.addLocal("i", "i32");
	        f.addLocal("j", "i32");
	        f.addLocal("pp", "i32");
	        f.addLocal("ps", "i32");
	        f.addLocal("pd", "i32");
	        f.addLocal("ncoefs", "i32");

	        const c = f.getCodeBuilder();

	        const aux = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.setLocal("i", c.i32_const(0)),
	            c.setLocal("pp", c.getLocal("ppolynomials")),
	            c.setLocal("ps", c.getLocal("psignals")),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("i"),
	                        c.getLocal("nSignals")
	                    )
	                ),

	                c.setLocal("ncoefs", c.i32_load(c.getLocal("pp"))),
	                c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(4))),

	                c.setLocal("j", c.i32_const(0)),
	                c.block(c.loop(
	                    c.br_if(
	                        1,
	                        c.i32_eq(
	                            c.getLocal("j"),
	                            c.getLocal("ncoefs")
	                        )
	                    ),

	                    c.setLocal(
	                        "pd",
	                        c.i32_add(
	                            c.getLocal("pres"),
	                            c.i32_mul(
	                                c.i32_load(c.getLocal("pp")),
	                                c.i32_const(n8)
	                            )
	                        )
	                    ),

	                    c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(4))),


	                    c.call(
	                        prefixField + "_mul",
	                        c.getLocal("ps"),
	                        c.getLocal("pp"),
	                        aux
	                    ),

	                    c.call(
	                        prefixField + "_add",
	                        aux,
	                        c.getLocal("pd"),
	                        c.getLocal("pd")
	                    ),

	                    c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(n8))),
	                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
	                    c.br(0)
	                )),

	                c.setLocal("ps", c.i32_add(c.getLocal("ps"), c.i32_const(n8))),
	                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );

	    }

	    buildZero();
	    buildConstructLC();


	    module.exportFunction(prefix + "_zero");
	    module.exportFunction(prefix + "_constructLC");

	    return prefix;




	};
	return build_pol;
}

var build_qap;
var hasRequiredBuild_qap;

function requireBuild_qap () {
	if (hasRequiredBuild_qap) return build_qap;
	hasRequiredBuild_qap = 1;
	build_qap = function buildQAP(module, prefix, prefixField) {

	    const n64 = module.modules[prefixField].n64;
	    const n8 = n64*8;


	    function buildBuildABC() {
	        const f = module.addFunction(prefix+"_buildABC");
	        f.addParam("pCoefs", "i32");
	        f.addParam("nCoefs", "i32");
	        f.addParam("pWitness", "i32");
	        f.addParam("pA", "i32");
	        f.addParam("pB", "i32");
	        f.addParam("pC", "i32");
	        f.addParam("offsetOut", "i32");
	        f.addParam("nOut", "i32");
	        f.addParam("offsetWitness", "i32");
	        f.addParam("nWitness", "i32");
	        f.addLocal("it", "i32");
	        f.addLocal("ita", "i32");
	        f.addLocal("itb", "i32");
	        f.addLocal("last", "i32");
	        f.addLocal("m", "i32");
	        f.addLocal("c", "i32");
	        f.addLocal("s", "i32");
	        f.addLocal("pOut", "i32");

	        const c = f.getCodeBuilder();

	        const aux = c.i32_const(module.alloc(n8));

	        f.addCode(

	            // Set output a and b to 0
	            c.setLocal("ita", c.getLocal("pA")),
	            c.setLocal("itb", c.getLocal("pB")),
	            c.setLocal(
	                "last",
	                c.i32_add(
	                    c.getLocal("pA"),
	                    c.i32_mul(
	                        c.getLocal("nOut"),
	                        c.i32_const(n8)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("ita"),
	                        c.getLocal("last")
	                    )
	                ),
	                c.call(prefixField + "_zero", c.getLocal("ita")),
	                c.call(prefixField + "_zero", c.getLocal("itb")),
	                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
	                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
	                c.br(0)
	            )),


	            c.setLocal("it", c.getLocal("pCoefs")),
	            c.setLocal(
	                "last",
	                c.i32_add(
	                    c.getLocal("pCoefs"),
	                    c.i32_mul(
	                        c.getLocal("nCoefs"),
	                        c.i32_const(n8+12)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("it"),
	                        c.getLocal("last")
	                    )
	                ),
	                c.setLocal(
	                    "s",
	                    c.i32_load(c.getLocal("it"), 8)
	                ),
	                c.if(
	                    c.i32_or(
	                        c.i32_lt_u(
	                            c.getLocal("s"),
	                            c.getLocal("offsetWitness"),
	                        ),
	                        c.i32_ge_u(
	                            c.getLocal("s"),
	                            c.i32_add(
	                                c.getLocal("offsetWitness"),
	                                c.getLocal("nWitness"),
	                            )
	                        )
	                    ),
	                    [
	                        ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
	                        ...c.br(1)
	                    ]
	                ),

	                c.setLocal(
	                    "m",
	                    c.i32_load(c.getLocal("it"))
	                ),
	                c.if(
	                    c.i32_eq(c.getLocal("m"), c.i32_const(0)),
	                    c.setLocal("pOut", c.getLocal("pA")),
	                    c.if(
	                        c.i32_eq(c.getLocal("m"), c.i32_const(1)),
	                        c.setLocal("pOut", c.getLocal("pB")),
	                        [
	                            ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
	                            ...c.br(1)
	                        ]
	                    )
	                ),
	                c.setLocal(
	                    "c",
	                    c.i32_load(c.getLocal("it"), 4)
	                ),
	                c.if(
	                    c.i32_or(
	                        c.i32_lt_u(
	                            c.getLocal("c"),
	                            c.getLocal("offsetOut"),
	                        ),
	                        c.i32_ge_u(
	                            c.getLocal("c"),
	                            c.i32_add(
	                                c.getLocal("offsetOut"),
	                                c.getLocal("nOut"),
	                            )
	                        )
	                    ),
	                    [
	                        ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
	                        ...c.br(1)
	                    ]
	                ),
	                c.setLocal(
	                    "pOut",
	                    c.i32_add(
	                        c.getLocal("pOut"),
	                        c.i32_mul(
	                            c.i32_sub(
	                                c.getLocal("c"),
	                                c.getLocal("offsetOut")
	                            ),
	                            c.i32_const(n8)
	                        )
	                    )
	                ),
	                c.call(
	                    prefixField + "_mul",
	                    c.i32_add(
	                        c.getLocal("pWitness"),
	                        c.i32_mul(
	                            c.i32_sub(c.getLocal("s"), c.getLocal("offsetWitness")),
	                            c.i32_const(n8)
	                        )
	                    ),
	                    c.i32_add( c.getLocal("it"), c.i32_const(12)),
	                    aux
	                ),
	                c.call(
	                    prefixField + "_add",
	                    c.getLocal("pOut"),
	                    aux,
	                    c.getLocal("pOut"),
	                ),
	                c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
	                c.br(0)
	            )),

	            c.setLocal("ita", c.getLocal("pA")),
	            c.setLocal("itb", c.getLocal("pB")),
	            c.setLocal("it", c.getLocal("pC")),
	            c.setLocal(
	                "last",
	                c.i32_add(
	                    c.getLocal("pA"),
	                    c.i32_mul(
	                        c.getLocal("nOut"),
	                        c.i32_const(n8)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("ita"),
	                        c.getLocal("last")
	                    )
	                ),
	                c.call(
	                    prefixField + "_mul",
	                    c.getLocal("ita"),
	                    c.getLocal("itb"),
	                    c.getLocal("it")
	                ),
	                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
	                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
	                c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8))),
	                c.br(0)
	            )),

	        );
	    }

	    function buildJoinABC() {
	        const f = module.addFunction(prefix+"_joinABC");
	        f.addParam("pA", "i32");
	        f.addParam("pB", "i32");
	        f.addParam("pC", "i32");
	        f.addParam("n", "i32");
	        f.addParam("pP", "i32");
	        f.addLocal("ita", "i32");
	        f.addLocal("itb", "i32");
	        f.addLocal("itc", "i32");
	        f.addLocal("itp", "i32");
	        f.addLocal("last", "i32");

	        const c = f.getCodeBuilder();

	        const aux = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.setLocal("ita", c.getLocal("pA")),
	            c.setLocal("itb", c.getLocal("pB")),
	            c.setLocal("itc", c.getLocal("pC")),
	            c.setLocal("itp", c.getLocal("pP")),
	            c.setLocal(
	                "last",
	                c.i32_add(
	                    c.getLocal("pA"),
	                    c.i32_mul(
	                        c.getLocal("n"),
	                        c.i32_const(n8)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("ita"),
	                        c.getLocal("last")
	                    )
	                ),
	                c.call(
	                    prefixField + "_mul",
	                    c.getLocal("ita"),
	                    c.getLocal("itb"),
	                    aux
	                ),
	                c.call(
	                    prefixField + "_sub",
	                    aux,
	                    c.getLocal("itc"),
	                    c.getLocal("itp"),
	                ),
	                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
	                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
	                c.setLocal("itc", c.i32_add(c.getLocal("itc"), c.i32_const(n8))),
	                c.setLocal("itp", c.i32_add(c.getLocal("itp"), c.i32_const(n8))),
	                c.br(0)
	            ))
	        );
	    }

	    function buildBatchAdd() {
	        const f = module.addFunction(prefix+"_batchAdd");
	        f.addParam("pa", "i32");
	        f.addParam("pb", "i32");
	        f.addParam("n", "i32");
	        f.addParam("pr", "i32");
	        f.addLocal("ita", "i32");
	        f.addLocal("itb", "i32");
	        f.addLocal("itr", "i32");
	        f.addLocal("last", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.setLocal("ita", c.getLocal("pa")),
	            c.setLocal("itb", c.getLocal("pb")),
	            c.setLocal("itr", c.getLocal("pr")),
	            c.setLocal(
	                "last",
	                c.i32_add(
	                    c.getLocal("pa"),
	                    c.i32_mul(
	                        c.getLocal("n"),
	                        c.i32_const(n8)
	                    )
	                )
	            ),
	            c.block(c.loop(
	                c.br_if(
	                    1,
	                    c.i32_eq(
	                        c.getLocal("ita"),
	                        c.getLocal("last")
	                    )
	                ),
	                c.call(
	                    prefixField + "_add",
	                    c.getLocal("ita"),
	                    c.getLocal("itb"),
	                    c.getLocal("itr"),
	                ),
	                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
	                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
	                c.setLocal("itr", c.i32_add(c.getLocal("itr"), c.i32_const(n8))),
	                c.br(0)
	            ))
	        );
	    }

	    buildBuildABC();
	    buildJoinABC();
	    buildBatchAdd();

	    module.exportFunction(prefix + "_buildABC");
	    module.exportFunction(prefix + "_joinABC");
	    module.exportFunction(prefix + "_batchAdd");

	    return prefix;

	};
	return build_qap;
}

var build_applykey;
var hasRequiredBuild_applykey;

function requireBuild_applykey () {
	if (hasRequiredBuild_applykey) return build_applykey;
	hasRequiredBuild_applykey = 1;
	/*
	    Copyright 2019 0KIMS association.

	    This file is part of wasmsnark (Web Assembly zkSnark Prover).

	    wasmsnark is a free software: you can redistribute it and/or modify it
	    under the terms of the GNU General Public License as published by
	    the Free Software Foundation, either version 3 of the License, or
	    (at your option) any later version.

	    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
	    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	    License for more details.

	    You should have received a copy of the GNU General Public License
	    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
	*/

	build_applykey = function buildApplyKey(module, fnName, gPrefix, frPrefix, sizeGIn, sizeGOut, sizeF, opGtimesF) {

	    const f = module.addFunction(fnName);
	    f.addParam("pIn", "i32");
	    f.addParam("n", "i32");
	    f.addParam("pFirst", "i32");
	    f.addParam("pInc", "i32");
	    f.addParam("pOut", "i32");
	    f.addLocal("pOldFree", "i32");
	    f.addLocal("i", "i32");
	    f.addLocal("pFrom", "i32");
	    f.addLocal("pTo", "i32");

	    const c = f.getCodeBuilder();

	    const t = c.i32_const(module.alloc(sizeF));

	    f.addCode(
	        c.setLocal("pFrom", c.getLocal("pIn")),
	        c.setLocal("pTo", c.getLocal("pOut")),
	    );

	    // t = first
	    f.addCode(
	        c.call(
	            frPrefix + "_copy",
	            c.getLocal("pFirst"),
	            t
	        )
	    );
	    f.addCode(
	        c.setLocal("i", c.i32_const(0)),
	        c.block(c.loop(
	            c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

	            c.call(
	                opGtimesF,
	                c.getLocal("pFrom"),
	                t,
	                c.getLocal("pTo")
	            ),
	            c.setLocal("pFrom", c.i32_add(c.getLocal("pFrom"), c.i32_const(sizeGIn))),
	            c.setLocal("pTo", c.i32_add(c.getLocal("pTo"), c.i32_const(sizeGOut))),

	            // t = t* inc
	            c.call(
	                frPrefix + "_mul",
	                t,
	                c.getLocal("pInc"),
	                t
	            ),
	            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
	            c.br(0)
	        ))
	    );

	    module.exportFunction(fnName);

	};
	return build_applykey;
}

var build_bn128;
var hasRequiredBuild_bn128;

function requireBuild_bn128 () {
	if (hasRequiredBuild_bn128) return build_bn128;
	hasRequiredBuild_bn128 = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const utils = /*@__PURE__*/ requireUtils$1();

	const buildF1m =/*@__PURE__*/ requireBuild_f1m();
	const buildF1 =/*@__PURE__*/ requireBuild_f1();
	const buildF2m =/*@__PURE__*/ requireBuild_f2m();
	const buildF3m =/*@__PURE__*/ requireBuild_f3m();
	const buildCurve =/*@__PURE__*/ requireBuild_curve_jacobian_a0();
	const buildFFT = /*@__PURE__*/ requireBuild_fft();
	const buildPol = /*@__PURE__*/ requireBuild_pol();
	const buildQAP = /*@__PURE__*/ requireBuild_qap();
	const buildApplyKey = /*@__PURE__*/ requireBuild_applykey();

	build_bn128 = function buildBN128(module, _prefix) {

	    const prefix = _prefix || "bn128";

	    if (module.modules[prefix]) return prefix;  // already builded

	    const q = bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
	    const r = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");


	    const n64 = Math.floor((q.minus(1).bitLength() - 1)/64) +1;
	    const n8 = n64*8;
	    const frsize = n8;
	    const f1size = n8;
	    const f2size = f1size * 2;
	    const ftsize = f1size * 12;

	    const pr = module.alloc(utils.bigInt2BytesLE( r, frsize ));

	    const f1mPrefix = buildF1m(module, q, "f1m");
	    buildF1(module, r, "fr", "frm");

	    const pG1b = module.alloc(utils.bigInt2BytesLE( toMontgomery(bigInt(3)), f1size ));
	    const g1mPrefix = buildCurve(module, "g1m", "f1m", pG1b);

	    buildFFT(module, "frm", "frm", "frm", "frm_mul");

	    buildPol(module, "pol", "frm");
	    buildQAP(module, "qap", "frm");

	    const f2mPrefix = buildF2m(module, "f1m_neg", "f2m", "f1m");
	    const pG2b = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(bigInt("19485874751759354771024239261021720505790618469301721065564631296452457478373")), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(bigInt("266929791119991161246907387137283842545076965332900288569378510910307636690")), f1size )
	    ]);
	    const g2mPrefix = buildCurve(module, "g2m", "f2m", pG2b);


	    function buildGTimesFr(fnName, opMul) {
	        const f = module.addFunction(fnName);
	        f.addParam("pG", "i32");
	        f.addParam("pFr", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8));

	        f.addCode(
	            c.call("frm_fromMontgomery", c.getLocal("pFr"), AUX),
	            c.call(
	                opMul,
	                c.getLocal("pG"),
	                AUX,
	                c.i32_const(n8),
	                c.getLocal("pr")
	            )
	        );

	        module.exportFunction(fnName);
	    }
	    buildGTimesFr("g1m_timesFr", "g1m_timesScalar");
	    buildFFT(module, "g1m", "g1m", "frm", "g1m_timesFr");

	    buildGTimesFr("g2m_timesFr", "g2m_timesScalar");
	    buildFFT(module, "g2m", "g2m", "frm", "g2m_timesFr");

	    buildGTimesFr("g1m_timesFrAffine", "g1m_timesScalarAffine");
	    buildGTimesFr("g2m_timesFrAffine", "g2m_timesScalarAffine");

	    buildApplyKey(module, "frm_batchApplyKey", "fmr", "frm", n8, n8, n8, "frm_mul");
	    buildApplyKey(module, "g1m_batchApplyKey", "g1m", "frm", n8*3, n8*3, n8, "g1m_timesFr");
	    buildApplyKey(module, "g1m_batchApplyKeyMixed", "g1m", "frm", n8*2, n8*3, n8, "g1m_timesFrAffine");
	    buildApplyKey(module, "g2m_batchApplyKey", "g2m", "frm", n8*2*3, n8*3*2, n8, "g2m_timesFr");
	    buildApplyKey(module, "g2m_batchApplyKeyMixed", "g2m", "frm", n8*2*2, n8*3*2, n8, "g2m_timesFrAffine");

	    function toMontgomery(a) {
	        return bigInt(a).times( bigInt.one.shiftLeft(f1size*8)).mod(q);
	    }

	    const G1gen = [
	        bigInt("1"),
	        bigInt("2"),
	        bigInt.one
	    ];

	    const pG1gen = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[2]), f1size ),
	        ]
	    );

	    const G1zero = [
	        bigInt.zero,
	        bigInt.one,
	        bigInt.zero
	    ];

	    const pG1zero = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[2]), f1size )
	        ]
	    );

	    const G2gen = [
	        [
	            bigInt("10857046999023057135944570762232829481370756359578518086990519993285655852781"),
	            bigInt("11559732032986387107991004021392285783925812861821192530917403151452391805634"),
	        ],[
	            bigInt("8495653923123431417604973247489272438418190587263600148770280649306958101930"),
	            bigInt("4082367875863433681332203403145435568316851327593401208105741076214120093531"),
	        ],[
	            bigInt.one,
	            bigInt.zero,
	        ]
	    ];

	    const pG2gen = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][1]), f1size ),
	        ]
	    );

	    const G2zero = [
	        [
	            bigInt.zero,
	            bigInt.zero,
	        ],[
	            bigInt.one,
	            bigInt.zero,
	        ],[
	            bigInt.zero,
	            bigInt.zero,
	        ]
	    ];

	    const pG2zero = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][1]), f1size ),
	        ]
	    );

	    const pOneT = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	    ]);

	    const pNonResidueF6 = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(9), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
	    ]);

	    const pTwoInv = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(  bigInt(2).modInv(q)), f1size ),
	        ...utils.bigInt2BytesLE( bigInt(0), f1size )
	    ]);

	    const pAltBn128Twist = pNonResidueF6;

	    const pTwistCoefB = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery("19485874751759354771024239261021720505790618469301721065564631296452457478373"), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery("266929791119991161246907387137283842545076965332900288569378510910307636690"), f1size ),
	    ]);

	    function build_mulNR6() {
	        const f = module.addFunction(prefix + "_mulNR6");
	        f.addParam("x", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(
	                f2mPrefix + "_mul",
	                c.i32_const(pNonResidueF6),
	                c.getLocal("x"),
	                c.getLocal("pr")
	            )
	        );
	    }
	    build_mulNR6();

	    const f6mPrefix = buildF3m(module, prefix+"_mulNR6", "f6m", "f2m");

	    function build_mulNR12() {
	        const f = module.addFunction(prefix + "_mulNR12");
	        f.addParam("x", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(
	                f2mPrefix + "_mul",
	                c.i32_const(pNonResidueF6),
	                c.i32_add(c.getLocal("x"), c.i32_const(n8*4)),
	                c.getLocal("pr")
	            ),
	            c.call(
	                f2mPrefix + "_copy",
	                c.getLocal("x"),
	                c.i32_add(c.getLocal("pr"), c.i32_const(n8*2)),
	            ),
	            c.call(
	                f2mPrefix + "_copy",
	                c.i32_add(c.getLocal("x"), c.i32_const(n8*2)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(n8*4)),
	            )
	        );
	    }
	    build_mulNR12();

	    const ftmPrefix = buildF2m(module, prefix+"_mulNR12", "ftm", f6mPrefix);


	    const ateLoopCount = bigInt("29793968203157093288");
	    const ateLoopBitBytes = bits(ateLoopCount);
	    const pAteLoopBitBytes = module.alloc(ateLoopBitBytes);

	    const ateCoefSize = 3 * f2size;
	    const ateNDblCoefs = ateLoopBitBytes.length-1;
	    const ateNAddCoefs = ateLoopBitBytes.reduce((acc, b) =>  acc + ( b!=0 ? 1 : 0)   ,0);
	    const ateNCoefs = ateNAddCoefs + ateNDblCoefs + 1;
	    const prePSize = 3*2*n8;
	    const preQSize = 3*n8*2 + ateNCoefs*ateCoefSize;


	    module.modules[prefix] = {
	        n64: n64,
	        pG1gen: pG1gen,
	        pG1zero: pG1zero,
	        pG1b: pG1b,
	        pG2gen: pG2gen,
	        pG2zero: pG2zero,
	        pG2b: pG2b,
	        pq: module.modules["f1m"].pq,
	        pr: pr,
	        pOneT: pOneT,
	        prePSize: prePSize,
	        preQSize: preQSize,
	        r: r.toString(),
	        q: q.toString()
	    };

	    // console.log("PrePSize: " +prePSize);
	    // console.log("PreQSize: " +preQSize);

	    const finalExpZ = bigInt("4965661367192848881");

	    function naf(n) {
	        let E = n;
	        const res = [];
	        while (E.gt(bigInt.zero)) {
	            if (E.isOdd()) {
	                const z = 2 - E.mod(4).toJSNumber();
	                res.push( z );
	                E = E.minus(z);
	            } else {
	                res.push( 0 );
	            }
	            E = E.shiftRight(1);
	        }
	        return res;
	    }

	    function bits(n) {
	        let E = n;
	        const res = [];
	        while (E.gt(bigInt.zero)) {
	            if (E.isOdd()) {
	                res.push( 1 );
	            } else {
	                res.push( 0 );
	            }
	            E = E.shiftRight(1);
	        }
	        return res;
	    }

	    function buildPrepareG1() {
	        const f = module.addFunction(prefix+ "_prepareG1");
	        f.addParam("pP", "i32");
	        f.addParam("ppreP", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(g1mPrefix + "_normalize", c.getLocal("pP"), c.getLocal("ppreP")),  // TODO Remove if already in affine
	        );
	    }

	    function buildPrepAddStep() {
	        const f = module.addFunction(prefix+ "_prepAddStep");
	        f.addParam("pQ", "i32");
	        f.addParam("pR", "i32");
	        f.addParam("pCoef", "i32");

	        const c = f.getCodeBuilder();

	        const X2  = c.getLocal("pQ");
	        const Y2  = c.i32_add(c.getLocal("pQ"), c.i32_const(f2size));

	        const X1  = c.getLocal("pR");
	        const Y1  = c.i32_add(c.getLocal("pR"), c.i32_const(f2size));
	        const Z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*f2size));

	        const ELL_0  = c.getLocal("pCoef");
	        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
	        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));

	        const D = ELL_VW;
	        const E = c.i32_const(module.alloc(f2size));
	        const F = c.i32_const(module.alloc(f2size));
	        const G = c.i32_const(module.alloc(f2size));
	        const H = c.i32_const(module.alloc(f2size));
	        const I = c.i32_const(module.alloc(f2size));
	        const J = c.i32_const(module.alloc(f2size));
	        const AUX = c.i32_const(module.alloc(f2size));

	        f.addCode(
	            // D = X1 - X2*Z1
	            c.call(f2mPrefix + "_mul", X2, Z1, D),
	            c.call(f2mPrefix + "_sub", X1, D, D),

	            // E = Y1 - Y2*Z1
	            c.call(f2mPrefix + "_mul", Y2, Z1, E),
	            c.call(f2mPrefix + "_sub", Y1, E, E),

	            // F = D^2
	            c.call(f2mPrefix + "_square", D, F),

	            // G = E^2
	            c.call(f2mPrefix + "_square", E, G),

	            // H = D*F
	            c.call(f2mPrefix + "_mul", D, F, H),

	            // I = X1 * F
	            c.call(f2mPrefix + "_mul", X1, F, I),

	            // J = H + Z1*G - (I+I)
	            c.call(f2mPrefix + "_add", I, I, AUX),
	            c.call(f2mPrefix + "_mul", Z1, G, J),
	            c.call(f2mPrefix + "_add", H, J, J),
	            c.call(f2mPrefix + "_sub", J, AUX, J),


	            // X3 (X1) = D*J
	            c.call(f2mPrefix + "_mul", D, J, X1),

	            // Y3 (Y1) = E*(I-J)-(H*Y1)
	            c.call(f2mPrefix + "_mul", H, Y1, Y1),
	            c.call(f2mPrefix + "_sub", I, J, AUX),
	            c.call(f2mPrefix + "_mul", E, AUX, AUX),
	            c.call(f2mPrefix + "_sub", AUX, Y1, Y1),

	            // Z3 (Z1) = Z1*H
	            c.call(f2mPrefix + "_mul", Z1, H, Z1),

	            // ell_0 = xi * (E * X2 - D * Y2)
	            c.call(f2mPrefix + "_mul", D, Y2, AUX),
	            c.call(f2mPrefix + "_mul", E, X2, ELL_0),
	            c.call(f2mPrefix + "_sub", ELL_0, AUX, ELL_0),
	            c.call(f2mPrefix + "_mul", ELL_0, c.i32_const(pAltBn128Twist), ELL_0),


	            // ell_VV = - E (later: * xP)
	            c.call(f2mPrefix + "_neg", E, ELL_VV),

	            // ell_VW = D (later: * yP    )
	            // Already assigned

	        );
	    }



	    function buildPrepDoubleStep() {
	        const f = module.addFunction(prefix+ "_prepDblStep");
	        f.addParam("pR", "i32");
	        f.addParam("pCoef", "i32");

	        const c = f.getCodeBuilder();

	        const X1  = c.getLocal("pR");
	        const Y1  = c.i32_add(c.getLocal("pR"), c.i32_const(f2size));
	        const Z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*f2size));

	        const ELL_0  = c.getLocal("pCoef");
	        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
	        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));

	        const A = c.i32_const(module.alloc(f2size));
	        const B = c.i32_const(module.alloc(f2size));
	        const C = c.i32_const(module.alloc(f2size));
	        const D = c.i32_const(module.alloc(f2size));
	        const E = c.i32_const(module.alloc(f2size));
	        const F = c.i32_const(module.alloc(f2size));
	        const G = c.i32_const(module.alloc(f2size));
	        const H = c.i32_const(module.alloc(f2size));
	        const I = c.i32_const(module.alloc(f2size));
	        const J = c.i32_const(module.alloc(f2size));
	        const E2 = c.i32_const(module.alloc(f2size));
	        const AUX = c.i32_const(module.alloc(f2size));

	        f.addCode(

	            // A = X1 * Y1 / 2
	            c.call(f2mPrefix + "_mul", Y1, c.i32_const(pTwoInv), A),
	            c.call(f2mPrefix + "_mul", X1, A, A),

	            // B = Y1^2
	            c.call(f2mPrefix + "_square", Y1, B),

	            // C = Z1^2
	            c.call(f2mPrefix + "_square", Z1, C),

	            // D = 3 * C
	            c.call(f2mPrefix + "_add", C, C, D),
	            c.call(f2mPrefix + "_add", D, C, D),

	            // E = twist_b * D
	            c.call(f2mPrefix + "_mul", c.i32_const(pTwistCoefB), D, E),

	            // F = 3 * E
	            c.call(f2mPrefix + "_add", E, E, F),
	            c.call(f2mPrefix + "_add", E, F, F),

	            // G = (B+F)/2
	            c.call(f2mPrefix + "_add", B, F, G),
	            c.call(f2mPrefix + "_mul", G, c.i32_const(pTwoInv), G),

	            // H = (Y1+Z1)^2-(B+C)
	            c.call(f2mPrefix + "_add", B, C, AUX),
	            c.call(f2mPrefix + "_add", Y1, Z1, H),
	            c.call(f2mPrefix + "_square", H, H),
	            c.call(f2mPrefix + "_sub", H, AUX, H),

	            // I = E-B
	            c.call(f2mPrefix + "_sub", E, B, I),

	            // J = X1^2
	            c.call(f2mPrefix + "_square", X1, J),

	            // E_squared = E^2
	            c.call(f2mPrefix + "_square", E, E2),

	            // X3 (X1) = A * (B-F)
	            c.call(f2mPrefix + "_sub", B, F, AUX),
	            c.call(f2mPrefix + "_mul", A, AUX, X1),

	            // Y3 (Y1) = G^2 - 3*E^2
	            c.call(f2mPrefix + "_add", E2, E2, AUX),
	            c.call(f2mPrefix + "_add", E2, AUX, AUX),
	            c.call(f2mPrefix + "_square", G, Y1),
	            c.call(f2mPrefix + "_sub", Y1, AUX, Y1),

	            // Z3 (Z1) = B * H
	            c.call(f2mPrefix + "_mul", B, H, Z1),

	            // ell_0 = xi * I
	            c.call(f2mPrefix + "_mul", c.i32_const(pAltBn128Twist), I, ELL_0),

	            // ell_VW = - H (later: * yP)
	            c.call(f2mPrefix + "_neg", H, ELL_VW),

	            // ell_VV = 3*J (later: * xP)
	            c.call(f2mPrefix + "_add", J, J, ELL_VV),
	            c.call(f2mPrefix + "_add", J, ELL_VV, ELL_VV),

	        );
	    }

	    function buildMulByQ() {
	        const f = module.addFunction(prefix + "_mulByQ");
	        f.addParam("p1", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("p1");
	        const y = c.i32_add(c.getLocal("p1"), c.i32_const(f2size));
	        const z = c.i32_add(c.getLocal("p1"), c.i32_const(f2size*2));
	        const x3 = c.getLocal("pr");
	        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(f2size));
	        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(f2size*2));

	        const MulByQX = c.i32_const(module.alloc([
	            ...utils.bigInt2BytesLE( toMontgomery("21575463638280843010398324269430826099269044274347216827212613867836435027261"), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery("10307601595873709700152284273816112264069230130616436755625194854815875713954"), f1size ),
	        ]));

	        const MulByQY = c.i32_const(module.alloc([
	            ...utils.bigInt2BytesLE( toMontgomery("2821565182194536844548159561693502659359617185244120367078079554186484126554"), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery("3505843767911556378687030309984248845540243509899259641013678093033130930403"), f1size ),
	        ]));

	        f.addCode(
	            // The frobeniusMap(1) in this field, is the conjugate
	            c.call(f2mPrefix + "_conjugate", x, x3),
	            c.call(f2mPrefix + "_mul", MulByQX, x3, x3),
	            c.call(f2mPrefix + "_conjugate", y, y3),
	            c.call(f2mPrefix + "_mul", MulByQY, y3, y3),
	            c.call(f2mPrefix + "_conjugate", z, z3),
	        );
	    }


	    function buildPrepareG2() {
	        buildMulByQ();
	        const f = module.addFunction(prefix+ "_prepareG2");
	        f.addParam("pQ", "i32");
	        f.addParam("ppreQ", "i32");
	        f.addLocal("pCoef", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const QX = c.getLocal("pQ");
	        c.i32_add( c.getLocal("pQ"), c.i32_const(f2size));
	        c.i32_add( c.getLocal("pQ"), c.i32_const(f2size*2));

	        const pR = module.alloc(f2size*3);
	        const R = c.i32_const(pR);
	        const RX = c.i32_const(pR);
	        const RY = c.i32_const(pR+f2size);
	        const RZ = c.i32_const(pR+2*f2size);

	        const cQX = c.i32_add( c.getLocal("ppreQ"), c.i32_const(0));
	        const cQY = c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size));
	        c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*2));

	        const pQ1 = module.alloc(f2size*3);
	        const Q1 = c.i32_const(pQ1);

	        const pQ2 = module.alloc(f2size*3);
	        const Q2 = c.i32_const(pQ2);
	        c.i32_const(pQ2);
	        const Q2Y = c.i32_const(pQ2 + f2size);
	        c.i32_const(pQ2 + f2size*2);

	        f.addCode(
	            c.call(g2mPrefix + "_normalize", QX, cQX),  // TODO Remove if already in affine
	            c.call(f2mPrefix + "_copy", cQX, RX),
	            c.call(f2mPrefix + "_copy", cQY, RY),
	            c.call(f2mPrefix + "_one", RZ),
	        );

	        f.addCode(
	            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),
	            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
	            c.block(c.loop(

	                c.call(prefix + "_prepDblStep", R, c.getLocal("pCoef")),
	                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	                c.if(
	                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
	                    [
	                        ...c.call(prefix + "_prepAddStep", cQX, R, c.getLocal("pCoef")),
	                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
	                    ]
	                ),
	                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );

	        f.addCode(
	            c.call(prefix + "_mulByQ", cQX, Q1),
	            c.call(prefix + "_mulByQ", Q1, Q2)
	        );

	        f.addCode(
	            c.call(f2mPrefix + "_neg", Q2Y, Q2Y),

	            c.call(prefix + "_prepAddStep", Q1, R, c.getLocal("pCoef")),
	            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	            c.call(prefix + "_prepAddStep", Q2, R, c.getLocal("pCoef")),
	            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
	        );
	    }

	    function buildMulBy024Old() {
	        const f = module.addFunction(prefix+ "__mulBy024Old");
	        f.addParam("pEll0", "i32");
	        f.addParam("pEllVW", "i32");
	        f.addParam("pEllVV", "i32");
	        f.addParam("pR", "i32");            // Result in F12

	        const c = f.getCodeBuilder();

	        const x0  = c.getLocal("pEll0");
	        const x2  = c.getLocal("pEllVV");
	        const x4  = c.getLocal("pEllVW");

	        const z0  = c.getLocal("pR");

	        const pAUX12 = module.alloc(ftsize);
	        const AUX12 = c.i32_const(pAUX12);
	        const AUX12_0 = c.i32_const(pAUX12);
	        const AUX12_2 = c.i32_const(pAUX12+f2size);
	        const AUX12_4 = c.i32_const(pAUX12+f2size*2);
	        const AUX12_6 = c.i32_const(pAUX12+f2size*3);
	        const AUX12_8 = c.i32_const(pAUX12+f2size*4);
	        const AUX12_10 = c.i32_const(pAUX12+f2size*5);

	        f.addCode(

	            c.call(f2mPrefix + "_copy", x0, AUX12_0),
	            c.call(f2mPrefix + "_zero", AUX12_2),
	            c.call(f2mPrefix + "_copy", x2, AUX12_4),
	            c.call(f2mPrefix + "_zero", AUX12_6),
	            c.call(f2mPrefix + "_copy", x4, AUX12_8),
	            c.call(f2mPrefix + "_zero", AUX12_10),
	            c.call(ftmPrefix + "_mul", AUX12, z0, z0),
	        );
	    }

	    function buildMulBy024() {
	        const f = module.addFunction(prefix+ "__mulBy024");
	        f.addParam("pEll0", "i32");
	        f.addParam("pEllVW", "i32");
	        f.addParam("pEllVV", "i32");
	        f.addParam("pR", "i32");            // Result in F12

	        const c = f.getCodeBuilder();

	        const x0  = c.getLocal("pEll0");
	        const x2  = c.getLocal("pEllVV");
	        const x4  = c.getLocal("pEllVW");

	        const z0  = c.getLocal("pR");
	        const z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*n8));
	        const z2  = c.i32_add(c.getLocal("pR"), c.i32_const(4*n8));
	        const z3  = c.i32_add(c.getLocal("pR"), c.i32_const(6*n8));
	        const z4  = c.i32_add(c.getLocal("pR"), c.i32_const(8*n8));
	        const z5  = c.i32_add(c.getLocal("pR"), c.i32_const(10*n8));

	        const t0 = c.i32_const(module.alloc(f2size));
	        const t1 = c.i32_const(module.alloc(f2size));
	        const t2 = c.i32_const(module.alloc(f2size));
	        const s0 = c.i32_const(module.alloc(f2size));
	        const T3 = c.i32_const(module.alloc(f2size));
	        const T4 = c.i32_const(module.alloc(f2size));
	        const D0 = c.i32_const(module.alloc(f2size));
	        const D2 = c.i32_const(module.alloc(f2size));
	        const D4 = c.i32_const(module.alloc(f2size));
	        const S1 = c.i32_const(module.alloc(f2size));
	        const AUX = c.i32_const(module.alloc(f2size));

	        f.addCode(

	            // D0 = z0 * x0;
	            c.call(f2mPrefix + "_mul", z0, x0, D0),
	            // D2 = z2 * x2;
	            c.call(f2mPrefix + "_mul", z2, x2, D2),
	            // D4 = z4 * x4;
	            c.call(f2mPrefix + "_mul", z4, x4, D4),
	            // t2 = z0 + z4;
	            c.call(f2mPrefix + "_add", z0, z4, t2),
	            // t1 = z0 + z2;
	            c.call(f2mPrefix + "_add", z0, z2, t1),
	            // s0 = z1 + z3 + z5;
	            c.call(f2mPrefix + "_add", z1, z3, s0),
	            c.call(f2mPrefix + "_add", s0, z5, s0),


	            // For z.a_.a_ = z0.
	            // S1 = z1 * x2;
	            c.call(f2mPrefix + "_mul", z1, x2, S1),
	            // T3 = S1 + D4;
	            c.call(f2mPrefix + "_add", S1, D4, T3),
	            // T4 = my_Fp6::non_residue * T3 + D0;
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
	            c.call(f2mPrefix + "_add", T4, D0, z0),
	            // z0 = T4;

	            // For z.a_.b_ = z1
	            // T3 = z5 * x4;
	            c.call(f2mPrefix + "_mul", z5, x4, T3),
	            // S1 = S1 + T3;
	            c.call(f2mPrefix + "_add", S1, T3, S1),
	            // T3 = T3 + D2;
	            c.call(f2mPrefix + "_add", T3, D2, T3),
	            // T4 = my_Fp6::non_residue * T3;
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
	            // T3 = z1 * x0;
	            c.call(f2mPrefix + "_mul", z1, x0, T3),
	            // S1 = S1 + T3;
	            c.call(f2mPrefix + "_add", S1, T3, S1),
	            // T4 = T4 + T3;
	            c.call(f2mPrefix + "_add", T4, T3, z1),
	            // z1 = T4;



	            // For z.a_.c_ = z2
	            // t0 = x0 + x2;
	            c.call(f2mPrefix + "_add", x0, x2, t0),
	            // T3 = t1 * t0 - D0 - D2;
	            c.call(f2mPrefix + "_mul", t1, t0, T3),
	            c.call(f2mPrefix + "_add", D0, D2, AUX),
	            c.call(f2mPrefix + "_sub", T3, AUX, T3),
	            // T4 = z3 * x4;
	            c.call(f2mPrefix + "_mul", z3, x4, T4),
	            // S1 = S1 + T4;
	            c.call(f2mPrefix + "_add", S1, T4, S1),


	            // For z.b_.a_ = z3 (z3 needs z2)
	            // t0 = z2 + z4;
	            c.call(f2mPrefix + "_add", z2, z4, t0),
	            // T3 = T3 + T4;
	            // z2 = T3;
	            c.call(f2mPrefix + "_add", T3, T4, z2),
	            // t1 = x2 + x4;
	            c.call(f2mPrefix + "_add", x2, x4, t1),
	            // T3 = t0 * t1 - D2 - D4;
	            c.call(f2mPrefix + "_mul", t1, t0, T3),
	            c.call(f2mPrefix + "_add", D2, D4, AUX),
	            c.call(f2mPrefix + "_sub", T3, AUX, T3),
	            // T4 = my_Fp6::non_residue * T3;
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
	            // T3 = z3 * x0;
	            c.call(f2mPrefix + "_mul", z3, x0, T3),
	            // S1 = S1 + T3;
	            c.call(f2mPrefix + "_add", S1, T3, S1),
	            // T4 = T4 + T3;
	            c.call(f2mPrefix + "_add", T4, T3, z3),
	            // z3 = T4;

	            // For z.b_.b_ = z4
	            // T3 = z5 * x2;
	            c.call(f2mPrefix + "_mul", z5, x2, T3),
	            // S1 = S1 + T3;
	            c.call(f2mPrefix + "_add", S1, T3, S1),
	            // T4 = my_Fp6::non_residue * T3;
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
	            // t0 = x0 + x4;
	            c.call(f2mPrefix + "_add", x0, x4, t0),
	            // T3 = t2 * t0 - D0 - D4;
	            c.call(f2mPrefix + "_mul", t2, t0, T3),
	            c.call(f2mPrefix + "_add", D0, D4, AUX),
	            c.call(f2mPrefix + "_sub", T3, AUX, T3),
	            // T4 = T4 + T3;
	            c.call(f2mPrefix + "_add", T4, T3, z4),
	            // z4 = T4;

	            // For z.b_.c_ = z5.
	            // t0 = x0 + x2 + x4;
	            c.call(f2mPrefix + "_add", x0, x2, t0),
	            c.call(f2mPrefix + "_add", t0, x4, t0),
	            // T3 = s0 * t0 - S1;
	            c.call(f2mPrefix + "_mul", s0, t0, T3),
	            c.call(f2mPrefix + "_sub", T3, S1, z5),
	            // z5 = T3;

	        );
	    }


	    function buildMillerLoop() {
	        const f = module.addFunction(prefix+ "_millerLoop");
	        f.addParam("ppreP", "i32");
	        f.addParam("ppreQ", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("pCoef", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const preP_PX = c.getLocal("ppreP");
	        const preP_PY = c.i32_add(c.getLocal("ppreP"), c.i32_const(f1size));

	        const ELL_0  = c.getLocal("pCoef");
	        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
	        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));


	        const pVW = module.alloc(f2size);
	        const VW = c.i32_const(pVW);
	        const pVV = module.alloc(f2size);
	        const VV = c.i32_const(pVV);

	        const F = c.getLocal("r");


	        f.addCode(
	            c.call(ftmPrefix + "_one", F),

	            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),

	            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
	            c.block(c.loop(


	                c.call(ftmPrefix + "_square", F, F),

	                c.call(f2mPrefix + "_mul1", ELL_VW,preP_PY, VW),
	                c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
	                c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
	                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	                c.if(
	                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
	                    [
	                        ...c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
	                        ...c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),

	                        ...c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
	                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	                    ]
	                ),
	                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))

	        );

	        f.addCode(
	            c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
	            c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
	            c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
	            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	            c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
	            c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
	            c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
	            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	        );

	    }


	    function buildFrobeniusMap(n) {
	        const F12 = [
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("8376118865763821496583973867626364092589906065868298776909617916018768340080"), bigInt("16469823323077808223889137241176536799009286646108169935659301613961712198316")],
	                [bigInt("21888242871839275220042445260109153167277707414472061641714758635765020556617"), bigInt("0")],
	                [bigInt("11697423496358154304825782922584725312912383441159505038794027105778954184319"), bigInt("303847389135065887422783454877609941456349188919719272345083954437860409601")],
	                [bigInt("21888242871839275220042445260109153167277707414472061641714758635765020556616"), bigInt("0")],
	                [bigInt("3321304630594332808241809054958361220322477375291206261884409189760185844239"), bigInt("5722266937896532885780051958958348231143373700109372999374820235121374419868")],
	                [bigInt("21888242871839275222246405745257275088696311157297823662689037894645226208582"), bigInt("0")],
	                [bigInt("13512124006075453725662431877630910996106405091429524885779419978626457868503"), bigInt("5418419548761466998357268504080738289687024511189653727029736280683514010267")],
	                [bigInt("2203960485148121921418603742825762020974279258880205651966"), bigInt("0")],
	                [bigInt("10190819375481120917420622822672549775783927716138318623895010788866272024264"), bigInt("21584395482704209334823622290379665147239961968378104390343953940207365798982")],
	                [bigInt("2203960485148121921418603742825762020974279258880205651967"), bigInt("0")],
	                [bigInt("18566938241244942414004596690298913868373833782006617400804628704885040364344"), bigInt("16165975933942742336466353786298926857552937457188450663314217659523851788715")],
	            ]
	        ];

	        const F6 = [
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("21575463638280843010398324269430826099269044274347216827212613867836435027261"), bigInt("10307601595873709700152284273816112264069230130616436755625194854815875713954")],
	                [bigInt("21888242871839275220042445260109153167277707414472061641714758635765020556616"), bigInt("0")],
	                [bigInt("3772000881919853776433695186713858239009073593817195771773381919316419345261"), bigInt("2236595495967245188281701248203181795121068902605861227855261137820944008926")],
	                [bigInt("2203960485148121921418603742825762020974279258880205651966"), bigInt("0")],
	                [bigInt("18429021223477853657660792034369865839114504446431234726392080002137598044644"), bigInt("9344045779998320333812420223237981029506012124075525679208581902008406485703")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("2581911344467009335267311115468803099551665605076196740867805258568234346338"), bigInt("19937756971775647987995932169929341994314640652964949448313374472400716661030")],
	                [bigInt("2203960485148121921418603742825762020974279258880205651966"), bigInt("0")],
	                [bigInt("5324479202449903542726783395506214481928257762400643279780343368557297135718"), bigInt("16208900380737693084919495127334387981393726419856888799917914180988844123039")],
	                [bigInt("21888242871839275220042445260109153167277707414472061641714758635765020556616"), bigInt("0")],
	                [bigInt("13981852324922362344252311234282257507216387789820983642040889267519694726527"), bigInt("7629828391165209371577384193250820201684255241773809077146787135900891633097")],
	            ]
	        ];

	        const f = module.addFunction(prefix+ "__frobeniusMap"+n);
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<6; i++) {
	            const X = (i==0) ? c.getLocal("x") : c.i32_add(c.getLocal("x"), c.i32_const(i*f2size));
	            const Xc0 = X;
	            const Xc1 = c.i32_add(c.getLocal("x"), c.i32_const(i*f2size + f1size));
	            const R = (i==0) ? c.getLocal("r") : c.i32_add(c.getLocal("r"), c.i32_const(i*f2size));
	            const Rc0 = R;
	            const Rc1 = c.i32_add(c.getLocal("r"), c.i32_const(i*f2size + f1size));
	            const coef = mul2(F12[Math.floor(i/3)][n%12] , F6[i%3][n%6]);
	            const pCoef = module.alloc([
	                ...utils.bigInt2BytesLE(toMontgomery(coef[0]), 32),
	                ...utils.bigInt2BytesLE(toMontgomery(coef[1]), 32),
	            ]);
	            if (n%2 == 1) {
	                f.addCode(
	                    c.call(f1mPrefix + "_copy", Xc0, Rc0),
	                    c.call(f1mPrefix + "_neg", Xc1, Rc1),
	                    c.call(f2mPrefix + "_mul", R, c.i32_const(pCoef), R),
	                );
	            } else {
	                f.addCode(c.call(f2mPrefix + "_mul", X, c.i32_const(pCoef), R));
	            }
	        }

	        function mul2(a, b) {
	            const ac0 = bigInt(a[0]);
	            const ac1 = bigInt(a[1]);
	            const bc0 = bigInt(b[0]);
	            const bc1 = bigInt(b[1]);
	            const res = [
	                ac0.times(bc0).minus(  ac1.times(bc1)  ).mod(q),
	                ac0.times(bc1).add(  ac1.times(bc0)  ).mod(q),
	            ];
	            if (res[0].isNegative()) res[0] = res[0].add(q);
	            return res;
	        }

	    }



	    function buildFinalExponentiationFirstChunk() {

	        const f = module.addFunction(prefix+ "__finalExponentiationFirstChunk");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const elt = c.getLocal("x");
	        const eltC0 = elt;
	        const eltC1 = c.i32_add(elt, c.i32_const(n8*6));
	        const r = c.getLocal("r");
	        const pA = module.alloc(ftsize);
	        const A = c.i32_const(pA);
	        const Ac0 = A;
	        const Ac1 = c.i32_const(pA + n8*6);
	        const B = c.i32_const(module.alloc(ftsize));
	        const C = c.i32_const(module.alloc(ftsize));
	        const D = c.i32_const(module.alloc(ftsize));

	        f.addCode(
	            // const alt_bn128_Fq12 A = alt_bn128_Fq12(elt.c0,-elt.c1);
	            c.call(f6mPrefix + "_copy", eltC0, Ac0),
	            c.call(f6mPrefix + "_neg", eltC1, Ac1),

	            // const alt_bn128_Fq12 B = elt.inverse();
	            c.call(ftmPrefix + "_inverse", elt, B),

	            // const alt_bn128_Fq12 C = A * B;
	            c.call(ftmPrefix + "_mul", A, B, C),
	            // const alt_bn128_Fq12 D = C.Frobenius_map(2);
	            c.call(prefix + "__frobeniusMap2", C, D),
	            // const alt_bn128_Fq12 result = D * C;
	            c.call(ftmPrefix + "_mul", C, D, r),
	        );
	    }

	    function buildCyclotomicSquare() {
	        const f = module.addFunction(prefix+ "__cyclotomicSquare");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x4 = c.i32_add(c.getLocal("x"), c.i32_const(f2size));
	        const x3 = c.i32_add(c.getLocal("x"), c.i32_const(2*f2size));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(3*f2size));
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(4*f2size));
	        const x5 = c.i32_add(c.getLocal("x"), c.i32_const(5*f2size));

	        const r0 = c.getLocal("r");
	        const r4 = c.i32_add(c.getLocal("r"), c.i32_const(f2size));
	        const r3 = c.i32_add(c.getLocal("r"), c.i32_const(2*f2size));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(3*f2size));
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(4*f2size));
	        const r5 = c.i32_add(c.getLocal("r"), c.i32_const(5*f2size));

	        const t0 = c.i32_const(module.alloc(f2size));
	        const t1 = c.i32_const(module.alloc(f2size));
	        const t2 = c.i32_const(module.alloc(f2size));
	        const t3 = c.i32_const(module.alloc(f2size));
	        const t4 = c.i32_const(module.alloc(f2size));
	        const t5 = c.i32_const(module.alloc(f2size));
	        const tmp = c.i32_const(module.alloc(f2size));
	        const AUX = c.i32_const(module.alloc(f2size));


	        f.addCode(

	//            c.call(ftmPrefix + "_square", x0, r0),

	            //    // t0 + t1*y = (z0 + z1*y)^2 = a^2
	            //    tmp = z0 * z1;
	            //    t0 = (z0 + z1) * (z0 + my_Fp6::non_residue * z1) - tmp - my_Fp6::non_residue * tmp;
	            //    t1 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x0, x1, tmp),
	            c.call(f2mPrefix + "_mul", x1, c.i32_const(pNonResidueF6), t0),
	            c.call(f2mPrefix + "_add", x0, t0, t0),
	            c.call(f2mPrefix + "_add", x0, x1, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t0, t0),
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t0, AUX, t0),
	            c.call(f2mPrefix + "_add", tmp, tmp, t1),

	            //  // t2 + t3*y = (z2 + z3*y)^2 = b^2
	            //  tmp = z2 * z3;
	            //  t2 = (z2 + z3) * (z2 + my_Fp6::non_residue * z3) - tmp - my_Fp6::non_residue * tmp;
	            //  t3 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x2, x3, tmp),
	            c.call(f2mPrefix + "_mul", x3, c.i32_const(pNonResidueF6), t2),
	            c.call(f2mPrefix + "_add", x2, t2, t2),
	            c.call(f2mPrefix + "_add", x2, x3, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t2, t2),
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t2, AUX, t2),
	            c.call(f2mPrefix + "_add", tmp, tmp, t3),

	            //  // t4 + t5*y = (z4 + z5*y)^2 = c^2
	            //  tmp = z4 * z5;
	            //  t4 = (z4 + z5) * (z4 + my_Fp6::non_residue * z5) - tmp - my_Fp6::non_residue * tmp;
	            //  t5 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x4, x5, tmp),
	            c.call(f2mPrefix + "_mul", x5, c.i32_const(pNonResidueF6), t4),
	            c.call(f2mPrefix + "_add", x4, t4, t4),
	            c.call(f2mPrefix + "_add", x4, x5, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t4, t4),
	            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t4, AUX, t4),
	            c.call(f2mPrefix + "_add", tmp, tmp, t5),

	            // For A
	            // z0 = 3 * t0 - 2 * z0
	            c.call(f2mPrefix + "_sub", t0, x0, r0),
	            c.call(f2mPrefix + "_add", r0, r0, r0),
	            c.call(f2mPrefix + "_add", t0, r0, r0),
	            // z1 = 3 * t1 + 2 * z1
	            c.call(f2mPrefix + "_add", t1, x1, r1),
	            c.call(f2mPrefix + "_add", r1, r1, r1),
	            c.call(f2mPrefix + "_add", t1, r1, r1),

	            // For B
	            // z2 = 3 * (xi * t5) + 2 * z2
	            c.call(f2mPrefix + "_mul", t5, c.i32_const(pAltBn128Twist), AUX),
	            c.call(f2mPrefix + "_add", AUX, x2, r2),
	            c.call(f2mPrefix + "_add", r2, r2, r2),
	            c.call(f2mPrefix + "_add", AUX, r2, r2),
	            // z3 = 3 * t4 - 2 * z3
	            c.call(f2mPrefix + "_sub", t4, x3, r3),
	            c.call(f2mPrefix + "_add", r3, r3, r3),
	            c.call(f2mPrefix + "_add", t4, r3, r3),

	            // For C
	            // z4 = 3 * t2 - 2 * z4
	            c.call(f2mPrefix + "_sub", t2, x4, r4),
	            c.call(f2mPrefix + "_add", r4, r4, r4),
	            c.call(f2mPrefix + "_add", t2, r4, r4),
	            // z5 = 3 * t3 + 2 * z5
	            c.call(f2mPrefix + "_add", t3, x5, r5),
	            c.call(f2mPrefix + "_add", r5, r5, r5),
	            c.call(f2mPrefix + "_add", t3, r5, r5),

	        );
	    }


	    function buildCyclotomicExp(exponent, fnName) {
	        const exponentNafBytes = naf(exponent).map( (b) => (b==-1 ? 0xFF: b) );
	        const pExponentNafBytes = module.alloc(exponentNafBytes);
	        module.alloc(utils.bigInt2BytesLE(exponent, 32));

	        const f = module.addFunction(prefix+ "__cyclotomicExp_"+fnName);
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("bit", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("x");

	        const res = c.getLocal("r");

	        const inverse = c.i32_const(module.alloc(ftsize));


	        f.addCode(
	//            c.call(ftmPrefix + "_exp", x, c.i32_const(pExponent), c.i32_const(32), res),

	            c.call(ftmPrefix + "_conjugate", x, inverse),
	            c.call(ftmPrefix + "_one", res),

	            c.if(
	                c.teeLocal("bit", c.i32_load8_s(c.i32_const(exponentNafBytes.length-1), pExponentNafBytes)),
	                c.if(
	                    c.i32_eq(
	                        c.getLocal("bit"),
	                        c.i32_const(1)
	                    ),
	                    c.call(ftmPrefix + "_mul", res, x, res),
	                    c.call(ftmPrefix + "_mul", res, inverse, res),
	                )
	            ),

	            c.setLocal("i", c.i32_const(exponentNafBytes.length-2)),
	            c.block(c.loop(
	//                c.call(ftmPrefix + "_square", res, res),
	                c.call(prefix + "__cyclotomicSquare", res, res),
	                c.if(
	                    c.teeLocal("bit", c.i32_load8_s(c.getLocal("i"), pExponentNafBytes)),
	                    c.if(
	                        c.i32_eq(
	                            c.getLocal("bit"),
	                            c.i32_const(1)
	                        ),
	                        c.call(ftmPrefix + "_mul", res, x, res),
	                        c.call(ftmPrefix + "_mul", res, inverse, res),
	                    )
	                ),
	                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }



	    function buildFinalExponentiationLastChunk() {
	        buildCyclotomicSquare();
	        buildCyclotomicExp(finalExpZ, "w0");

	        const f = module.addFunction(prefix+ "__finalExponentiationLastChunk");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const elt = c.getLocal("x");
	        const result = c.getLocal("r");
	        const A = c.i32_const(module.alloc(ftsize));
	        const B = c.i32_const(module.alloc(ftsize));
	        const C = c.i32_const(module.alloc(ftsize));
	        const D = c.i32_const(module.alloc(ftsize));
	        const E = c.i32_const(module.alloc(ftsize));
	        const F = c.i32_const(module.alloc(ftsize));
	        const G = c.i32_const(module.alloc(ftsize));
	        const H = c.i32_const(module.alloc(ftsize));
	        const I = c.i32_const(module.alloc(ftsize));
	        const J = c.i32_const(module.alloc(ftsize));
	        const K = c.i32_const(module.alloc(ftsize));
	        const L = c.i32_const(module.alloc(ftsize));
	        const M = c.i32_const(module.alloc(ftsize));
	        const N = c.i32_const(module.alloc(ftsize));
	        const O = c.i32_const(module.alloc(ftsize));
	        const P = c.i32_const(module.alloc(ftsize));
	        const Q = c.i32_const(module.alloc(ftsize));
	        const R = c.i32_const(module.alloc(ftsize));
	        const S = c.i32_const(module.alloc(ftsize));
	        const T = c.i32_const(module.alloc(ftsize));
	        const U = c.i32_const(module.alloc(ftsize));

	        f.addCode(


	            // A = exp_by_neg_z(elt)  // = elt^(-z)
	            c.call(prefix + "__cyclotomicExp_w0", elt, A),
	            c.call(ftmPrefix + "_conjugate", A, A),
	            // B = A^2                // = elt^(-2*z)
	            c.call(prefix + "__cyclotomicSquare", A, B),
	            // C = B^2                // = elt^(-4*z)
	            c.call(prefix + "__cyclotomicSquare", B, C),
	            // D = C * B              // = elt^(-6*z)
	            c.call(ftmPrefix + "_mul", C, B, D),
	            // E = exp_by_neg_z(D)    // = elt^(6*z^2)
	            c.call(prefix + "__cyclotomicExp_w0", D, E),
	            c.call(ftmPrefix + "_conjugate", E, E),
	            // F = E^2                // = elt^(12*z^2)
	            c.call(prefix + "__cyclotomicSquare", E, F),
	            // G = epx_by_neg_z(F)    // = elt^(-12*z^3)
	            c.call(prefix + "__cyclotomicExp_w0", F, G),
	            c.call(ftmPrefix + "_conjugate", G, G),
	            // H = conj(D)            // = elt^(6*z)
	            c.call(ftmPrefix + "_conjugate", D, H),
	            // I = conj(G)            // = elt^(12*z^3)
	            c.call(ftmPrefix + "_conjugate", G, I),
	            // J = I * E              // = elt^(12*z^3 + 6*z^2)
	            c.call(ftmPrefix + "_mul", I, E, J),
	            // K = J * H              // = elt^(12*z^3 + 6*z^2 + 6*z)
	            c.call(ftmPrefix + "_mul", J, H, K),
	            // L = K * B              // = elt^(12*z^3 + 6*z^2 + 4*z)
	            c.call(ftmPrefix + "_mul", K, B, L),
	            // M = K * E              // = elt^(12*z^3 + 12*z^2 + 6*z)
	            c.call(ftmPrefix + "_mul", K, E, M),

	            // N = M * elt            // = elt^(12*z^3 + 12*z^2 + 6*z + 1)
	            c.call(ftmPrefix + "_mul", M, elt, N),

	            // O = L.Frobenius_map(1) // = elt^(q*(12*z^3 + 6*z^2 + 4*z))
	            c.call(prefix + "__frobeniusMap1", L, O),
	            // P = O * N              // = elt^(q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
	            c.call(ftmPrefix + "_mul", O, N, P),
	            // Q = K.Frobenius_map(2) // = elt^(q^2 * (12*z^3 + 6*z^2 + 6*z))
	            c.call(prefix + "__frobeniusMap2", K, Q),
	            // R = Q * P              // = elt^(q^2 * (12*z^3 + 6*z^2 + 6*z) + q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
	            c.call(ftmPrefix + "_mul", Q, P, R),
	            // S = conj(elt)          // = elt^(-1)
	            c.call(ftmPrefix + "_conjugate", elt, S),
	            // T = S * L              // = elt^(12*z^3 + 6*z^2 + 4*z - 1)
	            c.call(ftmPrefix + "_mul", S, L, T),
	            // U = T.Frobenius_map(3) // = elt^(q^3(12*z^3 + 6*z^2 + 4*z - 1))
	            c.call(prefix + "__frobeniusMap3", T, U),
	            // V = U * R              // = elt^(q^3(12*z^3 + 6*z^2 + 4*z - 1) + q^2 * (12*z^3 + 6*z^2 + 6*z) + q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
	            c.call(ftmPrefix + "_mul", U, R, result),
	            // result = V
	        );
	    }


	    function buildFinalExponentiation() {
	        buildFinalExponentiationFirstChunk();
	        buildFinalExponentiationLastChunk();
	        const f = module.addFunction(prefix+ "_finalExponentiation");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const elt = c.getLocal("x");
	        const result = c.getLocal("r");
	        const eltToFirstChunk = c.i32_const(module.alloc(ftsize));

	        f.addCode(
	            c.call(prefix + "__finalExponentiationFirstChunk", elt, eltToFirstChunk ),
	            c.call(prefix + "__finalExponentiationLastChunk", eltToFirstChunk, result )
	        );
	    }


	    function buildFinalExponentiationOld() {
	        const f = module.addFunction(prefix+ "_finalExponentiationOld");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const exponent = bigInt("552484233613224096312617126783173147097382103762957654188882734314196910839907541213974502761540629817009608548654680343627701153829446747810907373256841551006201639677726139946029199968412598804882391702273019083653272047566316584365559776493027495458238373902875937659943504873220554161550525926302303331747463515644711876653177129578303191095900909191624817826566688241804408081892785725967931714097716709526092261278071952560171111444072049229123565057483750161460024353346284167282452756217662335528813519139808291170539072125381230815729071544861602750936964829313608137325426383735122175229541155376346436093930287402089517426973178917569713384748081827255472576937471496195752727188261435633271238710131736096299798168852925540549342330775279877006784354801422249722573783561685179618816480037695005515426162362431072245638324744480");

	        const pExponent = module.alloc(utils.bigInt2BytesLE( exponent, 352 ));

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(ftmPrefix + "_exp", c.getLocal("x"), c.i32_const(pExponent), c.i32_const(352), c.getLocal("r")),
	        );
	    }




	    const pPreP = module.alloc(prePSize);
	    const pPreQ = module.alloc(preQSize);

	    function buildPairingEquation(nPairings) {

	        const f = module.addFunction(prefix+ "_pairingEq"+nPairings);
	        for (let i=0; i<nPairings; i++) {
	            f.addParam("p_"+i, "i32");
	            f.addParam("q_"+i, "i32");
	        }
	        f.addParam("c", "i32");
	        f.setReturnType("i32");


	        const c = f.getCodeBuilder();

	        const resT = c.i32_const(module.alloc(ftsize));
	        const auxT = c.i32_const(module.alloc(ftsize));

	        f.addCode(c.call(ftmPrefix + "_one", resT ));

	        for (let i=0; i<nPairings; i++) {

	            f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p_"+i), c.i32_const(pPreP) ));
	            f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q_"+i), c.i32_const(pPreQ) ));
	            f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), auxT ));

	            f.addCode(c.call(ftmPrefix + "_mul", resT, auxT, resT ));
	        }

	        f.addCode(c.call(prefix + "_finalExponentiation", resT, resT ));

	        f.addCode(c.call(ftmPrefix + "_eq", resT, c.getLocal("c")));
	    }


	    function buildPairing() {

	        const f = module.addFunction(prefix+ "_pairing");
	        f.addParam("p", "i32");
	        f.addParam("q", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const resT = c.i32_const(module.alloc(ftsize));

	        f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p"), c.i32_const(pPreP) ));
	        f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q"), c.i32_const(pPreQ) ));
	        f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), resT ));
	        f.addCode(c.call(prefix + "_finalExponentiation", resT, c.getLocal("r") ));
	    }


	    buildPrepAddStep();
	    buildPrepDoubleStep();

	    buildPrepareG1();
	    buildPrepareG2();

	    buildMulBy024();
	    buildMulBy024Old();
	    buildMillerLoop();


	    for (let i=0; i<10; i++) {
	        buildFrobeniusMap(i);
	        module.exportFunction(prefix + "__frobeniusMap"+i);
	    }

	    buildFinalExponentiationOld();
	    buildFinalExponentiation();

	    for (let i=1; i<=5; i++) {
	        buildPairingEquation(i);
	        module.exportFunction(prefix + "_pairingEq"+i);
	    }

	    buildPairing();

	    module.exportFunction(prefix + "_pairing");

	    module.exportFunction(prefix + "_prepareG1");
	    module.exportFunction(prefix + "_prepareG2");
	    module.exportFunction(prefix + "_millerLoop");
	    module.exportFunction(prefix + "_finalExponentiation");
	    module.exportFunction(prefix + "_finalExponentiationOld");
	    module.exportFunction(prefix + "__mulBy024");
	    module.exportFunction(prefix + "__mulBy024Old");
	    module.exportFunction(prefix + "__cyclotomicSquare");
	    module.exportFunction(prefix + "__cyclotomicExp_w0");

	    // console.log(module.functionIdxByName);

	};
	return build_bn128;
}

var build_bls12381;
var hasRequiredBuild_bls12381;

function requireBuild_bls12381 () {
	if (hasRequiredBuild_bls12381) return build_bls12381;
	hasRequiredBuild_bls12381 = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const utils = /*@__PURE__*/ requireUtils$1();

	const buildF1m =/*@__PURE__*/ requireBuild_f1m();
	const buildF1 =/*@__PURE__*/ requireBuild_f1();
	const buildF2m =/*@__PURE__*/ requireBuild_f2m();
	const buildF3m =/*@__PURE__*/ requireBuild_f3m();
	const buildCurve =/*@__PURE__*/ requireBuild_curve_jacobian_a0();
	const buildFFT = /*@__PURE__*/ requireBuild_fft();
	const buildPol = /*@__PURE__*/ requireBuild_pol();
	const buildQAP = /*@__PURE__*/ requireBuild_qap();
	const buildApplyKey = /*@__PURE__*/ requireBuild_applykey();

	// Definition here: https://electriccoin.co/blog/new-snark-curve/

	build_bls12381 = function buildBLS12381(module, _prefix) {

	    const prefix = _prefix || "bls12381";

	    if (module.modules[prefix]) return prefix;  // already builded

	    const q = bigInt("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
	    const r = bigInt("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);

	    const n64q = Math.floor((q.minus(1).bitLength() - 1)/64) +1;
	    const n8q = n64q*8;
	    const f1size = n8q;
	    const f2size = f1size * 2;
	    const ftsize = f1size * 12;

	    const n64r = Math.floor((r.minus(1).bitLength() - 1)/64) +1;
	    const n8r = n64r*8;
	    const frsize = n8r;


	    const pr = module.alloc(utils.bigInt2BytesLE( r, frsize ));

	    const f1mPrefix = buildF1m(module, q, "f1m", "intq");
	    buildF1(module, r, "fr", "frm", "intr");
	    const pG1b = module.alloc(utils.bigInt2BytesLE( toMontgomery(bigInt(4)), f1size ));
	    const g1mPrefix = buildCurve(module, "g1m", "f1m", pG1b);

	    buildFFT(module, "frm", "frm", "frm", "frm_mul");

	    buildPol(module, "pol", "frm");
	    buildQAP(module, "qap", "frm");

	    const f2mPrefix = buildF2m(module, "f1m_neg", "f2m", "f1m");
	    const pG2b = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(bigInt("4")), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(bigInt("4")), f1size )
	    ]);
	    const g2mPrefix = buildCurve(module, "g2m", "f2m", pG2b);


	    function buildGTimesFr(fnName, opMul) {
	        const f = module.addFunction(fnName);
	        f.addParam("pG", "i32");
	        f.addParam("pFr", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const AUX = c.i32_const(module.alloc(n8r));

	        f.addCode(
	            c.call("frm_fromMontgomery", c.getLocal("pFr"), AUX),
	            c.call(
	                opMul,
	                c.getLocal("pG"),
	                AUX,
	                c.i32_const(n8r),
	                c.getLocal("pr")
	            )
	        );

	        module.exportFunction(fnName);
	    }
	    buildGTimesFr("g1m_timesFr", "g1m_timesScalar");
	    buildFFT(module, "g1m", "g1m", "frm", "g1m_timesFr");

	    buildGTimesFr("g2m_timesFr", "g2m_timesScalar");
	    buildFFT(module, "g2m", "g2m", "frm", "g2m_timesFr");

	    buildGTimesFr("g1m_timesFrAffine", "g1m_timesScalarAffine");
	    buildGTimesFr("g2m_timesFrAffine", "g2m_timesScalarAffine");

	    buildApplyKey(module, "frm_batchApplyKey", "fmr", "frm", n8r, n8r, n8r, "frm_mul");
	    buildApplyKey(module, "g1m_batchApplyKey", "g1m", "frm", n8q*3, n8q*3, n8r, "g1m_timesFr");
	    buildApplyKey(module, "g1m_batchApplyKeyMixed", "g1m", "frm", n8q*2, n8q*3, n8r, "g1m_timesFrAffine");
	    buildApplyKey(module, "g2m_batchApplyKey", "g2m", "frm", n8q*2*3, n8q*3*2, n8r, "g2m_timesFr");
	    buildApplyKey(module, "g2m_batchApplyKeyMixed", "g2m", "frm", n8q*2*2, n8q*3*2, n8r, "g2m_timesFrAffine");


	    function toMontgomery(a) {
	        return bigInt(a).times( bigInt.one.shiftLeft(f1size*8)).mod(q);
	    }

	    const G1gen = [
	        bigInt("3685416753713387016781088315183077757961620795782546409894578378688607592378376318836054947676345821548104185464507"),
	        bigInt("1339506544944476473020471379941921221584933875938349620426543736416511423956333506472724655353366534992391756441569"),
	        bigInt.one
	    ];

	    const pG1gen = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1gen[2]), f1size ),
	        ]
	    );

	    const G1zero = [
	        bigInt.zero,
	        bigInt.one,
	        bigInt.zero
	    ];

	    const pG1zero = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G1zero[2]), f1size )
	        ]
	    );

	    const G2gen = [
	        [
	            bigInt("352701069587466618187139116011060144890029952792775240219908644239793785735715026873347600343865175952761926303160"),
	            bigInt("3059144344244213709971259814753781636986470325476647558659373206291635324768958432433509563104347017837885763365758"),
	        ],[
	            bigInt("1985150602287291935568054521177171638300868978215655730859378665066344726373823718423869104263333984641494340347905"),
	            bigInt("927553665492332455747201965776037880757740193453592970025027978793976877002675564980949289727957565575433344219582"),
	        ],[
	            bigInt.one,
	            bigInt.zero,
	        ]
	    ];

	    const pG2gen = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][1]), f1size ),
	        ]
	    );

	    const G2zero = [
	        [
	            bigInt.zero,
	            bigInt.zero,
	        ],[
	            bigInt.one,
	            bigInt.zero,
	        ],[
	            bigInt.zero,
	            bigInt.zero,
	        ]
	    ];

	    const pG2zero = module.alloc(
	        [
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][1]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][0]), f1size ),
	            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][1]), f1size ),
	        ]
	    );

	    const pOneT = module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
	    ]);

	    module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(  bigInt(2).modInv(q)), f1size ),
	        ...utils.bigInt2BytesLE( bigInt(0), f1size )
	    ]);

	    const pBls12381Twist =  module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
	    ]);

	    module.alloc([
	        ...utils.bigInt2BytesLE( toMontgomery("4"), f1size ),
	        ...utils.bigInt2BytesLE( toMontgomery("4"), f1size ),
	    ]);

	    function build_mulNR2() {
	        const f = module.addFunction(f2mPrefix + "_mulNR");
	        f.addParam("x", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const x0c = c.i32_const(module.alloc(f1size));
	        const x0 = c.getLocal("x");
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1size));
	        const r0 = c.getLocal("pr");
	        const r1 = c.i32_add(c.getLocal("pr"), c.i32_const(f1size));

	        f.addCode(
	            c.call(f1mPrefix+"_copy", x0, x0c),
	            c.call(f1mPrefix+"_sub", x0, x1, r0),
	            c.call(f1mPrefix+"_add", x0c, x1, r1),
	        );
	    }
	    build_mulNR2();

	    const f6mPrefix = buildF3m(module, f2mPrefix+"_mulNR", "f6m", "f2m");

	    function build_mulNR6() {
	        const f = module.addFunction(f6mPrefix + "_mulNR");
	        f.addParam("x", "i32");
	        f.addParam("pr", "i32");

	        const c = f.getCodeBuilder();

	        const c0copy = c.i32_const(module.alloc(f1size*2));

	        f.addCode(
	            c.call(
	                f2mPrefix + "_copy",
	                c.getLocal("x"),
	                c0copy
	            ),
	            c.call(
	                f2mPrefix + "_mulNR",
	                c.i32_add(c.getLocal("x"), c.i32_const(n8q*4)),
	                c.getLocal("pr")
	            ),
	            c.call(
	                f2mPrefix + "_copy",
	                c.i32_add(c.getLocal("x"), c.i32_const(n8q*2)),
	                c.i32_add(c.getLocal("pr"), c.i32_const(n8q*4)),
	            ),
	            c.call(
	                f2mPrefix + "_copy",
	                c0copy,
	                c.i32_add(c.getLocal("pr"), c.i32_const(n8q*2)),
	            ),
	        );
	    }
	    build_mulNR6();

	    const ftmPrefix = buildF2m(module, f6mPrefix+"_mulNR", "ftm", f6mPrefix);

	    const ateLoopCount = bigInt("d201000000010000", 16);
	    const ateLoopBitBytes = bits(ateLoopCount);
	    const pAteLoopBitBytes = module.alloc(ateLoopBitBytes);

	    const ateCoefSize = 3 * f2size;
	    const ateNDblCoefs = ateLoopBitBytes.length-1;
	    const ateNAddCoefs = ateLoopBitBytes.reduce((acc, b) =>  acc + ( b!=0 ? 1 : 0)   ,0);
	    const ateNCoefs = ateNAddCoefs + ateNDblCoefs + 1;
	    const prePSize = 3*2*n8q;
	    const preQSize = 3*n8q*2 + ateNCoefs*ateCoefSize;
	    const finalExpIsNegative = true;

	    const finalExpZ = bigInt("15132376222941642752");


	    module.modules[prefix] = {
	        n64q: n64q,
	        n64r: n64r,
	        n8q: n8q,
	        n8r: n8r,
	        pG1gen: pG1gen,
	        pG1zero: pG1zero,
	        pG1b: pG1b,
	        pG2gen: pG2gen,
	        pG2zero: pG2zero,
	        pG2b: pG2b,
	        pq: module.modules["f1m"].pq,
	        pr: pr,
	        pOneT: pOneT,
	        r: r,
	        q: q,
	        prePSize: prePSize,
	        preQSize: preQSize
	    };


	    function naf(n) {
	        let E = n;
	        const res = [];
	        while (E.gt(bigInt.zero)) {
	            if (E.isOdd()) {
	                const z = 2 - E.mod(4).toJSNumber();
	                res.push( z );
	                E = E.minus(z);
	            } else {
	                res.push( 0 );
	            }
	            E = E.shiftRight(1);
	        }
	        return res;
	    }

	    function bits(n) {
	        let E = n;
	        const res = [];
	        while (E.gt(bigInt.zero)) {
	            if (E.isOdd()) {
	                res.push( 1 );
	            } else {
	                res.push( 0 );
	            }
	            E = E.shiftRight(1);
	        }
	        return res;
	    }

	    function buildPrepareG1() {
	        const f = module.addFunction(prefix+ "_prepareG1");
	        f.addParam("pP", "i32");
	        f.addParam("ppreP", "i32");

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(g1mPrefix + "_normalize", c.getLocal("pP"), c.getLocal("ppreP")),  // TODO Remove if already in affine
	        );
	    }



	    function buildPrepDoubleStep() {
	        const f = module.addFunction(prefix+ "_prepDblStep");
	        f.addParam("R", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const Rx  = c.getLocal("R");
	        const Ry  = c.i32_add(c.getLocal("R"), c.i32_const(2*n8q));
	        const Rz  = c.i32_add(c.getLocal("R"), c.i32_const(4*n8q));

	        const t0  = c.getLocal("r");
	        const t3  = c.i32_add(c.getLocal("r"), c.i32_const(2*n8q));
	        const t6  = c.i32_add(c.getLocal("r"), c.i32_const(4*n8q));


	        const zsquared = c.i32_const(module.alloc(f2size));
	        const t1 = c.i32_const(module.alloc(f2size));
	        const t2 = c.i32_const(module.alloc(f2size));
	        const t4 = c.i32_const(module.alloc(f2size));
	        const t5 = c.i32_const(module.alloc(f2size));

	        f.addCode(

	            // tmp0 = r.x.square();
	            c.call(f2mPrefix + "_square", Rx, t0),

	            // tmp1 = r.y.square();
	            c.call(f2mPrefix + "_square", Ry, t1),

	            // tmp2 = tmp1.square();
	            c.call(f2mPrefix + "_square", t1, t2),

	            // tmp3 = (tmp1 + r.x).square() - tmp0 - tmp2;
	            c.call(f2mPrefix + "_add", t1, Rx, t3),
	            c.call(f2mPrefix + "_square", t3, t3),
	            c.call(f2mPrefix + "_sub", t3, t0, t3),
	            c.call(f2mPrefix + "_sub", t3, t2, t3),

	            // tmp3 = tmp3 + tmp3;
	            c.call(f2mPrefix + "_add", t3, t3, t3),

	            // tmp4 = tmp0 + tmp0 + tmp0;
	            c.call(f2mPrefix + "_add", t0, t0, t4),
	            c.call(f2mPrefix + "_add", t4, t0, t4),

	            // tmp6 = r.x + tmp4;
	            c.call(f2mPrefix + "_add", Rx, t4, t6),

	            // tmp5 = tmp4.square();
	            c.call(f2mPrefix + "_square", t4, t5),

	            // zsquared = r.z.square();
	            c.call(f2mPrefix + "_square", Rz, zsquared),

	            // r.x = tmp5 - tmp3 - tmp3;
	            c.call(f2mPrefix + "_sub", t5, t3, Rx),
	            c.call(f2mPrefix + "_sub", Rx, t3, Rx),

	            // r.z = (r.z + r.y).square() - tmp1 - zsquared;
	            c.call(f2mPrefix + "_add", Rz, Ry, Rz),
	            c.call(f2mPrefix + "_square", Rz, Rz),
	            c.call(f2mPrefix + "_sub", Rz, t1, Rz),
	            c.call(f2mPrefix + "_sub", Rz, zsquared, Rz),

	            // r.y = (tmp3 - r.x) * tmp4;
	            c.call(f2mPrefix + "_sub", t3, Rx, Ry),
	            c.call(f2mPrefix + "_mul", Ry, t4, Ry),

	            // tmp2 = tmp2 + tmp2;
	            c.call(f2mPrefix + "_add", t2, t2, t2),

	            // tmp2 = tmp2 + tmp2;
	            c.call(f2mPrefix + "_add", t2, t2, t2),

	            // tmp2 = tmp2 + tmp2;
	            c.call(f2mPrefix + "_add", t2, t2, t2),

	            // r.y -= tmp2;
	            c.call(f2mPrefix + "_sub", Ry, t2, Ry),

	            // tmp3 = tmp4 * zsquared;
	            c.call(f2mPrefix + "_mul", t4, zsquared, t3),

	            // tmp3 = tmp3 + tmp3;
	            c.call(f2mPrefix + "_add", t3, t3, t3),

	            // tmp3 = -tmp3;
	            c.call(f2mPrefix + "_neg", t3, t3),

	            // tmp6 = tmp6.square() - tmp0 - tmp5;
	            c.call(f2mPrefix + "_square", t6, t6),
	            c.call(f2mPrefix + "_sub", t6, t0, t6),
	            c.call(f2mPrefix + "_sub", t6, t5, t6),

	            // tmp1 = tmp1 + tmp1;
	            c.call(f2mPrefix + "_add", t1, t1, t1),

	            // tmp1 = tmp1 + tmp1;
	            c.call(f2mPrefix + "_add", t1, t1, t1),

	            // tmp6 = tmp6 - tmp1;
	            c.call(f2mPrefix + "_sub", t6, t1, t6),

	            // tmp0 = r.z * zsquared;
	            c.call(f2mPrefix + "_mul", Rz, zsquared, t0),

	            // tmp0 = tmp0 + tmp0;
	            c.call(f2mPrefix + "_add", t0, t0, t0),

	        );
	    }

	    function buildPrepAddStep() {
	        const f = module.addFunction(prefix+ "_prepAddStep");
	        f.addParam("R", "i32");
	        f.addParam("Q", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const Rx  = c.getLocal("R");
	        const Ry  = c.i32_add(c.getLocal("R"), c.i32_const(2*n8q));
	        const Rz  = c.i32_add(c.getLocal("R"), c.i32_const(4*n8q));

	        const Qx  = c.getLocal("Q");
	        const Qy  = c.i32_add(c.getLocal("Q"), c.i32_const(2*n8q));

	        const t10  = c.getLocal("r");
	        const t1  = c.i32_add(c.getLocal("r"), c.i32_const(2*n8q));
	        const t9  = c.i32_add(c.getLocal("r"), c.i32_const(4*n8q));

	        const zsquared = c.i32_const(module.alloc(f2size));
	        const ysquared = c.i32_const(module.alloc(f2size));
	        const ztsquared = c.i32_const(module.alloc(f2size));
	        const t0 = c.i32_const(module.alloc(f2size));
	        const t2 = c.i32_const(module.alloc(f2size));
	        const t3 = c.i32_const(module.alloc(f2size));
	        const t4 = c.i32_const(module.alloc(f2size));
	        const t5 = c.i32_const(module.alloc(f2size));
	        const t6 = c.i32_const(module.alloc(f2size));
	        const t7 = c.i32_const(module.alloc(f2size));
	        const t8 = c.i32_const(module.alloc(f2size));

	        f.addCode(

	            // zsquared = r.z.square();
	            c.call(f2mPrefix + "_square", Rz, zsquared),

	            // ysquared = q.y.square();
	            c.call(f2mPrefix + "_square", Qy, ysquared),

	            // t0 = zsquared * q.x;
	            c.call(f2mPrefix + "_mul", zsquared, Qx, t0),

	            // t1 = ((q.y + r.z).square() - ysquared - zsquared) * zsquared;
	            c.call(f2mPrefix + "_add", Qy, Rz, t1),
	            c.call(f2mPrefix + "_square", t1, t1),
	            c.call(f2mPrefix + "_sub", t1, ysquared, t1),
	            c.call(f2mPrefix + "_sub", t1, zsquared, t1),
	            c.call(f2mPrefix + "_mul", t1, zsquared, t1),

	            // t2 = t0 - r.x;
	            c.call(f2mPrefix + "_sub", t0, Rx, t2),

	            // t3 = t2.square();
	            c.call(f2mPrefix + "_square", t2, t3),

	            // t4 = t3 + t3;
	            c.call(f2mPrefix + "_add", t3, t3, t4),

	            // t4 = t4 + t4;
	            c.call(f2mPrefix + "_add", t4, t4, t4),

	            // t5 = t4 * t2;
	            c.call(f2mPrefix + "_mul", t4, t2, t5),

	            // t6 = t1 - r.y - r.y;
	            c.call(f2mPrefix + "_sub", t1, Ry, t6),
	            c.call(f2mPrefix + "_sub", t6, Ry, t6),

	            // t9 = t6 * q.x;
	            c.call(f2mPrefix + "_mul", t6, Qx, t9),

	            // t7 = t4 * r.x;
	            c.call(f2mPrefix + "_mul", t4, Rx, t7),

	            // r.x = t6.square() - t5 - t7 - t7;
	            c.call(f2mPrefix + "_square", t6, Rx),
	            c.call(f2mPrefix + "_sub", Rx, t5, Rx),
	            c.call(f2mPrefix + "_sub", Rx, t7, Rx),
	            c.call(f2mPrefix + "_sub", Rx, t7, Rx),

	            // r.z = (r.z + t2).square() - zsquared - t3;
	            c.call(f2mPrefix + "_add", Rz, t2, Rz),
	            c.call(f2mPrefix + "_square", Rz, Rz),
	            c.call(f2mPrefix + "_sub", Rz, zsquared, Rz),
	            c.call(f2mPrefix + "_sub", Rz, t3, Rz),

	            // t10 = q.y + r.z;
	            c.call(f2mPrefix + "_add", Qy, Rz, t10),

	            // t8 = (t7 - r.x) * t6;
	            c.call(f2mPrefix + "_sub", t7, Rx, t8),
	            c.call(f2mPrefix + "_mul", t8, t6, t8),

	            // t0 = r.y * t5;
	            c.call(f2mPrefix + "_mul", Ry, t5, t0),

	            // t0 = t0 + t0;
	            c.call(f2mPrefix + "_add", t0, t0, t0),

	            // r.y = t8 - t0;
	            c.call(f2mPrefix + "_sub", t8, t0, Ry),

	            // t10 = t10.square() - ysquared;
	            c.call(f2mPrefix + "_square", t10, t10),
	            c.call(f2mPrefix + "_sub", t10, ysquared, t10),

	            // ztsquared = r.z.square();
	            c.call(f2mPrefix + "_square", Rz, ztsquared),

	            // t10 = t10 - ztsquared;
	            c.call(f2mPrefix + "_sub", t10, ztsquared, t10),

	            // t9 = t9 + t9 - t10;
	            c.call(f2mPrefix + "_add", t9, t9, t9),
	            c.call(f2mPrefix + "_sub", t9, t10, t9),

	            // t10 = r.z + r.z;
	            c.call(f2mPrefix + "_add", Rz, Rz, t10),

	            // t6 = -t6;
	            c.call(f2mPrefix + "_neg", t6, t6),

	            // t1 = t6 + t6;
	            c.call(f2mPrefix + "_add", t6, t6, t1),
	        );
	    }


	    function buildPrepareG2() {
	        const f = module.addFunction(prefix+ "_prepareG2");
	        f.addParam("pQ", "i32");
	        f.addParam("ppreQ", "i32");
	        f.addLocal("pCoef", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();


	        const Q = c.getLocal("pQ");

	        const pR = module.alloc(f2size*3);
	        const R = c.i32_const(pR);

	        const base = c.getLocal("ppreQ");

	        f.addCode(
	            c.call(g2mPrefix + "_normalize", Q, base),
	            c.if(
	                c.call(g2mPrefix + "_isZero", base),
	                c.ret([])
	            ),
	            c.call(g2mPrefix + "_copy", base, R),
	            c.setLocal("pCoef", c.i32_add(c.getLocal("ppreQ"), c.i32_const(f2size*3))),
	        );

	        f.addCode(
	            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
	            c.block(c.loop(

	                c.call(prefix + "_prepDblStep", R, c.getLocal("pCoef")),
	                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	                c.if(
	                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
	                    [
	                        ...c.call(prefix + "_prepAddStep", R, base, c.getLocal("pCoef")),
	                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
	                    ]
	                ),
	                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );
	    }


	    function buildF6Mul1() {
	        const f = module.addFunction(f6mPrefix+ "_mul1");
	        f.addParam("pA", "i32");    // F6
	        f.addParam("pC1", "i32");   // F2
	        f.addParam("pR", "i32");    // F6

	        const c = f.getCodeBuilder();

	        const A_c0 = c.getLocal("pA");
	        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*2));
	        const A_c2 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*4));

	        const c1  = c.getLocal("pC1");

	        const t1 = c.getLocal("pR");
	        const t2 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*2));
	        const b_b = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*4));

	        const Ac0_Ac1 = c.i32_const(module.alloc(f1size*2));
	        const Ac1_Ac2 = c.i32_const(module.alloc(f1size*2));

	        f.addCode(

	            c.call(f2mPrefix + "_add", A_c0, A_c1, Ac0_Ac1),
	            c.call(f2mPrefix + "_add", A_c1, A_c2, Ac1_Ac2),

	            // let b_b = self.c1 * c1;
	            c.call(f2mPrefix + "_mul", A_c1, c1, b_b),

	            // let t1 = (self.c1 + self.c2) * c1 - b_b;
	            c.call(f2mPrefix + "_mul", Ac1_Ac2, c1, t1),
	            c.call(f2mPrefix + "_sub", t1, b_b, t1),

	            // let t1 = t1.mul_by_nonresidue();
	            c.call(f2mPrefix + "_mulNR", t1, t1),

	            // let t2 = (self.c0 + self.c1) * c1 - b_b;
	            c.call(f2mPrefix + "_mul", Ac0_Ac1, c1, t2),
	            c.call(f2mPrefix + "_sub", t2, b_b, t2),
	        );
	    }
	    buildF6Mul1();

	    function buildF6Mul01() {
	        const f = module.addFunction(f6mPrefix+ "_mul01");
	        f.addParam("pA", "i32");    // F6
	        f.addParam("pC0", "i32");   // F2
	        f.addParam("pC1", "i32");   // F2
	        f.addParam("pR", "i32");    // F6

	        const c = f.getCodeBuilder();

	        const A_c0 = c.getLocal("pA");
	        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*2));
	        const A_c2 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*4));

	        const c0  = c.getLocal("pC0");
	        const c1  = c.getLocal("pC1");

	        const t1 = c.getLocal("pR");
	        const t2 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*2));
	        const t3 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*4));

	        const a_a = c.i32_const(module.alloc(f1size*2));
	        const b_b = c.i32_const(module.alloc(f1size*2));
	        const Ac0_Ac1 = c.i32_const(module.alloc(f1size*2));
	        const Ac0_Ac2 = c.i32_const(module.alloc(f1size*2));

	        f.addCode(
	            // let a_a = self.c0 * c0;
	            c.call(f2mPrefix + "_mul", A_c0, c0, a_a),

	            // let b_b = self.c1 * c1;
	            c.call(f2mPrefix + "_mul", A_c1, c1, b_b),


	            c.call(f2mPrefix + "_add", A_c0, A_c1, Ac0_Ac1),
	            c.call(f2mPrefix + "_add", A_c0, A_c2, Ac0_Ac2),

	            // let t1 = (self.c1 + self.c2) * c1 - b_b;
	            c.call(f2mPrefix + "_add", A_c1, A_c2, t1),
	            c.call(f2mPrefix + "_mul", t1, c1, t1),
	            c.call(f2mPrefix + "_sub", t1, b_b, t1),

	            // let t1 = t1.mul_by_nonresidue() + a_a;
	            c.call(f2mPrefix + "_mulNR", t1, t1),
	            c.call(f2mPrefix + "_add", t1, a_a, t1),

	            // let t2 = (c0 + c1) * (self.c0 + self.c1) - a_a - b_b;
	            c.call(f2mPrefix + "_add", c0, c1, t2),
	            c.call(f2mPrefix + "_mul", t2, Ac0_Ac1, t2),
	            c.call(f2mPrefix + "_sub", t2, a_a, t2),
	            c.call(f2mPrefix + "_sub", t2, b_b, t2),

	            // let t3 = (self.c0 + self.c2) * c0 - a_a + b_b;
	            c.call(f2mPrefix + "_mul", Ac0_Ac2, c0, t3),
	            c.call(f2mPrefix + "_sub", t3, a_a, t3),
	            c.call(f2mPrefix + "_add", t3, b_b, t3),


	        );
	    }
	    buildF6Mul01();


	    function buildF12Mul014() {

	        const f = module.addFunction(ftmPrefix+ "_mul014");
	        f.addParam("pA", "i32");    // F12
	        f.addParam("pC0", "i32");   // F2
	        f.addParam("pC1", "i32");   // F2
	        f.addParam("pC4", "i32");   // F2
	        f.addParam("pR", "i32");    // F12

	        const c = f.getCodeBuilder();


	        const A_c0 = c.getLocal("pA");
	        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*6));

	        const c0  = c.getLocal("pC0");
	        const c1  = c.getLocal("pC1");
	        const c4  = c.getLocal("pC4");

	        const aa = c.i32_const(module.alloc(f1size*6));
	        const bb = c.i32_const(module.alloc(f1size*6));
	        const o = c.i32_const(module.alloc(f1size*2));

	        const R_c0 = c.getLocal("pR");
	        const R_c1 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*6));

	        f.addCode(
	            // let aa = self.c0.mul_by_01(c0, c1);
	            c.call(f6mPrefix + "_mul01", A_c0, c0, c1, aa),

	            // let bb = self.c1.mul_by_1(c4);
	            c.call(f6mPrefix + "_mul1", A_c1, c4, bb),

	            // let o = c1 + c4;
	            c.call(f2mPrefix + "_add", c1, c4, o),

	            // let c1 = self.c1 + self.c0;
	            c.call(f6mPrefix + "_add", A_c1, A_c0, R_c1),

	            // let c1 = c1.mul_by_01(c0, &o);
	            c.call(f6mPrefix + "_mul01", R_c1, c0, o, R_c1),

	            // let c1 = c1 - aa - bb;
	            c.call(f6mPrefix + "_sub", R_c1, aa, R_c1),
	            c.call(f6mPrefix + "_sub", R_c1, bb, R_c1),

	            // let c0 = bb;
	            c.call(f6mPrefix + "_copy", bb, R_c0),

	            // let c0 = c0.mul_by_nonresidue();
	            c.call(f6mPrefix + "_mulNR", R_c0, R_c0),

	            // let c0 = c0 + aa;
	            c.call(f6mPrefix + "_add", R_c0, aa, R_c0),
	        );
	    }
	    buildF12Mul014();


	    function buildELL() {
	        const f = module.addFunction(prefix+ "_ell");
	        f.addParam("pP", "i32");
	        f.addParam("pCoefs", "i32");
	        f.addParam("pF", "i32");

	        const c = f.getCodeBuilder();

	        const Px  = c.getLocal("pP");
	        const Py  = c.i32_add(c.getLocal("pP"), c.i32_const(n8q));

	        const F  = c.getLocal("pF");

	        const coef0_0  = c.getLocal("pCoefs");
	        const coef0_1  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size));
	        const coef1_0  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*2));
	        const coef1_1  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*3));
	        const coef2  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*4));

	        const pc0 = module.alloc(f1size*2);
	        const c0  = c.i32_const(pc0);
	        const c0_c0 = c.i32_const(pc0);
	        const c0_c1 = c.i32_const(pc0+f1size);

	        const pc1 = module.alloc(f1size*2);
	        const c1  = c.i32_const(pc1);
	        const c1_c0 = c.i32_const(pc1);
	        const c1_c1 = c.i32_const(pc1+f1size);
	        f.addCode(
	            //     let mut c0 = coeffs.0;
	            //     let mut c1 = coeffs.1;
	            //
	            //    c0.c0 *= p.y;
	            //    c0.c1 *= p.y;
	            //
	            //    c1.c0 *= p.x;
	            //    c1.c1 *= p.x;
	            //
	            //     f.mul_by_014(&coeffs.2, &c1, &c0)

	            c.call(f1mPrefix + "_mul", coef0_0, Py, c0_c0),
	            c.call(f1mPrefix + "_mul", coef0_1, Py, c0_c1),
	            c.call(f1mPrefix + "_mul", coef1_0, Px, c1_c0),
	            c.call(f1mPrefix + "_mul", coef1_1, Px, c1_c1),

	            c.call(ftmPrefix + "_mul014", F, coef2, c1, c0, F),

	        );

	    }
	    buildELL();

	    function buildMillerLoop() {
	        const f = module.addFunction(prefix+ "_millerLoop");
	        f.addParam("ppreP", "i32");
	        f.addParam("ppreQ", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("pCoef", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const preP = c.getLocal("ppreP");
	        c.getLocal("ppreQ");

	        const coefs  = c.getLocal("pCoef");

	        const F = c.getLocal("r");


	        f.addCode(
	            c.call(ftmPrefix + "_one", F),

	            c.if(
	                c.call(g1mPrefix + "_isZero", preP),
	                c.ret([])
	            ),
	            c.if(
	                c.call(g1mPrefix + "_isZero", c.getLocal("ppreQ")),
	                c.ret([])
	            ),
	            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),

	            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
	            c.block(c.loop(


	                c.call(prefix + "_ell", preP, coefs,  F),
	                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

	                c.if(
	                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
	                    [
	                        ...c.call(prefix + "_ell", preP, coefs,  F),
	                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
	                    ]
	                ),
	                c.call(ftmPrefix + "_square", F, F),

	                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.i32_const(1) )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            )),
	            c.call(prefix + "_ell", preP, coefs,  F),

	        );


	        {
	            f.addCode(
	                c.call(ftmPrefix + "_conjugate", F, F),
	            );
	        }
	    }


	    function buildFrobeniusMap(n) {
	        const F12 = [
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("3850754370037169011952147076051364057158807420970682438676050522613628423219637725072182697113062777891589506424760"), bigInt("151655185184498381465642749684540099398075398968325446656007613510403227271200139370504932015952886146304766135027")],
	                [bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620351"), bigInt("0")],
	                [bigInt("2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530"), bigInt("1028732146235106349975324479215795277384839936929757896155643118032610843298655225875571310552543014690878354869257")],
	                [bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350"), bigInt("0")],
	                [bigInt("3125332594171059424908108096204648978570118281977575435832422631601824034463382777937621250592425535493320683825557"), bigInt("877076961050607968509681729531255177986764537961432449499635504522207616027455086505066378536590128544573588734230")],
	                [bigInt("4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559786"), bigInt("0")],
	                [bigInt("151655185184498381465642749684540099398075398968325446656007613510403227271200139370504932015952886146304766135027"), bigInt("3850754370037169011952147076051364057158807420970682438676050522613628423219637725072182697113062777891589506424760")],
	                [bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436"), bigInt("0")],
	                [bigInt("1028732146235106349975324479215795277384839936929757896155643118032610843298655225875571310552543014690878354869257"), bigInt("2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530")],
	                [bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939437"), bigInt("0")],
	                [bigInt("877076961050607968509681729531255177986764537961432449499635504522207616027455086505066378536590128544573588734230"), bigInt("3125332594171059424908108096204648978570118281977575435832422631601824034463382777937621250592425535493320683825557")],
	            ]
	        ];

	        const F6 = [
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	                [bigInt("1"), bigInt("0")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("0"), bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436")],
	                [bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350"), bigInt("0")],
	                [bigInt("0"), bigInt("1")],
	                [bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436"), bigInt("0")],
	                [bigInt("0"), bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350")],
	            ],
	            [
	                [bigInt("1"), bigInt("0")],
	                [bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939437"), bigInt("0")],
	                [bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436"), bigInt("0")],
	                [bigInt("4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559786"), bigInt("0")],
	                [bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350"), bigInt("0")],
	                [bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620351"), bigInt("0")],
	            ]
	        ];

	        const f = module.addFunction(ftmPrefix + "_frobeniusMap"+n);
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        for (let i=0; i<6; i++) {
	            const X = (i==0) ? c.getLocal("x") : c.i32_add(c.getLocal("x"), c.i32_const(i*f2size));
	            const Xc0 = X;
	            const Xc1 = c.i32_add(c.getLocal("x"), c.i32_const(i*f2size + f1size));
	            const R = (i==0) ? c.getLocal("r") : c.i32_add(c.getLocal("r"), c.i32_const(i*f2size));
	            const Rc0 = R;
	            const Rc1 = c.i32_add(c.getLocal("r"), c.i32_const(i*f2size + f1size));
	            const coef = mul2(F12[Math.floor(i/3)][n%12] , F6[i%3][n%6]);
	            const pCoef = module.alloc([
	                ...utils.bigInt2BytesLE(toMontgomery(coef[0]), n8q),
	                ...utils.bigInt2BytesLE(toMontgomery(coef[1]), n8q),
	            ]);
	            if (n%2 == 1) {
	                f.addCode(
	                    c.call(f1mPrefix + "_copy", Xc0, Rc0),
	                    c.call(f1mPrefix + "_neg", Xc1, Rc1),
	                    c.call(f2mPrefix + "_mul", R, c.i32_const(pCoef), R),
	                );
	            } else {
	                f.addCode(c.call(f2mPrefix + "_mul", X, c.i32_const(pCoef), R));
	            }
	        }

	        function mul2(a, b) {
	            const ac0 = bigInt(a[0]);
	            const ac1 = bigInt(a[1]);
	            const bc0 = bigInt(b[0]);
	            const bc1 = bigInt(b[1]);
	            const res = [
	                ac0.times(bc0).minus(  ac1.times(bc1)  ).mod(q),
	                ac0.times(bc1).add(  ac1.times(bc0)  ).mod(q),
	            ];
	            if (res[0].isNegative()) res[0] = res[0].add(q);
	            return res;
	        }

	    }


	    function buildCyclotomicSquare() {
	        const f = module.addFunction(prefix+ "__cyclotomicSquare");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const x0 = c.getLocal("x");
	        const x4 = c.i32_add(c.getLocal("x"), c.i32_const(f2size));
	        const x3 = c.i32_add(c.getLocal("x"), c.i32_const(2*f2size));
	        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(3*f2size));
	        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(4*f2size));
	        const x5 = c.i32_add(c.getLocal("x"), c.i32_const(5*f2size));

	        const r0 = c.getLocal("r");
	        const r4 = c.i32_add(c.getLocal("r"), c.i32_const(f2size));
	        const r3 = c.i32_add(c.getLocal("r"), c.i32_const(2*f2size));
	        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(3*f2size));
	        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(4*f2size));
	        const r5 = c.i32_add(c.getLocal("r"), c.i32_const(5*f2size));

	        const t0 = c.i32_const(module.alloc(f2size));
	        const t1 = c.i32_const(module.alloc(f2size));
	        const t2 = c.i32_const(module.alloc(f2size));
	        const t3 = c.i32_const(module.alloc(f2size));
	        const t4 = c.i32_const(module.alloc(f2size));
	        const t5 = c.i32_const(module.alloc(f2size));
	        const tmp = c.i32_const(module.alloc(f2size));
	        const AUX = c.i32_const(module.alloc(f2size));


	        f.addCode(

	//            c.call(ftmPrefix + "_square", x0, r0),

	            //    // t0 + t1*y = (z0 + z1*y)^2 = a^2
	            //    tmp = z0 * z1;
	            //    t0 = (z0 + z1) * (z0 + my_Fp6::non_residue * z1) - tmp - my_Fp6::non_residue * tmp;
	            //    t1 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x0, x1, tmp),
	            c.call(f2mPrefix + "_mulNR", x1, t0),
	            c.call(f2mPrefix + "_add", x0, t0, t0),
	            c.call(f2mPrefix + "_add", x0, x1, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t0, t0),
	            c.call(f2mPrefix + "_mulNR", tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t0, AUX, t0),
	            c.call(f2mPrefix + "_add", tmp, tmp, t1),

	            //  // t2 + t3*y = (z2 + z3*y)^2 = b^2
	            //  tmp = z2 * z3;
	            //  t2 = (z2 + z3) * (z2 + my_Fp6::non_residue * z3) - tmp - my_Fp6::non_residue * tmp;
	            //  t3 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x2, x3, tmp),
	            c.call(f2mPrefix + "_mulNR", x3, t2),
	            c.call(f2mPrefix + "_add", x2, t2, t2),
	            c.call(f2mPrefix + "_add", x2, x3, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t2, t2),
	            c.call(f2mPrefix + "_mulNR", tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t2, AUX, t2),
	            c.call(f2mPrefix + "_add", tmp, tmp, t3),

	            //  // t4 + t5*y = (z4 + z5*y)^2 = c^2
	            //  tmp = z4 * z5;
	            //  t4 = (z4 + z5) * (z4 + my_Fp6::non_residue * z5) - tmp - my_Fp6::non_residue * tmp;
	            //  t5 = tmp + tmp;
	            c.call(f2mPrefix + "_mul", x4, x5, tmp),
	            c.call(f2mPrefix + "_mulNR", x5, t4),
	            c.call(f2mPrefix + "_add", x4, t4, t4),
	            c.call(f2mPrefix + "_add", x4, x5, AUX),
	            c.call(f2mPrefix + "_mul", AUX, t4, t4),
	            c.call(f2mPrefix + "_mulNR", tmp, AUX),
	            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
	            c.call(f2mPrefix + "_sub", t4, AUX, t4),
	            c.call(f2mPrefix + "_add", tmp, tmp, t5),

	            // For A
	            // z0 = 3 * t0 - 2 * z0
	            c.call(f2mPrefix + "_sub", t0, x0, r0),
	            c.call(f2mPrefix + "_add", r0, r0, r0),
	            c.call(f2mPrefix + "_add", t0, r0, r0),
	            // z1 = 3 * t1 + 2 * z1
	            c.call(f2mPrefix + "_add", t1, x1, r1),
	            c.call(f2mPrefix + "_add", r1, r1, r1),
	            c.call(f2mPrefix + "_add", t1, r1, r1),

	            // For B
	            // z2 = 3 * (xi * t5) + 2 * z2
	            c.call(f2mPrefix + "_mul", t5, c.i32_const(pBls12381Twist), AUX),
	            c.call(f2mPrefix + "_add", AUX, x2, r2),
	            c.call(f2mPrefix + "_add", r2, r2, r2),
	            c.call(f2mPrefix + "_add", AUX, r2, r2),
	            // z3 = 3 * t4 - 2 * z3
	            c.call(f2mPrefix + "_sub", t4, x3, r3),
	            c.call(f2mPrefix + "_add", r3, r3, r3),
	            c.call(f2mPrefix + "_add", t4, r3, r3),

	            // For C
	            // z4 = 3 * t2 - 2 * z4
	            c.call(f2mPrefix + "_sub", t2, x4, r4),
	            c.call(f2mPrefix + "_add", r4, r4, r4),
	            c.call(f2mPrefix + "_add", t2, r4, r4),
	            // z5 = 3 * t3 + 2 * z5
	            c.call(f2mPrefix + "_add", t3, x5, r5),
	            c.call(f2mPrefix + "_add", r5, r5, r5),
	            c.call(f2mPrefix + "_add", t3, r5, r5),

	        );
	    }


	    function buildCyclotomicExp(exponent, isExpNegative, fnName) {
	        const exponentNafBytes = naf(exponent).map( (b) => (b==-1 ? 0xFF: b) );
	        const pExponentNafBytes = module.alloc(exponentNafBytes);
	        // const pExponent = module.alloc(utils.bigInt2BytesLE(exponent, n8));

	        const f = module.addFunction(prefix+ "__cyclotomicExp_"+fnName);
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");
	        f.addLocal("bit", "i32");
	        f.addLocal("i", "i32");

	        const c = f.getCodeBuilder();

	        const x = c.getLocal("x");

	        const res = c.getLocal("r");

	        const inverse = c.i32_const(module.alloc(ftsize));


	        f.addCode(
	//            c.call(ftmPrefix + "_exp", x, c.i32_const(pExponent), c.i32_const(32), res),

	            c.call(ftmPrefix + "_conjugate", x, inverse),
	            c.call(ftmPrefix + "_one", res),

	            c.if(
	                c.teeLocal("bit", c.i32_load8_s(c.i32_const(exponentNafBytes.length-1), pExponentNafBytes)),
	                c.if(
	                    c.i32_eq(
	                        c.getLocal("bit"),
	                        c.i32_const(1)
	                    ),
	                    c.call(ftmPrefix + "_mul", res, x, res),
	                    c.call(ftmPrefix + "_mul", res, inverse, res),
	                )
	            ),

	            c.setLocal("i", c.i32_const(exponentNafBytes.length-2)),
	            c.block(c.loop(
	//                c.call(ftmPrefix + "_square", res, res),
	                c.call(prefix + "__cyclotomicSquare", res, res),
	                c.if(
	                    c.teeLocal("bit", c.i32_load8_s(c.getLocal("i"), pExponentNafBytes)),
	                    c.if(
	                        c.i32_eq(
	                            c.getLocal("bit"),
	                            c.i32_const(1)
	                        ),
	                        c.call(ftmPrefix + "_mul", res, x, res),
	                        c.call(ftmPrefix + "_mul", res, inverse, res),
	                    )
	                ),
	                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
	                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
	                c.br(0)
	            ))
	        );

	        {
	            f.addCode(
	                c.call(ftmPrefix + "_conjugate", res, res),
	            );
	        }

	    }

	    function buildFinalExponentiation() {
	        buildCyclotomicSquare();
	        buildCyclotomicExp(finalExpZ, finalExpIsNegative, "w0");

	        const f = module.addFunction(prefix+ "_finalExponentiation");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const elt = c.getLocal("x");
	        const res = c.getLocal("r");
	        const t0 = c.i32_const(module.alloc(ftsize));
	        const t1 = c.i32_const(module.alloc(ftsize));
	        const t2 = c.i32_const(module.alloc(ftsize));
	        const t3 = c.i32_const(module.alloc(ftsize));
	        const t4 = c.i32_const(module.alloc(ftsize));
	        const t5 = c.i32_const(module.alloc(ftsize));
	        const t6 = c.i32_const(module.alloc(ftsize));

	        f.addCode(

	            // let mut t0 = f.frobenius_map(6)
	            c.call(ftmPrefix + "_frobeniusMap6", elt, t0),

	            // let t1 = f.invert()
	            c.call(ftmPrefix + "_inverse", elt, t1),

	            // let mut t2 = t0 * t1;
	            c.call(ftmPrefix + "_mul", t0, t1, t2),

	            // t1 = t2.clone();
	            c.call(ftmPrefix + "_copy", t2, t1),

	            // t2 = t2.frobenius_map().frobenius_map();
	            c.call(ftmPrefix + "_frobeniusMap2", t2, t2),

	            // t2 *= t1;
	            c.call(ftmPrefix + "_mul", t2, t1, t2),


	            // t1 = cyclotomic_square(t2).conjugate();
	            c.call(prefix + "__cyclotomicSquare", t2, t1),
	            c.call(ftmPrefix + "_conjugate", t1, t1),

	            // let mut t3 = cycolotomic_exp(t2);
	            c.call(prefix + "__cyclotomicExp_w0", t2, t3),

	            // let mut t4 = cyclotomic_square(t3);
	            c.call(prefix + "__cyclotomicSquare", t3, t4),

	            // let mut t5 = t1 * t3;
	            c.call(ftmPrefix + "_mul", t1, t3, t5),

	            // t1 = cycolotomic_exp(t5);
	            c.call(prefix + "__cyclotomicExp_w0", t5, t1),

	            // t0 = cycolotomic_exp(t1);
	            c.call(prefix + "__cyclotomicExp_w0", t1, t0),

	            // let mut t6 = cycolotomic_exp(t0);
	            c.call(prefix + "__cyclotomicExp_w0", t0, t6),

	            // t6 *= t4;
	            c.call(ftmPrefix + "_mul", t6, t4, t6),

	            // t4 = cycolotomic_exp(t6);
	            c.call(prefix + "__cyclotomicExp_w0", t6, t4),

	            // t5 = t5.conjugate();
	            c.call(ftmPrefix + "_conjugate", t5, t5),

	            // t4 *= t5 * t2;
	            c.call(ftmPrefix + "_mul", t4, t5, t4),
	            c.call(ftmPrefix + "_mul", t4, t2, t4),

	            // t5 = t2.conjugate();
	            c.call(ftmPrefix + "_conjugate", t2, t5),

	            // t1 *= t2;
	            c.call(ftmPrefix + "_mul", t1, t2, t1),

	            // t1 = t1.frobenius_map().frobenius_map().frobenius_map();
	            c.call(ftmPrefix + "_frobeniusMap3", t1, t1),

	            // t6 *= t5;
	            c.call(ftmPrefix + "_mul", t6, t5, t6),

	            // t6 = t6.frobenius_map();
	            c.call(ftmPrefix + "_frobeniusMap1", t6, t6),

	            // t3 *= t0;
	            c.call(ftmPrefix + "_mul", t3, t0, t3),

	            // t3 = t3.frobenius_map().frobenius_map();
	            c.call(ftmPrefix + "_frobeniusMap2", t3, t3),

	            // t3 *= t1;
	            c.call(ftmPrefix + "_mul", t3, t1, t3),

	            // t3 *= t6;
	            c.call(ftmPrefix + "_mul", t3, t6, t3),

	            // f = t3 * t4;
	            c.call(ftmPrefix + "_mul", t3, t4, res),

	        );
	    }


	    function buildFinalExponentiationOld() {
	        const f = module.addFunction(prefix+ "_finalExponentiationOld");
	        f.addParam("x", "i32");
	        f.addParam("r", "i32");

	        const exponent = bigInt("322277361516934140462891564586510139908379969514828494218366688025288661041104682794998680497580008899973249814104447692778988208376779573819485263026159588510513834876303014016798809919343532899164848730280942609956670917565618115867287399623286813270357901731510188149934363360381614501334086825442271920079363289954510565375378443704372994881406797882676971082200626541916413184642520269678897559532260949334760604962086348898118982248842634379637598665468817769075878555493752214492790122785850202957575200176084204422751485957336465472324810982833638490904279282696134323072515220044451592646885410572234451732790590013479358343841220074174848221722017083597872017638514103174122784843925578370430843522959600095676285723737049438346544753168912974976791528535276317256904336520179281145394686565050419250614107803233314658825463117900250701199181529205942363159325765991819433914303908860460720581408201373164047773794825411011922305820065611121544561808414055302212057471395719432072209245600258134364584636810093520285711072578721435517884103526483832733289802426157301542744476740008494780363354305116978805620671467071400711358839553375340724899735460480144599782014906586543813292157922220645089192130209334926661588737007768565838519456601560804957985667880395221049249803753582637708560");

	        const pExponent = module.alloc(utils.bigInt2BytesLE( exponent, 544 ));

	        const c = f.getCodeBuilder();

	        f.addCode(
	            c.call(ftmPrefix + "_exp", c.getLocal("x"), c.i32_const(pExponent), c.i32_const(544), c.getLocal("r")),
	        );
	    }


	    const pPreP = module.alloc(prePSize);
	    const pPreQ = module.alloc(preQSize);

	    function buildPairingEquation(nPairings) {

	        const f = module.addFunction(prefix+ "_pairingEq"+nPairings);
	        for (let i=0; i<nPairings; i++) {
	            f.addParam("p_"+i, "i32");
	            f.addParam("q_"+i, "i32");
	        }
	        f.addParam("c", "i32");
	        f.setReturnType("i32");


	        const c = f.getCodeBuilder();

	        const resT = c.i32_const(module.alloc(ftsize));
	        const auxT = c.i32_const(module.alloc(ftsize));

	        f.addCode(c.call(ftmPrefix + "_one", resT ));

	        for (let i=0; i<nPairings; i++) {

	            f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p_"+i), c.i32_const(pPreP) ));
	            f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q_"+i), c.i32_const(pPreQ) ));

	            // Checks
	            f.addCode(
	                c.if(
	                    c.i32_eqz(c.call(g1mPrefix + "_inGroupAffine", c.i32_const(pPreP))),
	                    c.ret(c.i32_const(0))
	                ),
	                c.if(
	                    c.i32_eqz(c.call(g2mPrefix + "_inGroupAffine", c.i32_const(pPreQ))),
	                    c.ret(c.i32_const(0))
	                )
	            );

	            f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), auxT ));

	            f.addCode(c.call(ftmPrefix + "_mul", resT, auxT, resT ));
	        }

	        f.addCode(c.call(prefix + "_finalExponentiation", resT, resT ));

	        f.addCode(c.call(ftmPrefix + "_eq", resT, c.getLocal("c")));
	    }


	    function buildPairing() {

	        const f = module.addFunction(prefix+ "_pairing");
	        f.addParam("p", "i32");
	        f.addParam("q", "i32");
	        f.addParam("r", "i32");

	        const c = f.getCodeBuilder();

	        const resT = c.i32_const(module.alloc(ftsize));

	        f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p"), c.i32_const(pPreP) ));
	        f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q"), c.i32_const(pPreQ) ));
	        f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), resT ));
	        f.addCode(c.call(prefix + "_finalExponentiation", resT, c.getLocal("r") ));
	    }


	    function buildInGroupG2() {
	        const f = module.addFunction(g2mPrefix+ "_inGroupAffine");
	        f.addParam("p", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const WINV = [
	            bigInt("2001204777610833696708894912867952078278441409969503942666029068062015825245418932221343814564507832018947136279894"),
	            bigInt("2001204777610833696708894912867952078278441409969503942666029068062015825245418932221343814564507832018947136279893")
	        ];

	        const FROB2X = bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436");
	        const FROB3Y = [
	            bigInt("2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530"),
	            bigInt("2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530")
	        ];

	        const wInv = c.i32_const(module.alloc([
	            ...utils.bigInt2BytesLE(toMontgomery(WINV[0]), n8q),
	            ...utils.bigInt2BytesLE(toMontgomery(WINV[1]), n8q),
	        ]));

	        const frob2X = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(FROB2X), n8q)));
	        const frob3Y = c.i32_const(module.alloc([
	            ...utils.bigInt2BytesLE(toMontgomery(FROB3Y[0]), n8q),
	            ...utils.bigInt2BytesLE(toMontgomery(FROB3Y[1]), n8q),
	        ]));

	        const z = c.i32_const(module.alloc(utils.bigInt2BytesLE(finalExpZ, 8)));

	        const px = c.getLocal("p");
	        const py = c.i32_add(c.getLocal("p"), c.i32_const(f2size));

	        const aux = c.i32_const(module.alloc(f1size));

	        const x_winv = c.i32_const(module.alloc(f2size));
	        const y_winv = c.i32_const(module.alloc(f2size));
	        const pf2 = module.alloc(f2size*2);
	        const f2 = c.i32_const(pf2);
	        const f2x = c.i32_const(pf2);
	        const f2x_c1 = c.i32_const(pf2);
	        const f2x_c2 = c.i32_const(pf2+f1size);
	        const f2y = c.i32_const(pf2+f2size);
	        const f2y_c1 = c.i32_const(pf2+f2size);
	        const f2y_c2 = c.i32_const(pf2+f2size+f1size);
	        const pf3 = module.alloc(f2size*3);
	        const f3 = c.i32_const(pf3);
	        const f3x = c.i32_const(pf3);
	        const f3x_c1 = c.i32_const(pf3);
	        const f3x_c2 = c.i32_const(pf3+f1size);
	        const f3y = c.i32_const(pf3+f2size);
	        const f3y_c1 = c.i32_const(pf3+f2size);
	        const f3y_c2 = c.i32_const(pf3+f2size+f1size);
	        const f3z = c.i32_const(pf3+f2size*2);


	        f.addCode(
	            c.if(
	                c.call(g2mPrefix + "_isZeroAffine", c.getLocal("p")),
	                c.ret( c.i32_const(1)),
	            ),
	            c.if(
	                c.i32_eqz(c.call(g2mPrefix + "_inCurveAffine", c.getLocal("p"))),
	                c.ret( c.i32_const(0)),
	            ),
	            c.call(f2mPrefix + "_mul", px, wInv, x_winv),
	            c.call(f2mPrefix + "_mul", py, wInv, y_winv),

	            c.call(f2mPrefix + "_mul1", x_winv, frob2X, f2x),
	            c.call(f2mPrefix + "_neg", y_winv, f2y),

	            c.call(f2mPrefix + "_neg", x_winv, f3x),
	            c.call(f2mPrefix + "_mul", y_winv, frob3Y, f3y),

	            c.call(f1mPrefix + "_sub", f2x_c1, f2x_c2, aux),
	            c.call(f1mPrefix + "_add", f2x_c1, f2x_c2, f2x_c2),
	            c.call(f1mPrefix + "_copy", aux, f2x_c1),

	            c.call(f1mPrefix + "_sub", f2y_c1, f2y_c2, aux),
	            c.call(f1mPrefix + "_add", f2y_c1, f2y_c2, f2y_c2),
	            c.call(f1mPrefix + "_copy", aux, f2y_c1),

	            c.call(f1mPrefix + "_add", f3x_c1, f3x_c2, aux),
	            c.call(f1mPrefix + "_sub", f3x_c1, f3x_c2, f3x_c2),
	            c.call(f1mPrefix + "_copy", aux, f3x_c1),

	            c.call(f1mPrefix + "_sub", f3y_c2, f3y_c1, aux),
	            c.call(f1mPrefix + "_add", f3y_c1, f3y_c2, f3y_c2),
	            c.call(f1mPrefix + "_copy", aux, f3y_c1),

	            c.call(f2mPrefix + "_one", f3z),

	            c.call(g2mPrefix + "_timesScalar", f3, z, c.i32_const(8), f3),
	            c.call(g2mPrefix + "_addMixed", f3, f2, f3),

	            c.ret(
	                c.call(g2mPrefix + "_eqMixed", f3, c.getLocal("p"))
	            )
	        );

	        const fInGroup = module.addFunction(g2mPrefix + "_inGroup");
	        fInGroup.addParam("pIn", "i32");
	        fInGroup.setReturnType("i32");

	        const c2 = fInGroup.getCodeBuilder();

	        const aux2 = c2.i32_const(module.alloc(f2size*2));

	        fInGroup.addCode(
	            c2.call(g2mPrefix + "_toAffine", c2.getLocal("pIn"), aux2),

	            c2.ret(
	                c2.call(g2mPrefix + "_inGroupAffine", aux2),
	            )
	        );

	    }

	    function buildInGroupG1() {
	        const f = module.addFunction(g1mPrefix+ "_inGroupAffine");
	        f.addParam("p", "i32");
	        f.setReturnType("i32");

	        const c = f.getCodeBuilder();

	        const BETA = bigInt("4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436");
	        const BETA2 = bigInt("793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350");
	        const Z2M1D3 = finalExpZ.times(finalExpZ).minus(bigInt.one).divide(bigInt(3));

	        const beta = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(BETA), n8q)));
	        const beta2 = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(BETA2), n8q)));

	        const z2m1d3 = c.i32_const(module.alloc(utils.bigInt2BytesLE(Z2M1D3, 16)));


	        const px = c.getLocal("p");
	        const py = c.i32_add(c.getLocal("p"), c.i32_const(f1size));

	        const psp = module.alloc(f1size*3);
	        const sp = c.i32_const(psp);
	        const spx = c.i32_const(psp);
	        const spy = c.i32_const(psp+f1size);
	        c.i32_const(psp+2*f1size);

	        const ps2p = module.alloc(f1size*2);
	        const s2p = c.i32_const(ps2p);
	        const s2px = c.i32_const(ps2p);
	        const s2py = c.i32_const(ps2p+f1size);

	        f.addCode(
	            c.if(
	                c.call(g1mPrefix + "_isZeroAffine", c.getLocal("p")),
	                c.ret( c.i32_const(1)),
	            ),
	            c.if(
	                c.i32_eqz(c.call(g1mPrefix + "_inCurveAffine", c.getLocal("p"))),
	                c.ret( c.i32_const(0)),
	            ),

	            c.call(f1mPrefix + "_mul", px, beta, spx),
	            c.call(f1mPrefix + "_copy", py, spy),

	            c.call(f1mPrefix + "_mul", px, beta2, s2px),
	            c.call(f1mPrefix + "_copy", py, s2py),


	            c.call(g1mPrefix + "_doubleAffine", sp, sp),
	            c.call(g1mPrefix + "_subMixed", sp, c.getLocal("p"), sp),
	            c.call(g1mPrefix + "_subMixed", sp, s2p, sp),

	            c.call(g1mPrefix + "_timesScalar", sp, z2m1d3, c.i32_const(16), sp),

	            c.ret(
	                c.call(g1mPrefix + "_eqMixed", sp, s2p)
	            )

	        );

	        const fInGroup = module.addFunction(g1mPrefix + "_inGroup");
	        fInGroup.addParam("pIn", "i32");
	        fInGroup.setReturnType("i32");

	        const c2 = fInGroup.getCodeBuilder();

	        const aux2 = c2.i32_const(module.alloc(f1size*2));

	        fInGroup.addCode(
	            c2.call(g1mPrefix + "_toAffine", c2.getLocal("pIn"), aux2),

	            c2.ret(
	                c2.call(g1mPrefix + "_inGroupAffine", aux2),
	            )
	        );
	    }

	    for (let i=0; i<10; i++) {
	        buildFrobeniusMap(i);
	        module.exportFunction(ftmPrefix + "_frobeniusMap"+i);
	    }


	    buildInGroupG1();
	    buildInGroupG2();

	    buildPrepAddStep();
	    buildPrepDoubleStep();

	    buildPrepareG1();
	    buildPrepareG2();

	    buildMillerLoop();

	    buildFinalExponentiationOld();
	    buildFinalExponentiation();

	    for (let i=1; i<=5; i++) {
	        buildPairingEquation(i);
	        module.exportFunction(prefix + "_pairingEq"+i);
	    }

	    buildPairing();

	    module.exportFunction(prefix + "_pairing");


	    module.exportFunction(prefix + "_prepareG1");
	    module.exportFunction(prefix + "_prepareG2");
	    module.exportFunction(prefix + "_millerLoop");
	    module.exportFunction(prefix + "_finalExponentiation");
	    module.exportFunction(prefix + "_finalExponentiationOld");
	    module.exportFunction(prefix + "__cyclotomicSquare");
	    module.exportFunction(prefix + "__cyclotomicExp_w0");

	    module.exportFunction(f6mPrefix + "_mul1");
	    module.exportFunction(f6mPrefix + "_mul01");
	    module.exportFunction(ftmPrefix + "_mul014");

	    module.exportFunction(g1mPrefix + "_inGroupAffine");
	    module.exportFunction(g1mPrefix + "_inGroup");
	    module.exportFunction(g2mPrefix + "_inGroupAffine");
	    module.exportFunction(g2mPrefix + "_inGroup");

	    // console.log(module.functionIdxByName);
	};
	return build_bls12381;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

var hasRequiredWasmcurves;

function requireWasmcurves () {
	if (hasRequiredWasmcurves) return wasmcurves;
	hasRequiredWasmcurves = 1;
	// module.exports.bn128_wasm = require("./build/bn128_wasm.js");
	// module.exports.bls12381_wasm = require("./build/bls12381_wasm.js");
	// module.exports.mnt6753_wasm = require("./build/mnt6753_wasm.js");

	wasmcurves.buildBn128 = /*@__PURE__*/ requireBuild_bn128();
	wasmcurves.buildBls12381 = /*@__PURE__*/ requireBuild_bls12381();
	// module.exports.buildMnt6753 = require("./src/mnt6753/build_mnt7.js");
	return wasmcurves;
}

var wasmcurvesExports = /*@__PURE__*/ requireWasmcurves();

/* global BigInt */

function stringifyBigInts$2(o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return fromRprLE(o, 0);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts$2);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts$2(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts$2(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts$2);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts$2(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int$2(buff) {
    let res = BigInt(0);
    let i = buff.length;
    let offset = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i>0) {
        if (i >= 4) {
            i -= 4;
            res += BigInt(buffV.getUint32(i)) << BigInt(offset*8);
            offset += 4;
        } else if (i >= 2) {
            i -= 2;
            res += BigInt(buffV.getUint16(i)) << BigInt(offset*8);
            offset += 2;
        } else {
            i -= 1;
            res += BigInt(buffV.getUint8(i)) << BigInt(offset*8);
            offset += 1;
        }
    }
    return res;
}

function beInt2Buff$2(n, len) {
    let r = n;
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = len;
    while (o > 0) {
        if (o-4 >= 0) {
            o -= 4;
            buffV.setUint32(o, Number(r & BigInt(0xFFFFFFFF)));
            r = r >> BigInt(32);
        } else if (o-2 >= 0) {
            o -= 2;
            buffV.setUint16(o, Number(r & BigInt(0xFFFF)));
            r = r >> BigInt(16);
        } else {
            o -= 1;
            buffV.setUint8(o, Number(r & BigInt(0xFF)));
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}


function leBuff2int$2(buff) {
    let res = BigInt(0);
    let i = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i<buff.length) {
        if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint32(i, true)) << BigInt( i*8);
            i += 4;
        } else if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint16(i, true)) << BigInt( i*8);
            i += 2;
        } else {
            res += BigInt(buffV.getUint8(i, true)) << BigInt( i*8);
            i += 1;
        }
    }
    return res;
}

function leInt2Buff$2(n, len) {
    let r = n;
    if (typeof len === "undefined") {
        len = Math.floor((bitLength(n) - 1) / 8) +1;
        if (len==0) len = 1;
    }
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = 0;
    while (o < len) {
        if (o+4 <= len) {
            buffV.setUint32(o, Number(r & BigInt(0xFFFFFFFF)), true );
            o += 4;
            r = r >> BigInt(32);
        } else if (o+2 <= len) {
            buffV.setUint16(Number(o, r & BigInt(0xFFFF)), true );
            o += 2;
            r = r >> BigInt(16);
        } else {
            buffV.setUint8(Number(o, r & BigInt(0xFF)), true );
            o += 1;
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}


function stringifyFElements$1(F, o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return F.toString(F.e(o));
    } else if (Array.isArray(o)) {
        return o.map(stringifyFElements$1.bind(this,F));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyFElements$1(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}


function unstringifyFElements$1(F, o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return F.e(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return F.e(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyFElements$1.bind(this,F));
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyFElements$1(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}

var utils_native = /*#__PURE__*/Object.freeze({
	__proto__: null,
	beBuff2int: beBuff2int$2,
	beInt2Buff: beInt2Buff$2,
	leBuff2int: leBuff2int$2,
	leInt2Buff: leInt2Buff$2,
	stringifyBigInts: stringifyBigInts$2,
	stringifyFElements: stringifyFElements$1,
	unstringifyBigInts: unstringifyBigInts$2,
	unstringifyFElements: unstringifyFElements$1
});

function stringifyBigInts$1(o) {
    if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts$1);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts$1(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts$1(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return bigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return bigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts$1);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts$1(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int$1(buff) {
    let res = bigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = bigInt(buff[buff.length - i - 1]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
}

function beInt2Buff$1(n, len) {
    let r = n;
    let o =len-1;
    const buff = new Uint8Array(len);
    while ((r.gt(bigInt.zero))&&(o>=0)) {
        let c = Number(r.and(bigInt("255")));
        buff[o] = c;
        o--;
        r = r.shiftRight(8);
    }
    if (!r.eq(bigInt.zero)) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}


function leBuff2int$1 (buff) {
    let res = bigInt.zero;
    for (let i=0; i<buff.length; i++) {
        const n = bigInt(buff[i]);
        res = res.add(n.shiftLeft(i*8));
    }
    return res;
}

function leInt2Buff$1(n, len) {
    let r = n;
    let o =0;
    const buff = new Uint8Array(len);
    while ((r.gt(bigInt.zero))&&(o<buff.length)) {
        let c = Number(r.and(bigInt(255)));
        buff[o] = c;
        o++;
        r = r.shiftRight(8);
    }
    if (!r.eq(bigInt.zero)) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

var utils_bigint = /*#__PURE__*/Object.freeze({
	__proto__: null,
	beBuff2int: beBuff2int$1,
	beInt2Buff: beInt2Buff$1,
	leBuff2int: leBuff2int$1,
	leInt2Buff: leInt2Buff$1,
	stringifyBigInts: stringifyBigInts$1,
	unstringifyBigInts: unstringifyBigInts$1
});

let utils$1 = {};

const supportsNativeBigInt = typeof BigInt === "function";
if (supportsNativeBigInt) {
    Object.assign(utils$1, utils_native);
} else {
    Object.assign(utils$1, utils_bigint);
}


const _revTable = [];
for (let i=0; i<256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

utils$1.bitReverse = function bitReverse(idx, bits) {
    return (
        _revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xFF] << 8) |
        (_revTable[(idx >>> 8) & 0xFF] << 16) |
        (_revTable[idx & 0xFF] << 24)
    ) >>> (32-bits);
};


utils$1.log2 = function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
};

utils$1.buffReverseBits = function buffReverseBits(buff, eSize) {
    const n = buff.byteLength /eSize;
    const bits = utils$1.log2(n);
    if (n != (1 << bits)) {
        throw new Error("Invalid number of pointers");
    }
    for (let i=0; i<n; i++) {
        const r = utils$1.bitReverse(i,bits);
        if (i>r) {
            const tmp = buff.slice(i*eSize, (i+1)*eSize);
            buff.set( buff.slice(r*eSize, (r+1)*eSize), i*eSize);
            buff.set(tmp, r*eSize);
        }
    }
};


utils$1.array2buffer = function(arr, sG) {
    const buff = new Uint8Array(sG*arr.length);

    for (let i=0; i<arr.length; i++) {
        buff.set(arr[i], i*sG);
    }

    return buff;
};

utils$1.buffer2array = function(buff , sG) {
    const n= buff.byteLength / sG;
    const arr = new Array(n);
    for (let i=0; i<n; i++) {
        arr[i] = buff.slice(i*sG, i*sG+sG);
    }
    return arr;
};

let {
    bitReverse,
    log2,
    buffReverseBits,
    stringifyBigInts,
    unstringifyBigInts,
    beBuff2int,
    beInt2Buff,
    leBuff2int,
    leInt2Buff,
    array2buffer,
    buffer2array,
    stringifyFElements,
    unstringifyFElements
} = utils$1;

const PAGE_SIZE = 1<<30;

class BigBuffer {

    constructor(size) {
        this.buffers = [];
        this.byteLength = size;
        for (let i=0; i<size; i+= PAGE_SIZE) {
            const n = Math.min(size-i, PAGE_SIZE);
            this.buffers.push(new Uint8Array(n));
        }

    }

    slice(fr, to) {
        if ( to === undefined ) to = this.byteLength;
        if ( fr === undefined ) fr = 0;
        const len = to-fr;

        const firstPage = Math.floor(fr / PAGE_SIZE);
        const lastPage = Math.floor((fr+len-1) / PAGE_SIZE);

        if ((firstPage == lastPage)||(len==0))
            return this.buffers[firstPage].slice(fr%PAGE_SIZE, fr%PAGE_SIZE + len);

        let buff;

        let p = firstPage;
        let o = fr % PAGE_SIZE;
        // Remaining bytes to read
        let r = len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset+o, l);
            if (l == len) return srcView.slice();
            if (!buff) {
                if (len <= PAGE_SIZE) {
                    buff = new Uint8Array(len);
                } else {
                    buff = new BigBuffer(len);
                }
            }
            buff.set(srcView, len-r);
            r = r-l;
            p ++;
            o = 0;
        }

        return buff;
    }

    set(buff, offset) {
        if (offset === undefined) offset = 0;

        const len = buff.byteLength;

        if (len==0) return;

        const firstPage = Math.floor(offset / PAGE_SIZE);
        const lastPage = Math.floor((offset+len-1) / PAGE_SIZE);

        if (firstPage == lastPage) {
            if ((buff instanceof BigBuffer)&&(buff.buffers.length==1)) {
                return this.buffers[firstPage].set(buff.buffers[0], offset % PAGE_SIZE);
            } else {
                return this.buffers[firstPage].set(buff, offset % PAGE_SIZE);
            }

        }


        let p = firstPage;
        let o = offset % PAGE_SIZE;
        let r = len;
        while (r>0) {
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = buff.slice( len -r, len -r+l);
            const dstView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset + o, l);
            dstView.set(srcView);
            r = r-l;
            p ++;
            o = 0;
        }

    }
}

function buildBatchConvert(tm, fnName, sIn, sOut) {
    return async function batchConvert(buffIn) {
        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: n},
                    {var: 1}
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

class WasmField1 {

    constructor(tm, prefix, n8, p) {
        this.tm = tm;
        this.prefix = prefix;

        this.p = p;
        this.n8 = n8;
        this.type = "F1";
        this.m = 1;

        this.half = shiftRight(p, one);
        this.bitLength = bitLength(p);
        this.mask = sub(shiftLeft(one, this.bitLength), one);

        this.pOp1 = tm.alloc(n8);
        this.pOp2 = tm.alloc(n8);
        this.pOp3 = tm.alloc(n8);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = this.tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.n64 = Math.floor(n8/8);
        this.n32 = Math.floor(n8/4);

        if(this.n64*8 != this.n8) {
            throw new Error("n8 must be a multiple of 8");
        }

        this.half = shiftRight(this.p, one);
        this.nqr = this.two;
        let r = this.exp(this.nqr, this.half);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.add(this.nqr, this.one);
            r = this.exp(this.nqr, this.half);
        }

        this.shift = this.mul(this.nqr, this.nqr);
        this.shiftInv = this.inv(this.shift);

        this.s = 0;
        let t = sub(this.p, one);

        while ( !isOdd(t) ) {
            this.s = this.s + 1;
            t = shiftRight(t, one);
        }

        this.w = [];
        this.w[this.s] = this.exp(this.nqr, t);

        for (let i= this.s-1; i>=0; i--) {
            this.w[i] = this.square(this.w[i+1]);
        }

        if (!this.eq(this.w[0], this.one)) {
            throw new Error("Error calculating roots of unity");
        }

        this.batchToMontgomery = buildBatchConvert(tm, prefix + "_batchToMontgomery", this.n8, this.n8);
        this.batchFromMontgomery = buildBatchConvert(tm, prefix + "_batchFromMontgomery", this.n8, this.n8);
    }


    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        let ra = e(a, b);
        if (isNegative(ra)) {
            ra = neg(ra);
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
            ra = sub(this.p, ra);
        } else {
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
        }
        const buff = leInt2Buff(ra, this.n8);
        return this.toMontgomery(buff);
    }

    toString(a, radix) {
        const an = this.fromMontgomery(a);
        const s = fromRprLE(an, 0);
        return toString(s, radix);
    }

    fromRng(rng) {
        let v;
        const buff = new Uint8Array(this.n8);
        do {
            v = zero;
            for (let i=0; i<this.n64; i++) {
                v = add(v,  shiftLeft(rng.nextU64(), 64*i));
            }
            v = band(v, this.mask);
        } while (geq(v, this.p));
        toRprLE(buff, 0, v, this.n8);
        return buff;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const an = this.fromMontgomery(a);
        return fromRprLE(an, 0);
    }

    fromObject(a) {
        const buff = new Uint8Array(this.n8);
        toRprLE(buff, 0, a, this.n8);
        return this.toMontgomery(buff);
    }

    toRprLE(buff, offset, a) {
        buff.set(this.fromMontgomery(a), offset);
    }

    toRprBE(buff, offset, a) {
        const buff2 = this.fromMontgomery(a);
        for (let i=0; i<this.n8/2; i++) {
            const aux = buff2[i];
            buff2[i] = buff2[this.n8-1-i];
            buff2[this.n8-1-i] = aux;
        }
        buff.set(buff2, offset);
    }

    fromRprLE(buff, offset) {
        offset = offset || 0;
        const res = buff.slice(offset, offset + this.n8);
        return this.toMontgomery(res);
    }

    async batchInverse(buffIn) {
        let returnArray = false;
        const sIn = this.n8;
        const sOut = this.n8;

        if (Array.isArray(buffIn)) {
            buffIn = array2buffer(buffIn, sIn );
            returnArray = true;
        } else {
            buffIn = buffIn.slice(0, buffIn.byteLength);
        }

        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/this.tm.concurrency);
        const opPromises = [];
        for (let i=0; i<this.tm.concurrency; i++) {
            let n;
            if (i< this.tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: this.prefix + "_batchInverse", params: [
                    {var: 0},
                    {val: sIn},
                    {val: n},
                    {var: 1},
                    {val: sOut},
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                this.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        if (returnArray) {
            return buffer2array(fullBuffOut, sOut);
        } else {
            return fullBuffOut;
        }

    }

}

class WasmField2 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F2";
        this.m = F.m * 2;
        this.n8 = this.F.n8*2;
        this.n32 = this.F.n32*2;
        this.n64 = this.F.n64*2;

        this.pOp1 = tm.alloc(F.n8*2);
        this.pOp2 = tm.alloc(F.n8*2);
        this.pOp3 = tm.alloc(F.n8*2);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    mul1(a,b) {
        return this.op2("_mul1", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 2)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const res = new Uint8Array(this.F.n8*2);
            res.set(c1);
            res.set(c2, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F2");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8), radix);
        return `[${s1}, ${s2}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*2);
        res.set(c1);
        res.set(c2, this.F.n8);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        return [c1, c2];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*2);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8);
    }

}

class WasmField3 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F3";
        this.m = F.m * 3;
        this.n8 = this.F.n8*3;
        this.n32 = this.F.n32*3;
        this.n64 = this.F.n64*3;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 3)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const c3 = this.F.e(a[2], b);
            const res = new Uint8Array(this.F.n8*3);
            res.set(c1);
            res.set(c2, this.F.n8);
            res.set(c3, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F3");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
        const s3 = this.F.toString(a.slice(this.F.n8*2), radix);
        return `[${s1}, ${s2}, ${s3}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const c3 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*3);
        res.set(c1);
        res.set(c2, this.F.n8);
        res.set(c3, this.F.n8*2);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        const c3 = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        return [c1, c2, c3];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*3);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        const b3 = this.F.fromObject(a[2]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        buff.set(b3, this.F.n8*2);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8, this.F.n8*2);
    }

    c3(a) {
        return a.slice(this.F.n8*2);
    }

}

class WasmCurve {

    constructor(tm, prefix, F, pGen, pGb, cofactor) {
        this.tm = tm;
        this.prefix = prefix;
        this.F = F;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, F.n8*3);
        this.tm.instance.exports[prefix + "_zeroAffine"](this.pOp1);
        this.zeroAffine = this.tm.getBuff(this.pOp1, F.n8*2);
        this.one = this.tm.getBuff(pGen, F.n8*3);
        this.g = this.one;
        this.oneAffine = this.tm.getBuff(pGen, F.n8*2);
        this.gAffine = this.oneAffine;
        this.b = this.tm.getBuff(pGb, F.n8);

        if (cofactor) {
            this.cofactor = toLEBuff(cofactor);
        }

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.batchLEMtoC = buildBatchConvert(tm, prefix + "_batchLEMtoC", F.n8*2, F.n8);
        this.batchLEMtoU = buildBatchConvert(tm, prefix + "_batchLEMtoU", F.n8*2, F.n8*2);
        this.batchCtoLEM = buildBatchConvert(tm, prefix + "_batchCtoLEM", F.n8, F.n8*2);
        this.batchUtoLEM = buildBatchConvert(tm, prefix + "_batchUtoLEM", F.n8*2, F.n8*2);
        this.batchToJacobian = buildBatchConvert(tm, prefix + "_batchToJacobian", F.n8*2, F.n8*3);
        this.batchToAffine = buildBatchConvert(tm, prefix + "_batchToAffine", F.n8*3, F.n8*2);
    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op2bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op1Affine(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*2);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_add", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_addMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    sub(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_sub", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_subMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    neg(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_neg", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Affine("_negAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    double(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_double", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_doubleAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    isZero(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Bool("_isZero", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Bool("_isZeroAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    timesScalar(a, s) {
        if (!(s instanceof Uint8Array)) {
            s = toLEBuff(e(s));
        }
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesScalar";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesScalarAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, s.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    timesFr(a, s) {
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesFr";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesFrAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    eq(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eq", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eqMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    toAffine(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Affine("_toAffine", a);
        } else if (a.byteLength == this.F.n8*2) {
            return a;
        } else {
            throw new Error("invalid point size");
        }
    }

    toJacobian(a) {
        if (a.byteLength == this.F.n8*3) {
            return a;
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_toJacobian", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    toRprUncompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoU"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
        arr.set(res, offset);
    }

    fromRprUncompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8*2);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_UtoLEM"](this.pOp1, this.pOp1);
        return this.tm.getBuff(this.pOp1, this.F.n8*2);
    }

    toRprCompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoC"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8);
        arr.set(res, offset);
    }

    fromRprCompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_CtoLEM"](this.pOp1, this.pOp2);
        return this.tm.getBuff(this.pOp2, this.F.n8*2);
    }

    toUncompressed(a) {
        const buff = new Uint8Array(this.F.n8*2);
        this.toRprUncompressed(buff, 0, a);
        return buff;
    }

    toRprLEM(arr, offset, a) {
        if (a.byteLength == this.F.n8*2) {
            arr.set(a, offset);
            return;
        } else if (a.byteLength == this.F.n8*3) {
            this.tm.setBuff(this.pOp1, a);
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
            const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
            arr.set(res, offset);
        } else {
            throw new Error("invalid point size");
        }
    }

    fromRprLEM(arr, offset) {
        offset = offset || 0;
        return arr.slice(offset, offset+this.F.n8*2);
    }

    toString(a, radix) {
        if (a.byteLength == this.F.n8*3) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
            const z = this.F.toString(a.slice(this.F.n8*2), radix);
            return `[ ${x}, ${y}, ${z} ]`;
        } else if (a.byteLength == this.F.n8*2) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8), radix);
            return `[ ${x}, ${y} ]`;
        } else {
            throw new Error("invalid point size");
        }
    }

    isValid(a) {
        if (this.isZero(a)) return true;
        const F = this.F;
        const aa = this.toAffine(a);
        const x = aa.slice(0, this.F.n8);
        const y = aa.slice(this.F.n8, this.F.n8*2);
        const x3b = F.add(F.mul(F.square(x),x), this.b);
        const y2 = F.square(y);
        return F.eq(x3b, y2);
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        let x3b;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        } while (!F.isSquare(x3b));

        P[1] = F.sqrt(x3b);

        const s = F.isNegative(P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);

        let Pbuff = new Uint8Array(this.F.n8*2);
        Pbuff.set(P[0]);
        Pbuff.set(P[1], this.F.n8);

        if (this.cofactor) {
            Pbuff = this.timesScalar(Pbuff, this.cofactor);
        }

        return Pbuff;
    }



    toObject(a) {
        if (this.isZero(a)) {
            return [
                this.F.toObject(this.F.zero),
                this.F.toObject(this.F.one),
                this.F.toObject(this.F.zero),
            ];
        }
        const x = this.F.toObject(a.slice(0, this.F.n8));
        const y = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        let z;
        if (a.byteLength == this.F.n8*3) {
            z = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        } else {
            z = this.F.toObject(this.F.one);
        }
        return [x, y, z];
    }

    fromObject(a) {
        const x = this.F.fromObject(a[0]);
        const y = this.F.fromObject(a[1]);
        let z;
        if (a.length==3) {
            z = this.F.fromObject(a[2]);
        } else {
            z = this.F.one;
        }
        if (this.F.isZero(z, this.F.one)) {
            return this.zeroAffine;
        } else if (this.F.eq(z, this.F.one)) {
            const buff = new Uint8Array(this.F.n8*2);
            buff.set(x);
            buff.set(y, this.F.n8);
            return buff;
        } else {
            const buff = new Uint8Array(this.F.n8*3);
            buff.set(x);
            buff.set(y, this.F.n8);
            buff.set(z, this.F.n8*2);
            return buff;
        }
    }

    e(a) {
        if (a instanceof Uint8Array) return a;
        return this.fromObject(a);
    }

    x(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(0, this.F.n8);
    }

    y(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(this.F.n8);
    }

}

/* global WebAssembly */

function thread(self) {
    const MAXMEM = 32767;
    let instance;
    let memory;

    if (self) {
        self.onmessage = function(e) {
            let data;
            if (e.data) {
                data = e.data;
            } else {
                data = e;
            }

            if (data[0].cmd == "INIT") {
                init(data[0]).then(function() {
                    self.postMessage(data.result);
                });
            } else if (data[0].cmd == "TERMINATE") {
                self.close();
            } else {
                const res = runTask(data);
                self.postMessage(res);
            }
        };
    }

    async function init(data) {
        const code = new Uint8Array(data.code);
        const wasmModule = await WebAssembly.compile(code);
        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});

        instance = await WebAssembly.instantiate(wasmModule, {
            env: {
                "memory": memory
            }
        });
    }



    function alloc(length) {
        const u32 = new Uint32Array(memory.buffer, 0, 1);
        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers
        const res = u32[0];
        u32[0] += length;
        if (u32[0] + length > memory.buffer.byteLength) {
            const currentPages = memory.buffer.byteLength / 0x10000;
            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;
            if (requiredPages>MAXMEM) requiredPages=MAXMEM;
            memory.grow(requiredPages-currentPages);
        }
        return res;
    }

    function allocBuffer(buffer) {
        const p = alloc(buffer.byteLength);
        setBuffer(p, buffer);
        return p;
    }

    function getBuffer(pointer, length) {
        const u8 = new Uint8Array(memory.buffer);
        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);
    }

    function setBuffer(pointer, buffer) {
        const u8 = new Uint8Array(memory.buffer);
        u8.set(new Uint8Array(buffer), pointer);
    }

    function runTask(task) {
        if (task[0].cmd == "INIT") {
            return init(task[0]);
        }
        const ctx = {
            vars: [],
            out: []
        };
        const u32a = new Uint32Array(memory.buffer, 0, 1);
        const oldAlloc = u32a[0];
        for (let i=0; i<task.length; i++) {
            switch (task[i].cmd) {
            case "ALLOCSET":
                ctx.vars[task[i].var] = allocBuffer(task[i].buff);
                break;
            case "ALLOC":
                ctx.vars[task[i].var] = alloc(task[i].len);
                break;
            case "SET":
                setBuffer(ctx.vars[task[i].var], task[i].buff);
                break;
            case "CALL": {
                const params = [];
                for (let j=0; j<task[i].params.length; j++) {
                    const p = task[i].params[j];
                    if (typeof p.var !== "undefined") {
                        params.push(ctx.vars[p.var] + (p.offset || 0));
                    } else if (typeof p.val != "undefined") {
                        params.push(p.val);
                    }
                }
                instance.exports[task[i].fnName](...params);
                break;
            }
            case "GET":
                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();
                break;
            default:
                throw new Error("Invalid cmd");
            }
        }
        const u32b = new Uint32Array(memory.buffer, 0, 1);
        u32b[0] = oldAlloc;
        return ctx.out;
    }


    return runTask;
}

/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const WORKER = Symbol.for('worker');
const EVENTS = Symbol.for('events');

class EventTarget {
	constructor() {
		Object.defineProperty(this, EVENTS, {
			value: new Map()
		});
	}
	dispatchEvent(event) {
		event.target = event.currentTarget = this;
		if (this['on'+event.type]) {
			try {
				this['on'+event.type](event);
			}
			catch (err) {
				console.error(err);
			}
		}
		const list = this[EVENTS].get(event.type);
		if (list == null) return;
		list.forEach(handler => {
			try {
				handler.call(this, event);
			}
			catch (err) {
				console.error(err);
			}
		});
	}
	addEventListener(type, fn) {
		let events = this[EVENTS].get(type);
		if (!events) this[EVENTS].set(type, events = []);
		events.push(fn);
	}
	removeEventListener(type, fn) {
		let events = this[EVENTS].get(type);
		if (events) {
			const index = events.indexOf(fn);
			if (index !== -1) events.splice(index, 1);
		}
	}
}

function Event(type, target) {
	this.type = type;
	this.timeStamp = Date.now();
	this.target = this.currentTarget = this.data = null;
}

// this module is used self-referentially on both sides of the
// thread boundary, but behaves differently in each context.
var Worker = threads.isMainThread ? mainThread() : workerThread();

const baseUrl = URL.pathToFileURL(process.cwd() + '/');

function mainThread() {

	/**
	 * A web-compatible Worker implementation atop Node's worker_threads.
	 *  - uses DOM-style events (Event.data, Event.type, etc)
	 *  - supports event handler properties (worker.onmessage)
	 *  - Worker() constructor accepts a module URL
	 *  - accepts the {type:'module'} option
	 *  - emulates WorkerGlobalScope within the worker
	 * @param {string} url  The URL or module specifier to load
	 * @param {object} [options]  Worker construction options
	 * @param {string} [options.name]  Available as `self.name` within the Worker
	 * @param {string} [options.type="classic"]  Pass "module" to create a Module Worker.
	 */
	class Worker extends EventTarget {
		constructor(url, options) {
			super();
			const { name, type } = options || {};
			url += '';
			let mod;
			if (/^data:/.test(url)) {
				mod = url;
			}
			else {
				mod = URL.fileURLToPath(new URL.URL(url, baseUrl));
			}
			const worker = new threads.Worker(
				__filename,
				{ workerData: { mod, name, type } }
			);
			Object.defineProperty(this, WORKER, {
				value: worker
			});
			worker.on('message', data => {
				const event = new Event('message');
				event.data = data;
				this.dispatchEvent(event);
			});
			worker.on('error', error => {
				error.type = 'error';
				this.dispatchEvent(error);
			});
			worker.on('exit', () => {
				this.dispatchEvent(new Event('close'));
			});
		}
		postMessage(data, transferList) {
			this[WORKER].postMessage(data, transferList);
		}
		terminate() {
			this[WORKER].terminate();
		}
	}
	Worker.prototype.onmessage = Worker.prototype.onerror = Worker.prototype.onclose = null;
	return Worker;
}

function workerThread() {
	let { mod, name, type } = threads.workerData;
	if (!mod) return mainThread();

	// turn global into a mock WorkerGlobalScope
	const self = global.self = global;

	// enqueue messages to dispatch after modules are loaded
	let q = [];
	function flush() {
		const buffered = q;
		q = null;
		buffered.forEach(event => { self.dispatchEvent(event); });
	}
	threads.parentPort.on('message', data => {
		const event = new Event('message');
		event.data = data;
		if (q == null) self.dispatchEvent(event);
		else q.push(event);
	});
	threads.parentPort.on('error', err => {
		err.type = 'Error';
		self.dispatchEvent(err);
	});

	class WorkerGlobalScope extends EventTarget {
		postMessage(data, transferList) {
			threads.parentPort.postMessage(data, transferList);
		}
		// Emulates https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/close
		close() {
			process.exit();
		}
	}
	let proto = Object.getPrototypeOf(global);
	delete proto.constructor;
	Object.defineProperties(WorkerGlobalScope.prototype, proto);
	proto = Object.setPrototypeOf(global, new WorkerGlobalScope());
	['postMessage', 'addEventListener', 'removeEventListener', 'dispatchEvent'].forEach(fn => {
		proto[fn] = proto[fn].bind(global);
	});
	global.name = name;

	const isDataUrl = /^data:/.test(mod);
	if (type === 'module') {
		import(mod)
			.catch(err => {
				if (isDataUrl && err.message === 'Not supported') {
					console.warn('Worker(): Importing data: URLs requires Node 12.10+. Falling back to classic worker.');
					return evaluateDataUrl(mod, name);
				}
				console.error(err);
			})
			.then(flush);
	}
	else {
		try {
			if (/^data:/.test(mod)) {
				evaluateDataUrl(mod, name);
			}
			else {
				require(mod);
			}
		}
		catch (err) {
			console.error(err);
		}
		Promise.resolve().then(flush);
	}
}

function evaluateDataUrl(url, name) {
	const { data } = parseDataUrl(url);
	return VM.runInThisContext(data, {
		filename: 'worker.<'+(name || 'data:')+'>'
	});
}

function parseDataUrl(url) {
	let [m, type, encoding, data] = url.match(/^data: *([^;,]*)(?: *; *([^,]*))? *,(.*)$/) || [];
	if (!m) throw Error('Invalid Data URL.');
	if (encoding) switch (encoding.toLowerCase()) {
		case 'base64':
			data = Buffer.from(data, 'base64').toString();
			break;
		default:
			throw Error('Unknown Data URL encoding "' + encoding + '"');
	}
	return { type, data };
}

/* global navigator, WebAssembly */
/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

// const MEM_SIZE = 1000;  // Memory size in 64K Pakes (512Mb)
const MEM_SIZE = 25;  // Memory size in 64K Pakes (1600Kb)

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function stringToBase64(str) {
    if (process.browser) {
        return globalThis.btoa(str);
    } else {
        return Buffer.from(str).toString("base64");
    }
}

const threadSource = stringToBase64("(" + thread.toString() + ")(self)");
const workerSource = "data:application/javascript;base64," + threadSource;



async function buildThreadManager(wasm, singleThread) {
    const tm = new ThreadManager();

    tm.memory = new WebAssembly.Memory({initial:MEM_SIZE});
    tm.u8 = new Uint8Array(tm.memory.buffer);
    tm.u32 = new Uint32Array(tm.memory.buffer);

    const wasmModule = await WebAssembly.compile(wasm.code);

    tm.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": tm.memory
        }
    });

    tm.singleThread = singleThread;
    tm.initalPFree = tm.u32[0];   // Save the Pointer to free space.
    tm.pq = wasm.pq;
    tm.pr = wasm.pr;
    tm.pG1gen = wasm.pG1gen;
    tm.pG1zero = wasm.pG1zero;
    tm.pG2gen = wasm.pG2gen;
    tm.pG2zero = wasm.pG2zero;
    tm.pOneT = wasm.pOneT;

    //    tm.pTmp0 = tm.alloc(curve.G2.F.n8*3);
    //    tm.pTmp1 = tm.alloc(curve.G2.F.n8*3);


    if (singleThread) {
        tm.code = wasm.code;
        tm.taskManager = thread();
        await tm.taskManager([{
            cmd: "INIT",
            init: MEM_SIZE,
            code: tm.code.slice()
        }]);
        tm.concurrency  = 1;
    } else {
        tm.workers = [];
        tm.pendingDeferreds = [];
        tm.working = [];

        let concurrency;

        if ((typeof(navigator) === "object") && navigator.hardwareConcurrency) {
            concurrency = navigator.hardwareConcurrency;
        } else {
            concurrency = os.cpus().length;
        }

        if(concurrency == 0){
            concurrency = 2;
        }

        // Limit to 64 threads for memory reasons.
        if (concurrency>64) concurrency=64;
        tm.concurrency = concurrency;

        for (let i = 0; i<concurrency; i++) {

            tm.workers[i] = new Worker(workerSource);

            tm.workers[i].addEventListener("message", getOnMsg(i));

            tm.working[i]=false;
        }

        const initPromises = [];
        for (let i=0; i<tm.workers.length;i++) {
            const copyCode = wasm.code.slice();
            initPromises.push(tm.postAction(i, [{
                cmd: "INIT",
                init: MEM_SIZE,
                code: copyCode
            }], [copyCode.buffer]));
        }

        await Promise.all(initPromises);

    }
    return tm;

    function getOnMsg(i) {
        return function(e) {
            let data;
            if ((e)&&(e.data)) {
                data = e.data;
            } else {
                data = e;
            }

            tm.working[i]=false;
            tm.pendingDeferreds[i].resolve(data);
            tm.processWorks();
        };
    }

}

class ThreadManager {
    constructor() {
        this.actionQueue = [];
        this.oldPFree = 0;
    }

    startSyncOp() {
        if (this.oldPFree != 0) throw new Error("Sync operation in progress");
        this.oldPFree = this.u32[0];
    }

    endSyncOp() {
        if (this.oldPFree == 0) throw new Error("No sync operation in progress");
        this.u32[0] = this.oldPFree;
        this.oldPFree = 0;
    }

    postAction(workerId, e, transfers, _deferred) {
        if (this.working[workerId]) {
            throw new Error("Posting a job t a working worker");
        }
        this.working[workerId] = true;

        this.pendingDeferreds[workerId] = _deferred ? _deferred : new Deferred();
        this.workers[workerId].postMessage(e, transfers);

        return this.pendingDeferreds[workerId].promise;
    }

    processWorks() {
        for (let i=0; (i<this.workers.length)&&(this.actionQueue.length > 0); i++) {
            if (this.working[i] == false) {
                const work = this.actionQueue.shift();
                this.postAction(i, work.data, work.transfers, work.deferred);
            }
        }
    }

    queueAction(actionData, transfers) {
        const d = new Deferred();

        if (this.singleThread) {
            const res = this.taskManager(actionData);
            d.resolve(res);
        } else {
            this.actionQueue.push({
                data: actionData,
                transfers: transfers,
                deferred: d
            });
            this.processWorks();
        }
        return d.promise;
    }

    resetMemory() {
        this.u32[0] = this.initalPFree;
    }

    allocBuff(buff) {
        const pointer = this.alloc(buff.byteLength);
        this.setBuff(pointer, buff);
        return pointer;
    }

    getBuff(pointer, length) {
        return this.u8.slice(pointer, pointer+ length);
    }

    setBuff(pointer, buffer) {
        this.u8.set(new Uint8Array(buffer), pointer);
    }

    alloc(length) {
        while (this.u32[0] & 3) this.u32[0]++;  // Return always aligned pointers
        const res = this.u32[0];
        this.u32[0] += length;
        return res;
    }

    async terminate() {
        for (let i=0; i<this.workers.length; i++) {
            this.workers[i].postMessage([{cmd: "TERMINATE"}]);
        }
        await sleep(200);
    }

}

function buildBatchApplyKey(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = curve.tm;

    curve[groupName].batchApplyKey = async function(buff, first, inc, inType, outType) {
        inType = inType || "affine";
        outType = outType || "affine";
        let fnName, fnAffine;
        let sGin, sGmid, sGout;
        if (groupName == "G1") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g1m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g1m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g1m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "G2") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g2m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g2m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g2m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "Fr") {
            fnName = "frm_batchApplyKey";
            sGin = G.n8;
            sGmid = G.n8;
            sGout = G.n8;
        } else {
            throw new Error("Invalid group: " + groupName);
        }
        const nPoints = Math.floor(buff.byteLength / sGin);
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        inc = Fr.e(inc);
        let t = Fr.e(first);
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const task = [];

            task.push({
                cmd: "ALLOCSET",
                var: 0,
                buff: buff.slice(i*pointsPerChunk*sGin, i*pointsPerChunk*sGin + n*sGin)
            });
            task.push({cmd: "ALLOCSET", var: 1, buff: t});
            task.push({cmd: "ALLOCSET", var: 2, buff: inc});
            task.push({cmd: "ALLOC", var: 3, len: n*Math.max(sGmid, sGout)});
            task.push({
                cmd: "CALL",
                fnName: fnName,
                params: [
                    {var: 0},
                    {val: n},
                    {var: 1},
                    {var: 2},
                    {var:3}
                ]
            });
            if (fnAffine) {
                task.push({
                    cmd: "CALL",
                    fnName: fnAffine,
                    params: [
                        {var: 3},
                        {val: n},
                        {var: 3},
                    ]
                });
            }
            task.push({cmd: "GET", out: 0, var: 3, len: n*sGout});

            opPromises.push(tm.queueAction(task));
            t = Fr.mul(t, Fr.exp(inc, n));
        }

        const result = await Promise.all(opPromises);

        let outBuff;
        if (buff instanceof BigBuffer) {
            outBuff = new BigBuffer(nPoints*sGout);
        } else {
            outBuff = new Uint8Array(nPoints*sGout);
        }

        let p=0;
        for (let i=0; i<result.length; i++) {
            outBuff.set(result[i][0], p);
            p += result[i][0].byteLength;
        }

        return outBuff;
    };
}

function buildPairing(curve) {
    const tm = curve.tm;
    curve.pairing = function pairing(a, b) {

        tm.startSyncOp();
        const pA = tm.allocBuff(curve.G1.toJacobian(a));
        const pB = tm.allocBuff(curve.G2.toJacobian(b));
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports[curve.name + "_pairing"](pA, pB, pRes);

        const res = tm.getBuff(pRes, curve.Gt.n8);

        tm.endSyncOp();
        return res;
    };

    curve.pairingEq = async function pairingEq() {
        let  buffCt;
        let nEqs;
        if ((arguments.length % 2) == 1) {
            buffCt = arguments[arguments.length-1];
            nEqs = (arguments.length -1) /2;
        } else {
            buffCt = curve.Gt.one;
            nEqs = arguments.length /2;
        }

        const opPromises = [];
        for (let i=0; i<nEqs; i++) {

            const task = [];

            const g1Buff = curve.G1.toJacobian(arguments[i*2]);
            task.push({cmd: "ALLOCSET", var: 0, buff: g1Buff});
            task.push({cmd: "ALLOC", var: 1, len: curve.prePSize});

            const g2Buff = curve.G2.toJacobian(arguments[i*2 +1]);
            task.push({cmd: "ALLOCSET", var: 2, buff: g2Buff});
            task.push({cmd: "ALLOC", var: 3, len: curve.preQSize});

            task.push({cmd: "ALLOC", var: 4, len: curve.Gt.n8});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG1", params: [
                {var: 0},
                {var: 1}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG2", params: [
                {var: 2},
                {var: 3}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_millerLoop", params: [
                {var: 1},
                {var: 3},
                {var: 4}
            ]});

            task.push({cmd: "GET", out: 0, var: 4, len: curve.Gt.n8});

            opPromises.push(
                tm.queueAction(task)
            );
        }


        const result = await Promise.all(opPromises);

        tm.startSyncOp();
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports.ftm_one(pRes);

        for (let i=0; i<result.length; i++) {
            const pMR = tm.allocBuff(result[i][0]);
            tm.instance.exports.ftm_mul(pRes, pMR, pRes);
        }
        tm.instance.exports[curve.name + "_finalExponentiation"](pRes, pRes);

        const pCt = tm.allocBuff(buffCt);

        const r = !!tm.instance.exports.ftm_eq(pRes, pCt);

        tm.endSyncOp();

        return r;
    };

    curve.prepareG1 = function(p) {
        this.tm.startSyncOp();
        const pP = this.tm.allocBuff(p);
        const pPrepP = this.tm.alloc(this.prePSize);
        this.tm.instance.exports[this.name + "_prepareG1"](pP, pPrepP);
        const res = this.tm.getBuff(pPrepP, this.prePSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.prepareG2 = function(q) {
        this.tm.startSyncOp();
        const pQ = this.tm.allocBuff(q);
        const pPrepQ = this.tm.alloc(this.preQSize);
        this.tm.instance.exports[this.name + "_prepareG2"](pQ, pPrepQ);
        const res = this.tm.getBuff(pPrepQ, this.preQSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.millerLoop = function(preP, preQ) {
        this.tm.startSyncOp();
        const pPreP = this.tm.allocBuff(preP);
        const pPreQ = this.tm.allocBuff(preQ);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_millerLoop"](pPreP, pPreQ, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

    curve.finalExponentiation = function(a) {
        this.tm.startSyncOp();
        const pA = this.tm.allocBuff(a);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_finalExponentiation"](pA, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

}

const pTSizes = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 12,
    13, 13, 14, 15,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

function buildMultiexp(curve, groupName) {
    const G = curve[groupName];
    const tm = G.tm;
    async function _multiExpChunk(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
        }
        inType = inType || "affine";

        let sGIn;
        let fnName;
        if (groupName == "G1") {
            if (inType == "affine") {
                fnName = "g1m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g1m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "g2m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g2m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }
        const nPoints = Math.floor(buffBases.byteLength / sGIn);

        if (nPoints == 0) return G.zero;
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBases},
                {cmd: "ALLOCSET", var: 1, buff: buffScalars},
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {var: 1},
                    {val: sScalar},
                    {val: nPoints},
                    {val: i*bitChunkSize},
                    {val: Math.min(sScalar*8 - i*bitChunkSize, bitChunkSize)},
                    {var: 2}
                ]},
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
        }

        return res;
    }

    async function _multiExp(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 22;
        const MIN_CHUNK_SIZE = 1 << 10;
        let sGIn;

        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        let chunkSize;
        chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;

        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            opPromises.push(_multiExpChunk(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
                if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
                return r;
            }));
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i]);
        }

        return res;
    }

    G.multiExp = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "jacobian", logger, logText);
    };
    G.multiExpAffine = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "affine", logger, logText);
    };
}

function buildFFT(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = G.tm;
    async function _fft(buff, inverse, inType, outType, logger, loggerTxt) {

        inType = inType || "affine";
        outType = outType || "affine";
        const MAX_BITS_THREAD = 14;

        let sIn, sMid, sOut, fnIn2Mid, fnMid2Out, fnFFTMix, fnFFTJoin, fnFFTFinal;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g1m_fftFinal";
            }
            fnFFTJoin = "g1m_fftJoin";
            fnFFTMix = "g1m_fftMix";

            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g1m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }

        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g2m_fftFinal";
            }
            fnFFTJoin = "g2m_fftJoin";
            fnFFTMix = "g2m_fftMix";
            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g2m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = G.n8;
            sMid = G.n8;
            sOut = G.n8;
            if (inverse) {
                fnFFTFinal = "frm_fftFinal";
            }
            fnFFTMix = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        }


        let returnArray = false;
        if (Array.isArray(buff)) {
            buff = array2buffer(buff, sIn);
            returnArray = true;
        } else {
            buff = buff.slice(0, buff.byteLength);
        }

        const nPoints = buff.byteLength / sIn;
        const bits = log2(nPoints);

        if  ((1 << bits) != nPoints) {
            throw new Error("fft must be multiple of 2" );
        }

        if (bits == Fr.s +1) {
            let buffOut;

            if (inverse) {
                buffOut =  await _fftExtInv(buff, inType, outType, logger, loggerTxt);
            } else {
                buffOut =  await _fftExt(buff, inType, outType, logger, loggerTxt);
            }

            if (returnArray) {
                return buffer2array(buffOut, sOut);
            } else {
                return buffOut;
            }
        }

        let inv;
        if (inverse) {
            inv = Fr.inv(Fr.e(nPoints));
        }

        let buffOut;

        buffReverseBits(buff, sIn);

        let chunks;
        let pointsInChunk = Math.min(1 << MAX_BITS_THREAD, nPoints);
        let nChunks = nPoints / pointsInChunk;

        while ((nChunks < tm.concurrency)&&(pointsInChunk>=16)) {
            nChunks *= 2;
            pointsInChunk /= 2;
        }

        const l2Chunk = log2(pointsInChunk);

        const promises = [];
        for (let i = 0; i< nChunks; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix start: ${i}/${nChunks}`);
            const task = [];
            task.push({cmd: "ALLOC", var: 0, len: sMid*pointsInChunk});
            const buffChunk = buff.slice( (pointsInChunk * i)*sIn, (pointsInChunk * (i+1))*sIn);
            task.push({cmd: "SET", var: 0, buff: buffChunk});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
            }
            for (let j=1; j<=l2Chunk;j++) {
                task.push({cmd: "CALL", fnName:fnFFTMix, params: [{var:0}, {val: pointsInChunk}, {val: j}]});
            }

            if (l2Chunk==bits) {
                if (fnFFTFinal) {
                    task.push({cmd: "ALLOCSET", var: 1, buff: inv});
                    task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                        {var: 0},
                        {val: pointsInChunk},
                        {var: 1},
                    ]});
                }
                if (fnMid2Out) {
                    task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                }
                task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
            } else {
                task.push({cmd: "GET", out:0, var: 0, len: sMid*pointsInChunk});
            }
            promises.push(tm.queueAction(task).then( (r) => {
                if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix end: ${i}/${nChunks}`);
                return r;
            }));
        }

        chunks = await Promise.all(promises);
        for (let i = 0; i< nChunks; i++) chunks[i] = chunks[i][0];

        for (let i = l2Chunk+1;   i<=bits; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft  ${bits}  join: ${i}/${bits}`);
            const nGroups = 1 << (bits - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsInChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsInChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    if (i==bits) {
                        if (fnFFTFinal) {
                            task.push({cmd: "ALLOCSET", var: 4, buff: inv});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 0},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 1},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                        }
                        if (fnMid2Out) {
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: pointsInChunk}, {var: 1}]});
                        }
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sOut});
                    } else {
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sMid});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sMid});
                    }
                    opPromises.push(tm.queueAction(task).then( (r) => {
                        if (logger) logger.debug(`${loggerTxt}: fft ${bits} join  ${i}/${bits}  ${j+1}/${nGroups} ${k}/${nChunksPerGroup/2}`);
                        return r;
                    }));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        if (buff instanceof BigBuffer) {
            buffOut = new BigBuffer(nPoints*sOut);
        } else {
            buffOut = new Uint8Array(nPoints*sOut);
        }
        if (inverse) {
            buffOut.set(chunks[0].slice((pointsInChunk-1)*sOut));
            let p= sOut;
            for (let i=nChunks-1; i>0; i--) {
                buffOut.set(chunks[i], p);
                p += pointsInChunk*sOut;
                delete chunks[i];  // Liberate mem
            }
            buffOut.set(chunks[0].slice(0, (pointsInChunk-1)*sOut), p);
            delete chunks[0];
        } else {
            for (let i=0; i<nChunks; i++) {
                buffOut.set(chunks[i], pointsInChunk*sOut*i);
                delete chunks[i];
            }
        }

        if (returnArray) {
            return buffer2array(buffOut, sOut);
        } else {
            return buffOut;
        }
    }

    async function _fftExt(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        [b1, b2] = await _fftJoinExt(b1, b2, "fftJoinExt", Fr.one, Fr.shift, inType, "jacobian", logger, loggerTxt);

        promises.push( _fft(b1, false, "jacobian", outType, logger, loggerTxt));
        promises.push( _fft(b2, false, "jacobian", outType, logger, loggerTxt));

        const res1 = await Promise.all(promises);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }

    async function _fftExtInv(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        promises.push( _fft(b1, true, inType, "jacobian", logger, loggerTxt));
        promises.push( _fft(b2, true, inType, "jacobian", logger, loggerTxt));

        [b1, b2] = await Promise.all(promises);

        const res1 = await _fftJoinExt(b1, b2, "fftJoinExtInv", Fr.one, Fr.shiftInv, "jacobian", outType, logger, loggerTxt);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }


    async function _fftJoinExt(buff1, buff2, fn, first, inc, inType, outType, logger, loggerTxt) {
        const MAX_CHUNK_SIZE = 1<<16;
        const MIN_CHUNK_SIZE = 1<<4;

        let fnName;
        let fnIn2Mid, fnMid2Out;
        let sOut, sIn, sMid;

        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            fnName = "g1m_"+fn;
            if (outType == "affine") {
                fnMid2Out = "g1m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            fnName = "g2m_"+fn;
            sMid = G.F.n8*3;
            if (outType == "affine") {
                fnMid2Out = "g2m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
            sOut = Fr.n8;
            sMid = Fr.n8;
            fnName = "frm_" + fn;
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sIn);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let chunkSize = Math.floor(nPoints /tm.concurrency);
        if (chunkSize < MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;
        if (chunkSize > MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;

        const opPromises = [];

        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`${loggerTxt}: fftJoinExt Start: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);

            const firstChunk = Fr.mul(first, Fr.exp( inc, i));
            const task = [];

            const b1 = buff1.slice(i*sIn, (i+n)*sIn);
            const b2 = buff2.slice(i*sIn, (i+n)*sIn);

            task.push({cmd: "ALLOC", var: 0, len: sMid*n});
            task.push({cmd: "SET", var: 0, buff: b1});
            task.push({cmd: "ALLOC", var: 1, len: sMid*n});
            task.push({cmd: "SET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: n},
                {var: 2},
                {var: 3},
                {val: Fr.s},
            ]});
            if (fnMid2Out) {
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: n*sOut});
            task.push({cmd: "GET", out: 1, var: 1, len: n*sOut});
            opPromises.push(
                tm.queueAction(task).then( (r) => {
                    if (logger) logger.debug(`${loggerTxt}: fftJoinExt End: ${i}/${nPoints}`);
                    return r;
                })
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (nPoints * sOut > 1<<28) {
            fullBuffOut1 = new BigBuffer(nPoints*sOut);
            fullBuffOut2 = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sOut);
            fullBuffOut2 = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    }


    G.fft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, false, inType, outType, logger, loggerTxt);
    };

    G.ifft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, true, inType, outType, logger, loggerTxt);
    };

    G.lagrangeEvaluations = async function (buff, inType, outType, logger, loggerTxt) {
        inType = inType || "affine";
        outType = outType || "affine";

        let sIn;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = buff.byteLength /sIn;
        const bits = log2(nPoints);

        if ((2 ** bits)*sIn != buff.byteLength) {
            if (logger) logger.error("lagrangeEvaluations iinvalid input size");
            throw new Error("lagrangeEvaluations invalid Input size");
        }

        if (bits <= Fr.s) {
            return await G.ifft(buff, inType, outType, logger, loggerTxt);
        }

        if (bits > Fr.s+1) {
            if (logger) logger.error("lagrangeEvaluations input too big");
            throw new Error("lagrangeEvaluations input too big");
        }

        let t0 = buff.slice(0, buff.byteLength/2);
        let t1 = buff.slice(buff.byteLength/2, buff.byteLength);


        const shiftToSmallM = Fr.exp(Fr.shift, nPoints/2);
        const sConst = Fr.inv( Fr.sub(Fr.one, shiftToSmallM));

        [t0, t1] = await _fftJoinExt(t0, t1, "prepareLagrangeEvaluation", sConst, Fr.shiftInv, inType, "jacobian", logger, loggerTxt + " prep");

        const promises = [];

        promises.push( _fft(t0, true, "jacobian", outType, logger, loggerTxt + " t0"));
        promises.push( _fft(t1, true, "jacobian", outType, logger, loggerTxt + " t1"));

        [t0, t1] = await Promise.all(promises);

        let buffOut;
        if (t0.byteLength > (1<<28)) {
            buffOut = new BigBuffer(t0.byteLength*2);
        } else {
            buffOut = new Uint8Array(t0.byteLength*2);
        }

        buffOut.set(t0);
        buffOut.set(t1, t0.byteLength);

        return buffOut;
    };

    G.fftMix = async function fftMix(buff) {
        const sG = G.F.n8*3;
        let fnName, fnFFTJoin;
        if (groupName == "G1") {
            fnName = "g1m_fftMix";
            fnFFTJoin = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftMix";
            fnFFTJoin = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        const power = log2(nPoints);

        let nChunks = 1 << log2(tm.concurrency);

        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;

        const powerChunk = log2(pointsPerChunk);

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            for (let j=1; j<=powerChunk; j++) {
                task.push({cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: pointsPerChunk},
                    {val: j}
                ]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        const chunks = [];
        for (let i=0; i<result.length; i++) chunks[i] = result[i][0];


        for (let i = powerChunk+1; i<=power; i++) {
            const nGroups = 1 << (power - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsPerChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsPerChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
                    task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
                    opPromises.push(tm.queueAction(task));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sG);
        }
        let p =0;
        for (let i=0; i<nChunks; i++) {
            fullBuffOut.set(chunks[i], p);
            p+=chunks[i].byteLength;
        }

        return fullBuffOut;
    };

    G.fftJoin = async function fftJoin(buff1, buff2, first, inc) {
        const sG = G.F.n8*3;
        let fnName;
        if (groupName == "G1") {
            fnName = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let nChunks = 1 << log2(tm.concurrency);
        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;


        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];

            const firstChunk = Fr.mul(first, Fr.exp(inc, i*pointsPerChunk));
            const b1 = buff1.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            const b2 = buff2.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b1});
            task.push({cmd: "ALLOCSET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: pointsPerChunk},
                {var: 2},
                {var: 3}
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );

        }


        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (buff1 instanceof BigBuffer) {
            fullBuffOut1 = new BigBuffer(nPoints*sG);
            fullBuffOut2 = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sG);
            fullBuffOut2 = new Uint8Array(nPoints*sG);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    };



    G.fftFinal =  async function fftFinal(buff, factor) {
        const sG = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnName, fnToAffine;
        if (groupName == "G1") {
            fnName = "g1m_fftFinal";
            fnToAffine = "g1m_batchToAffine";
        } else if (groupName == "G2") {
            fnName = "g2m_fftFinal";
            fnToAffine = "g2m_batchToAffine";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        const pointsPerChunk = Math.floor(nPoints / tm.concurrency);

        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, (i*pointsPerChunk+n)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            task.push({cmd: "ALLOCSET", var: 1, buff: factor});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {val: n},
                {var: 1},
            ]});
            task.push({cmd: "CALL", fnName: fnToAffine, params: [
                {var: 0},
                {val: n},
                {var: 0},
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: n*sGout});
            opPromises.push(
                tm.queueAction(task)
            );

        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sGout);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sGout);
        }

        let p =0;
        for (let i=result.length-1; i>=0; i--) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

async function buildEngine(params) {

    const tm = await buildThreadManager(params.wasm, params.singleThread);


    const curve = {};

    curve.q = e(params.wasm.q);
    curve.r = e(params.wasm.r);
    curve.name = params.name;
    curve.tm = tm;
    curve.prePSize = params.wasm.prePSize;
    curve.preQSize = params.wasm.preQSize;
    curve.Fr = new WasmField1(tm, "frm", params.n8r, params.r);
    curve.F1 = new WasmField1(tm, "f1m", params.n8q, params.q);
    curve.F2 = new WasmField2(tm, "f2m", curve.F1);
    curve.G1 = new WasmCurve(tm, "g1m", curve.F1, params.wasm.pG1gen, params.wasm.pG1b, params.cofactorG1);
    curve.G2 = new WasmCurve(tm, "g2m", curve.F2, params.wasm.pG2gen, params.wasm.pG2b, params.cofactorG2);
    curve.F6 = new WasmField3(tm, "f6m", curve.F2);
    curve.F12 = new WasmField2(tm, "ftm", curve.F6);

    curve.Gt = curve.F12;

    buildBatchApplyKey(curve, "G1");
    buildBatchApplyKey(curve, "G2");
    buildBatchApplyKey(curve, "Fr");

    buildMultiexp(curve, "G1");
    buildMultiexp(curve, "G2");

    buildFFT(curve, "G1");
    buildFFT(curve, "G2");
    buildFFT(curve, "Fr");

    buildPairing(curve);

    curve.array2buffer = function(arr, sG) {
        const buff = new Uint8Array(sG*arr.length);

        for (let i=0; i<arr.length; i++) {
            buff.set(arr[i], i*sG);
        }

        return buff;
    };

    curve.buffer2array = function(buff , sG) {
        const n= buff.byteLength / sG;
        const arr = new Array(n);
        for (let i=0; i<n; i++) {
            arr[i] = buff.slice(i*sG, i*sG+sG);
        }
        return arr;
    };

    return curve;
}

var wasmbuilder = {};

var utils = {};

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;
	const bigInt = /*@__PURE__*/ requireBigInteger();

	function toNumber(n) {
	    let v;
	    if (typeof n=="string") {
	        if (n.slice(0,2).toLowerCase() == "0x") {
	            v = bigInt(n.slice(2),16);
	        } else {
	            v = bigInt(n);
	        }
	    } else {
	        v = bigInt(n);
	    }
	    return v;
	}

	function u32(n) {
	    const b = [];
	    const v = toNumber(n);
	    b.push(v.and(0xFF).toJSNumber());
	    b.push(v.shiftRight(8).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(16).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(24).and(0xFF).toJSNumber());
	    return b;
	}

	function u64(n) {
	    const b = [];
	    const v = toNumber(n);
	    b.push(v.and(0xFF).toJSNumber());
	    b.push(v.shiftRight(8).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(16).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(24).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(32).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(40).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(48).and(0xFF).toJSNumber());
	    b.push(v.shiftRight(56).and(0xFF).toJSNumber());
	    return b;
	}

	function toUTF8Array(str) {
	    var utf8 = [];
	    for (var i=0; i < str.length; i++) {
	        var charcode = str.charCodeAt(i);
	        if (charcode < 0x80) utf8.push(charcode);
	        else if (charcode < 0x800) {
	            utf8.push(0xc0 | (charcode >> 6),
	                      0x80 | (charcode & 0x3f));
	        }
	        else if (charcode < 0xd800 || charcode >= 0xe000) {
	            utf8.push(0xe0 | (charcode >> 12),
	                      0x80 | ((charcode>>6) & 0x3f),
	                      0x80 | (charcode & 0x3f));
	        }
	        // surrogate pair
	        else {
	            i++;
	            // UTF-16 encodes 0x10000-0x10FFFF by
	            // subtracting 0x10000 and splitting the
	            // 20 bits of 0x0-0xFFFFF into two halves
	            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
	                      | (str.charCodeAt(i) & 0x3ff));
	            utf8.push(0xf0 | (charcode >>18),
	                      0x80 | ((charcode>>12) & 0x3f),
	                      0x80 | ((charcode>>6) & 0x3f),
	                      0x80 | (charcode & 0x3f));
	        }
	    }
	    return utf8;
	}

	function string(str) {
	    const bytes = toUTF8Array(str);
	    return [ ...varuint32(bytes.length), ...bytes ];
	}

	function varuint(n) {
	    const code = [];
	    let v = toNumber(n);
	    if (v.isNegative()) throw new Error("Number cannot be negative");
	    while (!v.isZero()) {
	        code.push(v.and(0x7F).toJSNumber());
	        v = v.shiftRight(7);
	    }
	    if (code.length==0) code.push(0);
	    for (let i=0; i<code.length-1; i++) {
	        code[i] = code[i] | 0x80;
	    }
	    return code;
	}

	function varint(_n) {
	    let n, sign;
	    const bits = _n.bitLength().toJSNumber();
	    if (_n<0) {
	        sign = true;
	        n = bigInt.one.shiftLeft(bits).add(_n);
	    } else {
	        sign = false;
	        n = toNumber(_n);
	    }
	    const paddingBits = 7 - (bits % 7);

	    const padding = bigInt.one.shiftLeft(paddingBits).minus(1).shiftLeft(bits);
	    const paddingMask = ((1 << (7 - paddingBits))-1) | 0x80;

	    const code = varuint(n.add(padding));

	    if (!sign) {
	        code[code.length-1] = code[code.length-1] & paddingMask;
	    }

	    return code;
	}

	function varint32(n) {
	    let v = toNumber(n);
	    if (v.greater(bigInt("FFFFFFFF", 16))) throw new Error("Number too big");
	    if (v.greater(bigInt("7FFFFFFF", 16))) v = v.minus(bigInt("100000000",16));
	    if (v.lesser(bigInt("-80000000", 16))) throw new Error("Number too small");
	    return varint(v);
	}

	function varint64(n) {
	    let v = toNumber(n);
	    if (v.greater(bigInt("FFFFFFFFFFFFFFFF", 16))) throw new Error("Number too big");
	    if (v.greater(bigInt("7FFFFFFFFFFFFFFF", 16))) v = v.minus(bigInt("10000000000000000",16));
	    if (v.lesser(bigInt("-8000000000000000", 16))) throw new Error("Number too small");
	    return varint(v);
	}

	function varuint32(n) {
	    let v = toNumber(n);
	    if (v.greater(bigInt("FFFFFFFF", 16))) throw new Error("Number too big");
	    return varuint(v);
	}

	function varuint64(n) {
	    let v = toNumber(n);
	    if (v.greater(bigInt("FFFFFFFFFFFFFFFF", 16))) throw new Error("Number too big");
	    return varuint(v);
	}

	function toHexString(byteArray) {
	    return Array.from(byteArray, function(byte) {
	        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
	    }).join("");
	}

	function ident(text) {
	    if (typeof text === "string") {
	        let lines = text.split("\n");
	        for (let i=0; i<lines.length; i++) {
	            if (lines[i]) lines[i] = "    "+lines[i];
	        }
	        return lines.join("\n");
	    } else if (Array.isArray(text)) {
	        for (let i=0; i<text.length; i++ ) {
	            text[i] = ident(text[i]);
	        }
	        return text;
	    }
	}

	utils.toNumber = toNumber;
	utils.u32 = u32;
	utils.u64 = u64;
	utils.varuint32 = varuint32;
	utils.varuint64 = varuint64;
	utils.varint32 = varint32;
	utils.varint64 = varint64;
	utils.string = string;
	utils.toHexString = toHexString;
	utils.ident = ident;
	return utils;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var codebuilder;
var hasRequiredCodebuilder;

function requireCodebuilder () {
	if (hasRequiredCodebuilder) return codebuilder;
	hasRequiredCodebuilder = 1;
	const utils = /*@__PURE__*/ requireUtils();

	class CodeBuilder {
	    constructor(func) {
	        this.func = func;
	        this.functionName = func.functionName;
	        this.module = func.module;
	    }

	    setLocal(localName, valCode) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return [...valCode, 0x21, ...utils.varuint32( idx )];
	    }

	    teeLocal(localName, valCode) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return [...valCode, 0x22, ...utils.varuint32( idx )];
	    }

	    getLocal(localName) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return [0x20, ...utils.varuint32( idx )];
	    }

	    i64_load8_s(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 0 : _align;  // 8 bits alignment by default
	        return [...idxCode, 0x30, align, ...utils.varuint32(offset)];
	    }

	    i64_load8_u(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 0 : _align;  // 8 bits alignment by default
	        return [...idxCode, 0x31, align, ...utils.varuint32(offset)];
	    }

	    i64_load16_s(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 1 : _align;  // 16 bits alignment by default
	        return [...idxCode, 0x32, align, ...utils.varuint32(offset)];
	    }

	    i64_load16_u(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 1 : _align;  // 16 bits alignment by default
	        return [...idxCode, 0x33, align, ...utils.varuint32(offset)];
	    }

	    i64_load32_s(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x34, align, ...utils.varuint32(offset)];
	    }

	    i64_load32_u(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x35, align, ...utils.varuint32(offset)];
	    }

	    i64_load(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 3 : _align;  // 64 bits alignment by default
	        return [...idxCode, 0x29, align, ...utils.varuint32(offset)];
	    }


	    i64_store(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 3;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 3;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x37, align, ...utils.varuint32(offset)];
	    }

	    i64_store32(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 2;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 2;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x3e, align, ...utils.varuint32(offset)];
	    }


	    i64_store16(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 1;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 1;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x3d, align, ...utils.varuint32(offset)];
	    }


	    i64_store8(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 0;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 0;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x3c, align, ...utils.varuint32(offset)];
	    }

	    i32_load8_s(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 0 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x2c, align, ...utils.varuint32(offset)];
	    }

	    i32_load8_u(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 0 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x2d, align, ...utils.varuint32(offset)];
	    }

	    i32_load16_s(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 1 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x2e, align, ...utils.varuint32(offset)];
	    }

	    i32_load16_u(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 1 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x2f, align, ...utils.varuint32(offset)];
	    }

	    i32_load(idxCode, _offset, _align) {
	        const offset = _offset || 0;
	        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
	        return [...idxCode, 0x28, align, ...utils.varuint32(offset)];
	    }

	    i32_store(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 2;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 2;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x36, align, ...utils.varuint32(offset)];
	    }


	    i32_store16(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 1;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 1;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x3b, align, ...utils.varuint32(offset)];
	    }

	    i32_store8(idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (Array.isArray(_offset)) {
	            offset = 0;
	            align = 0;
	            codeVal = _offset;
	        } else if (Array.isArray(_align)) {
	            offset = _offset;
	            align = 0;
	            codeVal = _align;
	        } else if (Array.isArray(_codeVal)) {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        return [...idxCode, ...codeVal, 0x3a, align, ...utils.varuint32(offset)];
	    }

	    call(fnName, ...args) {
	        const idx = this.module.functionIdxByName[fnName];
	        if (idx === undefined)
	            throw new Error(`Function not defined: Function: ${fnName}`);
	        return [...[].concat(...args), 0x10, ...utils.varuint32(idx)];
	    }

	    call_indirect(fnIdx, ...args) {
	        return [...[].concat(...args), ...fnIdx, 0x11, 0, 0];
	    }

	    if(condCode, thenCode, elseCode) {
	        if (elseCode) {
	            return [...condCode, 0x04, 0x40, ...thenCode, 0x05, ...elseCode, 0x0b];
	        } else {
	            return [...condCode, 0x04, 0x40, ...thenCode, 0x0b];
	        }
	    }

	    block(bCode) { return [0x02, 0x40, ...bCode, 0x0b]; }
	    loop(...args) {
	        return [0x03, 0x40, ...[].concat(...[...args]), 0x0b];
	    }
	    br_if(relPath, condCode) { return [...condCode, 0x0d, ...utils.varuint32(relPath)]; }
	    br(relPath) { return [0x0c, ...utils.varuint32(relPath)]; }
	    ret(rCode) { return [...rCode, 0x0f]; }
	    drop(dCode) { return [...dCode,  0x1a]; }

	    i64_const(num) { return [0x42, ...utils.varint64(num)]; }
	    i32_const(num) { return [0x41, ...utils.varint32(num)]; }


	    i64_eqz(opcode) { return [...opcode, 0x50]; }
	    i64_eq(op1code, op2code) { return [...op1code, ...op2code, 0x51]; }
	    i64_ne(op1code, op2code) { return [...op1code, ...op2code, 0x52]; }
	    i64_lt_s(op1code, op2code) { return [...op1code, ...op2code, 0x53]; }
	    i64_lt_u(op1code, op2code) { return [...op1code, ...op2code, 0x54]; }
	    i64_gt_s(op1code, op2code) { return [...op1code, ...op2code, 0x55]; }
	    i64_gt_u(op1code, op2code) { return [...op1code, ...op2code, 0x56]; }
	    i64_le_s(op1code, op2code) { return [...op1code, ...op2code, 0x57]; }
	    i64_le_u(op1code, op2code) { return [...op1code, ...op2code, 0x58]; }
	    i64_ge_s(op1code, op2code) { return [...op1code, ...op2code, 0x59]; }
	    i64_ge_u(op1code, op2code) { return [...op1code, ...op2code, 0x5a]; }
	    i64_add(op1code, op2code) { return [...op1code, ...op2code, 0x7c]; }
	    i64_sub(op1code, op2code) { return [...op1code, ...op2code, 0x7d]; }
	    i64_mul(op1code, op2code) { return [...op1code, ...op2code, 0x7e]; }
	    i64_div_s(op1code, op2code) { return [...op1code, ...op2code, 0x7f]; }
	    i64_div_u(op1code, op2code) { return [...op1code, ...op2code, 0x80]; }
	    i64_rem_s(op1code, op2code) { return [...op1code, ...op2code, 0x81]; }
	    i64_rem_u(op1code, op2code) { return [...op1code, ...op2code, 0x82]; }
	    i64_and(op1code, op2code) { return [...op1code, ...op2code, 0x83]; }
	    i64_or(op1code, op2code) { return [...op1code, ...op2code, 0x84]; }
	    i64_xor(op1code, op2code) { return [...op1code, ...op2code, 0x85]; }
	    i64_shl(op1code, op2code) { return [...op1code, ...op2code, 0x86]; }
	    i64_shr_s(op1code, op2code) { return [...op1code, ...op2code, 0x87]; }
	    i64_shr_u(op1code, op2code) { return [...op1code, ...op2code, 0x88]; }
	    i64_extend_i32_s(op1code) { return [...op1code, 0xac]; }
	    i64_extend_i32_u(op1code) { return [...op1code, 0xad]; }
	    i64_clz(op1code) { return [...op1code, 0x79]; }
	    i64_ctz(op1code) { return [...op1code, 0x7a]; }

	    i32_eqz(op1code) { return [...op1code, 0x45]; }
	    i32_eq(op1code, op2code) { return [...op1code, ...op2code, 0x46]; }
	    i32_ne(op1code, op2code) { return [...op1code, ...op2code, 0x47]; }
	    i32_lt_s(op1code, op2code) { return [...op1code, ...op2code, 0x48]; }
	    i32_lt_u(op1code, op2code) { return [...op1code, ...op2code, 0x49]; }
	    i32_gt_s(op1code, op2code) { return [...op1code, ...op2code, 0x4a]; }
	    i32_gt_u(op1code, op2code) { return [...op1code, ...op2code, 0x4b]; }
	    i32_le_s(op1code, op2code) { return [...op1code, ...op2code, 0x4c]; }
	    i32_le_u(op1code, op2code) { return [...op1code, ...op2code, 0x4d]; }
	    i32_ge_s(op1code, op2code) { return [...op1code, ...op2code, 0x4e]; }
	    i32_ge_u(op1code, op2code) { return [...op1code, ...op2code, 0x4f]; }
	    i32_add(op1code, op2code) { return [...op1code, ...op2code, 0x6a]; }
	    i32_sub(op1code, op2code) { return [...op1code, ...op2code, 0x6b]; }
	    i32_mul(op1code, op2code) { return [...op1code, ...op2code, 0x6c]; }
	    i32_div_s(op1code, op2code) { return [...op1code, ...op2code, 0x6d]; }
	    i32_div_u(op1code, op2code) { return [...op1code, ...op2code, 0x6e]; }
	    i32_rem_s(op1code, op2code) { return [...op1code, ...op2code, 0x6f]; }
	    i32_rem_u(op1code, op2code) { return [...op1code, ...op2code, 0x70]; }
	    i32_and(op1code, op2code) { return [...op1code, ...op2code, 0x71]; }
	    i32_or(op1code, op2code) { return [...op1code, ...op2code, 0x72]; }
	    i32_xor(op1code, op2code) { return [...op1code, ...op2code, 0x73]; }
	    i32_shl(op1code, op2code) { return [...op1code, ...op2code, 0x74]; }
	    i32_shr_s(op1code, op2code) { return [...op1code, ...op2code, 0x75]; }
	    i32_shr_u(op1code, op2code) { return [...op1code, ...op2code, 0x76]; }
	    i32_rotl(op1code, op2code) { return [...op1code, ...op2code, 0x77]; }
	    i32_rotr(op1code, op2code) { return [...op1code, ...op2code, 0x78]; }
	    i32_wrap_i64(op1code) { return [...op1code, 0xa7]; }
	    i32_clz(op1code) { return [...op1code, 0x67]; }
	    i32_ctz(op1code) { return [...op1code, 0x68]; }

	    unreachable() { return [ 0x0 ]; }

	    current_memory() { return [ 0x3f, 0]; }

	    comment() { return []; }
	}

	codebuilder = CodeBuilder;
	return codebuilder;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var functionbuilder;
var hasRequiredFunctionbuilder;

function requireFunctionbuilder () {
	if (hasRequiredFunctionbuilder) return functionbuilder;
	hasRequiredFunctionbuilder = 1;
	const CodeBuilder = /*@__PURE__*/ requireCodebuilder();
	const utils = /*@__PURE__*/ requireUtils();

	const typeCodes = {
	    "i32": 0x7f,
	    "i64": 0x7e,
	    "f32": 0x7d,
	    "f64": 0x7c,
	    "anyfunc": 0x70,
	    "func": 0x60,
	    "emptyblock": 0x40
	};


	class FunctionBuilder {

	    constructor (module, fnName, fnType, moduleName, fieldName) {
	        if (fnType == "import") {
	            this.fnType = "import";
	            this.moduleName = moduleName;
	            this.fieldName = fieldName;
	        } else if (fnType == "internal") {
	            this.fnType = "internal";
	        } else {
	            throw new Error("Invalid function fnType: " + fnType);
	        }
	        this.module = module;
	        this.fnName = fnName;
	        this.params = [];
	        this.locals = [];
	        this.localIdxByName = {};
	        this.code = [];
	        this.returnType = null;
	        this.nextLocal =0;
	    }

	    addParam(paramName, paramType) {
	        if (this.localIdxByName[paramName])
	            throw new Error(`param already exists. Function: ${this.fnName}, Param: ${paramName} `);
	        const idx = this.nextLocal++;
	        this.localIdxByName[paramName] = idx;
	        this.params.push({
	            type: paramType
	        });
	    }

	    addLocal(localName, localType, _length) {
	        const length = _length || 1;
	        if (this.localIdxByName[localName])
	            throw new Error(`local already exists. Function: ${this.fnName}, Param: ${localName} `);
	        const idx = this.nextLocal++;
	        this.localIdxByName[localName] = idx;
	        this.locals.push({
	            type: localType,
	            length: length
	        });
	    }

	    setReturnType(returnType) {
	        if (this.returnType)
	            throw new Error(`returnType already defined. Function: ${this.fnName}`);
	        this.returnType = returnType;
	    }

	    getSignature() {
	        const params = [...utils.varuint32(this.params.length), ...this.params.map((p) => typeCodes[p.type])];
	        const returns = this.returnType ? [0x01, typeCodes[this.returnType]] : [0];
	        return [0x60, ...params, ...returns];
	    }

	    getBody() {
	        const locals = this.locals.map((l) => [
	            ...utils.varuint32(l.length),
	            typeCodes[l.type]
	        ]);

	        const body = [
	            ...utils.varuint32(this.locals.length),
	            ...[].concat(...locals),
	            ...this.code,
	            0x0b
	        ];
	        return [
	            ...utils.varuint32(body.length),
	            ...body
	        ];
	    }

	    addCode(...code) {
	        this.code.push(...[].concat(...[...code]));
	    }

	    getCodeBuilder() {
	        return new CodeBuilder(this);
	    }
	}

	functionbuilder = FunctionBuilder;
	return functionbuilder;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var modulebuilder;
var hasRequiredModulebuilder;

function requireModulebuilder () {
	if (hasRequiredModulebuilder) return modulebuilder;
	hasRequiredModulebuilder = 1;
	const FunctionBuilder = /*@__PURE__*/ requireFunctionbuilder();
	const utils = /*@__PURE__*/ requireUtils();

	class ModuleBuilder {

	    constructor() {
	        this.functions = [];
	        this.functionIdxByName = {};
	        this.nImportFunctions = 0;
	        this.nInternalFunctions =0;
	        this.memory = {
	            pagesSize: 1,
	            moduleName: "env",
	            fieldName: "memory"
	        };
	        this.free = 8;
	        this.datas = [];
	        this.modules = {};
	        this.exports = [];
	        this.functionsTable = [];
	    }

	    build() {
	        this._setSignatures();
	        return new Uint8Array([
	            ...utils.u32(0x6d736100),
	            ...utils.u32(1),
	            ...this._buildType(),
	            ...this._buildImport(),
	            ...this._buildFunctionDeclarations(),
	            ...this._buildFunctionsTable(),
	            ...this._buildExports(),
	            ...this._buildElements(),
	            ...this._buildCode(),
	            ...this._buildData()
	        ]);
	    }

	    addFunction(fnName) {
	        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
	            throw new Error(`Function already defined: ${fnName}`);

	        const idx = this.functions.length;
	        this.functionIdxByName[fnName] = idx;

	        this.functions.push(new FunctionBuilder(this, fnName, "internal"));

	        this.nInternalFunctions++;
	        return this.functions[idx];
	    }

	    addIimportFunction(fnName, moduleName, _fieldName) {
	        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
	            throw new Error(`Function already defined: ${fnName}`);

	        if (  (this.functions.length>0)
	            &&(this.functions[this.functions.length-1].type == "internal"))
	            throw new Error(`Import functions must be declared before internal: ${fnName}`);

	        let fieldName = _fieldName || fnName;

	        const idx = this.functions.length;
	        this.functionIdxByName[fnName] = idx;

	        this.functions.push(new FunctionBuilder(this, fnName, "import", moduleName, fieldName));

	        this.nImportFunctions ++;
	        return this.functions[idx];
	    }

	    setMemory(pagesSize, moduleName, fieldName) {
	        this.memory = {
	            pagesSize: pagesSize,
	            moduleName: moduleName || "env",
	            fieldName: fieldName || "memory"
	        };
	    }

	    exportFunction(fnName, _exportName) {
	        const exportName = _exportName || fnName;
	        if (typeof(this.functionIdxByName[fnName]) === "undefined")
	            throw new Error(`Function not defined: ${fnName}`);
	        const idx = this.functionIdxByName[fnName];
	        if (exportName != fnName) {
	            this.functionIdxByName[exportName] = idx;
	        }
	        this.exports.push({
	            exportName: exportName,
	            idx: idx
	        });
	    }

	    addFunctionToTable(fnName) {
	        const idx = this.functionIdxByName[fnName];
	        this.functionsTable.push(idx);
	    }

	    addData(offset, bytes) {
	        this.datas.push({
	            offset: offset,
	            bytes: bytes
	        });
	    }

	    alloc(a, b) {
	        let size;
	        let bytes;
	        if ((Array.isArray(a) || ArrayBuffer.isView(a)) && (typeof(b) === "undefined")) {
	            size = a.length;
	            bytes = a;
	        } else {
	            size = a;
	            bytes = b;
	        }
	        size = (((size-1)>>3) +1)<<3;       // Align to 64 bits.
	        const p = this.free;
	        this.free += size;
	        if (bytes) {
	            this.addData(p, bytes);
	        }
	        return p;
	    }

	    allocString(s) {
	        const encoder = new globalThis.TextEncoder();
	        const uint8array = encoder.encode(s);
	        return this.alloc([...uint8array, 0]);
	    }

	    _setSignatures() {
	        this.signatures = [];
	        const signatureIdxByName = {};
	        if (this.functionsTable.length>0) {
	            const signature = this.functions[this.functionsTable[0]].getSignature();
	            const signatureName = "s_"+utils.toHexString(signature);
	            signatureIdxByName[signatureName] = 0;
	            this.signatures.push(signature);
	        }
	        for (let i=0; i<this.functions.length; i++) {
	            const signature = this.functions[i].getSignature();
	            const signatureName = "s_"+utils.toHexString(signature);
	            if (typeof(signatureIdxByName[signatureName]) === "undefined") {
	                signatureIdxByName[signatureName] = this.signatures.length;
	                this.signatures.push(signature);
	            }

	            this.functions[i].signatureIdx = signatureIdxByName[signatureName];
	        }

	    }

	    _buildSection(sectionType, section) {
	        return [sectionType, ...utils.varuint32(section.length), ...section];
	    }

	    _buildType() {
	        return this._buildSection(
	            0x01,
	            [
	                ...utils.varuint32(this.signatures.length),
	                ...[].concat(...this.signatures)
	            ]
	        );
	    }

	    _buildImport() {
	        const entries = [];
	        entries.push([
	            ...utils.string(this.memory.moduleName),
	            ...utils.string(this.memory.fieldName),
	            0x02,
	            0x00,   //Flags no init valua
	            ...utils.varuint32(this.memory.pagesSize)
	        ]);
	        for (let i=0; i< this.nImportFunctions; i++) {
	            entries.push([
	                ...utils.string(this.functions[i].moduleName),
	                ...utils.string(this.functions[i].fieldName),
	                0x00,
	                ...utils.varuint32(this.functions[i].signatureIdx)
	            ]);
	        }
	        return this._buildSection(
	            0x02,
	            utils.varuint32(entries.length).concat(...entries)
	        );
	    }

	    _buildFunctionDeclarations() {
	        const entries = [];
	        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
	            entries.push(...utils.varuint32(this.functions[i].signatureIdx));
	        }
	        return this._buildSection(
	            0x03,
	            [
	                ...utils.varuint32(entries.length),
	                ...[...entries]
	            ]
	        );
	    }

	    _buildFunctionsTable() {
	        if (this.functionsTable.length == 0) return [];
	        return this._buildSection(
	            0x04,
	            [
	                ...utils.varuint32(1),
	                0x70, 0, ...utils.varuint32(this.functionsTable.length)
	            ]
	        );
	    }

	    _buildElements() {
	        if (this.functionsTable.length == 0) return [];
	        const entries = [];
	        for (let i=0; i<this.functionsTable.length; i++) {
	            entries.push(...utils.varuint32(this.functionsTable[i]));
	        }
	        return this._buildSection(
	            0x09,
	            [
	                ...utils.varuint32(1),      // 1 entry
	                ...utils.varuint32(0),      // Table (0 in MVP)
	                0x41,                       // offset 0
	                ...utils.varint32(0),
	                0x0b,
	                ...utils.varuint32(this.functionsTable.length), // Number of elements
	                ...[...entries]
	            ]
	        );
	    }

	    _buildExports() {
	        const entries = [];
	        for (let i=0; i< this.exports.length; i++) {
	            entries.push([
	                ...utils.string(this.exports[i].exportName),
	                0x00,
	                ...utils.varuint32(this.exports[i].idx)
	            ]);
	        }
	        return this._buildSection(
	            0x07,
	            utils.varuint32(entries.length).concat(...entries)
	        );
	    }

	    _buildCode() {
	        const entries = [];
	        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
	            entries.push(this.functions[i].getBody());
	        }
	        return this._buildSection(
	            0x0a,
	            utils.varuint32(entries.length).concat(...entries)
	        );
	    }

	    _buildData() {
	        const entries = [];
	        entries.push([
	            0x00,
	            0x41,
	            0x00,
	            0x0b,
	            0x04,
	            ...utils.u32(this.free)
	        ]);
	        for (let i=0; i< this.datas.length; i++) {
	            entries.push([
	                0x00,
	                0x41,
	                ...utils.varint32(this.datas[i].offset),
	                0x0b,
	                ...utils.varuint32(this.datas[i].bytes.length),
	                ...this.datas[i].bytes,
	            ]);
	        }
	        return this._buildSection(
	            0x0b,
	            utils.varuint32(entries.length).concat(...entries)
	        );
	    }

	}

	modulebuilder = ModuleBuilder;
	return modulebuilder;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var codebuilder_wat;
var hasRequiredCodebuilder_wat;

function requireCodebuilder_wat () {
	if (hasRequiredCodebuilder_wat) return codebuilder_wat;
	hasRequiredCodebuilder_wat = 1;
	const utils = /*@__PURE__*/ requireUtils();

	class CodeBuilderWat {
	    constructor(func) {
	        this.func = func;
	        this.functionName = func.functionName;
	        this.module = func.module;
	    }

	    setLocal(localName, valCode) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return [valCode, `set_local $${localName}`];
	    }

	    teeLocal(localName, valCode) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return [valCode, `tee_local $${localName}`];
	    }

	    getLocal(localName) {
	        const idx = this.func.localIdxByName[localName];
	        if (idx === undefined)
	            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
	        return `get_local $${localName}`;
	    }

	    genLoad(inst, def_align, idxCode, _offset, _align) {
	        let S = inst;
	        const offset = _offset || 0;
	        if (offset>0) S += ` offset=${offset}`;
	        const align = (_align === undefined) ? def_align : _align;  // 8 bits alignment by default
	        if (align!=def_align) S += ` align=${1 << align}`;
	        return [idxCode, S];
	    }


	    genStore(inst, def_align, idxCode, _offset, _align, _codeVal) {
	        let offset, align, codeVal;
	        if (typeof _align === "undefined") {
	            offset = 0;
	            align = def_align;
	            codeVal = _offset;
	        } else if (typeof _codeVal === "undefined") {
	            offset = _offset;
	            align = def_align;
	            codeVal = _align;
	        } else {
	            offset = _offset;
	            align = _align;
	            codeVal = _codeVal;
	        }
	        let S = inst;
	        if (offset>0) S += ` offset=${offset}`;
	        if (align!=def_align) S += ` align=${1 << align}`;
	        return [idxCode, codeVal, S];
	    }

	    i64_load8_s(idxCode, _offset, _align) {
	        return this.genLoad("i64.load8_s", 0, idxCode, _offset, _align);
	    }

	    i64_load8_u(idxCode, _offset, _align) {
	        return this.genLoad("i64.load8_u", 0, idxCode, _offset, _align);
	    }

	    i64_load16_s(idxCode, _offset, _align) {
	        return this.genLoad("i64.load16_s", 1,idxCode, _offset, _align);
	    }

	    i64_load16_u(idxCode, _offset, _align) {
	        return this.genLoad("i64.load16_u", 1, idxCode, _offset, _align);
	    }

	    i64_load32_s(idxCode, _offset, _align) {
	        return this.genLoad("i64.load32_s", 2, idxCode, _offset, _align);
	    }

	    i64_load32_u(idxCode, _offset, _align) {
	        return this.genLoad("i64.load32_u", 2, idxCode, _offset, _align);
	    }

	    i64_load(idxCode, _offset, _align) {
	        return this.genLoad("i64.load", 3, idxCode, _offset, _align);
	    }


	    i64_store(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i64.store", 3, idxCode, _offset, _align, _codeVal);
	    }

	    i64_store32(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i64.store32", 2, idxCode, _offset, _align, _codeVal);
	    }

	    i64_store16(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i64.store16", 1, idxCode, _offset, _align, _codeVal);
	    }

	    i64_store8(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i64.store8", 0, idxCode, _offset, _align, _codeVal);
	    }

	    i32_load8_s(idxCode, _offset, _align) {
	        return this.genLoad("i32.load8_s", 0, idxCode, _offset, _align);
	    }

	    i32_load8_u(idxCode, _offset, _align) {
	        return this.genLoad("i32.load8_u", 0, idxCode, _offset, _align);
	    }

	    i32_load16_s(idxCode, _offset, _align) {
	        return this.genLoad("i32.load16_s", 1, idxCode, _offset, _align);
	    }

	    i32_load16_u(idxCode, _offset, _align) {
	        return this.genLoad("i32.load16_u", 1, idxCode, _offset, _align);
	    }

	    i32_load(idxCode, _offset, _align) {
	        return this.genLoad("i32.load", 2, idxCode, _offset, _align);
	    }

	    i32_store(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i32.store", 2, idxCode, _offset, _align, _codeVal);
	    }

	    i32_store16(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i32.store16", 1, idxCode, _offset, _align, _codeVal);
	    }

	    i32_store8(idxCode, _offset, _align, _codeVal) {
	        return this.genStore("i32.store8", 0, idxCode, _offset, _align, _codeVal);
	    }

	    call(fnName, ...args) {
	        const idx = this.module.functionIdxByName[fnName];
	        if (idx === undefined)
	            throw new Error(`Function not defined: Function: ${fnName}`);
	        return [args, `call $${fnName}`];
	    }

	    call_indirect(fnIdx, ...args) {
	        return [args, fnIdx, "call_indirect (type 0)"];
	    }

	    if(condCode, thenCode, elseCode) {
	        if (elseCode) {
	            return [condCode, "if", utils.ident(thenCode), "else", utils.ident(elseCode), "end"];
	        } else {
	            return [condCode, "if", utils.ident(thenCode), "end"];
	        }
	    }

	    block(bCode) { return ["block", utils.ident(bCode), "end"]; }
	    loop(...args) { return ["loop", utils.ident(args), "end"]; }
	    br_if(relPath, condCode) { return [condCode, `br_if ${relPath}`]; }
	    br(relPath) { return `br ${relPath}`; }
	    ret(rCode) { return [rCode, "return"]; }
	    drop(dCode) { return [dCode,  "drop"]; }

	    i64_const(num) { return `i64.const ${num}`; }
	    i32_const(num) { return `i32.const ${num}`; }

	    i64_eqz(opcode) { return [opcode, "i64.eqz"]; }
	    i64_eq(op1code, op2code) { return [op1code, op2code, "i64.eq"]; }
	    i64_ne(op1code, op2code) { return [op1code, op2code, "i64.ne"]; }
	    i64_lt_s(op1code, op2code) { return [op1code, op2code, "i64.lt_s"]; }
	    i64_lt_u(op1code, op2code) { return [op1code, op2code, "i64.lt_u"]; }
	    i64_gt_s(op1code, op2code) { return [op1code, op2code, "i64.gt_s"]; }
	    i64_gt_u(op1code, op2code) { return [op1code, op2code, "i64.gt_u"]; }
	    i64_le_s(op1code, op2code) { return [op1code, op2code, "i64.le_s"]; }
	    i64_le_u(op1code, op2code) { return [op1code, op2code, "i64.le_u"]; }
	    i64_ge_s(op1code, op2code) { return [op1code, op2code, "i64.ge_s"]; }
	    i64_ge_u(op1code, op2code) { return [op1code, op2code, "i64.ge_u"]; }
	    i64_add(op1code, op2code) { return [op1code, op2code, "i64.add"]; }
	    i64_sub(op1code, op2code) { return [op1code, op2code, "i64.sub"]; }
	    i64_mul(op1code, op2code) { return [op1code, op2code, "i64.mul"]; }
	    i64_div_s(op1code, op2code) { return [op1code, op2code, "i64.div_s"]; }
	    i64_div_u(op1code, op2code) { return [op1code, op2code, "i64.div_u"]; }
	    i64_rem_s(op1code, op2code) { return [op1code, op2code, "i64.rem_s"]; }
	    i64_rem_u(op1code, op2code) { return [op1code, op2code, "i64.rem_u"]; }
	    i64_and(op1code, op2code) { return [op1code, op2code, "i64.and"]; }
	    i64_or(op1code, op2code) { return [op1code, op2code, "i64.or"]; }
	    i64_xor(op1code, op2code) { return [op1code, op2code, "i64.xor"]; }
	    i64_shl(op1code, op2code) { return [op1code, op2code, "i64.shl"]; }
	    i64_shr_s(op1code, op2code) { return [op1code, op2code, "i64.shr_s"]; }
	    i64_shr_u(op1code, op2code) { return [op1code, op2code, "i64.shr_u"]; }
	    i64_extend_i32_s(op1code) { return [op1code, "i64.extend_s/i32"]; }
	    i64_extend_i32_u(op1code) { return [op1code, "i64.extend_u/i32"]; }


	    i32_eqz(op1code) { return [op1code, "i32.eqz"]; }
	    i32_eq(op1code, op2code) { return [op1code, op2code, "i32.eq"]; }
	    i32_ne(op1code, op2code) { return [op1code, op2code, "i32.ne"]; }
	    i32_lt_s(op1code, op2code) { return [op1code, op2code, "i32.lt_s"]; }
	    i32_lt_u(op1code, op2code) { return [op1code, op2code, "i32.lt_u"]; }
	    i32_gt_s(op1code, op2code) { return [op1code, op2code, "i32.gt_s"]; }
	    i32_gt_u(op1code, op2code) { return [op1code, op2code, "i32.gt_u"]; }
	    i32_le_s(op1code, op2code) { return [op1code, op2code, "i32.le_s"]; }
	    i32_le_u(op1code, op2code) { return [op1code, op2code, "i32.le_u"]; }
	    i32_ge_s(op1code, op2code) { return [op1code, op2code, "i32.ge_s"]; }
	    i32_ge_u(op1code, op2code) { return [op1code, op2code, "i32.ge_u"]; }
	    i32_add(op1code, op2code) { return [op1code, op2code, "i32.add"]; }
	    i32_sub(op1code, op2code) { return [op1code, op2code, "i32.sub"]; }
	    i32_mul(op1code, op2code) { return [op1code, op2code, "i32.mul"]; }
	    i32_div_s(op1code, op2code) { return [op1code, op2code, "i32.div_s"]; }
	    i32_div_u(op1code, op2code) { return [op1code, op2code, "i32.div_u"]; }
	    i32_rem_s(op1code, op2code) { return [op1code, op2code, "i32.rem_s"]; }
	    i32_rem_u(op1code, op2code) { return [op1code, op2code, "i32.rem_u"]; }
	    i32_and(op1code, op2code) { return [op1code, op2code, "i32.and"]; }
	    i32_or(op1code, op2code) { return [op1code, op2code, "i32.or"]; }
	    i32_xor(op1code, op2code) { return [op1code, op2code, "i32.xor"]; }
	    i32_shl(op1code, op2code) { return [op1code, op2code, "i32.shl"]; }
	    i32_shr_s(op1code, op2code) { return [op1code, op2code, "i32.shr_s"]; }
	    i32_shr_u(op1code, op2code) { return [op1code, op2code, "i32.shr_u"]; }
	    i32_rotl(op1code, op2code) { return [op1code, op2code, "i32.rotl"]; }
	    i32_rotr(op1code, op2code) { return [op1code, op2code, "i32.rotr"]; }
	    i32_wrap_i64(op1code) { return [op1code, "i32.wrap/i64"]; }

	    ureachable() { return "unreachable"; }

	    current_memory() { return "current_memory"; }

	    comment(c) { return ";; " + c; }

	}

	codebuilder_wat = CodeBuilderWat;
	return codebuilder_wat;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var functionbuilder_wat;
var hasRequiredFunctionbuilder_wat;

function requireFunctionbuilder_wat () {
	if (hasRequiredFunctionbuilder_wat) return functionbuilder_wat;
	hasRequiredFunctionbuilder_wat = 1;
	const CodeBuilderWat = /*@__PURE__*/ requireCodebuilder_wat();
	const utils = /*@__PURE__*/ requireUtils();

	class FunctionBuilderWat {

	    constructor (module, fnName, fnType, moduleName, fieldName) {
	        if (fnType == "import") {
	            this.fnType = "import";
	            this.moduleName = moduleName;
	            this.fieldName = fieldName;
	        } else if (fnType == "internal") {
	            this.fnType = "internal";
	            this.comment = moduleName;
	        } else {
	            throw new Error("Invalid function fnType: " + fnType);
	        }
	        this.module = module;
	        this.fnName = fnName;
	        this.params = [];
	        this.locals = [];
	        this.localIdxByName = {};
	        this.code = [];
	        this.returnType = null;
	        this.nextLocal =0;
	    }

	    addParam(paramName, paramType) {
	        if (this.localIdxByName[paramName])
	            throw new Error(`param already exists. Function: ${this.fnName}, Param: ${paramName} `);
	        const idx = this.nextLocal++;
	        this.localIdxByName[paramName] = idx;
	        this.params.push({
	            type: paramType,
	            name: paramName
	        });
	    }

	    addLocal(localName, localType, _length) {
	        if ((typeof _length != "undefined") && (_length != 1)) {
	            throw new Error("Locals greater than 1 not implemented");
	        }
	        if (this.localIdxByName[localName])
	            throw new Error(`local already exists. Function: ${this.fnName}, Param: ${localName} `);
	        const idx = this.nextLocal++;
	        this.localIdxByName[localName] = idx;
	        this.locals.push({
	            type: localType,
	            name: localName,
	        });
	    }

	    setReturnType(returnType) {
	        if (this.returnType)
	            throw new Error(`returnType already defined. Function: ${this.fnName}`);
	        this.returnType = returnType;
	    }

	    getSignature() {
	        let p = "";
	        for (let i=0; i<this.params.length; i++) {
	            if (i==0) p += " (param";
	            p += " " + this.params[i].type;
	        }
	        if (p!="") p+= ")";
	        let r = "";
	        if (this.returnType) {
	            r += ` (result ${this.returnType})`;
	        }
	        return `(type $${this.getSignatureName()} (func ${p}${r}))`;
	    }

	    getSignatureName() {
	        let s = "_sig_";
	        for (let i=0; i<this.params.length; i++) {
	            s += this.params[i].type;
	        }
	        if (this.returnType) {
	            s+="r"+this.returnType;
	        }
	        return s;
	    }

	    getBody() {
	        const src = [];

	        for (let i=0; i<this.params.length; i++) {
	            src.push(` (param $${this.params[i].name} ${this.params[i].type})`);
	        }
	        if (this.returnType) {
	            src.push(`(result ${this.returnType})`);
	        }
	        for (let i=0; i<this.locals.length; i++) {
	            src.push(` (local $${this.locals[i].name} ${this.locals[i].type})`);
	        }
	        src.push(this.code);

	        let Ss;
	        if (this.comment) {
	            Ss = this.comment.split("\n");
	            for (let i=0; i<Ss.length; i++) {
	                Ss[i] = ";; " + Ss[i];
	            }
	        } else {
	            Ss = [];
	        }

	        return [
	            ...Ss,
	            `(func $${this.fnName} (type $${this.getSignatureName()})`,
	            utils.ident(src),
	            ")"
	        ];

	    }

	    addCode(...code) {
	        this.code.push(code);
	    }

	    getCodeBuilder() {
	        return new CodeBuilderWat(this);
	    }
	}

	functionbuilder_wat = FunctionBuilderWat;
	return functionbuilder_wat;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var modulebuilder_wat;
var hasRequiredModulebuilder_wat;

function requireModulebuilder_wat () {
	if (hasRequiredModulebuilder_wat) return modulebuilder_wat;
	hasRequiredModulebuilder_wat = 1;
	const FunctionBuilderWat = /*@__PURE__*/ requireFunctionbuilder_wat();
	const utils = /*@__PURE__*/ requireUtils();

	class ModuleBuilderWat {

	    constructor() {
	        this.functions = [];
	        this.functionIdxByName = {};
	        this.nImportFunctions = 0;
	        this.nInternalFunctions =0;
	        this.memory = {
	            pagesSize: 1,
	            moduleName: "env",
	            fieldName: "memory"
	        };
	        this.free = 8;
	        this.datas = [];
	        this.modules = {};
	        this.exports = [];
	        this.functionsTable = [];
	    }

	    build() {
	        const src = [];
	        this._setSignatures();
	        src.push(this._buildType());
	        src.push(this._buildImport());
	        if (this.functionsTable.length>0) {
	            src.push(this._buildFunctionsTable());
	        }
	        if (this.exports.length > 0) {
	            src.push(this._buildExports());
	        }
	        if (this.functionsTable.length>0) {
	            src.push(this._buildElements());
	        }
	        if (this.nInternalFunctions>0) {
	            src.push(this._buildFunctions());
	        }
	        src.push(this._buildData());
	        return [
	            "(module",
	            utils.ident(src),
	            ")"
	        ];
	    }

	    addFunction(fnName, comment) {
	        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
	            throw new Error(`Function already defined: ${fnName}`);

	        const idx = this.functions.length;
	        this.functionIdxByName[fnName] = idx;

	        this.functions.push(new FunctionBuilderWat(this, fnName, "internal", comment));

	        this.nInternalFunctions++;
	        return this.functions[idx];
	    }

	    addIimportFunction(fnName, moduleName, _fieldName) {
	        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
	            throw new Error(`Function already defined: ${fnName}`);

	        if (  (this.functions.length>0)
	            &&(this.functions[this.functions.length-1].type == "internal"))
	            throw new Error(`Import functions must be declared before internal: ${fnName}`);

	        let fieldName = _fieldName || fnName;

	        const idx = this.functions.length;
	        this.functionIdxByName[fnName] = idx;

	        this.functions.push(new FunctionBuilderWat(this, fnName, "import", moduleName, fieldName));

	        this.nImportFunctions ++;
	        return this.functions[idx];
	    }

	    setMemory(pagesSize, moduleName, fieldName) {
	        this.memory = {
	            pagesSize: pagesSize,
	            moduleName: moduleName || "env",
	            fieldName: fieldName || "memory"
	        };
	    }

	    exportFunction(fnName, _exportName) {
	        const exportName = _exportName || fnName;
	        if (typeof(this.functionIdxByName[fnName]) === "undefined")
	            throw new Error(`Function not defined: ${fnName}`);
	        const idx = this.functionIdxByName[fnName];
	        if (exportName != fnName) {
	            this.functionIdxByName[exportName] = idx;
	        }
	        this.exports.push({
	            exportName: exportName,
	            idx: idx
	        });
	    }

	    addFunctionToTable(fnName) {
	        const idx = this.functionIdxByName[fnName];
	        this.functionsTable.push(idx);
	    }

	    addData(offset, bytes) {
	        this.datas.push({
	            offset: offset,
	            bytes: bytes
	        });
	    }

	    alloc(a, b) {
	        let size;
	        let bytes;
	        if ((Array.isArray(a) || ArrayBuffer.isView(a)) && (typeof(b) === "undefined")) {
	            size = a.length;
	            bytes = a;
	        } else {
	            size = a;
	            bytes = b;
	        }
	        size = (((size-1)>>3) +1)<<3;       // Align to 64 bits.
	        const p = this.free;
	        this.free += size;
	        if (bytes) {
	            this.addData(p, bytes);
	        }
	        return p;
	    }

	    allocString(s) {
	        const encoder = new TextEncoder();
	        const uint8array = encoder.encode(s);
	        return this.alloc([...uint8array, 0]);
	    }

	    _setSignatures() {
	        this.signatures = [];
	        const signatureIdxByName = {};
	        if (this.functionsTable.length>0) {
	            const signature = this.functions[this.functionsTable[0]].getSignature();
	            const signatureName = this.functions[this.functionsTable[0]].getSignatureName();
	            signatureIdxByName[signatureName] = 0;
	            this.signatures.push(signature);
	        }
	        for (let i=0; i<this.functions.length; i++) {
	            const signature = this.functions[i].getSignature();
	            const signatureName = this.functions[i].getSignatureName();
	            if (typeof(signatureIdxByName[signatureName]) === "undefined") {
	                signatureIdxByName[signatureName] = this.signatures.length;
	                this.signatures.push(signature);
	            }

	            this.functions[i].signatureIdx = signatureIdxByName[signatureName];
	            this.functions[i].signatureName = signatureName;
	        }

	    }

	    _buildType() {
	        return this.signatures;
	    }

	    _buildImport() {
	        const src = [];
	        src.push(`(import "${this.memory.moduleName}" "${this.memory.fieldName}" (memory ${this.memory.pagesSize}))`);
	        for (let i=0; i< this.nImportFunctions; i++) {
	            src.push(`(import "${this.functions[i].moduleName}" "${this.functions[i].fieldName}" (func $${this.functions[i].fnName} (type $${this.functions[i].getSignatureName()})))`);
	        }
	        return src;
	    }

	    _buildFunctionsTable() {
	        return `(table ${this.functionsTable.length} anyfunc)`;
	    }

	    _buildElements() {
	        let funcs="";
	        for (let i=0; i<this.functionsTable.length; i++) {
	            funcs += " $"+this.functions[this.functionsTable[i]].fnName;
	        }
	        return `(elem (i32.const 0) ${funcs})`;
	    }

	    _buildExports() {
	        const src = [];
	        for (let i=0; i< this.exports.length; i++) {
	            src.push(`(export "${this.exports[i].exportName}" (func $${this.functions[this.exports[i].idx].fnName}))`);
	        }
	        return src;
	    }

	    _buildFunctions() {
	        const src = [];
	        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
	            src.push(this.functions[i].getBody());
	        }
	        return src;
	    }

	    _buildData() {
	        const src = [];
	        const buf = Buffer.alloc(4);
	        buf.writeUInt32LE(this.free, 0);
	        src.push(`(data (i32.const 0) ${bytes2string(buf)})`);
	        for (let i=0; i< this.datas.length; i++) {
	            src.push(`(data (i32.const ${this.datas[i].offset}) ${bytes2string(this.datas[i].bytes)})`);
	        }
	        return src;

	        function bytes2string(b) {
	            let S = "\"";
	            for (let i=0; i<b.length; i++) {
	                if (b[i]<32 || b[i] >126 || b[i] == 34 || b[i]==92) {
	                    let h=b[i].toString(16);
	                    while (h.length<2) h = "0"+h;
	                    S += "\\" + h;
	                } else {
	                    S += String.fromCharCode(b[i]);
	                }
	            }
	            S +=  "\"";
	            return S;
	        }
	    }

	}

	modulebuilder_wat = ModuleBuilderWat;
	return modulebuilder_wat;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of websnark (Web Assembly zkSnark Prover).

    websnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    websnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with websnark. If not, see <https://www.gnu.org/licenses/>.
*/

var protoboard;
var hasRequiredProtoboard;

function requireProtoboard () {
	if (hasRequiredProtoboard) return protoboard;
	hasRequiredProtoboard = 1;
	/* globals WebAssembly */
	const bigInt = /*@__PURE__*/ requireBigInteger();
	const ModuleBuilder = /*@__PURE__*/ requireModulebuilder();


	async function buildProtoboard(builder, defBytes, bitsPerBytes) {
	    const protoboard = new Protoboard();

	    protoboard.defBytes = defBytes;
	    protoboard.bitsPerBytes = bitsPerBytes || 32;

	    protoboard.memory = new WebAssembly.Memory({initial:20000});
	    protoboard.i32 = new Uint32Array(protoboard.memory.buffer);
	    protoboard.i8 = new Uint8Array(protoboard.memory.buffer);

	    const moduleBuilder = new ModuleBuilder();

	    const fLog32 = moduleBuilder.addIimportFunction("debug_log32", "debug", "log32");
	    fLog32.addParam("x", "i32");
	    const fLog64 = moduleBuilder.addIimportFunction("debug_log64", "debug", "log64");
	    fLog64.addParam("x", "i32");
	    fLog64.addParam("y", "i32");

	    buildLog32(moduleBuilder);
	    buildLog64(moduleBuilder);

	    builder(moduleBuilder, protoboard);


	    const code = moduleBuilder.build();

	    const wasmModule = await WebAssembly.compile(code);

	    protoboard.log = console.log;

	    protoboard.instance = await WebAssembly.instantiate(wasmModule, {
	        env: {
	            "memory": protoboard.memory
	        },
	        debug: {
	            log32: function (c1) {
	                if (c1<0) c1 = 0x100000000+c1;
	                let s=c1.toString(16);
	                while (s.length<8) s = "0"+s;
	                protoboard.log(s + ": " + c1.toString());
	            },
	            log64: function (c1, c2) {
	                if (c1<0) c1 = 0x100000000+c1;
	                if (c2<0) c2 = 0x100000000+c2;
	                const n = bigInt(c1) +  bigInt(c2).shiftLeft(32);
	                let s=n.toString(16);
	                while (s.length<16) s = "0"+s;
	                protoboard.log(s + ": " + n.toString());
	            }
	        }
	    });

	    Object.assign(protoboard, protoboard.instance.exports);
	    Object.assign(protoboard, moduleBuilder.modules);

	    return protoboard;

	    function buildLog32(module) {

	        const f = module.addFunction("log32");
	        f.addParam("x", "i32");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call("debug_log32", c.getLocal("x")));
	    }

	    function buildLog64(module) {

	        const f = module.addFunction("log64");
	        f.addParam("x", "i64");

	        const c = f.getCodeBuilder();
	        f.addCode(c.call(
	            "debug_log64",
	            c.i32_wrap_i64(c.getLocal("x")),
	            c.i32_wrap_i64(
	                c.i64_shr_u(
	                    c.getLocal("x"),
	                    c.i64_const(32)
	                )
	            )
	        ));
	    }

	}

	class Protoboard {

	    constructor() {

	    }

	    alloc(length) {
	        if (typeof length === "undefined") {
	            length = this.defBytes;
	        }
	        length = (((length-1)>>3) +1)<<3;       // Align to 64 bits.

	        const res = this.i32[0];
	        this.i32[0] += length;
	        return res;
	    }

	    set(pos, nums, nBytes) {
	        if (!Array.isArray(nums)) {
	            nums = [nums];
	        }
	        if (typeof nBytes === "undefined") {
	            nBytes = this.defBytes;
	        }

	        const words = Math.floor((nBytes -1)/4)+1;
	        let p = pos;

	        const CHUNK = bigInt.one.shiftLeft(this.bitsPerBytes);

	        for (let i=0; i<nums.length; i++) {
	            let v = bigInt(nums[i]);
	            for (let j=0; j<words; j++) {
	                const rd = v.divmod(CHUNK);
	                this.i32[p>>2] = rd.remainder.toJSNumber();
	                v = rd.quotient;
	                p += 4;
	            }
	            if (!v.isZero()) {
	                throw new Error('Expected v to be 0');
	            }
	/*            this.i32[p>>2] = bigInt(nums[i]).shiftRight( (words-1)*this.bitsPerBytes).toJSNumber();
	            p += 4;
	*/        }

	        return pos;
	    }

	    get(pos, nElements, nBytes) {
	        if (typeof nBytes == "undefined") {
	            if (typeof nElements == "undefined") {
	                nElements = 1;
	                nBytes = this.defBytes;
	            } else {
	                nElements = nBytes;
	                nBytes = this.defBytes;
	            }
	        }

	        const words = Math.floor((nBytes -1)/4)+1;

	        const CHUNK = bigInt.one.shiftLeft(this.bitsPerBytes);


	        const nums = [];
	        for (let i=0; i<nElements; i++) {
	            let acc = bigInt.zero;
	            for (let j=words-1; j>=0; j--) {
	                acc = acc.times(CHUNK);
	                let v = this.i32[(pos>>2)+j];
	                if (this.bitsPerBytes <32) {
	                    if (v&0x80000000) v = v-0x100000000;
	                }
	                acc = acc.add(v);
	            }
	            nums.push(acc);
	            pos += words*4;
	        }

	        if (nums.length == 1) return nums[0];
	        return nums;
	    }
	}

	protoboard = buildProtoboard;
	return protoboard;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

var hasRequiredWasmbuilder;

function requireWasmbuilder () {
	if (hasRequiredWasmbuilder) return wasmbuilder;
	hasRequiredWasmbuilder = 1;
	wasmbuilder.ModuleBuilder = /*@__PURE__*/ requireModulebuilder();
	wasmbuilder.ModuleBuilderWat = /*@__PURE__*/ requireModulebuilder_wat();
	wasmbuilder.buildProtoboard = /*@__PURE__*/ requireProtoboard();
	return wasmbuilder;
}

var wasmbuilderExports = /*@__PURE__*/ requireWasmbuilder();

globalThis.curve_bn128 = null;

async function buildBn128(singleThread, plugins) {

    const moduleBuilder = new wasmbuilderExports.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurvesExports.buildBn128(moduleBuilder);

    const bn128wasm = {};

    bn128wasm.code = moduleBuilder.build();
    bn128wasm.pq = moduleBuilder.modules.f1m.pq;
    bn128wasm.pr = moduleBuilder.modules.frm.pq;
    bn128wasm.pG1gen = moduleBuilder.modules.bn128.pG1gen;
    bn128wasm.pG1zero = moduleBuilder.modules.bn128.pG1zero;
    bn128wasm.pG1b = moduleBuilder.modules.bn128.pG1b;
    bn128wasm.pG2gen = moduleBuilder.modules.bn128.pG2gen;
    bn128wasm.pG2zero = moduleBuilder.modules.bn128.pG2zero;
    bn128wasm.pG2b = moduleBuilder.modules.bn128.pG2b;
    bn128wasm.pOneT = moduleBuilder.modules.bn128.pOneT;
    bn128wasm.prePSize = moduleBuilder.modules.bn128.prePSize;
    bn128wasm.preQSize = moduleBuilder.modules.bn128.preQSize;
    bn128wasm.n8q = 32;
    bn128wasm.n8r = 32;
    bn128wasm.q = moduleBuilder.modules.bn128.q;
    bn128wasm.r = moduleBuilder.modules.bn128.r;
    const params = {
        name: "bn128",
        wasm: bn128wasm,
        q: e("21888242871839275222246405745257275088696311157297823662689037894645226208583"),
        r: e("21888242871839275222246405745257275088548364400416034343698204186575808495617"),
        n8q: 32,
        n8r: 32,
        cofactorG2: e("30644e72e131a029b85045b68181585e06ceecda572a2489345f2299c0f9fa8d", 16),
        singleThread: true 
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bn128 = null;
            await this.tm.terminate();
        }
    };

    return curve;
}

globalThis.curve_bls12381 = null;

async function buildBls12381(singleThread, plugins) {

    const moduleBuilder = new wasmbuilderExports.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurvesExports.buildBls12381(moduleBuilder);

    const bls12381wasm = {};

    bls12381wasm.code = moduleBuilder.build();
    bls12381wasm.pq = moduleBuilder.modules.f1m.pq;
    bls12381wasm.pr = moduleBuilder.modules.frm.pq;
    bls12381wasm.pG1gen = moduleBuilder.modules.bls12381.pG1gen;
    bls12381wasm.pG1zero = moduleBuilder.modules.bls12381.pG1zero;
    bls12381wasm.pG1b = moduleBuilder.modules.bls12381.pG1b;
    bls12381wasm.pG2gen = moduleBuilder.modules.bls12381.pG2gen;
    bls12381wasm.pG2zero = moduleBuilder.modules.bls12381.pG2zero;
    bls12381wasm.pG2b = moduleBuilder.modules.bls12381.pG2b;
    bls12381wasm.pOneT = moduleBuilder.modules.bls12381.pOneT;
    bls12381wasm.prePSize = moduleBuilder.modules.bls12381.prePSize;
    bls12381wasm.preQSize = moduleBuilder.modules.bls12381.preQSize;
    bls12381wasm.n8q = 48;
    bls12381wasm.n8r = 32;
    bls12381wasm.q = moduleBuilder.modules.bn128.q;
    bls12381wasm.r = moduleBuilder.modules.bn128.r;
    const params = {
        name: "bls12381",
        wasm: bls12381wasm,
        q: e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16),
        r: e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16),
        n8q: 48,
        n8r: 32,
        cofactorG1: e("0x396c8c005555e1568c00aaab0000aaab", 16),
        cofactorG2: e("0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5", 16),
        singleThread: true 
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bls12381 = null;
            await this.tm.terminate();
        }
    };

    return curve;
}

e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromName(name, singleThread, plugins) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

const Scalar=_Scalar;

const version$2 = "logger/5.7.0";

let _permanentCensorErrors = false;
let _censorErrors = false;
const LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
let _logLevel = LogLevels["default"];
let _globalLogger = null;
function _checkNormalize() {
    try {
        const missing = [];
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
            try {
                if ("test".normalize(form) !== "test") {
                    throw new Error("bad normalize");
                }
            }
            catch (error) {
                missing.push(form);
            }
        });
        if (missing.length) {
            throw new Error("missing " + missing.join(", "));
        }
        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error("broken implementation");
        }
    }
    catch (error) {
        return error.message;
    }
    return null;
}
const _normalizeError = _checkNormalize();
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["OFF"] = "OFF";
})(LogLevel || (LogLevel = {}));
var ErrorCode;
(function (ErrorCode) {
    ///////////////////
    // Generic Errors
    // Unknown Error
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    // Not Implemented
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    // Unsupported Operation
    //   - operation
    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Some sort of bad response from the server
    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    // Timeout
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ///////////////////
    // Operational  Errors
    // Buffer Overrun
    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
    // Numeric Fault
    //   - operation: the operation being executed
    //   - fault: the reason this faulted
    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
    ///////////////////
    // Argument Errors
    // Missing new operator to an object
    //  - name: The name of the class
    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
    // Invalid argument (e.g. value is incompatible with type) to a function:
    //   - argument: The argument name that was invalid
    //   - value: The value of the argument
    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    // Missing argument to a function:
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
    // Too many arguments
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
    ///////////////////
    // Blockchain Errors
    // Call exception
    //  - transaction: the transaction
    //  - address?: the contract address
    //  - args?: The arguments passed into the function
    //  - method?: The Solidity method signature
    //  - errorSignature?: The EIP848 error signature
    //  - errorArgs?: The EIP848 error parameters
    //  - reason: The reason (only for EIP848 "Error(string)")
    ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION";
    // Insufficient funds (< value + gasLimit * gasPrice)
    //   - transaction: the transaction attempted
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    // Nonce has already been used
    //   - transaction: the transaction attempted
    ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED";
    // The replacement fee for the transaction is too low
    //   - transaction: the transaction attempted
    ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
    // The gas limit could not be estimated
    //   - transaction: the transaction passed to estimateGas
    ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
    // The transaction was replaced by one with a higher gas price
    //   - reason: "cancelled", "replaced" or "repriced"
    //   - cancelled: true if reason == "cancelled" or reason == "replaced")
    //   - hash: original transaction hash
    //   - replacement: the full TransactionsResponse for the replacement
    //   - receipt: the receipt of the replacement
    ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
    ///////////////////
    // Interaction Errors
    // The user rejected the action, such as signing a message or sending
    // a transaction
    ErrorCode["ACTION_REJECTED"] = "ACTION_REJECTED";
})(ErrorCode || (ErrorCode = {}));
const HEX = "0123456789abcdef";
class Logger {
    constructor(version) {
        Object.defineProperty(this, "version", {
            enumerable: true,
            value: version,
            writable: false
        });
    }
    _log(logLevel, args) {
        const level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
            this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }
        if (_logLevel > LogLevels[level]) {
            return;
        }
        console.log.apply(console, args);
    }
    debug(...args) {
        this._log(Logger.levels.DEBUG, args);
    }
    info(...args) {
        this._log(Logger.levels.INFO, args);
    }
    warn(...args) {
        this._log(Logger.levels.WARNING, args);
    }
    makeError(message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
            return this.makeError("censored error", code, {});
        }
        if (!code) {
            code = Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
            params = {};
        }
        const messageDetails = [];
        Object.keys(params).forEach((key) => {
            const value = params[key];
            try {
                if (value instanceof Uint8Array) {
                    let hex = "";
                    for (let i = 0; i < value.length; i++) {
                        hex += HEX[value[i] >> 4];
                        hex += HEX[value[i] & 0x0f];
                    }
                    messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
                }
                else {
                    messageDetails.push(key + "=" + JSON.stringify(value));
                }
            }
            catch (error) {
                messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
            }
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        let url = "";
        switch (code) {
            case ErrorCode.NUMERIC_FAULT: {
                url = "NUMERIC_FAULT";
                const fault = message;
                switch (fault) {
                    case "overflow":
                    case "underflow":
                    case "division-by-zero":
                        url += "-" + fault;
                        break;
                    case "negative-power":
                    case "negative-width":
                        url += "-unsupported";
                        break;
                    case "unbound-bitwise-result":
                        url += "-unbound-result";
                        break;
                }
                break;
            }
            case ErrorCode.CALL_EXCEPTION:
            case ErrorCode.INSUFFICIENT_FUNDS:
            case ErrorCode.MISSING_NEW:
            case ErrorCode.NONCE_EXPIRED:
            case ErrorCode.REPLACEMENT_UNDERPRICED:
            case ErrorCode.TRANSACTION_REPLACED:
            case ErrorCode.UNPREDICTABLE_GAS_LIMIT:
                url = code;
                break;
        }
        if (url) {
            message += " [ See: https:/\/links.ethers.org/v5-errors-" + url + " ]";
        }
        if (messageDetails.length) {
            message += " (" + messageDetails.join(", ") + ")";
        }
        // @TODO: Any??
        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function (key) {
            error[key] = params[key];
        });
        return error;
    }
    throwError(message, code, params) {
        throw this.makeError(message, code, params);
    }
    throwArgumentError(message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
            argument: name,
            value: value
        });
    }
    assert(condition, message, code, params) {
        if (!!condition) {
            return;
        }
        this.throwError(message, code, params);
    }
    assertArgument(condition, message, name, value) {
        if (!!condition) {
            return;
        }
        this.throwArgumentError(message, name, value);
    }
    checkNormalize(message) {
        if (_normalizeError) {
            this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "String.prototype.normalize", form: _normalizeError
            });
        }
    }
    checkSafeUint53(value, message) {
        if (typeof (value) !== "number") {
            return;
        }
        if (message == null) {
            message = "value not safe";
        }
        if (value < 0 || value >= 0x1fffffffffffff) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "out-of-safe-range",
                value: value
            });
        }
        if (value % 1) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "non-integer",
                value: value
            });
        }
    }
    checkArgumentCount(count, expectedCount, message) {
        if (message) {
            message = ": " + message;
        }
        else {
            message = "";
        }
        if (count < expectedCount) {
            this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
        if (count > expectedCount) {
            this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
    }
    checkNew(target, kind) {
        if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    checkAbstract(target, kind) {
        if (target === kind) {
            this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
        }
        else if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    static globalLogger() {
        if (!_globalLogger) {
            _globalLogger = new Logger(version$2);
        }
        return _globalLogger;
    }
    static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
            this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        if (_permanentCensorErrors) {
            if (!censorship) {
                return;
            }
            this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
    }
    static setLogLevel(logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
            Logger.globalLogger().warn("invalid log level - " + logLevel);
            return;
        }
        _logLevel = level;
    }
    static from(version) {
        return new Logger(version);
    }
}
Logger.errors = ErrorCode;
Logger.levels = LogLevel;

const version$1 = "bytes/5.7.0";

const logger$1 = new Logger(version$1);
///////////////////////////////
function isHexable(value) {
    return !!(value.toHexString);
}
function addSlice(array) {
    if (array.slice) {
        return array;
    }
    array.slice = function () {
        const args = Array.prototype.slice.call(arguments);
        return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
    };
    return array;
}
function isInteger(value) {
    return (typeof (value) === "number" && value == value && (value % 1) === 0);
}
function isBytes(value) {
    if (value == null) {
        return false;
    }
    if (value.constructor === Uint8Array) {
        return true;
    }
    if (typeof (value) === "string") {
        return false;
    }
    if (!isInteger(value.length) || value.length < 0) {
        return false;
    }
    for (let i = 0; i < value.length; i++) {
        const v = value[i];
        if (!isInteger(v) || v < 0 || v >= 256) {
            return false;
        }
    }
    return true;
}
function arrayify(value, options) {
    if (!options) {
        options = {};
    }
    if (typeof (value) === "number") {
        logger$1.checkSafeUint53(value, "invalid arrayify value");
        const result = [];
        while (value) {
            result.unshift(value & 0xff);
            value = parseInt(String(value / 256));
        }
        if (result.length === 0) {
            result.push(0);
        }
        return addSlice(new Uint8Array(result));
    }
    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    if (isHexable(value)) {
        value = value.toHexString();
    }
    if (isHexString(value)) {
        let hex = value.substring(2);
        if (hex.length % 2) {
            if (options.hexPad === "left") {
                hex = "0" + hex;
            }
            else if (options.hexPad === "right") {
                hex += "0";
            }
            else {
                logger$1.throwArgumentError("hex data is odd-length", "value", value);
            }
        }
        const result = [];
        for (let i = 0; i < hex.length; i += 2) {
            result.push(parseInt(hex.substring(i, i + 2), 16));
        }
        return addSlice(new Uint8Array(result));
    }
    if (isBytes(value)) {
        return addSlice(new Uint8Array(value));
    }
    return logger$1.throwArgumentError("invalid arrayify value", "value", value);
}
function isHexString(value, length) {
    if (typeof (value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
    }
    return true;
}

var sha3$1 = {exports: {}};

/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2018
 * @license MIT
 */

var hasRequiredSha3;

function requireSha3 () {
	if (hasRequiredSha3) return sha3$1.exports;
	hasRequiredSha3 = 1;
	(function (module) {
		/*jslint bitwise: true */
		(function () {

		  var INPUT_ERROR = 'input is invalid type';
		  var FINALIZE_ERROR = 'finalize already called';
		  var WINDOW = typeof window === 'object';
		  var root = WINDOW ? window : {};
		  if (root.JS_SHA3_NO_WINDOW) {
		    WINDOW = false;
		  }
		  var WEB_WORKER = !WINDOW && typeof self === 'object';
		  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
		  if (NODE_JS) {
		    root = commonjsGlobal;
		  } else if (WEB_WORKER) {
		    root = self;
		  }
		  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && 'object' === 'object' && module.exports;
		  var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
		  var HEX_CHARS = '0123456789abcdef'.split('');
		  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
		  var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
		  var KECCAK_PADDING = [1, 256, 65536, 16777216];
		  var PADDING = [6, 1536, 393216, 100663296];
		  var SHIFT = [0, 8, 16, 24];
		  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
		    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
		    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
		    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
		    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
		  var BITS = [224, 256, 384, 512];
		  var SHAKE_BITS = [128, 256];
		  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
		  var CSHAKE_BYTEPAD = {
		    '128': 168,
		    '256': 136
		  };

		  if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
		    Array.isArray = function (obj) {
		      return Object.prototype.toString.call(obj) === '[object Array]';
		    };
		  }

		  if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
		    ArrayBuffer.isView = function (obj) {
		      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
		    };
		  }

		  var createOutputMethod = function (bits, padding, outputType) {
		    return function (message) {
		      return new Keccak(bits, padding, bits).update(message)[outputType]();
		    };
		  };

		  var createShakeOutputMethod = function (bits, padding, outputType) {
		    return function (message, outputBits) {
		      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
		    };
		  };

		  var createCshakeOutputMethod = function (bits, padding, outputType) {
		    return function (message, outputBits, n, s) {
		      return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
		    };
		  };

		  var createKmacOutputMethod = function (bits, padding, outputType) {
		    return function (key, message, outputBits, s) {
		      return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
		    };
		  };

		  var createOutputMethods = function (method, createMethod, bits, padding) {
		    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
		      var type = OUTPUT_TYPES[i];
		      method[type] = createMethod(bits, padding, type);
		    }
		    return method;
		  };

		  var createMethod = function (bits, padding) {
		    var method = createOutputMethod(bits, padding, 'hex');
		    method.create = function () {
		      return new Keccak(bits, padding, bits);
		    };
		    method.update = function (message) {
		      return method.create().update(message);
		    };
		    return createOutputMethods(method, createOutputMethod, bits, padding);
		  };

		  var createShakeMethod = function (bits, padding) {
		    var method = createShakeOutputMethod(bits, padding, 'hex');
		    method.create = function (outputBits) {
		      return new Keccak(bits, padding, outputBits);
		    };
		    method.update = function (message, outputBits) {
		      return method.create(outputBits).update(message);
		    };
		    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
		  };

		  var createCshakeMethod = function (bits, padding) {
		    var w = CSHAKE_BYTEPAD[bits];
		    var method = createCshakeOutputMethod(bits, padding, 'hex');
		    method.create = function (outputBits, n, s) {
		      if (!n && !s) {
		        return methods['shake' + bits].create(outputBits);
		      } else {
		        return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
		      }
		    };
		    method.update = function (message, outputBits, n, s) {
		      return method.create(outputBits, n, s).update(message);
		    };
		    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
		  };

		  var createKmacMethod = function (bits, padding) {
		    var w = CSHAKE_BYTEPAD[bits];
		    var method = createKmacOutputMethod(bits, padding, 'hex');
		    method.create = function (key, outputBits, s) {
		      return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
		    };
		    method.update = function (key, message, outputBits, s) {
		      return method.create(key, outputBits, s).update(message);
		    };
		    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
		  };

		  var algorithms = [
		    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
		    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
		    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
		    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
		    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
		  ];

		  var methods = {}, methodNames = [];

		  for (var i = 0; i < algorithms.length; ++i) {
		    var algorithm = algorithms[i];
		    var bits = algorithm.bits;
		    for (var j = 0; j < bits.length; ++j) {
		      var methodName = algorithm.name + '_' + bits[j];
		      methodNames.push(methodName);
		      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
		      if (algorithm.name !== 'sha3') {
		        var newMethodName = algorithm.name + bits[j];
		        methodNames.push(newMethodName);
		        methods[newMethodName] = methods[methodName];
		      }
		    }
		  }

		  function Keccak(bits, padding, outputBits) {
		    this.blocks = [];
		    this.s = [];
		    this.padding = padding;
		    this.outputBits = outputBits;
		    this.reset = true;
		    this.finalized = false;
		    this.block = 0;
		    this.start = 0;
		    this.blockCount = (1600 - (bits << 1)) >> 5;
		    this.byteCount = this.blockCount << 2;
		    this.outputBlocks = outputBits >> 5;
		    this.extraBytes = (outputBits & 31) >> 3;

		    for (var i = 0; i < 50; ++i) {
		      this.s[i] = 0;
		    }
		  }

		  Keccak.prototype.update = function (message) {
		    if (this.finalized) {
		      throw new Error(FINALIZE_ERROR);
		    }
		    var notString, type = typeof message;
		    if (type !== 'string') {
		      if (type === 'object') {
		        if (message === null) {
		          throw new Error(INPUT_ERROR);
		        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
		          message = new Uint8Array(message);
		        } else if (!Array.isArray(message)) {
		          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
		            throw new Error(INPUT_ERROR);
		          }
		        }
		      } else {
		        throw new Error(INPUT_ERROR);
		      }
		      notString = true;
		    }
		    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
		      blockCount = this.blockCount, index = 0, s = this.s, i, code;

		    while (index < length) {
		      if (this.reset) {
		        this.reset = false;
		        blocks[0] = this.block;
		        for (i = 1; i < blockCount + 1; ++i) {
		          blocks[i] = 0;
		        }
		      }
		      if (notString) {
		        for (i = this.start; index < length && i < byteCount; ++index) {
		          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
		        }
		      } else {
		        for (i = this.start; index < length && i < byteCount; ++index) {
		          code = message.charCodeAt(index);
		          if (code < 0x80) {
		            blocks[i >> 2] |= code << SHIFT[i++ & 3];
		          } else if (code < 0x800) {
		            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          } else if (code < 0xd800 || code >= 0xe000) {
		            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          } else {
		            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
		            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          }
		        }
		      }
		      this.lastByteIndex = i;
		      if (i >= byteCount) {
		        this.start = i - byteCount;
		        this.block = blocks[blockCount];
		        for (i = 0; i < blockCount; ++i) {
		          s[i] ^= blocks[i];
		        }
		        f(s);
		        this.reset = true;
		      } else {
		        this.start = i;
		      }
		    }
		    return this;
		  };

		  Keccak.prototype.encode = function (x, right) {
		    var o = x & 255, n = 1;
		    var bytes = [o];
		    x = x >> 8;
		    o = x & 255;
		    while (o > 0) {
		      bytes.unshift(o);
		      x = x >> 8;
		      o = x & 255;
		      ++n;
		    }
		    if (right) {
		      bytes.push(n);
		    } else {
		      bytes.unshift(n);
		    }
		    this.update(bytes);
		    return bytes.length;
		  };

		  Keccak.prototype.encodeString = function (str) {
		    var notString, type = typeof str;
		    if (type !== 'string') {
		      if (type === 'object') {
		        if (str === null) {
		          throw new Error(INPUT_ERROR);
		        } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
		          str = new Uint8Array(str);
		        } else if (!Array.isArray(str)) {
		          if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
		            throw new Error(INPUT_ERROR);
		          }
		        }
		      } else {
		        throw new Error(INPUT_ERROR);
		      }
		      notString = true;
		    }
		    var bytes = 0, length = str.length;
		    if (notString) {
		      bytes = length;
		    } else {
		      for (var i = 0; i < str.length; ++i) {
		        var code = str.charCodeAt(i);
		        if (code < 0x80) {
		          bytes += 1;
		        } else if (code < 0x800) {
		          bytes += 2;
		        } else if (code < 0xd800 || code >= 0xe000) {
		          bytes += 3;
		        } else {
		          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
		          bytes += 4;
		        }
		      }
		    }
		    bytes += this.encode(bytes * 8);
		    this.update(str);
		    return bytes;
		  };

		  Keccak.prototype.bytepad = function (strs, w) {
		    var bytes = this.encode(w);
		    for (var i = 0; i < strs.length; ++i) {
		      bytes += this.encodeString(strs[i]);
		    }
		    var paddingBytes = w - bytes % w;
		    var zeros = [];
		    zeros.length = paddingBytes;
		    this.update(zeros);
		    return this;
		  };

		  Keccak.prototype.finalize = function () {
		    if (this.finalized) {
		      return;
		    }
		    this.finalized = true;
		    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
		    blocks[i >> 2] |= this.padding[i & 3];
		    if (this.lastByteIndex === this.byteCount) {
		      blocks[0] = blocks[blockCount];
		      for (i = 1; i < blockCount + 1; ++i) {
		        blocks[i] = 0;
		      }
		    }
		    blocks[blockCount - 1] |= 0x80000000;
		    for (i = 0; i < blockCount; ++i) {
		      s[i] ^= blocks[i];
		    }
		    f(s);
		  };

		  Keccak.prototype.toString = Keccak.prototype.hex = function () {
		    this.finalize();

		    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
		      extraBytes = this.extraBytes, i = 0, j = 0;
		    var hex = '', block;
		    while (j < outputBlocks) {
		      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
		        block = s[i];
		        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
		          HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
		          HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
		          HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
		      }
		      if (j % blockCount === 0) {
		        f(s);
		        i = 0;
		      }
		    }
		    if (extraBytes) {
		      block = s[i];
		      hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
		      if (extraBytes > 1) {
		        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
		      }
		      if (extraBytes > 2) {
		        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
		      }
		    }
		    return hex;
		  };

		  Keccak.prototype.arrayBuffer = function () {
		    this.finalize();

		    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
		      extraBytes = this.extraBytes, i = 0, j = 0;
		    var bytes = this.outputBits >> 3;
		    var buffer;
		    if (extraBytes) {
		      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
		    } else {
		      buffer = new ArrayBuffer(bytes);
		    }
		    var array = new Uint32Array(buffer);
		    while (j < outputBlocks) {
		      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
		        array[j] = s[i];
		      }
		      if (j % blockCount === 0) {
		        f(s);
		      }
		    }
		    if (extraBytes) {
		      array[i] = s[i];
		      buffer = buffer.slice(0, bytes);
		    }
		    return buffer;
		  };

		  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

		  Keccak.prototype.digest = Keccak.prototype.array = function () {
		    this.finalize();

		    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
		      extraBytes = this.extraBytes, i = 0, j = 0;
		    var array = [], offset, block;
		    while (j < outputBlocks) {
		      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
		        offset = j << 2;
		        block = s[i];
		        array[offset] = block & 0xFF;
		        array[offset + 1] = (block >> 8) & 0xFF;
		        array[offset + 2] = (block >> 16) & 0xFF;
		        array[offset + 3] = (block >> 24) & 0xFF;
		      }
		      if (j % blockCount === 0) {
		        f(s);
		      }
		    }
		    if (extraBytes) {
		      offset = j << 2;
		      block = s[i];
		      array[offset] = block & 0xFF;
		      if (extraBytes > 1) {
		        array[offset + 1] = (block >> 8) & 0xFF;
		      }
		      if (extraBytes > 2) {
		        array[offset + 2] = (block >> 16) & 0xFF;
		      }
		    }
		    return array;
		  };

		  function Kmac(bits, padding, outputBits) {
		    Keccak.call(this, bits, padding, outputBits);
		  }

		  Kmac.prototype = new Keccak();

		  Kmac.prototype.finalize = function () {
		    this.encode(this.outputBits, true);
		    return Keccak.prototype.finalize.call(this);
		  };

		  var f = function (s) {
		    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
		      b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
		      b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
		      b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
		    for (n = 0; n < 48; n += 2) {
		      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
		      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
		      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
		      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
		      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
		      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
		      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
		      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
		      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
		      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

		      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
		      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
		      s[0] ^= h;
		      s[1] ^= l;
		      s[10] ^= h;
		      s[11] ^= l;
		      s[20] ^= h;
		      s[21] ^= l;
		      s[30] ^= h;
		      s[31] ^= l;
		      s[40] ^= h;
		      s[41] ^= l;
		      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
		      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
		      s[2] ^= h;
		      s[3] ^= l;
		      s[12] ^= h;
		      s[13] ^= l;
		      s[22] ^= h;
		      s[23] ^= l;
		      s[32] ^= h;
		      s[33] ^= l;
		      s[42] ^= h;
		      s[43] ^= l;
		      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
		      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
		      s[4] ^= h;
		      s[5] ^= l;
		      s[14] ^= h;
		      s[15] ^= l;
		      s[24] ^= h;
		      s[25] ^= l;
		      s[34] ^= h;
		      s[35] ^= l;
		      s[44] ^= h;
		      s[45] ^= l;
		      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
		      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
		      s[6] ^= h;
		      s[7] ^= l;
		      s[16] ^= h;
		      s[17] ^= l;
		      s[26] ^= h;
		      s[27] ^= l;
		      s[36] ^= h;
		      s[37] ^= l;
		      s[46] ^= h;
		      s[47] ^= l;
		      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
		      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
		      s[8] ^= h;
		      s[9] ^= l;
		      s[18] ^= h;
		      s[19] ^= l;
		      s[28] ^= h;
		      s[29] ^= l;
		      s[38] ^= h;
		      s[39] ^= l;
		      s[48] ^= h;
		      s[49] ^= l;

		      b0 = s[0];
		      b1 = s[1];
		      b32 = (s[11] << 4) | (s[10] >>> 28);
		      b33 = (s[10] << 4) | (s[11] >>> 28);
		      b14 = (s[20] << 3) | (s[21] >>> 29);
		      b15 = (s[21] << 3) | (s[20] >>> 29);
		      b46 = (s[31] << 9) | (s[30] >>> 23);
		      b47 = (s[30] << 9) | (s[31] >>> 23);
		      b28 = (s[40] << 18) | (s[41] >>> 14);
		      b29 = (s[41] << 18) | (s[40] >>> 14);
		      b20 = (s[2] << 1) | (s[3] >>> 31);
		      b21 = (s[3] << 1) | (s[2] >>> 31);
		      b2 = (s[13] << 12) | (s[12] >>> 20);
		      b3 = (s[12] << 12) | (s[13] >>> 20);
		      b34 = (s[22] << 10) | (s[23] >>> 22);
		      b35 = (s[23] << 10) | (s[22] >>> 22);
		      b16 = (s[33] << 13) | (s[32] >>> 19);
		      b17 = (s[32] << 13) | (s[33] >>> 19);
		      b48 = (s[42] << 2) | (s[43] >>> 30);
		      b49 = (s[43] << 2) | (s[42] >>> 30);
		      b40 = (s[5] << 30) | (s[4] >>> 2);
		      b41 = (s[4] << 30) | (s[5] >>> 2);
		      b22 = (s[14] << 6) | (s[15] >>> 26);
		      b23 = (s[15] << 6) | (s[14] >>> 26);
		      b4 = (s[25] << 11) | (s[24] >>> 21);
		      b5 = (s[24] << 11) | (s[25] >>> 21);
		      b36 = (s[34] << 15) | (s[35] >>> 17);
		      b37 = (s[35] << 15) | (s[34] >>> 17);
		      b18 = (s[45] << 29) | (s[44] >>> 3);
		      b19 = (s[44] << 29) | (s[45] >>> 3);
		      b10 = (s[6] << 28) | (s[7] >>> 4);
		      b11 = (s[7] << 28) | (s[6] >>> 4);
		      b42 = (s[17] << 23) | (s[16] >>> 9);
		      b43 = (s[16] << 23) | (s[17] >>> 9);
		      b24 = (s[26] << 25) | (s[27] >>> 7);
		      b25 = (s[27] << 25) | (s[26] >>> 7);
		      b6 = (s[36] << 21) | (s[37] >>> 11);
		      b7 = (s[37] << 21) | (s[36] >>> 11);
		      b38 = (s[47] << 24) | (s[46] >>> 8);
		      b39 = (s[46] << 24) | (s[47] >>> 8);
		      b30 = (s[8] << 27) | (s[9] >>> 5);
		      b31 = (s[9] << 27) | (s[8] >>> 5);
		      b12 = (s[18] << 20) | (s[19] >>> 12);
		      b13 = (s[19] << 20) | (s[18] >>> 12);
		      b44 = (s[29] << 7) | (s[28] >>> 25);
		      b45 = (s[28] << 7) | (s[29] >>> 25);
		      b26 = (s[38] << 8) | (s[39] >>> 24);
		      b27 = (s[39] << 8) | (s[38] >>> 24);
		      b8 = (s[48] << 14) | (s[49] >>> 18);
		      b9 = (s[49] << 14) | (s[48] >>> 18);

		      s[0] = b0 ^ (~b2 & b4);
		      s[1] = b1 ^ (~b3 & b5);
		      s[10] = b10 ^ (~b12 & b14);
		      s[11] = b11 ^ (~b13 & b15);
		      s[20] = b20 ^ (~b22 & b24);
		      s[21] = b21 ^ (~b23 & b25);
		      s[30] = b30 ^ (~b32 & b34);
		      s[31] = b31 ^ (~b33 & b35);
		      s[40] = b40 ^ (~b42 & b44);
		      s[41] = b41 ^ (~b43 & b45);
		      s[2] = b2 ^ (~b4 & b6);
		      s[3] = b3 ^ (~b5 & b7);
		      s[12] = b12 ^ (~b14 & b16);
		      s[13] = b13 ^ (~b15 & b17);
		      s[22] = b22 ^ (~b24 & b26);
		      s[23] = b23 ^ (~b25 & b27);
		      s[32] = b32 ^ (~b34 & b36);
		      s[33] = b33 ^ (~b35 & b37);
		      s[42] = b42 ^ (~b44 & b46);
		      s[43] = b43 ^ (~b45 & b47);
		      s[4] = b4 ^ (~b6 & b8);
		      s[5] = b5 ^ (~b7 & b9);
		      s[14] = b14 ^ (~b16 & b18);
		      s[15] = b15 ^ (~b17 & b19);
		      s[24] = b24 ^ (~b26 & b28);
		      s[25] = b25 ^ (~b27 & b29);
		      s[34] = b34 ^ (~b36 & b38);
		      s[35] = b35 ^ (~b37 & b39);
		      s[44] = b44 ^ (~b46 & b48);
		      s[45] = b45 ^ (~b47 & b49);
		      s[6] = b6 ^ (~b8 & b0);
		      s[7] = b7 ^ (~b9 & b1);
		      s[16] = b16 ^ (~b18 & b10);
		      s[17] = b17 ^ (~b19 & b11);
		      s[26] = b26 ^ (~b28 & b20);
		      s[27] = b27 ^ (~b29 & b21);
		      s[36] = b36 ^ (~b38 & b30);
		      s[37] = b37 ^ (~b39 & b31);
		      s[46] = b46 ^ (~b48 & b40);
		      s[47] = b47 ^ (~b49 & b41);
		      s[8] = b8 ^ (~b0 & b2);
		      s[9] = b9 ^ (~b1 & b3);
		      s[18] = b18 ^ (~b10 & b12);
		      s[19] = b19 ^ (~b11 & b13);
		      s[28] = b28 ^ (~b20 & b22);
		      s[29] = b29 ^ (~b21 & b23);
		      s[38] = b38 ^ (~b30 & b32);
		      s[39] = b39 ^ (~b31 & b33);
		      s[48] = b48 ^ (~b40 & b42);
		      s[49] = b49 ^ (~b41 & b43);

		      s[0] ^= RC[n];
		      s[1] ^= RC[n + 1];
		    }
		  };

		  if (COMMON_JS) {
		    module.exports = methods;
		  } else {
		    for (i = 0; i < methodNames.length; ++i) {
		      root[methodNames[i]] = methods[methodNames[i]];
		    }
		  }
		})(); 
	} (sha3$1));
	return sha3$1.exports;
}

var sha3Exports = /*@__PURE__*/ requireSha3();
var sha3 = /*@__PURE__*/getDefaultExportFromCjs(sha3Exports);

function keccak256(data) {
    return '0x' + sha3.keccak_256(arrayify(data));
}

const version = "strings/5.7.0";

const logger = new Logger(version);
///////////////////////////////
var UnicodeNormalizationForm;
(function (UnicodeNormalizationForm) {
    UnicodeNormalizationForm["current"] = "";
    UnicodeNormalizationForm["NFC"] = "NFC";
    UnicodeNormalizationForm["NFD"] = "NFD";
    UnicodeNormalizationForm["NFKC"] = "NFKC";
    UnicodeNormalizationForm["NFKD"] = "NFKD";
})(UnicodeNormalizationForm || (UnicodeNormalizationForm = {}));
var Utf8ErrorReason;
(function (Utf8ErrorReason) {
    // A continuation byte was present where there was nothing to continue
    // - offset = the index the codepoint began in
    Utf8ErrorReason["UNEXPECTED_CONTINUE"] = "unexpected continuation byte";
    // An invalid (non-continuation) byte to start a UTF-8 codepoint was found
    // - offset = the index the codepoint began in
    Utf8ErrorReason["BAD_PREFIX"] = "bad codepoint prefix";
    // The string is too short to process the expected codepoint
    // - offset = the index the codepoint began in
    Utf8ErrorReason["OVERRUN"] = "string overrun";
    // A missing continuation byte was expected but not found
    // - offset = the index the continuation byte was expected at
    Utf8ErrorReason["MISSING_CONTINUE"] = "missing continuation byte";
    // The computed code point is outside the range for UTF-8
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; outside the UTF-8 range
    Utf8ErrorReason["OUT_OF_RANGE"] = "out of UTF-8 range";
    // UTF-8 strings may not contain UTF-16 surrogate pairs
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; inside the UTF-16 surrogate range
    Utf8ErrorReason["UTF16_SURROGATE"] = "UTF-16 surrogate";
    // The string is an overlong representation
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; already bounds checked
    Utf8ErrorReason["OVERLONG"] = "overlong representation";
})(Utf8ErrorReason || (Utf8ErrorReason = {}));
// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
function toUtf8Bytes(str, form = UnicodeNormalizationForm.current) {
    if (form != UnicodeNormalizationForm.current) {
        logger.checkNormalize();
        str = str.normalize(form);
    }
    let result = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 0x80) {
            result.push(c);
        }
        else if (c < 0x800) {
            result.push((c >> 6) | 0xc0);
            result.push((c & 0x3f) | 0x80);
        }
        else if ((c & 0xfc00) == 0xd800) {
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
        }
        else {
            result.push((c >> 12) | 0xe0);
            result.push(((c >> 6) & 0x3f) | 0x80);
            result.push((c & 0x3f) | 0x80);
        }
    }
    return arrayify(result);
}

const SEED = "mimcsponge";
const NROUNDS = 220;

async function buildMimcSponge() {
    const bn128 = await getCurveFromName("bn128");
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
        const c = keccak256(toUtf8Bytes(seed+"_iv"));
        const cn = Scalar.e(c);
        const iv = cn.mod(F.p);
        return iv;
    };

    getConstants (seed, nRounds)  {
        const F = this.F;
        if (typeof nRounds === "undefined") nRounds = NROUNDS;
        const cts = new Array(nRounds);
        let c = keccak256(toUtf8Bytes(SEED));        for (let i=1; i<nRounds; i++) {
            c = keccak256(c);

            cts[i] = F.e(c);
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
  const { merkleTreeHeight, edge, elements, zeroElement } = threads.workerData;
  if (edge) {
    const merkleTree2 = new libExports.PartialMerkleTree(merkleTreeHeight, edge, elements, {
      zeroElement,
      hashFunction
    });
    threads.parentPort.postMessage(merkleTree2.toString());
    return;
  }
  const merkleTree = new libExports.MerkleTree(merkleTreeHeight, elements, {
    zeroElement,
    hashFunction
  });
  threads.parentPort.postMessage(merkleTree.toString());
}
if (isNode && threads) {
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
