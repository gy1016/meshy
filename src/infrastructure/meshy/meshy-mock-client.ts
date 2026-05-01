const MOCK_GLB_URL = "/mock-models/monkey-d-luffy.glb";

interface MockTaskResponse {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED";
  progress: number;
  model_urls?: {
    glb?: string;
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export function createMockImageTo3DTask() {
  return `mock-task-${Date.now()}`;
}

export async function waitForMockImageTo3DTask(
  taskId: string,
  onProgress: (task: MockTaskResponse) => void,
) {
  const states: MockTaskResponse[] = [
    { id: taskId, status: "PENDING", progress: 5 },
    { id: taskId, status: "IN_PROGRESS", progress: 35 },
    { id: taskId, status: "IN_PROGRESS", progress: 68 },
    {
      id: taskId,
      status: "SUCCEEDED",
      progress: 100,
      model_urls: { glb: MOCK_GLB_URL },
    },
  ];

  for (const [index, taskState] of states.entries()) {
    onProgress(taskState);
    if (index < states.length - 1) {
      await sleep(800);
    }
  }

  return states.at(-1)!;
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
