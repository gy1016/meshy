/* oxlint-disable max-lines-per-function */
import { act, renderHook } from "@testing-library/react";
import { message } from "antd";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Editor, TLShapeId } from "tldraw";
import { useModelConversion } from "@/domains/model-conversion/hooks/use-model-conversion";
import type { MeshyImageTo3DTask } from "@/domains/model-conversion/repositories/model-conversion.repository";
import type { ModelConversionRepository } from "@/domains/model-conversion/repositories/model-conversion.repository";

vi.mock("antd", () => ({
  message: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createImageShape() {
  return {
    id: "shape:image" as TLShapeId,
    type: "image",
    x: 120,
    y: 80,
    rotation: 0,
    props: {
      w: 640,
      h: 480,
      assetId: "asset:image-1",
    },
  } as const;
}

function createEditorMock(config?: { shapeDisappearsBeforeReplace?: boolean }) {
  const imageShape = createImageShape();
  const createShapes = vi.fn();
  const deleteShapes = vi.fn(() => ({ createShapes }));

  const getShape = config?.shapeDisappearsBeforeReplace
    ? vi.fn().mockReturnValueOnce(imageShape).mockImplementationOnce(() => {})
    : vi.fn(() => imageShape);

  const editor = {
    getShape,
    getAsset: vi.fn(() => ({ props: { src: "https://example.com/input.png" } })),
    deleteShapes,
    markHistoryStoppingPoint: vi.fn(),
  } as unknown as Editor;

  return { editor, imageShape, createShapes, deleteShapes };
}

function createRepositoryMock(config?: { shouldFail?: boolean }) {
  const repository: ModelConversionRepository = {
    toDataUriFromUrl: vi.fn(() => Promise.resolve("data:image/png;base64,AAAA")),
    createImageTo3DTask: vi.fn(() => Promise.resolve("task-1")),
    waitForImageTo3DTask: vi.fn((_taskId, onProgress) => {
      if (config?.shouldFail) {
        return Promise.reject(new Error("task failed"));
      }

      const progressTask: MeshyImageTo3DTask = {
        id: "task-1",
        status: "IN_PROGRESS",
        progress: 55,
      };
      onProgress(progressTask);

      const successTask: MeshyImageTo3DTask = {
        id: "task-1",
        status: "SUCCEEDED",
        progress: 100,
        modelUrls: {
          glb: "https://example.com/result.glb",
        },
      };
      return Promise.resolve(successTask);
    }),
  };

  return repository;
}

describe("useModelConversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures replace step for undo/redo after successful flow", async () => {
    const repository = createRepositoryMock();
    const { editor, imageShape, createShapes, deleteShapes } = createEditorMock();
    const { result } = renderHook(() => useModelConversion({ repository }));

    await act(async () => {
      await result.current.handleConvertImageShape(editor, imageShape.id);
    });

    expect(deleteShapes).toHaveBeenCalledTimes(1);
    expect(deleteShapes).toHaveBeenCalledWith([imageShape.id]);
    expect(createShapes).toHaveBeenCalledTimes(1);
    expect(createShapes.mock.calls[0][0][0]).toMatchObject({
      type: "meshy-model",
      x: imageShape.x,
      y: imageShape.y,
      rotation: imageShape.rotation,
      props: {
        w: imageShape.props.w,
        h: imageShape.props.h,
        assetUrl: "https://example.com/result.glb",
        yRotation: 0,
      },
    });

    expect(editor.markHistoryStoppingPoint).toHaveBeenNthCalledWith(1, "before-image-to-3d-replace");
    expect(editor.markHistoryStoppingPoint).toHaveBeenNthCalledWith(2, "after-image-to-3d-replace");
    expect(message.success).toHaveBeenCalledTimes(1);
  });

  it("keeps image state when conversion fails", async () => {
    const repository = createRepositoryMock({ shouldFail: true });
    const { editor, imageShape, createShapes, deleteShapes } = createEditorMock();
    const { result } = renderHook(() => useModelConversion({ repository }));

    await act(async () => {
      await result.current.handleConvertImageShape(editor, imageShape.id);
    });

    expect(deleteShapes).not.toHaveBeenCalled();
    expect(createShapes).not.toHaveBeenCalled();
    expect(editor.markHistoryStoppingPoint).not.toHaveBeenCalledWith("before-image-to-3d-replace");
    expect(editor.markHistoryStoppingPoint).not.toHaveBeenCalledWith("after-image-to-3d-replace");
    expect(message.error).toHaveBeenCalledTimes(1);
  });

  it("does not create 3D shape when source image was deleted during long task", async () => {
    const repository = createRepositoryMock();
    const { editor, imageShape, createShapes, deleteShapes } = createEditorMock({
      shapeDisappearsBeforeReplace: true,
    });
    const { result } = renderHook(() => useModelConversion({ repository }));

    await act(async () => {
      await result.current.handleConvertImageShape(editor, imageShape.id);
    });

    expect(deleteShapes).not.toHaveBeenCalled();
    expect(createShapes).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalledWith(
      expect.stringContaining("Source image shape was removed before conversion finished."),
    );
  });
});
