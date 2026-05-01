export type MeshyTaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";

export interface MeshyImageTo3DTask {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  modelUrls?: {
    glb?: string;
  };
  taskErrorMessage?: string;
}

export interface CreateImageTo3DTaskInput {
  imageDataUri: string;
}

export interface ModelConversionRepository {
  createImageTo3DTask(input: CreateImageTo3DTaskInput): Promise<string>;
  waitForImageTo3DTask(
    taskId: string,
    onProgress: (task: MeshyImageTo3DTask) => void,
  ): Promise<MeshyImageTo3DTask>;
  toDataUriFromUrl(url: string): Promise<string>;
}
