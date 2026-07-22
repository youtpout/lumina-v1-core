import { Cache } from 'o1js';
import { Pool } from './build/src/index.js';
const which = process.env.BACKEND ?? 'jsoo';
if (which === 'rust') {
  const { setProofSystemBackend } = await import('/home/eddy/Projects/o1js/dist/node/lib/backend.js');
  setProofSystemBackend('rust');
  process.env.O1JS_DUMP_PROGRAM_BRANCHES = '/tmp/claude-1000/lum-Pool-first-branches.json';
}
const { verificationKey } = await Pool.compile({ cache: Cache.None, forceRecompile: true });
console.log(`${which} Pool-first: ${verificationKey.hash.toString()}`);
