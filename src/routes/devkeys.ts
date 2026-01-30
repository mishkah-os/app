import { FastifyPluginAsync } from "fastify";
import { PrismaClient, DevRole } from "@prisma/client";
import { randomBytes, createHmac } from "crypto";
import { env } from "../env.js";
import { ok, HttpError } from "../http.js";
import { nanoid } from "nanoid";

const hmacSecret = Buffer.from(env.APIKEY_HMAC_SECRET_B64, "base64");

function hashKey(apiKey: string) {
  return createHmac("sha256", hmacSecret).update(apiKey).digest("base64");
}

function genKey() {
  return randomBytes(32).toString("base64url");
}

export const devKeyRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.post("/v1/devkeys", async (req) => {
    if (!req.dev || req.dev.role !== "ADMIN") throw new HttpError(403, "FORBIDDEN", "Admin only");
    const body = req.body as { name: string; role?: DevRole };
    if (!body?.name || body.name.length < 2) throw new HttpError(400, "BAD_REQUEST", "name required");

    const apiKey = genKey();
    const apiKeyHash = hashKey(apiKey);

    const dev = await prisma.developer.create({
      data: { id: nanoid(), name: body.name, role: body.role ?? "DEV", apiKeyHash, isActive: true }
    });

    await prisma.accessLog.create({
      data: { id: nanoid(), devId: req.dev.id, ip: req.ip, action: "DEVKEY_CREATE", meta: JSON.stringify({ target: dev.id }) }
    });

    return ok({ developerId: dev.id, apiKey });
  });

  app.get("/v1/me", async (req) => ok({ dev: req.dev }));
};
