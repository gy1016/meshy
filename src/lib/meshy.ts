const MESHY_BASE_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

export type MeshyTaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";

export interface MeshyImageTo3DTask {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  model_urls?: {
    glb?: string;
    [key: string]: string | undefined;
  };
  task_error?: {
    message?: string;
  };
}

interface CreateImageTaskPayload {
  image_url: string;
  ai_model?: "latest" | "meshy-6" | "meshy-5";
  should_texture?: boolean;
  target_formats?: Array<"glb" | "obj" | "fbx" | "stl" | "usdz" | "3mf">;
}

interface WaitTaskOptions {
  timeoutMs?: number;
  onProgress?: (task: MeshyImageTo3DTask) => void;
}

function getApiKey() {
  const viteKey = import.meta.env.VITE_MESHY_API_KEY;
  const legacyKey = (import.meta.env as Record<string, string | undefined>).MESHY_API_KEY;
  const apiKey = viteKey || legacyKey;

  if (!apiKey) {
    throw new Error(
      "缺少 Meshy API Key。请在 .env.local 中设置 VITE_MESHY_API_KEY=...（前端直连需要 VITE_ 前缀）。",
    );
  }

  return apiKey;
}

async function requestMeshy<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${MESHY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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

export async function createImageTo3DTask(payload: CreateImageTaskPayload) {
  const result = await requestMeshy<{ result: string }>("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.result;
}

export async function getImageTo3DTask(taskId: string) {
  return requestMeshy<MeshyImageTo3DTask>(`/${taskId}`);
}

function getPollingDelayMs(task: MeshyImageTo3DTask, elapsedMs: number) {
  // 前期更快拿反馈，后期放缓减少请求压力。
  let base = 5000;
  if (elapsedMs < 30_000) base = 2500;
  if (task.progress >= 80) base = 7000;
  if (elapsedMs > 5 * 60_000) base = 9000;

  const jitter = Math.floor(base * (Math.random() * 0.2 - 0.1));
  return base + jitter;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForImageTo3DTask(taskId: string, options: WaitTaskOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    let task: MeshyImageTo3DTask;
    try {
      task = await getImageTo3DTask(taskId);
      options.onProgress?.(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429")) throw error;
      await sleep(5000);
      continue;
    }

    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED" || task.status === "CANCELED") {
      throw new Error(task.task_error?.message || `任务已${task.status}`);
    }

    await sleep(getPollingDelayMs(task, Date.now() - startedAt));
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
