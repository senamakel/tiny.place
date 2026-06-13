import type { SigningKey } from "./auth.js";
import { Signer } from "./signer.js";
import {
  generateKeyPair,
  deriveCryptoId,
  publicKeyToBase64,
  publicKeyToHex,
} from "./crypto.js";
import type { KeyPair } from "./crypto.js";
import { ed25519SeedToX25519KeyPair } from "./signal/crypto.js";
import type { X25519KeyPair } from "./signal/crypto.js";
import {
  signX402Authorization,
  generateNonce,
} from "./x402.js";
import type {
  X402Authorization,
  X402AuthorizationFields,
} from "./x402.js";

export interface SessionApprovalRequest {
  signerPublicKeyHex: string;
  authorization: X402Authorization;
}

export interface BrowserSessionSignerOptions {
  network: string;
  asset: string;
  budget: string;
  expiresAt: string;
  to?: string;
  /**
   * The grantor's base64 Ed25519 public key. Required when the grantor is not a
   * registered identity: the backend derives/binds the grant to the grantor via
   * metadata.publicKey, and stores it as the grantor public key the session key
   * is allowed to act as. Omit only when the grantor is already registered (the
   * backend then resolves the key from the registry).
   */
  grantorPublicKey?: string;
}

export class BrowserSessionSigner extends Signer {
  readonly agentId: string;
  readonly publicKeyBase64: string;
  readonly publicKeyHex: string;

  private readonly keyPair: KeyPair;
  private approvalNonce: string | undefined;

  private constructor(keyPair: KeyPair) {
    super();
    this.keyPair = keyPair;
    this.agentId = deriveCryptoId(keyPair.publicKey);
    this.publicKeyBase64 = publicKeyToBase64(keyPair.publicKey);
    this.publicKeyHex = publicKeyToHex(keyPair.publicKey);
  }

  static async create(): Promise<BrowserSessionSigner> {
    const keyPair = await generateKeyPair();
    return new BrowserSessionSigner(keyPair);
  }

  async buildApprovalRequest(
    grantor: SigningKey,
    grantorCryptoId: string,
    options: BrowserSessionSignerOptions,
  ): Promise<SessionApprovalRequest> {
    const nonce = generateNonce("signer");
    this.approvalNonce = nonce;

    // The backend verifies the approval signature against an RFC 3339
    // (whole-second) expiry, so strip any fractional seconds before signing —
    // otherwise a `Date.toISOString()` millisecond expiry signs bytes the server
    // never reconstructs ("invalid signature").
    const expiresAt = options.expiresAt.replace(
      /\.\d+(Z|[+-]\d{2}:?\d{2})$/,
      "$1",
    );

    const fields: X402AuthorizationFields = {
      scheme: "upto",
      network: options.network,
      asset: options.asset,
      amount: options.budget,
      from: grantorCryptoId,
      to: options.to ?? "",
      nonce,
      expiresAt,
      metadata: {
        domain: "tiny.place",
        signerKey: this.publicKeyHex,
        // Bind the grant to the grantor's key so an unregistered wallet can
        // still be the grantor (the backend requires publicKey to derive the
        // grantor cryptoId and stores it as the delegated-to key).
        ...(options.grantorPublicKey
          ? { publicKey: options.grantorPublicKey }
          : {}),
      },
    };

    const authorization = await signX402Authorization(grantor, fields);

    return {
      signerPublicKeyHex: this.publicKeyHex,
      authorization,
    };
  }

  getApprovalNonce(): string | undefined {
    return this.approvalNonce;
  }

  setApprovalNonce(nonce: string): void {
    this.approvalNonce = nonce;
  }

  async signPayment(
    to: string,
    amount: string,
    network: string,
    asset: string,
    grantorCryptoId: string,
  ): Promise<X402Authorization> {
    if (!this.approvalNonce) {
      throw new Error("Session signer has not been approved yet");
    }

    const fields: X402AuthorizationFields = {
      scheme: "exact",
      network,
      asset,
      amount,
      from: grantorCryptoId,
      to,
      nonce: generateNonce("pay"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      metadata: {
        domain: "tiny.place",
        parentNonce: this.approvalNonce,
      },
    };

    return signX402Authorization(this, fields);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    const sig = await globalThis.crypto.subtle.sign(
      "Ed25519",
      this.keyPair.privateKey,
      buffer,
    );
    return new Uint8Array(sig);
  }

  async getX25519KeyPair(): Promise<X25519KeyPair> {
    const jwk = await globalThis.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.privateKey,
    );
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
