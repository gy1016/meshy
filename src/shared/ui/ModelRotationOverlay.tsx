import { Button } from "antd";
import { useEditor, useValue, type Editor } from "tldraw";
import type { MeshyModelShape } from "@/domains/canvas-editor/shapes/meshy-model-shape.util";

const ROTATION_STEP = Math.PI / 4;

function getSelectedModelShape(editor: Editor) {
  const selected = editor.getOnlySelectedShape() as MeshyModelShape | null;
  if (!selected || selected.type !== "meshy-model") return null;
  return selected;
}

function getControlPosition(editor: Editor, shape: MeshyModelShape | null) {
  if (!shape) return null;
  const bounds = editor.getShapePageBounds(shape.id);
  if (!bounds) return null;

  const screenBottomCenter = editor.pageToScreen({
    x: bounds.x + bounds.w / 2,
    y: bounds.y + bounds.h,
  });

  return { x: screenBottomCenter.x, y: screenBottomCenter.y - 8 };
}

function rotateModelY(editor: Editor, shape: MeshyModelShape, delta: number) {
  editor.markHistoryStoppingPoint("before-meshy-y-rotation");
  editor.updateShape({
    id: shape.id,
    type: "meshy-model",
    props: { yRotation: shape.props.yRotation + delta },
  } as never);
  editor.markHistoryStoppingPoint("after-meshy-y-rotation");
}

function RotationButton(props: { symbol: string; label: string; onClick: () => void }) {
  return (
    <Button
      className="meshy-rotation-overlay__button"
      type="text"
      size="small"
      aria-label={props.label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      <span className="meshy-rotation-overlay__icon" aria-hidden>
        {props.symbol}
      </span>
    </Button>
  );
}

export function ModelRotationOverlay() {
  const editor = useEditor();
  const selectedModelShape = useValue("selected-model-shape", () => getSelectedModelShape(editor), [editor]);
  const controlPosition = useValue(
    "selected-model-control-position",
    () => getControlPosition(editor, selectedModelShape),
    [editor, selectedModelShape],
  );

  if (!selectedModelShape || !controlPosition) return null;

  return (
    <div
      className="meshy-rotation-overlay"
      style={{ left: controlPosition.x, top: controlPosition.y }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <RotationButton
        label="向左旋转 45 度"
        symbol="↺"
        onClick={() => rotateModelY(editor, selectedModelShape, -ROTATION_STEP)}
      />
      <RotationButton
        label="向右旋转 45 度"
        symbol="↻"
        onClick={() => rotateModelY(editor, selectedModelShape, ROTATION_STEP)}
      />
    </div>
  );
}
