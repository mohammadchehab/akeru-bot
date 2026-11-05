import * as NodeCrypto from "node:crypto";

/** AES-256-GCM of one credential value. The id is authenticated, so a sealed value cannot be moved to another credential. */
export function sealValue(key: Buffer, id: string, value: string): string {
  const iv = NodeCrypto.randomBytes(12);
  const cipher = NodeCrypto.createCipheriv("aes-256-gcm", key, iv);

  cipher.setAAD(Buffer.from(id, "utf8"));

  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}

/** Returns undefined for a wrong key, a tampered record, or a record sealed for another id. */
export function openValue(key: Buffer, id: string, sealed: string): string | undefined {
  const [iv, tag, body] = sealed.split(".");

  if (iv === undefined || tag === undefined || body === undefined) return undefined;

  try {
    const decipher = NodeCrypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));

    decipher.setAAD(Buffer.from(id, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return undefined;
  }
}
