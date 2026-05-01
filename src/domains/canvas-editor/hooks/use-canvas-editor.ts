import { useCallback, useRef, type DragEvent, type MutableRefObject } from "react";
import type { Editor, TLOnMountHandler } from "tldraw";

interface UseCanvasEditorResult {
  editorRef: MutableRefObject<Editor | null>;
  handleMount: TLOnMountHandler;
  handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>;
}

export function useCanvasEditor(): UseCanvasEditorResult {
  const editorRef = useRef<Editor | null>(null);

  const handleMount = useCallback<TLOnMountHandler>((editor) => {
    editorRef.current = editor;

    return () => {
      editorRef.current = null;
    };
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!editorRef.current || files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    await editorRef.current.putExternalContent({
      type: "files",
      files: imageFiles,
    });
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      const dropped = Array.from(event.dataTransfer.files ?? []);
      if (dropped.length === 0) return;

      event.preventDefault();
      await uploadFiles(dropped);
    },
    [uploadFiles],
  );

  return {
    editorRef,
    handleMount,
    handleDragOver,
    handleDrop,
  };
}
