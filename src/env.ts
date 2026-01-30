import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  MASTER_KEY_B64: z.string().min(1),
  APIKEY_HMAC_SECRET_B64: z.string().min(1),
  RATE_GLOBAL_PER_IP_PER_MIN: z.coerce.number().default(120),
  RATE_PER_KEY_PER_MIN: z.coerce.number().default(300),
  BAN_AFTER_FAILS: z.coerce.number().default(5),
  BAN_TTL_SECONDS: z.coerce.number().default(3600),
  FAIL_TTL_SECONDS: z.coerce.number().default(900),
  CORS_ORIGIN: z.string().default("*")
});

export const env = Env.parse(process.env);
