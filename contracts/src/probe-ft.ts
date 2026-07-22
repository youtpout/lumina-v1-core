import { Bool, Mina, AccountUpdate, PrivateKey, UInt8, setProofSystemBackend } from 'o1js';
import { FungibleToken, FungibleTokenAdmin } from './index.js';
setProofSystemBackend('rust');
const log = (m: string) => process.stderr.write(m + '\n');
async function main() {
  await FungibleTokenAdmin.compile(); await FungibleToken.compile();
  const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [deployer] = Local.testAccounts;
  const adminKey = PrivateKey.random(), tokenKey = PrivateKey.random();
  const admin = new FungibleTokenAdmin(adminKey.toPublicKey());
  const token = new FungibleToken(tokenKey.toPublicKey());
  const tx = await Mina.transaction(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer, 3);
    await admin.deploy({ adminPublicKey: deployer });
    await token.deploy({ symbol: 'LTA', src: 'x', allowUpdates: false });
    await token.initialize(adminKey.toPublicKey(), UInt8.from(9), Bool(false));
  });
  await tx.prove(); log('>>> PROVED');
}
main().then(()=>process.exit(0)).catch(e=>{log('>>> ERR '+(e?.stack??e?.message??e));process.exit(1);});
