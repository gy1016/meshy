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
    return createMeshyImageTo3DTask(input.imageDataUri);
  },

  async waitForImageTo3DTask(taskId, onProgress) {
    const task = await waitForMeshyImageTo3DTask(taskId, (currentTask) => {
      onProgress(mapTask(currentTask));
    });

    return mapTask(task);
  },

  toDataUriFromUrl,
};
