import { FastifyPluginAsync } from "fastify";
import { PrismaClient, SecretType } from "@prisma/client";
import { ok, HttpError } from "../http.js";
import { decryptString } from "../crypto.js";
import { gh, setRepoSecret, dispatchWorkflow, listRuns, getRun } from "../integrations/github.js";
import { nanoid } from "nanoid";

export const githubRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const prisma = opts.prisma;

  app.put("/v1/projects/:id/github/pat", async (req) => {
    const id = (req.params as any).id as string;
    const body = req.body as { pat: string };
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p) throw new HttpError(404, "NOT_FOUND", "project not found");
    if (!body?.pat || body.pat.length < 10) throw new HttpError(400, "BAD_REQUEST", "pat required");

    const { encryptString } = await import("../crypto.js");
    await prisma.secret.upsert({
      where: { projectId_type: { projectId: id, type: "GITHUB_PAT" } },
      update: { enc: encryptString(body.pat) },
      create: { id: nanoid(), projectId: id, type: "GITHUB_PAT", enc: encryptString(body.pat) }
    });

    return ok({ saved: true });
  });

  app.post("/v1/projects/:id/github/sync-secrets", async (req) => {
    const id = (req.params as any).id as string;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p || !p.githubOwner || !p.githubRepo) throw new HttpError(400, "BAD_REQUEST", "githubOwner/githubRepo required on project");

    const token = await getGithubPat(prisma, id);
    const octokit = gh(token);

    const secrets = await prisma.secret.findMany({ where: { projectId: id } });
    const map: Record<string, SecretType> = {
      ASC_KEY_ID: "APPLE_ASC_KEY_ID",
      ASC_ISSUER_ID: "APPLE_ASC_ISSUER_ID",
      ASC_KEY_P8_B64: "APPLE_ASC_P8_B64",
      UPLOAD_JKS_B64: "ANDROID_UPLOAD_JKS_B64",
      UPLOAD_JKS_PASS: "ANDROID_UPLOAD_JKS_PASS",
      UPLOAD_KEY_ALIAS: "ANDROID_UPLOAD_KEY_ALIAS",
      UPLOAD_KEY_PASS: "ANDROID_UPLOAD_KEY_PASS",
      GOOGLE_PLAY_SA_B64: "GOOGLE_PLAY_SA_B64"
    };

    const byType = new Map(secrets.map((s) => [s.type, s.enc]));
    for (const [name, type] of Object.entries(map)) {
      const enc = byType.get(type);
      if (!enc) continue;
      const value = decryptString(enc);
      await setRepoSecret(octokit, p.githubOwner, p.githubRepo, name, value);
    }

    await prisma.accessLog.create({
      data: { id: nanoid(), devId: req.dev!.id, ip: req.ip, action: "GITHUB_SYNC_SECRETS", meta: JSON.stringify({ projectId: id }) }
    });

    return ok({ synced: true });
  });

  app.post("/v1/projects/:id/github/dispatch", async (req) => {
    const id = (req.params as any).id as string;
    const body = req.body as { workflowFile: string; ref: string; inputs?: Record<string, string> };
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p || !p.githubOwner || !p.githubRepo) throw new HttpError(400, "BAD_REQUEST", "githubOwner/githubRepo required");

    const token = await getGithubPat(prisma, id);
    const octokit = gh(token);

    await dispatchWorkflow(octokit, p.githubOwner, p.githubRepo, body.workflowFile, body.ref || "main", body.inputs);

    const b = await prisma.build.create({
      data: { id: nanoid(), projectId: id, platform: "unknown", workflow: body.workflowFile, ref: body.ref || "main", status: "dispatched" }
    });

    return ok(b);
  });

  app.get("/v1/projects/:id/github/runs", async (req) => {
    const id = (req.params as any).id as string;
    const workflow = (req.query as any)?.workflow as string | undefined;
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p || !p.githubOwner || !p.githubRepo) throw new HttpError(400, "BAD_REQUEST", "githubOwner/githubRepo required");

    const token = await getGithubPat(prisma, id);
    const octokit = gh(token);

    const runs = await listRuns(octokit, p.githubOwner, p.githubRepo, workflow);
    return ok(runs);
  });

  app.get("/v1/projects/:id/github/runs/:runId", async (req) => {
    const id = (req.params as any).id as string;
    const runId = Number((req.params as any).runId);
    const p = await prisma.project.findFirst({ where: { id, ownerDevId: req.dev!.id } });
    if (!p || !p.githubOwner || !p.githubRepo) throw new HttpError(400, "BAD_REQUEST", "githubOwner/githubRepo required");

    const token = await getGithubPat(prisma, id);
    const octokit = gh(token);

    const run = await getRun(octokit, p.githubOwner, p.githubRepo, runId);
    return ok(run);
  });
};

async function getGithubPat(prisma: PrismaClient, projectId: string) {
  const s = await prisma.secret.findUnique({ where: { projectId_type: { projectId, type: "GITHUB_PAT" } } });
  if (!s) throw new HttpError(400, "BAD_REQUEST", "missing github pat");
  return decryptString(s.enc);
}
