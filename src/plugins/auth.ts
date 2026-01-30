import { FastifyPluginAsync } from "fastify";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { env } from "../env.js";
import { HttpError } from "../http.js";

declare module "fastify" {
  interface FastifyRequest {
    dev?: { id: string; name: string; role: string };
  }
}

const hmacSecret = Buffer.from(env.APIKEY_HMAC_SECRET_B64, "base64");

function apiKeyHash(apiKey: string) {
  return createHmac("sha256", hmacSecret).update(apiKey).digest("base64");
}

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const authPlugin: FastifyPluginAsync<{
  prisma: PrismaClient;
  redis: Redis;
}> = async (app, opts) => {
  const { prisma, redis } = opts;

  app.addHook("preHandler", async (req) => {
    const ip = req.ip;
    const banKey = `ban:${ip}`;
    const banned = await redis.ttl(banKey);
    if (banned > 0) throw new HttpError(429, "IP_BANNED", `IP banned for ${banned}s`);

    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string" || apiKey.length < 16) {
      await registerFail(redis, ip);
      throw new HttpError(401, "INVALID_API_KEY", "Invalid api key");
    }

    const hash = apiKeyHash(apiKey);
    const dev = await prisma.developer.findUnique({
      where: { apiKeyHash: hash },
      select: { id: true, name: true, role: true, apiKeyHash: true, isActive: true }
    });

    if (!dev || !dev.isActive || !safeEq(dev.apiKeyHash, hash)) {
      await registerFail(redis, ip);
      throw new HttpError(401, "INVALID_API_KEY", "Invalid api key");
    }

    req.dev = { id: dev.id, name: dev.name, role: dev.role };
  });
};

async function registerFail(redis: Redis, ip: string) {
  const failKey = `fail:${ip}`;
  const fails = await redis.incr(failKey);
  if (fails === 1) await redis.expire(failKey, env.FAIL_TTL_SECONDS);
  if (fails >= env.BAN_AFTER_FAILS) {
    await redis.set(`ban:${ip}`, "1", "EX", env.BAN_TTL_SECONDS);
    await redis.del(failKey);
  }
}
