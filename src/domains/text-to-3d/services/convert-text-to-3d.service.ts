import type { MeshyImageTo3DTask } from "@/shared/types/meshy-task.dto";
import type { TextTo3DRepository } from "@/domains/text-to-3d/repositories/text-to-3d.repository";

export interface TextTo3DProgress {
  phase: "preview" | "refine";
  statusText: string;
  progress: number;
}

function clampProgress(progress: number) {
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

function mergePreviewProgress(task: MeshyImageTo3DTask) {
  const base = 8 + Math.round(task.progress * 0.37);
  return clampProgress(Math.min(base, 45));
}

function mergeRefineProgress(task: MeshyImageTo3DTask) {
  const base = 48 + Math.round(task.progress * 0.48);
  return clampProgress(Math.min(base, 98));
}

async function runPreviewPipeline(
  repository: TextTo3DRepository,
  trimmed: string,
  onProgress: (payload: TextTo3DProgress) => void,
) {
  onProgress({
    phase: "preview",
    statusText: "正在提交 Meshy 预览任务…",
    progress: 5,
  });

  const previewId = await repository.createPreviewTask(trimmed);

  onProgress({
    phase: "preview",
    statusText: "预览几何生成中…",
    progress: 8,
  });

  await repository.waitForTask(previewId, (task) => {
    onProgress({
      phase: "preview",
      statusText: `预览 ${task.status} · ${clampProgress(task.progress)}%`,
      progress: mergePreviewProgress(task),
    });
  });

  return previewId;
}

async function runRefinePipeline(
  repository: TextTo3DRepository,
  previewId: string,
  onProgress: (payload: TextTo3DProgress) => void,
) {
  onProgress({
    phase: "refine",
    statusText: "预览完成，正在提交贴图细化任务…",
    progress: 46,
  });

  const refineId = await repository.createRefineTask(previewId);

  onProgress({
    phase: "refine",
    statusText: "贴图与材质生成中…",
    progress: 48,
  });

  const finalTask = await repository.waitForTask(refineId, (task) => {
    onProgress({
      phase: "refine",
      statusText: `细化 ${task.status} · ${clampProgress(task.progress)}%`,
      progress: mergeRefineProgress(task),
    });
  });

  const glbUrl = finalTask.modelUrls?.glb;
  if (!glbUrl) {
    throw new Error("任务已成功，但返回结果中没有 glb 链接。");
  }

  onProgress({
    phase: "refine",
    statusText: "生成完成",
    progress: 100,
  });

  return glbUrl;
}

export async function convertTextTo3D(
  repository: TextTo3DRepository,
  prompt: string,
  onProgress: (payload: TextTo3DProgress) => void,
) {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("请输入描述文本。");
  }

  const previewId = await runPreviewPipeline(repository, trimmed, onProgress);
  return runRefinePipeline(repository, previewId, onProgress);
}
