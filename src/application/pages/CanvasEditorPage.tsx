import { Tldraw } from "tldraw";
import { MeshyModelShapeUtil } from "@/domains/canvas-editor/shapes/meshy-model-shape.util";
import { modelConversionRepository } from "@/application/adapters/model-conversion.repository";
import { textTo3DRepository } from "@/application/adapters/text-to-3d.repository";
import { AiAssistantSidePanel } from "@/application/ui/AiAssistantSidePanel";
import { CanvasEditorInFrontOfCanvas } from "@/application/pages/CanvasEditorInFrontOfCanvas";
import { useCanvasEditor } from "@/domains/canvas-editor";
import { useModelConversion } from "@/domains/model-conversion";
import { useTextToModel } from "@/domains/text-to-3d";
import { CANVAS_EDITOR_TLDRAW_STATIC_UI } from "@/application/pages/canvas-editor-tldraw-static-ui";
import "tldraw/tldraw.css";

export function CanvasEditorPage() {
  const { editorRef, handleMount, handleDragOver, handleDrop } = useCanvasEditor();
  const { activeTask, handleConvertImageShape } = useModelConversion({
    repository: modelConversionRepository,
  });
  const { activeTask: textToModelTask, handleGenerateTextToModel } = useTextToModel({
    repository: textTo3DRepository,
  });

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
                textToModelTask={textToModelTask}
              />
            ),
          }}
        />
      </div>
      <AiAssistantSidePanel
        isTextTo3dBusy={textToModelTask?.isConverting ?? false}
        onGenerateTextTo3d={(prompt) => {
          void handleGenerateTextToModel(editorRef.current, prompt);
        }}
      />
    </div>
  );
}
