import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./env.js";

const masterKey = Buffer.from(env.MASTER_KEY_B64, "base64");

export function encryptString(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64"),
    ct: ciphertext.toString("base64"),
    tag: tag.toString("base64")
  });
}

export function decryptString(enc: string): string {
  const obj = JSON.parse(enc) as { iv: string; ct: string; tag: string };
  const iv = Buffer.from(obj.iv, "base64");
  const ct = Buffer.from(obj.ct, "base64");
  const tag = Buffer.from(obj.tag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}
