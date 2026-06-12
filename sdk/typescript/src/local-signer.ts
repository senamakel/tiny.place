import { Signer } from "./signer.js";
import {
  generateKeyPair,
  deriveCryptoId,
  publicKeyToBase64,
} from "./crypto.js";
import type { KeyPair } from "./crypto.js";
import { ed25519SeedToX25519KeyPair } from "./signal/crypto.js";
import type { X25519KeyPair } from "./signal/crypto.js";

export class LocalSigner extends Signer {
  readonly agentId: string;
  readonly publicKeyBase64: string;
  readonly publicKey: Uint8Array;

  private readonly privateKey: CryptoKey;

  private constructor(keyPair: KeyPair) {
    super();
    this.publicKey = keyPair.publicKey;
    this.privateKey = keyPair.privateKey;
    this.agentId = deriveCryptoId(keyPair.publicKey);
    this.publicKeyBase64 = publicKeyToBase64(keyPair.publicKey);
  }

  static async generate(): Promise<LocalSigner> {
    const keyPair = await generateKeyPair();
    return new LocalSigner(keyPair);
  }

  static async fromPrivateKey(privateKey: CryptoKey): Promise<LocalSigner> {
    const crypto = globalThis.crypto;
    const jwk = await crypto.subtle.exportKey("jwk", privateKey);
    const publicOnlyJwk = { ...jwk, d: undefined, key_ops: ["verify"] };
    const publicCryptoKey = await crypto.subtle.importKey(
      "jwk",
      publicOnlyJwk,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    const publicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", publicCryptoKey),
    );
    return new LocalSigner({ publicKey: publicKeyRaw, privateKey });
  }

  static fromKeyPair(keyPair: KeyPair): LocalSigner {
    return new LocalSigner(keyPair);
  }

  /**
   * Derives a deterministic signer from a 32-byte Ed25519 seed. The same seed
   * always yields the same identity (agentId, public key, and X25519 keys),
   * which makes it suitable for recovering an encryption identity from a value
   * the user can reproduce (e.g. a wallet signature over a fixed message).
   *
   * @param seed - Exactly 32 bytes of secret seed material.
   * @returns A signer backed by the derived Ed25519 key.
   */
  static async fromSeed(seed: Uint8Array): Promise<LocalSigner> {
    if (seed.length !== 32) {
      throw new Error(`Ed25519 seed must be 32 bytes, got ${seed.length}`);
    }
    // PKCS#8 PrivateKeyInfo prefix for an Ed25519 key, followed by the raw seed.
    const prefix = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
      0x04, 0x22, 0x04, 0x20,
    ]);
    const pkcs8 = new Uint8Array(prefix.length + seed.length);
    pkcs8.set(prefix, 0);
    pkcs8.set(seed, prefix.length);
    const privateKey = await globalThis.crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "Ed25519" },
      true,
      ["sign"],
    );
    return LocalSigner.fromPrivateKey(privateKey);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const crypto = globalThis.crypto;
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    const sig = await crypto.subtle.sign("Ed25519", this.privateKey, buffer);
    return new Uint8Array(sig);
  }

  async getX25519KeyPair(): Promise<X25519KeyPair> {
    const crypto = globalThis.crypto;
    const jwk = await crypto.subtle.exportKey("jwk", this.privateKey);
    const seed = base64urlToBytes(jwk.d!);
    return ed25519SeedToX25519KeyPair(seed);
  }
}

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
