import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { env } from "./env.js";
import { HttpError } from "./http.js";
import { ratePlugin } from "./plugins/rate.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { devKeyRoutes } from "./routes/devkeys.js";
import { projectRoutes } from "./routes/projects.js";
import { credentialRoutes } from "./routes/credentials.js";
import { githubRoutes } from "./routes/github.js";

const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL);

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN });

await app.register(swagger, {
  openapi: {
    info: { title: "PWA Control Plane", version: "1.0.0" }
  }
});
await app.register(swaggerUI, { routePrefix: "/docs" });

await app.register(ratePlugin, { redis });

await app.register(authPlugin, { prisma, redis });

await app.register(healthRoutes);
await app.register(devKeyRoutes, { prisma });
await app.register(projectRoutes, { prisma });
await app.register(credentialRoutes, { prisma });
await app.register(githubRoutes, { prisma });

app.setErrorHandler(async (err, req, reply) => {
  if (err instanceof HttpError) {
    reply.code(err.status).send({ ok: false, code: err.code, message: err.message });
    return;
  }
  if ((err as any)?.message === "Rate limit exceeded") {
    reply.code(429).send({ ok: false, code: "RATE_LIMIT", message: "Too many requests" });
    return;
  }
  req.log.error(err);
  reply.code(500).send({ ok: false, code: "INTERNAL", message: "Internal error" });
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
