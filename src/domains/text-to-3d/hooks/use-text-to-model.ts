import { message } from "antd";
import { useCallback, useState } from "react";
import type { Editor } from "tldraw";
import { runTextToModelGeneration } from "@/domains/text-to-3d/helpers/run-text-to-model-generation";
import type { TextTo3DRepository } from "@/domains/text-to-3d/repositories/text-to-3d.repository";
import type { ActiveTextToModelTask } from "@/shared/types/active-text-to-model.dto";

interface UseTextToModelOptions {
  repository: TextTo3DRepository;
}

interface UseTextToModelResult {
  activeTask: ActiveTextToModelTask | null;
  handleGenerateTextToModel: (editor: Editor | null, prompt: string) => Promise<void>;
}

export function useTextToModel(options: UseTextToModelOptions): UseTextToModelResult {
  const [activeTask, setActiveTask] = useState<ActiveTextToModelTask | null>(null);

  const handleGenerateTextToModel = useCallback(
    async (editor: Editor | null, prompt: string) => {
      if (!editor) {
        message.warning("画布尚未就绪，请稍后重试。");
        return;
      }

      if (activeTask?.isConverting) return;

      try {
        await runTextToModelGeneration(editor, options.repository, prompt, setActiveTask);
        message.success("已在视口中心创建 3D 模型");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(`文字转 3D 失败：${errorMessage}`);
      }
    },
    [activeTask?.isConverting, options.repository],
  );

  return {
    activeTask,
    handleGenerateTextToModel,
  };
}
