import { PrismaClient } from "@prisma/client";
import { randomBytes, createHmac } from "crypto";
import { env } from "../src/env.js";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();
const hmacSecret = Buffer.from(env.APIKEY_HMAC_SECRET_B64, "base64");

function genKey() {
  return randomBytes(32).toString("base64url");
}

function hashKey(apiKey: string) {
  return createHmac("sha256", hmacSecret).update(apiKey).digest("base64");
}

const apiKey = genKey();
const apiKeyHash = hashKey(apiKey);

const dev = await prisma.developer.create({
  data: { id: nanoid(), name: "root-admin", role: "ADMIN", apiKeyHash, isActive: true }
});

console.log(JSON.stringify({ developerId: dev.id, apiKey }, null, 2));
await prisma.$disconnect();
