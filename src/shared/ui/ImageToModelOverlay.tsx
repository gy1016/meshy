import { Button, Progress } from "antd";
import {
  useEditor,
  useValue,
  type Editor,
  type TLImageShape,
  type TLShapeId,
} from "tldraw";
import type { ActiveConversionTask } from "@/domains/model-conversion/hooks/use-model-conversion";

interface ImageToModelOverlayProps {
  activeTask: ActiveConversionTask | null;
  onConvert: (imageShapeId: TLShapeId) => void;
}

function getImageShapeById(editor: Editor, shapeId: TLShapeId | null) {
  if (!shapeId) return null;
  const shape = editor.getShape(shapeId) as TLImageShape | undefined;
  if (!shape || shape.type !== "image") return null;
  return shape;
}

function useTargetImageShape(editor: Editor, activeTask: ActiveConversionTask | null) {
  const hoveredImageShape = useValue(
    "hovered-image-shape",
    () => getImageShapeById(editor, (editor.getHoveredShapeId() as TLShapeId | null) ?? null),
    [editor],
  );

  const activeTaskImageShape = useValue(
    "active-task-image-shape",
    () => getImageShapeById(editor, activeTask?.sourceShapeId ?? null),
    [editor, activeTask?.sourceShapeId],
  );

  return activeTaskImageShape ?? hoveredImageShape;
}

function useTargetCenter(editor: Editor, targetShape: TLImageShape | null) {
  return useValue(
    "target-shape-center",
    () => {
      if (!targetShape) return null;
      const bounds = editor.getShapePageBounds(targetShape);
      if (!bounds) return null;
      return editor.pageToScreen({
        x: bounds.x + bounds.w / 2,
        y: bounds.y + bounds.h / 2,
      });
    },
    [editor, targetShape],
  );
}

function useTargetScreenBounds(editor: Editor, targetShape: TLImageShape | null) {
  return useValue(
    "target-shape-screen-bounds",
    () => {
      if (!targetShape) return null;
      const bounds = editor.getShapePageBounds(targetShape);
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
    [editor, targetShape],
  );
}

function renderConvertingProgress(task: ActiveConversionTask, bounds: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
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
      <div className="meshy-image-overlay__progress">
        <div className="meshy-image-overlay__title">转换中</div>
        <Progress
          percent={task.progress}
          size="small"
          status={task.progress >= 100 ? "success" : "active"}
          showInfo={false}
        />
        <div className="meshy-image-overlay__status">{task.statusText}</div>
      </div>
    </div>
  );
}

export function ImageToModelOverlay(props: ImageToModelOverlayProps) {
  const editor = useEditor();
  const targetShape = useTargetImageShape(editor, props.activeTask);
  const center = useTargetCenter(editor, targetShape);
  const bounds = useTargetScreenBounds(editor, targetShape);

  if (!targetShape || !center || !bounds) return null;

  const currentTask = props.activeTask;
  const isConverting = currentTask?.isConverting && currentTask.sourceShapeId === targetShape.id;

  if (isConverting && currentTask) {
    return renderConvertingProgress(currentTask, bounds);
  }

  return (
    <div
      className="meshy-image-overlay"
      style={{ left: center.x, top: center.y }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Button
        className="meshy-image-overlay__action"
        type="text"
        size="small"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          props.onConvert(targetShape.id as TLShapeId);
        }}
      >
        <span className="meshy-image-overlay__action-icon" aria-hidden>
          ✨
        </span>
        <span>转 3D</span>
      </Button>
    </div>
  );
}
