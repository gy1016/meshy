export type { MeshyImageTo3DTask, MeshyTaskStatus } from "@/shared/types/meshy-task.dto";

export interface CreateImageTo3DTaskInput {
  imageDataUri: string;
}

import type { MeshyImageTo3DTask } from "@/shared/types/meshy-task.dto";

export interface ModelConversionRepository {
  createImageTo3DTask(input: CreateImageTo3DTaskInput): Promise<string>;
  waitForImageTo3DTask(
    taskId: string,
    onProgress: (task: MeshyImageTo3DTask) => void,
  ): Promise<MeshyImageTo3DTask>;
  toDataUriFromUrl(url: string): Promise<string>;
}
