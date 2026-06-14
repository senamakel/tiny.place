// Non-interactive: materialize a CLI keypair file from a raw secret key passed
// via the SECRET env var (so it never appears in argv or shell history). Accepts
// a base58 secret (Phantom export) or a JSON byte array. Prints the pubkey.
//
//   SECRET="<base58-or-[1,2,...]>" node secret-to-keypair.mjs <out.json>
import { writeFileSync } from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const out = process.argv[2];
const secret = (process.env.SECRET || "").trim();
if (!out || !secret) {
  console.error("usage: SECRET=<base58|json-array> node secret-to-keypair.mjs <out>");
  process.exit(1);
}

const bytes = secret.startsWith("[")
  ? Uint8Array.from(JSON.parse(secret))
  : bs58.decode(secret);
const kp = Keypair.fromSecretKey(bytes); // throws on wrong length
writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
console.log(kp.publicKey.toBase58());
