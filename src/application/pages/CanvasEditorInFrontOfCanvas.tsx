import type { TLShapeId } from "tldraw";
import type { ActiveConversionTask } from "@/domains/model-conversion/hooks/use-model-conversion";
import type { ActiveTextToModelTask } from "@/shared/types/active-text-to-model.dto";
import { ImageToModelOverlay } from "@/shared/ui/ImageToModelOverlay";
import { ModelRotationOverlay } from "@/shared/ui/ModelRotationOverlay";
import { TextToModelProgressOverlay } from "@/shared/ui/TextToModelProgressOverlay";

interface CanvasEditorInFrontOfCanvasProps {
  imageActiveTask: ActiveConversionTask | null;
  onConvertImageShape: (shapeId: TLShapeId) => void;
  textToModelTask: ActiveTextToModelTask | null;
}

export function CanvasEditorInFrontOfCanvas(props: CanvasEditorInFrontOfCanvasProps) {
  return (
    <>
      <ImageToModelOverlay activeTask={props.imageActiveTask} onConvert={props.onConvertImageShape} />
      <TextToModelProgressOverlay activeTask={props.textToModelTask} />
      <ModelRotationOverlay />
    </>
  );
}
