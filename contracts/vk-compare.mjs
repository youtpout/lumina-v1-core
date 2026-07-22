// Ground-truth VK-hash comparison of FungibleToken between backends.
//   BACKEND=jsoo node vk-compare.mjs
//   BACKEND=rust node vk-compare.mjs
import { Cache } from 'o1js';
import { FungibleToken } from 'mina-fungible-token';

const which = process.env.BACKEND ?? 'jsoo';
if (which === 'rust') {
  const { setProofSystemBackend } = await import(
    '/home/eddy/Projects/o1js/dist/node/lib/backend.js'
  );
  setProofSystemBackend('rust');
}
const { verificationKey } = await FungibleToken.compile({ cache: Cache.None, forceRecompile: true });
console.log(`${which} FungibleToken VK hash: ${verificationKey.hash.toString()}`);
const { writeFileSync } = await import('node:fs');
writeFileSync(`/tmp/claude-1000/ft-vk-${which}.txt`, verificationKey.data);
console.log(`wrote /tmp/claude-1000/ft-vk-${which}.txt (${verificationKey.data.length} b64 chars)`);
