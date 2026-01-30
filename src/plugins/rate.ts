import rateLimit from "@fastify/rate-limit";
import { FastifyPluginAsync } from "fastify";
import Redis from "ioredis";
import { env } from "../env.js";

export const ratePlugin: FastifyPluginAsync<{ redis: Redis }> = async (app, opts) => {
  await app.register(rateLimit, {
    max: env.RATE_GLOBAL_PER_IP_PER_MIN,
    timeWindow: "1 minute",
    keyGenerator: (req) => `ip:${req.ip}`,
    redis: opts.redis
  });

  app.addHook("preHandler", async (req, reply) => {
    const k = req.headers["x-api-key"];
    if (typeof k === "string" && k.length > 0) {
      const key = `key:${k}:${req.ip}`;
      const cur = await opts.redis.incr(key);
      if (cur === 1) await opts.redis.expire(key, 60);
      if (cur > env.RATE_PER_KEY_PER_MIN) {
        reply.code(429);
        throw new Error("Rate limit exceeded");
      }
    }
  });
};
