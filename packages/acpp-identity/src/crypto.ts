import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  verify,
} from "node:crypto";

export type Ed25519KeyMaterial = {
  keyId: string;
  alg: "Ed25519";
  publicKey: string;
  privateKey: string;
};

export function newKeyId(): string {
  return `key_${randomBytes(12).toString("base64url")}`;
}

/** Generate Ed25519 key pair (SPKI/PKCS8 DER, base64). */
export function generateEd25519KeyPair(keyId?: string): Ed25519KeyMaterial {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const privateKeyPkcs8 = privateKey.export({ type: "pkcs8", format: "der" });
  return {
    keyId: keyId ?? newKeyId(),
    alg: "Ed25519",
    publicKey: Buffer.from(publicKeyDer).toString("base64"),
    privateKey: Buffer.from(privateKeyPkcs8).toString("base64"),
  };
}

function messageBytes(message: string | Uint8Array): Buffer {
  return typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
}

export function signEd25519(
  message: string | Uint8Array,
  privateKeyBase64: string,
): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return sign(null, messageBytes(message), key).toString("base64");
}

export function verifyEd25519(
  message: string | Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  const key = createPublicKey({
    key: Buffer.from(publicKeyBase64, "base64"),
    format: "der",
    type: "spki",
  });
  return verify(
    null,
    messageBytes(message),
    key,
    Buffer.from(signatureBase64, "base64"),
  );
}
