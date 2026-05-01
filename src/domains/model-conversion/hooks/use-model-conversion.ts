import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { TLAsset, TLAssetId, TLImageShape } from "tldraw";
import { MESHY_PANEL_TEXT } from "@/shared/constants/meshy.constants";
import type { Editor } from "tldraw";
import type { ModelConversionRepository } from "@/domains/model-conversion/repositories/model-conversion.repository";
import { convertImageTo3D } from "@/domains/model-conversion/services/convert-image-to-3d.service";
import type { ModelConversionState } from "@/domains/model-conversion/types/model-conversion.type";

interface UseModelConversionOptions {
  repository: ModelConversionRepository;
}

interface UseModelConversionResult {
  state: ModelConversionState;
  convertButtonText: string;
  handleConvertSelectedImage: (editor: Editor | null) => Promise<void>;
}

type ConversionStateSetter = Dispatch<SetStateAction<ModelConversionState>>;

async function resolveSelectedImageUrl(editor: Editor) {
  const selectedShape = editor.getOnlySelectedShape() as TLImageShape | null;
  if (!selectedShape || selectedShape.type !== "image") {
    window.alert("请先选中一张图片后再进行转换。");
    return null;
  }

  const assetId = selectedShape.props.assetId;
  if (!assetId) {
    window.alert("当前图片缺少 asset 信息，无法转换。");
    return null;
  }

  const typedAssetId = assetId as TLAssetId;
  const asset = editor.getAsset(typedAssetId) as TLAsset | undefined;
  const imageUrl =
    (asset as { props?: { src?: string } }).props?.src ||
    (await editor.resolveAssetUrl(typedAssetId, {
      shouldResolveToOriginal: true,
    }));

  if (!imageUrl) {
    window.alert("无法读取图片地址，请重新上传图片后重试。");
    return null;
  }

  return imageUrl;
}

function setPreparingState(setState: ConversionStateSetter) {
  setState((prevState) => ({
    ...prevState,
    isConverting: true,
    status: "preparing",
    statusText: MESHY_PANEL_TEXT.preparing,
    latestGlbUrl: "",
  }));
}

function setRunningState(setState: ConversionStateSetter, statusText: string) {
  setState((prevState) => ({
    ...prevState,
    status: "running",
    statusText,
  }));
}

function setSuccessState(setState: ConversionStateSetter, glbUrl: string) {
  setState({
    isConverting: false,
    status: "success",
    statusText: MESHY_PANEL_TEXT.success,
    latestGlbUrl: glbUrl,
  });
}

function setErrorState(setState: ConversionStateSetter, message: string) {
  setState((prevState) => ({
    ...prevState,
    isConverting: false,
    status: "error",
    statusText: `转换失败：${message}`,
  }));
}

function createConvertHandler(
  repository: ModelConversionRepository,
  setState: ConversionStateSetter,
) {
  return async (editor: Editor | null) => {
    if (!editor) return;

    const selectedImageUrl = await resolveSelectedImageUrl(editor);
    if (!selectedImageUrl) return;

    try {
      setPreparingState(setState);
      const glbUrl = await convertImageTo3D(repository, selectedImageUrl, (statusText) => {
        setRunningState(setState, statusText);
      });

      setSuccessState(setState, glbUrl);
      window.alert("转换成功，页面右下角已生成 GLB 链接。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setErrorState(setState, message);
      window.alert(`转换失败：${message}`);
    }
  };
}

export function useModelConversion(options: UseModelConversionOptions): UseModelConversionResult {
  const [state, setState] = useState<ModelConversionState>({
    isConverting: false,
    status: "idle",
    statusText: MESHY_PANEL_TEXT.idle,
    latestGlbUrl: "",
  });

  const handleConvertSelectedImage = useCallback(
    async (editor: Editor | null) => {
      const convertHandler = createConvertHandler(options.repository, setState);
      await convertHandler(editor);
    },
    [options.repository],
  );

  const convertButtonText = useMemo(
    () => (state.isConverting ? MESHY_PANEL_TEXT.buttonLoading : MESHY_PANEL_TEXT.buttonIdle),
    [state.isConverting],
  );

  return {
    state,
    convertButtonText,
    handleConvertSelectedImage,
  };
}
