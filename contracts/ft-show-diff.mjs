import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/eddy/Projects/o1js/x.js');
const native = require('@o1js/native-linux-x64');
const dump = native.rust_pickles_recorded_step_circuit_json;

const branches = JSON.parse(readFileSync('/tmp/claude-1000/ft-branches.json', 'utf8'));
const jsoo = JSON.parse(readFileSync('/tmp/claude-1000/ft-steps-jsoo.json', 'utf8'));
const BI = Number(process.env.BI ?? 3);

const leHexToDec = (h) => {
  let x = 0n;
  for (let i = h.length - 2; i >= 0; i -= 2) x = (x << 8n) | BigInt(parseInt(h.substr(i, 2), 16));
  return x.toString();
};
const isHex = (s) => /^[0-9a-f]{64}$/.test(s);
const nc = (c) => (c || []).map((s) => (isHex(s) ? leHexToDec(s) : String(s)));
const nw = (w) => (w || []).map((x) => x.row + ',' + x.col).join(' ');
const gt = (g) => g.typ || g.type;

const r = JSON.parse(dump(JSON.stringify(branches[BI].circuit))).gates;
const j = jsoo[BI].gates;
const L = JSON.parse(dump(JSON.stringify(branches[BI].circuit))).labels || [];
console.log(`branch ${BI} = ${jsoo[BI].name}, ${r.length} gates`);
for (let i = 0; i < j.length; i++) {
  const cd = JSON.stringify(nc(j[i].coeffs)) !== JSON.stringify(nc(r[i].coeffs));
  const wd = nw(j[i].wires) !== nw(r[i].wires);
  const td = gt(j[i]) !== gt(r[i]);
  if (!cd && !wd && !td) continue;
  console.log(`\nrow ${i}: ${gt(j[i])}/${gt(r[i])}  ${td ? 'TYP ' : ''}${cd ? 'COEFF ' : ''}${wd ? 'WIRE' : ''}`);
  if (cd) {
    console.log('  J c:', JSON.stringify(nc(j[i].coeffs).map((x) => x.slice(0, 10))));
    console.log('  R c:', JSON.stringify(nc(r[i].coeffs).map((x) => x.slice(0, 10))));
  }
  if (wd) {
    console.log('  J w:', nw(j[i].wires));
    console.log('  R w:', nw(r[i].wires));
  }
}
