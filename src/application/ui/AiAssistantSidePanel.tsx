import { MessageOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useCallback, useState } from "react";
import { useOpenAiAssistantChat } from "@/infrastructure/openai/use-openai-assistant-chat";
import type { ChatAction } from "@/shared/types/chat-action.dto";
import { AiAssistantChatPanel } from "@/shared/ui/AiAssistantChatPanel";

interface AiAssistantSidePanelProps {
  onGenerateTextTo3d: (prompt: string) => void;
  onGenerateImageTo3d: (imageDataUri: string) => void;
  isTextTo3dBusy: boolean;
  isImageTo3dBusy: boolean;
}

interface SideChatSectionProps {
  chat: ReturnType<typeof useOpenAiAssistantChat>;
  uploadedImage: string | null;
  onUploadImage: (dataUri: string) => void;
  onRemoveImage: () => void;
}

function renderToolStatusTag(chat: ReturnType<typeof useOpenAiAssistantChat>) {
  const phase = chat.toolStatus.phase;
  const className = `meshy-ai-side__tool-status meshy-ai-side__tool-status--${phase}`;
  return <span className={className}>{chat.toolStatus.label}</span>;
}

function SideChatSection(props: SideChatSectionProps) {
  return (
    <section className="meshy-ai-side__block meshy-ai-side__block--chat" aria-label="对话">
      <div className="meshy-ai-side__block-head">
        <MessageOutlined className="meshy-ai-side__block-icon" aria-hidden />
        <span>对话</span>
        {renderToolStatusTag(props.chat)}
      </div>
      <div className="meshy-ai-side__block-body">
        <AiAssistantChatPanel
          messages={props.chat.messages}
          chatInput={props.chat.chatInput}
          setChatInput={props.chat.setChatInput}
          sending={props.chat.sending}
          onSend={() => void props.chat.sendUserMessage()}
          uploadedImage={props.uploadedImage}
          onUploadImage={props.onUploadImage}
          onRemoveImage={props.onRemoveImage}
        />
      </div>
    </section>
  );
}

export function AiAssistantSidePanel(props: AiAssistantSidePanelProps) {
  const { isTextTo3dBusy, isImageTo3dBusy, onGenerateTextTo3d, onGenerateImageTo3d } = props;
  const [uploadedImageDataUri, setUploadedImageDataUri] = useState<string | null>(null);
  const activeMeshyMode = String(import.meta.env.VITE_MESHY_MODE ?? "auto")
    .trim()
    .toLowerCase();

  const handleAction = useCallback(
    (action: ChatAction) => {
      if (action.type === "text_to_3d_generate") {
        onGenerateTextTo3d(action.prompt);
        return;
      }

      if (action.type === "image_to_3d_generate") {
        if (!uploadedImageDataUri) {
          message.warning("请先在上方上传一张图片，再触发图片转 3D。");
          return;
        }

        onGenerateImageTo3d(uploadedImageDataUri);
        setUploadedImageDataUri(null);
      }
    },
    [onGenerateTextTo3d, onGenerateImageTo3d, uploadedImageDataUri],
  );

  const systemHint = uploadedImageDataUri
	    ? `用户当前已在对话框上方上传了一张图片。如果用户说“这张图”“这个图片”“把图转成3D”“帮我把这张图片转成三维模型”等指代性表述，说明用户想将已上传的图片转换为3D模型，请立即调用 image_to_3d_generate 工具，不要询问用户是否上传了图片。`
    : undefined;

  const chat = useOpenAiAssistantChat({ onAction: handleAction, systemHint });

  const busyHint = [];
  if (isTextTo3dBusy) busyHint.push("文字转 3D");
  if (isImageTo3dBusy) busyHint.push("图片转 3D");
  const busyText = busyHint.length > 0 ? `（${busyHint.join("、")}进行中）` : "";

  return (
    <aside className="meshy-ai-side">
      <header className="meshy-ai-side__header">
        <div className="meshy-ai-side__title">
          <span className="meshy-ai-side__title-mark" aria-hidden />
          AI 工作台
        </div>
        <p className="meshy-ai-side__subtitle">
          对话触发 MCP 工具调用
          {busyText}
        </p>
        <p className="meshy-ai-side__meta">当前 Meshy 模式：{activeMeshyMode || "auto"}</p>
      </header>

      <div className="meshy-ai-side__scroll">
        <div className="meshy-ai-side__stack">
          <SideChatSection
            chat={chat}
            uploadedImage={uploadedImageDataUri}
            onUploadImage={setUploadedImageDataUri}
            onRemoveImage={() => setUploadedImageDataUri(null)}
          />
        </div>
      </div>
    </aside>
  );
}
