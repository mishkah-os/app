import { FastifyPluginAsync } from "fastify";
import { PrismaClient, SecretType } from "@prisma/client";
import { ok, HttpError } from "../http.js";
import { nanoid } from "nanoid";
import { encryptString, decryptString } from "../crypto.js";

export const credentialRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.put("/v1/projects/:id/credentials/:type", async (req) => {
    const id = (req.params as any).id as string;
    const type = (req.params as any).type as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");

    const st = mapType(type);
    const body = req.body as { value: string };
    if (!body?.value || body.value.length < 1) throw new HttpError(400, "BAD_REQUEST", "value required");

    const enc = encryptString(body.value);

    await prisma.secret.upsert({
      where: { projectId_type: { projectId: id, type: st } },
      update: { enc },
      create: { id: nanoid(), projectId: id, type: st, enc }
    });

    await prisma.accessLog.create({
      data: { id: nanoid(), devId: req.dev!.id, ip: req.ip, action: "SECRET_UPSERT", meta: JSON.stringify({ projectId: id, type: st }) }
    });

    return ok({ saved: true });
  });

  app.get("/v1/projects/:id/credentials", async (req) => {
    const id = (req.params as any).id as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");

    const items = await prisma.secret.findMany({ where: { projectId: id }, select: { type: true, updatedAt: true, createdAt: true } });
    return ok(items);
  });

  app.post("/v1/projects/:id/credentials/:type/download", async (req) => {
    const id = (req.params as any).id as string;
    const type = (req.params as any).type as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");

    const st = mapType(type);
    const sec = await prisma.secret.findUnique({ where: { projectId_type: { projectId: id, type: st } } });
    if (!sec) throw new HttpError(404, "NOT_FOUND", "secret not found");

    const value = decryptString(sec.enc);

    await prisma.accessLog.create({
      data: { id: nanoid(), devId: req.dev!.id, ip: req.ip, action: "SECRET_DOWNLOAD", meta: JSON.stringify({ projectId: id, type: st }) }
    });

    return ok({ type: st, value });
  });
};

function mapType(t: string): SecretType {
  const k = t.toUpperCase();
  if (!(k in SecretType)) throw new HttpError(400, "BAD_REQUEST", "invalid secret type");
  return (SecretType as any)[k] as SecretType;
}
