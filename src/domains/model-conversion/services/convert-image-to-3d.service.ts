import type { ModelConversionRepository } from "@/domains/model-conversion/repositories/model-conversion.repository";

export async function convertImageTo3D(
  repository: ModelConversionRepository,
  imageUrl: string,
  onProgress: (statusText: string) => void,
) {
  onProgress("正在准备图片数据...");
  const imageDataUri = await repository.toDataUriFromUrl(imageUrl);

  onProgress("已提交到 Meshy，等待任务排队...");
  const taskId = await repository.createImageTo3DTask({ imageDataUri });

  const task = await repository.waitForImageTo3DTask(taskId, (currentTask) => {
    onProgress(`Meshy 任务 ${currentTask.status} · ${Math.max(currentTask.progress, 0)}%`);
  });

  const glbUrl = task.modelUrls?.glb;
  if (!glbUrl) {
    throw new Error("任务已成功，但返回结果中没有 glb 链接。");
  }

  return glbUrl;
}
