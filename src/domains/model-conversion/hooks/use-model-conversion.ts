import { message } from "antd";
import { useCallback, useState } from "react";
import type { TLAsset, TLAssetId, TLImageShape, TLShapeId } from "tldraw";
import { createShapeId, type Editor } from "tldraw";
import type { ModelConversionRepository } from "@/domains/model-conversion/repositories/model-conversion.repository";
import {
  convertImageTo3D,
  type ConversionProgress,
} from "@/domains/model-conversion/services/convert-image-to-3d.service";

interface UseModelConversionOptions {
  repository: ModelConversionRepository;
}

export interface ActiveConversionTask {
  sourceShapeId: TLShapeId;
  isConverting: boolean;
  statusText: string;
  progress: number;
}

interface UseModelConversionResult {
  activeTask: ActiveConversionTask | null;
  handleConvertImageShape: (editor: Editor | null, imageShapeId: TLShapeId) => Promise<void>;
}

function resolveImageShape(editor: Editor, imageShapeId: TLShapeId) {
  const shape = editor.getShape(imageShapeId) as TLImageShape | undefined;
  if (!shape || shape.type !== "image") return null;
  return shape;
}

function resolveImageUrl(editor: Editor, imageShape: TLImageShape) {
  const assetId = imageShape.props.assetId;
  if (!assetId) return null;

  const typedAssetId = assetId as TLAssetId;
  const asset = editor.getAsset(typedAssetId) as TLAsset | undefined;
  return (asset as { props?: { src?: string } }).props?.src ?? null;
}

function applyProgress(
  setActiveTask: React.Dispatch<React.SetStateAction<ActiveConversionTask | null>>,
  shapeId: TLShapeId,
  progress: ConversionProgress,
) {
  setActiveTask((prevTask) => {
    if (!prevTask || prevTask.sourceShapeId !== shapeId) return prevTask;
    return {
      ...prevTask,
      statusText: progress.statusText,
      progress: progress.progress,
    };
  });
}

function createModelShapeFromImage(editor: Editor, imageShapeId: TLShapeId, assetUrl: string) {
  const latestShape = resolveImageShape(editor, imageShapeId);
  if (!latestShape) {
    throw new Error("Source image shape was removed before conversion finished.");
  }

  const modelShape = {
    id: createShapeId(),
    type: "meshy-model",
    x: latestShape.x,
    y: latestShape.y,
    rotation: latestShape.rotation,
    props: {
      w: latestShape.props.w,
      h: latestShape.props.h,
      assetUrl,
      yRotation: 0,
    },
  };

  // Split history around conversion replacement so one undo targets only this replace step.
  editor.markHistoryStoppingPoint("before-image-to-3d-replace");
  editor.deleteShapes([latestShape.id]).createShapes([modelShape as never]);
  editor.markHistoryStoppingPoint("after-image-to-3d-replace");
}

export function useModelConversion(options: UseModelConversionOptions): UseModelConversionResult {
  const [activeTask, setActiveTask] = useState<ActiveConversionTask | null>(null);

  const handleConvertImageShape = useCallback(
    async (editor: Editor | null, imageShapeId: TLShapeId) => {
      if (!editor) return;
      if (activeTask?.isConverting) return;

      const imageShape = resolveImageShape(editor, imageShapeId);
      if (!imageShape) {
        message.warning("Please hover an image shape before converting.");
        return;
      }

      const imageUrl = resolveImageUrl(editor, imageShape);
      if (!imageUrl) {
        message.warning("Selected image shape has no resolvable source.");
        return;
      }

      setActiveTask({
        sourceShapeId: imageShapeId,
        isConverting: true,
        statusText: "Preparing image data...",
        progress: 0,
      });

      try {
        const glbUrl = await convertImageTo3D(options.repository, imageUrl, (progress) => {
          applyProgress(setActiveTask, imageShapeId, progress);
        });

        createModelShapeFromImage(editor, imageShapeId, glbUrl);
        setActiveTask(null);
        message.success("Converted to 3D shape successfully.");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setActiveTask(null);
        message.error(`Conversion failed: ${errorMessage}`);
      }
    },
    [activeTask?.isConverting, options.repository],
  );

  return {
    activeTask,
    handleConvertImageShape,
  };
}
