import type { Dispatch, SetStateAction } from "react";
import type { Editor } from "tldraw";
import {
  applyGeneratedAssetToTextToModelShape,
  placeTextToModelShapeAtViewportCenter,
} from "@/domains/text-to-3d/helpers/place-text-to-model-shape-at-viewport-center";
import type { TextTo3DRepository } from "@/domains/text-to-3d/repositories/text-to-3d.repository";
import { convertTextTo3D } from "@/domains/text-to-3d/services/convert-text-to-3d.service";
import type { ActiveTextToModelTask } from "@/shared/types/active-text-to-model.dto";

export async function runTextToModelGeneration(
  editor: Editor,
  repository: TextTo3DRepository,
  prompt: string,
  setActiveTask: Dispatch<SetStateAction<ActiveTextToModelTask | null>>,
) {
  const sourceShapeId = placeTextToModelShapeAtViewportCenter(editor);

  setActiveTask({
    isConverting: true,
    statusText: "正在准备文字转 3D…",
    progress: 2,
    sourceShapeId,
  });

  try {
    const glbUrl = await convertTextTo3D(repository, prompt, (payload) => {
      setActiveTask({
        isConverting: true,
        statusText: payload.statusText,
        progress: payload.progress,
        sourceShapeId,
      });
    });

    applyGeneratedAssetToTextToModelShape(editor, sourceShapeId, glbUrl);

    setActiveTask(null);
  } catch (error) {
    editor.deleteShapes([sourceShapeId as never]);
    setActiveTask(null);
    throw error;
  }
}
