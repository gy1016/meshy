import type {
  CreateImageTo3DTaskInput,
  MeshyImageTo3DTask,
  ModelConversionRepository,
} from "@/domains/model-conversion/repositories/model-conversion.repository";
import {
  createMeshyImageTo3DTask,
  toDataUriFromUrl,
  waitForMeshyImageTo3DTask,
} from "@/infrastructure/meshy/meshy-client";
import {
  createMockImageTo3DTask,
  toDataUriFromUrl as toDataUriFromUrlInMock,
  waitForMockImageTo3DTask,
} from "@/infrastructure/meshy/meshy-mock-client";

type MeshyMode = "mock" | "proxy" | "direct";

function resolveMeshyMode(): MeshyMode {
  const rawMode = (import.meta.env.VITE_MESHY_MODE ?? "").toLowerCase();
  if (rawMode === "mock" || rawMode === "proxy" || rawMode === "direct") {
    return rawMode;
  }

  const isDevelopEnv = ["development", "develop"].includes(import.meta.env.VITE_APP_ENV ?? "");
  return isDevelopEnv ? "mock" : "proxy";
}

const meshyMode = resolveMeshyMode();
const useMock = meshyMode === "mock";
const useDirect = meshyMode === "direct";

function mapTask(task: {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  model_urls?: { glb?: string };
  task_error?: { message?: string };
}): MeshyImageTo3DTask {
  return {
    id: task.id,
    status: task.status,
    progress: task.progress,
    modelUrls: { glb: task.model_urls?.glb },
    taskErrorMessage: task.task_error?.message,
  };
}

export const modelConversionRepository: ModelConversionRepository = {
  createImageTo3DTask(input: CreateImageTo3DTaskInput) {
    if (useMock) {
      return Promise.resolve(createMockImageTo3DTask());
    }

    return createMeshyImageTo3DTask(input.imageDataUri, useDirect);
  },

  async waitForImageTo3DTask(taskId, onProgress) {
    if (useMock) {
      const task = await waitForMockImageTo3DTask(taskId, (currentTask) => {
        onProgress(mapTask(currentTask));
      });

      return mapTask(task);
    }

    const task = await waitForMeshyImageTo3DTask(
      taskId,
      (currentTask) => {
        onProgress(mapTask(currentTask));
      },
      useDirect,
    );

    return mapTask(task);
  },

  toDataUriFromUrl(url: string) {
    if (useMock) {
      return toDataUriFromUrlInMock(url);
    }

    return toDataUriFromUrl(url);
  },
};
