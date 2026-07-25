import { writeFile } from 'node:fs/promises';
import {
  AccountUpdate,
  Bool,
  Mina,
  PrivateKey,
  UInt8,
  UInt64,
  setProofSystemBackend,
} from 'o1js';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';

type Recording = {
  circuit: unknown;
  witness: string[];
};

const output = process.env.FT_WITNESS_OUTPUT ?? '/tmp/ft-transfer-recording.json';

async function main() {
  setProofSystemBackend('rust');
  const local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(local);
  const senderKey = PrivateKey.fromBigInt(BigInt(process.env.FT_SENDER_KEY ?? '11'));
  const receiverKey = PrivateKey.fromBigInt(BigInt(process.env.FT_RECEIVER_KEY ?? '12'));
  const adminKey = PrivateKey.fromBigInt(13n);
  const tokenKey = PrivateKey.fromBigInt(BigInt(process.env.FT_TOKEN_KEY ?? '14'));
  const deployer = Object.assign(senderKey.toPublicKey(), { key: senderKey });
  const receiver = receiverKey.toPublicKey();
  local.addAccount(deployer, '1000000000000');
  const admin = new FungibleTokenAdmin(adminKey.toPublicKey());
  const token = new FungibleToken(tokenKey.toPublicKey());

  const deploy = await Mina.transaction(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer, 3);
    await admin.deploy({ adminPublicKey: deployer });
    await token.deploy({ symbol: 'LTA', src: 'native-witness-fixture', allowUpdates: false });
    await token.initialize(adminKey.toPublicKey(), UInt8.from(9), Bool(false));
  });
  await deploy.prove();
  await deploy.sign([deployer.key, adminKey, tokenKey]).send();

  local.setProofsEnabled(true);
  const compileRecordings: Recording[] = [];
  (globalThis as Record<string, unknown>).__rustPicklesRecordingObserver = (
    recording: Recording
  ) => compileRecordings.push(recording);
  const { verificationKey } = await FungibleToken.compile();
  const transferRecordings: Recording[] = [];
  (globalThis as Record<string, unknown>).__rustPicklesRecordingObserver = (
    recording: Recording
  ) => transferRecordings.push(recording);

  const amount = UInt64.from(BigInt(process.env.FT_AMOUNT ?? '1234567890'));
  const transfer = await Mina.transaction(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer, 1);
    await token.transfer(deployer, receiver, amount);
  });
  await transfer.prove();
  delete (globalThis as Record<string, unknown>).__rustPicklesRecordingObserver;

  await writeFile(
    output,
    JSON.stringify({
      verificationKey: {
        data: verificationKey.data,
        hash: verificationKey.hash.toString(),
      },
      input: {
        sender: deployer.toBase58(),
        receiver: receiver.toBase58(),
        amount: amount.toString(),
        tokenAddress: token.address.toBase58(),
        tokenId: token.deriveTokenId().toString(),
      },
      transaction: JSON.parse(transfer.toJSON()),
      compileRecordings,
      recordings: transferRecordings,
    })
  );
  process.stderr.write(
    `Wrote ${compileRecordings.length} compile and ${transferRecordings.length} transfer recording(s) to ${output}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
