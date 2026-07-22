// Diff each FungibleToken branch's REAL rust step (addon) against jsoo's real
// step (prover_to_json), aligned at offset, isolating genuine coeff/wire
// divergences from the public-input constant-pin representation artifact.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/eddy/Projects/o1js/x.js');
const native = require('@o1js/native-linux-x64');
const dump = native.rust_pickles_recorded_step_circuit_json;
if (!dump) throw new Error('addon missing rust_pickles_recorded_step_circuit_json');

const branches = JSON.parse(readFileSync('/tmp/claude-1000/ft-branches.json', 'utf8'));
const jsoo = JSON.parse(readFileSync('/tmp/claude-1000/ft-steps-jsoo.json', 'utf8'));

const leHexToDec = (h) => {
  let x = 0n;
  for (let i = h.length - 2; i >= 0; i -= 2) x = (x << 8n) | BigInt(parseInt(h.substr(i, 2), 16));
  return x.toString();
};
const isHex = (s) => /^[0-9a-f]{64}$/.test(s);
const nc = (c) => (c || []).map((s) => (isHex(s) ? leHexToDec(s) : String(s)));
const nw = (w) => (w || []).map((x) => x.row + ',' + x.col);
const gt = (g) => g.typ || g.type;
const key = (g) => gt(g) + '|' + JSON.stringify(nc(g.coeffs)) + '|' + JSON.stringify(nw(g.wires));

// rust real step per branch (by order)
const rustSteps = branches.map((b) => JSON.parse(dump(JSON.stringify(b.circuit))));

for (let bi = 0; bi < branches.length; bi++) {
  const r = rustSteps[bi].gates;
  // methods compile in declaration order on both sides -> match by index
  const j = jsoo[bi].gates;
  const jname = jsoo[bi].name;
  if (j.length !== r.length) {
    console.log(`branch ${bi} (~${jname}): LENGTH MISMATCH jsoo=${j.length} rust=${r.length}`);
    continue;
  }
  // best offset
  let best = -1,
    bo = 0;
  for (let off = -40; off <= 40; off++) {
    let m = 0;
    for (let i = 0; i < j.length; i++) {
      const ri = i + off;
      if (ri < 0 || ri >= r.length) continue;
      if (key(j[i]) === key(r[ri])) m++;
    }
    if (m > best) {
      best = m;
      bo = off;
    }
  }
  // classify diffs at best offset
  let realCoeff = 0,
    realWire = 0,
    pinArtifact = 0,
    otherTyp = 0;
  for (let i = 0; i < j.length; i++) {
    const ri = i + bo;
    if (ri < 0 || ri >= r.length) continue;
    if (key(j[i]) === key(r[ri])) continue;
    if (gt(j[i]) !== gt(r[ri])) {
      // constant-pin artifact: jsoo Zero vs rust Generic
      if (gt(j[i]) === 'Zero' && gt(r[ri]) === 'Generic') pinArtifact++;
      else otherTyp++;
      continue;
    }
    const cd = JSON.stringify(nc(j[i].coeffs)) !== JSON.stringify(nc(r[ri].coeffs));
    const wd = JSON.stringify(nw(j[i].wires)) !== JSON.stringify(nw(r[ri].wires));
    if (cd) realCoeff++;
    if (wd) realWire++;
  }
  const verdict = realCoeff + realWire + otherTyp === 0 ? 'CLEAN' : '*** DIVERGES ***';
  console.log(
    `branch ${bi} (~${jname}, ${r.length}g, off ${bo}): realCoeff=${realCoeff} realWire=${realWire} otherTyp=${otherTyp} pinArtifact=${pinArtifact}  ${verdict}`
  );
}
