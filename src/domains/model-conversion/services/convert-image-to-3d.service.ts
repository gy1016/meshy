import type { ModelConversionRepository } from "@/domains/model-conversion/repositories/model-conversion.repository";

export interface ConversionProgress {
  phase: "preparing" | "queued" | "running";
  statusText: string;
  progress: number;
}

function clampProgress(progress: number) {
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

export async function convertImageTo3D(
  repository: ModelConversionRepository,
  imageUrl: string,
  onProgress: (payload: ConversionProgress) => void,
) {
  onProgress({
    phase: "preparing",
    statusText: "正在准备图片数据...",
    progress: 5,
  });
  const imageDataUri = await repository.toDataUriFromUrl(imageUrl);

  onProgress({
    phase: "queued",
    statusText: "已提交到 Meshy，等待任务排队...",
    progress: 10,
  });
  const taskId = await repository.createImageTo3DTask({ imageDataUri });

  const task = await repository.waitForImageTo3DTask(taskId, (currentTask) => {
    onProgress({
      phase: "running",
      statusText: `Meshy 任务 ${currentTask.status} · ${clampProgress(currentTask.progress)}%`,
      progress: clampProgress(currentTask.progress),
    });
  });

  const glbUrl = task.modelUrls?.glb;
  if (!glbUrl) {
    throw new Error("任务已成功，但返回结果中没有 glb 链接。");
  }

  return glbUrl;
}
