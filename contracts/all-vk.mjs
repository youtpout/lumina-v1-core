// Compile every lumina contract via jsoo (VK hash) or via the rust backend
// (dump per-contract branches). Compilation order is fixed and printed, since
// order can influence VK hashes when contracts reference one another.
//   BACKEND=jsoo node all-vk.mjs
//   BACKEND=rust node all-vk.mjs
import { Cache } from 'o1js';
import { writeFileSync } from 'node:fs';
import { Faucet, FungibleToken, FungibleTokenAdmin, Pool, PoolFactory, PoolTokenHolder } from './build/src/index.js';

const ORDER = [
  ['FungibleTokenAdmin', FungibleTokenAdmin],
  ['FungibleToken', FungibleToken],
  ['Faucet', Faucet],
  ['PoolTokenHolder', PoolTokenHolder],
  ['Pool', Pool],
  ['PoolFactory', PoolFactory],
];

const which = process.env.BACKEND ?? 'jsoo';
if (which === 'rust') {
  const { setProofSystemBackend } = await import('/home/eddy/Projects/o1js/dist/node/lib/backend.js');
  setProofSystemBackend('rust');
}

console.log(`# backend=${which}, order=${ORDER.map(([n]) => n).join(' > ')}`);
const results = {};
for (const [name, C] of ORDER) {
  try {
    if (which === 'rust') {
      process.env.O1JS_DUMP_PROGRAM_BRANCHES = `/tmp/claude-1000/lum-${name}-branches.json`;
    }
    const { verificationKey } = await C.compile({ cache: Cache.None, forceRecompile: true });
    console.log(`${which} ${name}: ${verificationKey.hash.toString()}`);
    results[name] = {
      hash: verificationKey.hash.toString(),
      data: verificationKey.data,
    };
  } catch (e) {
    console.log(`${which} ${name}: ERROR ${e.message?.split('\n')[0]}`);
  }
}
writeFileSync(`/tmp/lumina-vk-${which}.json`, JSON.stringify(results, null, 2));
