import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import { ok, HttpError } from "../http.js";
import { readFile } from "fs/promises";
import path from "path";

const GUIDE_FILES = {
  en: "docs/guides/publishing-guide-en.md",
  ar: "docs/guides/publishing-guide-ar.md"
};

const POLICY_FILES = {
  en: "docs/templates/privacy-policy-en.md",
  ar: "docs/templates/privacy-policy-ar.md"
};

export const guideRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.get("/v1/projects/:id/guides/publishing", async (req) => {
    const id = (req.params as any).id as string;
    const lang = normalizeLang((req.query as any)?.lang);

    const project = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!project) throw new HttpError(404, "NOT_FOUND", "project not found");

    const filePath = path.resolve(process.cwd(), GUIDE_FILES[lang]);
    const content = await readFile(filePath, "utf8");
    return ok({ format: "markdown", lang, content });
  });

  app.get("/v1/projects/:id/privacy-policy", async (req) => {
    const id = (req.params as any).id as string;
    const lang = normalizeLang((req.query as any)?.lang);

    const project = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!project) throw new HttpError(404, "NOT_FOUND", "project not found");

    const filePath = path.resolve(process.cwd(), POLICY_FILES[lang]);
    const template = await readFile(filePath, "utf8");

    const content = renderTemplate(template, {
      appName: project.name,
      domain: project.domain,
      date: new Date().toISOString().slice(0, 10),
      contactEmail: "support@example.com"
    });

    return ok({ format: "markdown", lang, content });
  });
};

function normalizeLang(input?: string): "en" | "ar" {
  if (input?.toLowerCase() === "ar") return "ar";
  return "en";
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
