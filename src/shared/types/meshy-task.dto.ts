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
