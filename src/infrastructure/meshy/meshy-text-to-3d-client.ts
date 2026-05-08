import type { MeshyImageTo3DTask } from "@/shared/types/meshy-task.dto";
import { MESHY_POLLING } from "@/shared/constants/meshy.constants";

const API_BASE_URL = "/api/meshy";
const MESHY_TEXT_DIRECT_BASE = "https://api.meshy.ai/openapi/v2/text-to-3d";

interface MeshyTextTaskResponse {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  model_urls?: { glb?: string };
  task_error?: { message?: string };
}

function mapToDomain(task: MeshyTextTaskResponse): MeshyImageTo3DTask {
  return {
    id: task.id,
    status: task.status,
    progress: task.progress,
    modelUrls: { glb: task.model_urls?.glb },
    taskErrorMessage: task.task_error?.message,
  };
}

async function requestBackend<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || body?.error || `Meshy API 请求失败（${response.status}）`;
    throw new Error(message);
  }

  return body as T;
}

function getDirectApiKey() {
  const apiKey = import.meta.env.VITE_MESHY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("缺少 VITE_MESHY_API_KEY（direct 模式）");
  }

  return apiKey;
}

async function requestMeshyTextDirect<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${MESHY_TEXT_DIRECT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getDirectApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || body?.error || `Meshy API 请求失败（${response.status}）`;
    throw new Error(message);
  }

  return body as T;
}

export async function createMeshyTextPreviewTask(prompt: string, useDirect: boolean) {
  if (useDirect) {
    const response = await requestMeshyTextDirect<{ result: string }>("", {
      method: "POST",
      body: JSON.stringify({
        mode: "preview",
        prompt: prompt.trim(),
        ai_model: "latest",
        target_formats: ["glb"],
      }),
    });

    return response.result;
  }

  const response = await requestBackend<{ taskId: string }>("/text-preview", {
    method: "POST",
    body: JSON.stringify({ prompt: prompt.trim() }),
  });

  return response.taskId;
}

export async function createMeshyTextRefineTask(previewTaskId: string, useDirect: boolean) {
  if (useDirect) {
    const response = await requestMeshyTextDirect<{ result: string }>("", {
      method: "POST",
      body: JSON.stringify({
        mode: "refine",
        preview_task_id: previewTaskId,
        enable_pbr: true,
        ai_model: "latest",
        target_formats: ["glb"],
      }),
    });

    return response.result;
  }

  const response = await requestBackend<{ taskId: string }>("/text-refine", {
    method: "POST",
    body: JSON.stringify({ previewTaskId }),
  });

  return response.taskId;
}

function getTextTask(taskId: string) {
  return requestBackend<MeshyTextTaskResponse>(`/text-task?taskId=${encodeURIComponent(taskId)}`);
}

function getTextTaskDirect(taskId: string) {
  return requestMeshyTextDirect<MeshyTextTaskResponse>(`/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

function getPollingDelayMs(progress: number, elapsedMs: number) {
  let base = 5000;
  if (elapsedMs < 30_000) base = 2500;
  if (progress >= 80) base = 7000;
  if (elapsedMs > 5 * 60_000) base = 9000;

  const jitter = Math.floor(base * (Math.random() * 0.2 - 0.1));
  return base + jitter;
}

export async function waitForMeshyTextTo3DTask(
  taskId: string,
  onProgress: (task: MeshyImageTo3DTask) => void,
  useDirect: boolean,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MESHY_POLLING.timeoutMs) {
    let task: MeshyTextTaskResponse;
    try {
      task = useDirect ? await getTextTaskDirect(taskId) : await getTextTask(taskId);
      onProgress(mapToDomain(task));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429")) throw error;
      await sleep(MESHY_POLLING.retryOnRateLimitMs);
      continue;
    }

    if (task.status === "SUCCEEDED") return mapToDomain(task);
    if (task.status === "FAILED" || task.status === "CANCELED") {
      throw new Error(task.task_error?.message || `任务已${task.status}`);
    }

    await sleep(getPollingDelayMs(task.progress, Date.now() - startedAt));
  }

  throw new Error("任务轮询超时，请稍后在 Meshy 控制台查看任务状态。");
}
