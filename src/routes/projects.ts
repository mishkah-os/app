import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import { ok, HttpError } from "../http.js";
import { nanoid } from "nanoid";

export const projectRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.post("/v1/projects", async (req) => {
    const body = req.body as {
      name: string;
      domain: string;
      iosBundleId?: string;
      iosScheme?: string;
      androidPackage?: string;
      publicSlug?: string;
    };
    if (!body?.name || body.name.length < 2) throw new HttpError(400, "BAD_REQUEST", "name required");
    if (!body?.domain || !body.domain.startsWith("https://")) throw new HttpError(400, "BAD_REQUEST", "domain must be https");
    if (body.publicSlug && !isValidSlug(body.publicSlug)) {
      throw new HttpError(400, "BAD_REQUEST", "publicSlug must be 3-32 chars, lowercase letters, numbers, or hyphen");
    }
    if (body.publicSlug) {
      const exists = await prisma.project.findFirst({ where: { publicSlug: body.publicSlug } });
      if (exists) throw new HttpError(409, "SLUG_TAKEN", "publicSlug already in use");
    }

    const p = await prisma.project.create({
      data: {
        id: nanoid(),
        ownerDevId: req.dev!.id,
        name: body.name,
        publicSlug: body.publicSlug,
        domain: body.domain,
        iosBundleId: body.iosBundleId,
        iosScheme: body.iosScheme,
        androidPackage: body.androidPackage
      }
    });
    return ok(p);
  });

  app.get("/v1/projects", async (req) => {
    const items = await prisma.project.findMany({ where: { ownerDevId: req.dev!.id }, orderBy: { createdAt: "desc" } });
    return ok(items);
  });

  app.get("/v1/projects/:id", async (req) => {
    const id = (req.params as any).id as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");
    return ok(p);
  });

  app.patch("/v1/projects/:id", async (req) => {
    const id = (req.params as any).id as string;
    const body = req.body as Partial<{
      name: string;
      domain: string;
      iosBundleId: string;
      iosScheme: string;
      androidPackage: string;
      githubOwner: string;
      githubRepo: string;
      publicSlug: string;
    }>;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");
    if (body.publicSlug && !isValidSlug(body.publicSlug)) {
      throw new HttpError(400, "BAD_REQUEST", "publicSlug must be 3-32 chars, lowercase letters, numbers, or hyphen");
    }
    if (body.publicSlug) {
      const exists = await prisma.project.findFirst({ where: { publicSlug: body.publicSlug, NOT: { id } } });
      if (exists) throw new HttpError(409, "SLUG_TAKEN", "publicSlug already in use");
    }
    const u = await prisma.project.update({ where: { id }, data: body });
    return ok(u);
  });

  app.delete("/v1/projects/:id", async (req) => {
    const id = (req.params as any).id as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");
    await prisma.secret.deleteMany({ where: { projectId: id } });
    await prisma.build.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    return ok({ deleted: true });
  });
};

function isValidSlug(slug: string) {
  if (slug.length < 3 || slug.length > 32) return false;
  return /^[a-z0-9-]+$/.test(slug);
}
