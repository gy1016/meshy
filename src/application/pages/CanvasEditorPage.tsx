import { Tldraw } from "tldraw";
import { MeshyModelShapeUtil } from "@/domains/canvas-editor/shapes/meshy-model-shape.util";
import { modelConversionRepository } from "@/application/adapters/model-conversion.repository";
import { useCanvasEditor } from "@/domains/canvas-editor";
import { useModelConversion } from "@/domains/model-conversion";
import { ImageToModelOverlay } from "@/shared/ui/ImageToModelOverlay";
import { ModelRotationOverlay } from "@/shared/ui/ModelRotationOverlay";
import { TldrawMinimalToolbar } from "@/shared/ui/TldrawMinimalToolbar";
import "tldraw/tldraw.css";

export function CanvasEditorPage() {
  const { editorRef, handleMount, handleDragOver, handleDrop } = useCanvasEditor();
  const { activeTask, handleConvertImageShape } = useModelConversion({
    repository: modelConversionRepository,
  });

  return (
    <div className="app-shell" onDragOver={handleDragOver} onDrop={handleDrop}>
      <Tldraw
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
        onMount={handleMount}
        shapeUtils={[MeshyModelShapeUtil as never]}
        components={{
          InFrontOfTheCanvas: () => (
            <>
              <ImageToModelOverlay
                activeTask={activeTask}
                onConvert={(shapeId) => {
                  void handleConvertImageShape(editorRef.current, shapeId);
                }}
              />
              <ModelRotationOverlay />
            </>
          ),
          Toolbar: TldrawMinimalToolbar,
          TopPanel: null,
          MenuPanel: null,
          SharePanel: null,
          HelpMenu: null,
          ActionsMenu: null,
          QuickActions: null,
          NavigationPanel: null,
          ZoomMenu: null,
          Minimap: null,
          StylePanel: null,
          PageMenu: null,
          HelperButtons: null,
        }}
      />
    </div>
  );
}
