import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";

export const publicRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.get("/public/projects/:id/privacy", async (req, reply) => {
    const id = (req.params as any).id as string;
    const lang = normalizeLang((req.query as any)?.lang);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.code(404).send("Not Found");

    const html = await renderPrivacyHtml(project.name, project.domain, lang);
    reply.type("text/html; charset=utf-8").send(html);
  });

  app.get("/public/projects/slug/:slug/privacy", async (req, reply) => {
    const slug = (req.params as any).slug as string;
    const lang = normalizeLang((req.query as any)?.lang);
    const project = await prisma.project.findFirst({ where: { publicSlug: slug } });
    if (!project) return reply.code(404).send("Not Found");

    const html = await renderPrivacyHtml(project.name, project.domain, lang);
    reply.type("text/html; charset=utf-8").send(html);
  });
};

async function renderPrivacyHtml(appName: string, domain: string, lang: "en" | "ar") {
  const filePath = path.resolve(process.cwd(), `docs/templates/privacy-policy-${lang}.md`);
  const template = await readFile(filePath, "utf8");
  const content = renderTemplate(template, {
    appName,
    domain,
    date: new Date().toISOString().slice(0, 10),
    contactEmail: "support@example.com"
  });

  const safeName = escapeHtml(appName);
  const safeDomain = escapeHtml(domain);
  const safeContent = escapeHtml(content);

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeName} - Privacy Policy</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f8fb; margin: 0; padding: 0; }
    .container { max-width: 860px; margin: 40px auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    h1 { margin-top: 0; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.6; }
    .meta { color: #666; font-size: 14px; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${safeName} Privacy Policy</h1>
    <p class="meta">Website: <a href="${safeDomain}">${safeDomain}</a></p>
    <pre>${safeContent}</pre>
  </div>
</body>
</html>`;
}

function normalizeLang(input?: string): "en" | "ar" {
  if (input?.toLowerCase() === "ar") return "ar";
  return "en";
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
