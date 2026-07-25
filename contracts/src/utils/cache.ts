import fs from 'fs/promises';
import { Cache, setBackend, setProofSystemBackend } from 'o1js';
import { Pool, PoolTokenHolder, FungibleToken, FungibleTokenAdmin, Faucet, PoolFactory } from '../index.js';
import path from 'path';

// node build/src/utils/cache.js
//
// Generates the compile cache with the Rust proof-system backend. In the
// browser, rust-wasm reconstructs the prover keys from the compact
// recorded-program entries plus the shared SRS/Lagrange bases, so only those
// (no `-pk-` prover keys) need to be shipped in public/cache.
setProofSystemBackend('rust');
// Generate through the same transport the browser uses, so the entries are
// exactly the ones it will read back.
setBackend('wasm');

// Start from a clean cache so no stale jsoo entries survive.
await fs.rm('./cache', { recursive: true, force: true });
const cache = Cache.FileSystem('./cache');

const contracts: [string, any][] = [
    ['PoolFactory', PoolFactory],
    ['Pool', Pool],
    ['FungibleToken', FungibleToken],
    ['FungibleTokenAdmin', FungibleTokenAdmin],
    ['PoolTokenHolder', PoolTokenHolder],
    ['Faucet', Faucet],
];

const vkHashes: Record<string, string> = {};
// One pass is enough: writing a cache entry now builds a Lagrange basis that
// has not been materialized yet, instead of skipping it. Before that, a basis
// whose domain only shows up while proving could never be written by a script
// that merely compiles, and repeating the compile just hoped to stumble on it.
for (const [name, contract] of contracts) {
    const { verificationKey } = await contract.compile({ cache });
    vkHashes[name] = verificationKey.hash.toString();
}

// Fail loudly rather than shipping a cache that makes every visitor rebuild
// what is missing.
const written = await fs.readdir('./cache');
const expected = [
    'srs-fp-65536',
    'srs-fq-32768',
    ...[512, 1024, 2048, 4096, 8192, 16384, 32768, 65536].map(d => `lagrange-basis-fp-${d}`),
    ...[8192, 16384, 32768].map(d => `lagrange-basis-fq-${d}`),
];
const missing = expected.filter(name => !written.includes(name));
const programs = written.filter(name => name.startsWith('recorded-base-program-')).length;
console.log(`cache: ${programs} program entries, ${expected.length - missing.length}/${expected.length} SRS+Lagrange entries`);
if (missing.length) {
    throw new Error(`incomplete cache, missing: ${missing.join(', ')}`);
}
if (programs < contracts.length) {
    throw new Error(`expected one program entry per contract, got ${programs}`);
}

console.log('--- verification key hashes (rust backend) ---');
for (const [name, hash] of Object.entries(vkHashes)) {
    console.log(`${name}: ${hash}`);
}

const folder = await fs.readdir("./cache");

const filter = (x: string) => { return x.indexOf('-pk-') === -1 && x.indexOf('.header') === -1 };
// we will filter pk directly on the frontend
//const filter = (x: string) => { return x.indexOf('.header') === -1 };
const fileName = folder.filter(filter);
const json = JSON.stringify(fileName);

// Rebuild public/cache from scratch so no stale entries remain.
await fs.rm('../website/public/cache', { recursive: true, force: true });
await fs.mkdir('../website/public/cache', { recursive: true });
await fs.cp('./cache', '../website/public/cache', {
    recursive: true, filter: (source, _destination) => {
        return filter(source);
    }
});


const folderPath = '../website/public/cache';
let filesArr = await fs.readdir(folderPath);

// Loop through array and rename all files
filesArr.forEach(async (file) => {
    let fullPath = path.join(folderPath, file);
    let fileExtension = path.extname(file);
    let fileName = path.basename(file, fileExtension);

    // we use textfile to get browser compression
    let newFileName = fileName + ".txt";
    try {
        await fs.rename(fullPath, path.join(folderPath, newFileName));
    } catch (error) {
        console.error(error)
    }
});

await fs.writeFile('../website/public/compiled.json', json, 'utf8');
