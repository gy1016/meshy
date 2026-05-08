import type { TextTo3DRepository } from "@/domains/text-to-3d/repositories/text-to-3d.repository";
import {
  createMeshyTextPreviewTask,
  createMeshyTextRefineTask,
  waitForMeshyTextTo3DTask,
} from "@/infrastructure/meshy/meshy-text-to-3d-client";
import {
  createMockTextPreviewTaskId,
  createMockTextRefineTaskId,
  waitForMockTextPreviewTask,
  waitForMockTextRefineTask,
} from "@/infrastructure/meshy/meshy-text-to-3d-mock-client";

type MeshyMode = "mock" | "proxy" | "direct";

function resolveMeshyMode(): MeshyMode {
  const rawMode = String(import.meta.env.VITE_MESHY_MODE ?? "")
    .trim()
    .toLowerCase();
  if (rawMode === "mock" || rawMode === "proxy" || rawMode === "direct") {
    return rawMode;
  }

  const isDevelopEnv = ["development", "develop"].includes(import.meta.env.VITE_APP_ENV ?? "");
  return isDevelopEnv ? "mock" : "proxy";
}

const meshyMode = resolveMeshyMode();
const useMock = meshyMode === "mock";
const useDirect = meshyMode === "direct";

export const textTo3DRepository: TextTo3DRepository = {
  createPreviewTask(prompt: string) {
    if (useMock) {
      return Promise.resolve(createMockTextPreviewTaskId());
    }

    return createMeshyTextPreviewTask(prompt, useDirect);
  },

  createRefineTask(previewTaskId: string) {
    if (useMock) {
      return Promise.resolve(createMockTextRefineTaskId());
    }

    return createMeshyTextRefineTask(previewTaskId, useDirect);
  },

  async waitForTask(taskId, onProgress) {
    if (useMock) {
      if (taskId.includes("preview")) {
        const task = await waitForMockTextPreviewTask(taskId, (current) => {
          onProgress(current);
        });

        return task;
      }

      const task = await waitForMockTextRefineTask(taskId, (current) => {
        onProgress(current);
      });

      return task;
    }

    return waitForMeshyTextTo3DTask(taskId, onProgress, useDirect);
  },
};
