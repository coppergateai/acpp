import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";

export type Ed25519Material = {
  /** Raw Ed25519 public key (base64url, 32 bytes). */
  publicKey: string;
  privateKey: KeyObject;
};

export function generateActorId(): string {
  const suffix = randomBytes(12).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `01${Date.now().toString(36)}${suffix}`.slice(0, 26);
}

export function createKeyId(publicKeyRaw: string): string {
  const digest = createHash("sha256").update(publicKeyRaw).digest("base64url");
  return `key_${digest.slice(0, 16)}`;
}

export function generateEd25519KeyPair(): Ed25519Material {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: exportRawPublicKey(publicKey),
    privateKey,
  };
}

export function exportRawPublicKey(publicKey: KeyObject): string {
  const jwk = publicKey.export({ format: "jwk" }) as { x?: string };
  if (!jwk.x) {
    throw new Error("Ed25519 public key missing JWK x");
  }
  return jwk.x;
}

export function publicKeyFromRaw(rawBase64Url: string): KeyObject {
  return createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: rawBase64Url },
    format: "jwk",
  });
}

export function signMessage(
  message: string | Uint8Array,
  privateKey: KeyObject,
): string {
  const data =
    typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  return sign(null, data, privateKey).toString("base64url");
}

export function verifyMessage(
  message: string | Uint8Array,
  signatureBase64Url: string,
  publicKeyRaw: string,
): boolean {
  const data =
    typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  const key = publicKeyFromRaw(publicKeyRaw);
  return verify(
    null,
    data,
    key,
    Buffer.from(signatureBase64Url, "base64url"),
  );
}
