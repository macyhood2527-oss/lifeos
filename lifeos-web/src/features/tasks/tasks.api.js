import { apiFetch } from "../../shared/api/http";

export async function listTasks({ includeDone = false, scope, projectId, status } = {}) {
  const params = new URLSearchParams();
  if (includeDone) params.set("includeDone", "true");
  if (scope) params.set("scope", scope);
  if (projectId != null) params.set("project_id", String(projectId));
  if (status) params.set("status", status);

  const qs = params.toString();
  const data = await apiFetch(`/api/tasks${qs ? `?${qs}` : ""}`);
  return data?.tasks ?? [];
}

// ✅ list today
export async function listTodayTasks({ includeDone = true } = {}) {
  const data = await apiFetch(`/api/tasks?includeDone=${includeDone ? "true" : "false"}`);
  return data?.tasks ?? [];
}

// ✅ create
export async function createTask(payload) {
  const data = await apiFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data?.task; // backend returns { task }
}

// ✅ patch (status/priority/etc)
export async function updateTask(taskId, patch) {
  const data = await apiFetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data?.task ?? data;
}

export async function deleteTask(taskId) {
  const data = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  return data?.ok === true;
}

export async function deleteAllTasks() {
  const data = await apiFetch("/api/tasks?all=true", { method: "DELETE" });
  return Number(data?.deleted ?? 0);
}
