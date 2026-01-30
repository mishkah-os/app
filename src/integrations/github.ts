import { Octokit } from "@octokit/rest";
import sodium from "tweetsodium";

export function gh(token: string) {
  return new Octokit({ auth: token });
}

export async function setRepoSecret(octokit: Octokit, owner: string, repo: string, name: string, value: string) {
  const { data: key } = await octokit.actions.getRepoPublicKey({ owner, repo });
  const messageBytes = Buffer.from(value);
  const keyBytes = Buffer.from(key.key, "base64");
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  const encrypted_value = Buffer.from(encryptedBytes).toString("base64");
  await octokit.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: name,
    encrypted_value,
    key_id: key.key_id
  });
}

export async function dispatchWorkflow(octokit: Octokit, owner: string, repo: string, workflowFile: string, ref: string, inputs?: Record<string, string>) {
  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowFile,
    ref,
    inputs
  });
}

export async function listRuns(octokit: Octokit, owner: string, repo: string, workflowFile?: string) {
  if (!workflowFile) {
    const r = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 30 });
    return r.data.workflow_runs;
  }
  const r = await octokit.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: workflowFile,
    per_page: 30
  });
  return r.data.workflow_runs;
}

export async function getRun(octokit: Octokit, owner: string, repo: string, run_id: number) {
  const r = await octokit.actions.getWorkflowRun({ owner, repo, run_id });
  return r.data;
}
