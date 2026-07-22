// Reconstruct the add_generic_constraint FEED order from each side's step
// gates (double-generic row = pending(op2, cols5-9) fed first, current(op1,
// cols0-4) fed second) and diff, to pinpoint the first feed-order divergence.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/eddy/Projects/o1js/x.js');
const native = require('@o1js/native-linux-x64');
const dump = native.rust_pickles_recorded_step_circuit_json;

const BI = Number(process.env.BI ?? 4);
const branches = JSON.parse(readFileSync('/tmp/claude-1000/ft-branches.json', 'utf8'));
const jsoo = JSON.parse(readFileSync('/tmp/claude-1000/ft-steps-jsoo.json', 'utf8'))[BI].gates;
const rust = JSON.parse(dump(JSON.stringify(branches[BI].circuit))).gates;

const leHexToDec = (h) => {
  let x = 0n;
  for (let i = h.length - 2; i >= 0; i -= 2) x = (x << 8n) | BigInt(parseInt(h.substr(i, 2), 16));
  return x.toString();
};
const isHex = (s) => /^[0-9a-f]{64}$/.test(s);
const nc = (c) => (c || []).map((s) => (isHex(s) ? leHexToDec(s) : String(s)));
const gt = (g) => g.typ || g.type;

// Extract feed sequence: for each Generic row, emit op2 then op1 (feed order).
// Single generic (5 coeffs) = one feed (a flushed pending).
function feeds(gates) {
  const out = [];
  for (const g of gates) {
    if (gt(g) !== 'Generic') continue;
    const c = nc(g.coeffs);
    if (c.length >= 10) {
      out.push(c.slice(5, 10).join(',')); // op2 (pending, fed first)
      out.push(c.slice(0, 5).join(',')); // op1 (current, fed second)
    } else {
      out.push(c.slice(0, 5).join(','));
    }
  }
  return out;
}

const jf = feeds(jsoo);
const rf = feeds(rust);
console.log(`branch ${BI}: jsoo feeds=${jf.length} rust feeds=${rf.length}`);
const n = Math.min(jf.length, rf.length);
let first = -1;
for (let i = 0; i < n; i++)
  if (jf[i] !== rf[i]) {
    first = i;
    break;
  }
if (first < 0) {
  console.log('feed sequences MATCH (divergence is a pure pairing/flush-boundary effect)');
} else {
  console.log(`first feed divergence at #${first}:`);
  for (let i = Math.max(0, first - 3); i < Math.min(n, first + 6); i++) {
    const mk = i === first ? ' <<<' : '';
    console.log(`  #${i}  J[${jf[i]}]  R[${rf[i]}]${mk}`);
  }
}
