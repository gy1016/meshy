import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { Tldraw, type Editor, type TLAssetId, type TLOnMountHandler } from "tldraw";
import { createImageTo3DTask, toDataUriFromUrl, waitForImageTo3DTask } from "./lib/meshy";
import "tldraw/tldraw.css";

function App() {
  const editorRef = useRef<Editor | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [statusText, setStatusText] = useState("请先上传并选中一张图片");
  const [latestGlbUrl, setLatestGlbUrl] = useState("");

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

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      const dropped = Array.from(event.dataTransfer.files ?? []);
      if (dropped.length === 0) return;

      event.preventDefault();
      await uploadFiles(dropped);
    },
    [uploadFiles],
  );

  const convertSelectedImage = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selected = editor.getOnlySelectedShape() as {
      type: string;
      props?: { assetId?: string };
    } | null;
    if (!selected || selected.type !== "image") {
      window.alert("请先选中一张图片后再进行转换。");
      return;
    }

    const assetId = selected.props?.assetId;
    if (!assetId) {
      window.alert("当前图片缺少 asset 信息，无法转换。");
      return;
    }

    const typedAssetId = assetId as TLAssetId;
    const asset = editor.getAsset(typedAssetId) as { props?: { src?: string } } | undefined;
    const resolvedUrl =
      asset?.props?.src ||
      (await editor.resolveAssetUrl(typedAssetId, { shouldResolveToOriginal: true }));

    if (!resolvedUrl) {
      window.alert("无法读取图片地址，请重新上传图片后重试。");
      return;
    }

    try {
      setIsConverting(true);
      setLatestGlbUrl("");
      setStatusText("正在准备图片数据...");

      const dataUri = await toDataUriFromUrl(resolvedUrl);
      setStatusText("已提交到 Meshy，等待任务排队...");

      const taskId = await createImageTo3DTask({
        image_url: dataUri,
        ai_model: "latest",
        should_texture: true,
        target_formats: ["glb"],
      });

      const task = await waitForImageTo3DTask(taskId, {
        timeoutMs: 10 * 60 * 1000,
        onProgress: (currentTask) => {
          setStatusText(
            `Meshy 任务 ${currentTask.status} · ${Math.max(currentTask.progress ?? 0, 0)}%`,
          );
        },
      });

      const glbUrl = task.model_urls?.glb;
      if (!glbUrl) {
        throw new Error("任务已成功，但返回结果中没有 glb 链接。");
      }

      setLatestGlbUrl(glbUrl);
      setStatusText("转换成功，已拿到 GLB 链接。");
      window.alert("转换成功，页面右下角已生成 GLB 链接。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setStatusText(`转换失败：${message}`);
      window.alert(`转换失败：${message}`);
    } finally {
      setIsConverting(false);
    }
  }, []);

  const convertButtonText = useMemo(
    () => (isConverting ? "转换中..." : "将选中图片转换为3D"),
    [isConverting],
  );

  return (
    <div className="app-shell" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="meshy-panel">
        <button
          className="meshy-button"
          type="button"
          onClick={convertSelectedImage}
          disabled={isConverting}
        >
          {convertButtonText}
        </button>
        <p className="meshy-status">{statusText}</p>
        {latestGlbUrl ? (
          <a className="meshy-link" href={latestGlbUrl} target="_blank" rel="noreferrer">
            打开 GLB 结果
          </a>
        ) : null}
      </div>
      <Tldraw
        onMount={handleMount}
        components={{
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

export default App;
