// Convert a base58-encoded Solana secret key (e.g. a Phantom export) into the
// 64-byte JSON array file the solana CLI expects, WITHOUT the secret ever
// appearing in argv or shell history. The secret is read from a hidden prompt.
//
//   node scripts/devnet/from-base58.mjs scripts/devnet/keys/deployer.json
//
// Then paste the base58 secret and press enter (input is not echoed).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const out = process.argv[2];
if (!out) {
  console.error("usage: node from-base58.mjs <output-keypair.json>");
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      // Re-print the prompt with no echo of the typed characters.
      const c = char.toString();
      if (c === "\n" || c === "\r" || c === "") process.stdout.write("\n");
      else process.stdout.write(`\r${question}`);
    };
    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      process.stdin.removeListener("data", onData);
      rl.close();
      resolve(answer.trim());
    });
  });
}

const secret = await promptHidden("paste base58 secret key: ");
const bytes = bs58.decode(secret);
const kp = Keypair.fromSecretKey(bytes); // throws if length is wrong
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)));
console.log(`wrote ${out}  (pubkey ${kp.publicKey.toBase58()})`);
