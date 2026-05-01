import { Tldraw } from "tldraw";
import { modelConversionRepository } from "@/application/adapters/model-conversion.repository";
import { useCanvasEditor } from "@/domains/canvas-editor";
import { useModelConversion } from "@/domains/model-conversion";
import { MeshyConversionPanel } from "@/shared/ui/MeshyConversionPanel";
import { TldrawMinimalToolbar } from "@/shared/ui/TldrawMinimalToolbar";
import "tldraw/tldraw.css";

export function CanvasEditorPage() {
  const { editorRef, handleMount, handleDragOver, handleDrop } = useCanvasEditor();
  const { state, convertButtonText, handleConvertSelectedImage } = useModelConversion({
    repository: modelConversionRepository,
  });

  return (
    <div className="app-shell" onDragOver={handleDragOver} onDrop={handleDrop}>
      <MeshyConversionPanel
        isConverting={state.isConverting}
        buttonText={convertButtonText}
        statusText={state.statusText}
        latestGlbUrl={state.latestGlbUrl}
        onConvert={() => {
          void handleConvertSelectedImage(editorRef.current);
        }}
      />
      <Tldraw
        onMount={handleMount}
        components={{
          InFrontOfTheCanvas: null,
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
