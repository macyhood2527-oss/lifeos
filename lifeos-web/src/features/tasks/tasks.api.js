import { apiFetch } from "../../shared/api/http";

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