import { MESHY_POLLING } from "@/shared/constants/meshy.constants";

const API_BASE_URL = "/api/meshy";

interface MeshyTaskResponse {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  model_urls?: {
    glb?: string;
    [key: string]: string | undefined;
  };
  task_error?: {
    message?: string;
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

export async function createMeshyImageTo3DTask(imageDataUri: string) {
  const response = await requestBackend<{ taskId: string }>("/create", {
    method: "POST",
    body: JSON.stringify({
      imageDataUri,
    }),
  });

  return response.taskId;
}

function getMeshyImageTo3DTask(taskId: string) {
  return requestBackend<MeshyTaskResponse>(`/task?taskId=${encodeURIComponent(taskId)}`);
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

export async function waitForMeshyImageTo3DTask(
  taskId: string,
  onProgress: (task: MeshyTaskResponse) => void,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MESHY_POLLING.timeoutMs) {
    let task: MeshyTaskResponse;
    try {
      task = await getMeshyImageTo3DTask(taskId);
      onProgress(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429")) throw error;
      await sleep(MESHY_POLLING.retryOnRateLimitMs);
      continue;
    }

    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED" || task.status === "CANCELED") {
      throw new Error(task.task_error?.message || `任务已${task.status}`);
    }

    await sleep(getPollingDelayMs(task.progress, Date.now() - startedAt));
  }

  throw new Error("任务轮询超时，请稍后在 Meshy 控制台查看任务状态。");
}

export async function toDataUriFromUrl(url: string) {
  if (url.startsWith("data:")) return url;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法读取图片资源（${response.status}）`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片转 Data URI 失败"));
    reader.readAsDataURL(blob);
  });
}
