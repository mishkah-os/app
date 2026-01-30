import { FastifyPluginAsync } from "fastify";
import { ok } from "../http.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/health", async () => ok({ status: "up" }));
};
