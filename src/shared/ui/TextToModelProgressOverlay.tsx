import { Progress } from "antd";
import { useEditor, useValue } from "tldraw";
import type { Editor } from "tldraw";
import type { TLShapeId } from "tldraw";
import type { ActiveTextToModelTask } from "@/shared/types/active-text-to-model.dto";

interface TextToModelProgressOverlayProps {
  activeTask: ActiveTextToModelTask | null;
}

interface MeshyModelShapeLike {
  id: TLShapeId;
  type: string;
}

function getTargetMeshyShape(editor: Editor, shapeId: string | null) {
  if (!shapeId) return null;
  const shape = editor.getShape(shapeId as TLShapeId) as MeshyModelShapeLike | undefined;
  if (!shape || shape.type !== "meshy-model") return null;
  return shape;
}

function useTargetMeshyShape(editor: Editor, activeTask: ActiveTextToModelTask | null) {
  return useValue(
    "active-text-to-model-shape",
    () => getTargetMeshyShape(editor, activeTask?.sourceShapeId ?? null),
    [activeTask?.sourceShapeId, editor],
  );
}

function useTargetScreenBounds(editor: Editor, shapeId: TLShapeId | null) {
  return useValue(
    "active-text-to-model-shape-screen-bounds",
    () => {
      if (!shapeId) return null;
      const shape = editor.getShape(shapeId);
      if (!shape) return null;
      const bounds = editor.getShapePageBounds(shape);
      if (!bounds) return null;

      const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y });
      const bottomRight = editor.pageToScreen({
        x: bounds.x + bounds.w,
        y: bounds.y + bounds.h,
      });

      return {
        left: Math.min(topLeft.x, bottomRight.x),
        top: Math.min(topLeft.y, bottomRight.y),
        width: Math.abs(bottomRight.x - topLeft.x),
        height: Math.abs(bottomRight.y - topLeft.y),
      };
    },
    [editor, shapeId],
  );
}

export function TextToModelProgressOverlay(props: TextToModelProgressOverlayProps) {
  const editor = useEditor();
  const targetShape = useTargetMeshyShape(editor, props.activeTask);
  const bounds = useTargetScreenBounds(editor, targetShape?.id ?? null);
  if (!props.activeTask?.isConverting) return null;
  if (!bounds) return null;

  return (
    <div
      className="meshy-image-overlay meshy-image-overlay--mask"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <div className="meshy-text-to-model-progress__card">
        <div className="meshy-text-to-model-progress__title">文字转 3D</div>
        <Progress percent={props.activeTask.progress} size="small" status="active" showInfo={false} />
        <div className="meshy-text-to-model-progress__status">{props.activeTask.statusText}</div>
      </div>
    </div>
  );
}
