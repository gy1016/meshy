import type { MeshyImageTo3DTask } from "@/shared/types/meshy-task.dto";

const MOCK_GLB_URL = "/mock-models/monkey-d-luffy.glb";

interface TextTaskState {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED";
  progress: number;
  model_urls?: { glb?: string };
  task_error?: { message?: string };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export function createMockTextPreviewTaskId() {
  return `mock-text-preview-${Date.now()}`;
}

export function createMockTextRefineTaskId() {
  return `mock-text-refine-${Date.now()}`;
}

function mapToDomain(task: TextTaskState): MeshyImageTo3DTask {
  return {
    id: task.id,
    status: task.status,
    progress: task.progress,
    modelUrls: { glb: task.model_urls?.glb },
    taskErrorMessage: task.task_error?.message,
  };
}

export async function waitForMockTextPreviewTask(
  taskId: string,
  onProgress: (task: MeshyImageTo3DTask) => void,
) {
  const states: TextTaskState[] = [
    { id: taskId, status: "PENDING", progress: 5 },
    { id: taskId, status: "IN_PROGRESS", progress: 40 },
    {
      id: taskId,
      status: "SUCCEEDED",
      progress: 100,
      model_urls: { glb: MOCK_GLB_URL },
    },
  ];

  for (const [index, taskState] of states.entries()) {
    onProgress(mapToDomain(taskState));
    if (index < states.length - 1) {
      await sleep(600);
    }
  }

  return mapToDomain(states.at(-1)!);
}

export async function waitForMockTextRefineTask(
  taskId: string,
  onProgress: (task: MeshyImageTo3DTask) => void,
) {
  const states: TextTaskState[] = [
    { id: taskId, status: "PENDING", progress: 2 },
    { id: taskId, status: "IN_PROGRESS", progress: 55 },
    {
      id: taskId,
      status: "SUCCEEDED",
      progress: 100,
      model_urls: { glb: MOCK_GLB_URL },
    },
  ];

  for (const [index, taskState] of states.entries()) {
    onProgress(mapToDomain(taskState));
    if (index < states.length - 1) {
      await sleep(600);
    }
  }

  return mapToDomain(states.at(-1)!);
}
