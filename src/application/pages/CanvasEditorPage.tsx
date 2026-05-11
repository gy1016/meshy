import { message } from "antd";
import { useCallback, useState } from "react";
import { Tldraw, createShapeId } from "tldraw";
import type { Editor } from "tldraw";
import { MeshyModelShapeUtil } from "@/domains/canvas-editor/shapes/meshy-model-shape.util";
import { modelConversionRepository } from "@/application/adapters/model-conversion.repository";
import { textTo3DRepository } from "@/application/adapters/text-to-3d.repository";
import { AiAssistantSidePanel } from "@/application/ui/AiAssistantSidePanel";
import { CanvasEditorInFrontOfCanvas } from "@/application/pages/CanvasEditorInFrontOfCanvas";
import { useCanvasEditor } from "@/domains/canvas-editor";
import { useModelConversion } from "@/domains/model-conversion";
import { useTextToModel } from "@/domains/text-to-3d";
import { convertImageTo3D } from "@/domains/model-conversion/services/convert-image-to-3d.service";
import type { ConversionProgress } from "@/domains/model-conversion/services/convert-image-to-3d.service";
import type { ActiveTextToModelTask } from "@/shared/types/active-text-to-model.dto";
import { CANVAS_EDITOR_TLDRAW_STATIC_UI } from "@/application/pages/canvas-editor-tldraw-static-ui";
import "tldraw/tldraw.css";

function placeImageToModelShapeAtViewportCenter(editor: Editor) {
  const bounds = editor.getViewportPageBounds();
  const w = 320;
  const h = 320;
  const x = bounds.x + bounds.w / 2 - w / 2;
  const y = bounds.y + bounds.h / 2 - h / 2;
  const shapeId = createShapeId();

  editor.markHistoryStoppingPoint("before-image-to-3d-shape");
  editor.createShapes([
    {
      id: shapeId,
      type: "meshy-model",
      x,
      y,
      rotation: 0,
      props: {
        w,
        h,
        assetUrl: "",
        yRotation: 0,
      },
    } as never,
  ]);

  return shapeId;
}

function updateShapeWithGlb(editor: Editor, shapeId: string, glbUrl: string) {
  editor.updateShape({
    id: shapeId as never,
    type: "meshy-model",
    props: {
      assetUrl: glbUrl,
    },
  } as never);
  editor.markHistoryStoppingPoint("after-image-to-3d-shape");
}

export function CanvasEditorPage() {
  const { editorRef, handleMount, handleDragOver, handleDrop } = useCanvasEditor();
  const { activeTask, handleConvertImageShape } = useModelConversion({
    repository: modelConversionRepository,
  });
  const { activeTask: textToModelTask, handleGenerateTextToModel } = useTextToModel({
    repository: textTo3DRepository,
  });
  const [imageToModelTask, setImageToModelTask] = useState<ActiveTextToModelTask | null>(null);

  const handleGenerateImageTo3d = useCallback(
    async (imageDataUri: string) => {
      const editor = editorRef.current;
      if (!editor) {
        message.warning("画布尚未就绪，请稍后重试。");
        return;
      }

      if (imageToModelTask?.isConverting) return;

      const sourceShapeId = placeImageToModelShapeAtViewportCenter(editor);

      setImageToModelTask({
        isConverting: true,
        statusText: "正在准备图片数据…",
        progress: 2,
        sourceShapeId,
      });

      try {
        const glbUrl = await convertImageTo3D(modelConversionRepository, imageDataUri, (payload: ConversionProgress) => {
          setImageToModelTask({
            isConverting: true,
            statusText: payload.statusText,
            progress: payload.progress,
            sourceShapeId,
          });
        });

        updateShapeWithGlb(editor, sourceShapeId, glbUrl);
        setImageToModelTask(null);
        message.success("已在视口中心创建 3D 模型");
      } catch (error) {
        editor.deleteShapes([sourceShapeId as never]);
        setImageToModelTask(null);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(`图片转 3D 失败：${errorMessage}`);
      }
    },
    [imageToModelTask?.isConverting, editorRef],
  );

  return (
    <div className="app-shell app-shell--split" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="app-shell__editor">
        <Tldraw
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
          onMount={handleMount}
          shapeUtils={[MeshyModelShapeUtil as never]}
          components={{
            ...CANVAS_EDITOR_TLDRAW_STATIC_UI,
            InFrontOfTheCanvas: () => (
              <CanvasEditorInFrontOfCanvas
                imageActiveTask={activeTask}
                onConvertImageShape={(shapeId) => {
                  void handleConvertImageShape(editorRef.current, shapeId);
                }}
                textToModelTask={textToModelTask ?? imageToModelTask}
              />
            ),
          }}
        />
      </div>
      <AiAssistantSidePanel
        isTextTo3dBusy={textToModelTask?.isConverting ?? false}
        isImageTo3dBusy={imageToModelTask?.isConverting ?? false}
        onGenerateTextTo3d={(prompt) => {
          void handleGenerateTextToModel(editorRef.current, prompt);
        }}
        onGenerateImageTo3d={(imageDataUri) => {
          void handleGenerateImageTo3d(imageDataUri);
        }}
      />
    </div>
  );
}
