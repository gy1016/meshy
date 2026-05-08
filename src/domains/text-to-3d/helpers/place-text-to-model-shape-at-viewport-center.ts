import type { Editor } from "tldraw";
import { createShapeId } from "tldraw";

export function placeTextToModelShapeAtViewportCenter(editor: Editor) {
  const bounds = editor.getViewportPageBounds();
  const w = 320;
  const h = 320;
  const x = bounds.x + bounds.w / 2 - w / 2;
  const y = bounds.y + bounds.h / 2 - h / 2;
  const shapeId = createShapeId();

  editor.markHistoryStoppingPoint("before-text-to-3d-shape");
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

export function applyGeneratedAssetToTextToModelShape(editor: Editor, shapeId: string, glbUrl: string) {
  editor.updateShape({
    id: shapeId as never,
    type: "meshy-model",
    props: {
      assetUrl: glbUrl,
    },
  } as never);
  editor.markHistoryStoppingPoint("after-text-to-3d-shape");
}
