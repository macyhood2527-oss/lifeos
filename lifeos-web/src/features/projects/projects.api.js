import { apiFetch } from "../../shared/api/http";

export async function listProjects({ includeArchived = false } = {}) {
  const data = await apiFetch(`/api/projects?includeArchived=${includeArchived ? "true" : "false"}`);
  return data?.projects ?? [];
}

export async function createProject(payload) {
  const data = await apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data?.project ?? data;
}

export async function archiveProject(projectId) {
  const data = await apiFetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
  return data?.project ?? data;
}

export async function deleteAllProjects() {
  const data = await apiFetch("/api/projects?all=true&hard=true", {
    method: "DELETE",
  });
  return Number(data?.deleted ?? 0);
}
