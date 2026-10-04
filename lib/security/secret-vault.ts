import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isValidAesKey } from "./env";

const ALGORITHM = "aes-256-gcm";
const VERSION = 1;

export type EncryptedSecret = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
};

function getKey(): Buffer {
  const encoded = process.env.ULTRON_ENCRYPTION_KEY_BASE64;
  if (!isValidAesKey(encoded)) {
    throw new Error("Secret encryption is not configured: ULTRON_ENCRYPTION_KEY_BASE64 must encode exactly 32 random bytes.");
  }
  return Buffer.from(encoded!, "base64");
}

/** Encrypts a secret using authenticated encryption. Store the key outside the database. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  if (!plaintext) throw new Error("Secret value must not be empty.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    version: VERSION,
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

/** Decryption fails closed if the payload is modified or the key is wrong. */
export function decryptSecret(payload: EncryptedSecret): string {
  if (payload.version !== VERSION || payload.algorithm !== ALGORITHM) {
    throw new Error("Unsupported encrypted-secret format.");
  }
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  if (iv.byteLength !== 12 || authTag.byteLength !== 16) {
    throw new Error("Invalid encrypted-secret payload.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
