// Capture jsoo's REAL per-method step circuits for FungibleToken.
import { Cache } from 'o1js';
import { FungibleToken } from 'mina-fungible-token';
import { writeFileSync } from 'node:fs';
const bindings = await import('/home/eddy/Projects/o1js/dist/node/bindings.js');

let stepPks = [];
let cache = {
  canWrite: true,
  read: () => undefined,
  write(header, value) {
    if (header.kind === 'step-pk')
      stepPks.push({ name: header.methodName ?? String(stepPks.length), bytes: value.slice() });
  },
};
await FungibleToken.compile({ cache, forceRecompile: true });
let { Pickles, wasm } = bindings;
let steps = stepPks.map(({ name, bytes }) => {
  let index = wasm.caml_pasta_fp_plonk_index_decode(bytes, Pickles.loadSrsFp());
  let c = JSON.parse(wasm.prover_to_json(index));
  return { name, public_input_size: c.public_input_size, gates: c.gates };
});
writeFileSync('/tmp/claude-1000/ft-steps-jsoo.json', JSON.stringify(steps));
console.log('jsoo steps:', steps.map((s) => `${s.name}:${s.gates.length}`).join(' '));
