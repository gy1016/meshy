import type { MeshyImageTo3DTask } from "@/shared/types/meshy-task.dto";

export interface TextTo3DRepository {
  createPreviewTask(prompt: string): Promise<string>;
  createRefineTask(previewTaskId: string): Promise<string>;
  waitForTask(
    taskId: string,
    onProgress: (task: MeshyImageTo3DTask) => void,
  ): Promise<MeshyImageTo3DTask>;
}
