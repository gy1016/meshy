import { MessageOutlined } from "@ant-design/icons";
import { useCallback } from "react";
import { useOpenAiAssistantChat } from "@/infrastructure/openai/use-openai-assistant-chat";
import type { ChatAction } from "@/shared/types/chat-action.dto";
import { AiAssistantChatPanel } from "@/shared/ui/AiAssistantChatPanel";

interface AiAssistantSidePanelProps {
  onGenerateTextTo3d: (prompt: string) => void;
  isTextTo3dBusy: boolean;
}

interface SideChatSectionProps {
  chat: ReturnType<typeof useOpenAiAssistantChat>;
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
        />
      </div>
    </section>
  );
}

export function AiAssistantSidePanel(props: AiAssistantSidePanelProps) {
  const { isTextTo3dBusy, onGenerateTextTo3d } = props;
  const activeMeshyMode = String(import.meta.env.VITE_MESHY_MODE ?? "auto")
    .trim()
    .toLowerCase();

  const handleAction = useCallback(
    (action: ChatAction) => {
      if (action.type !== "text_to_3d_generate") return;
      onGenerateTextTo3d(action.prompt);
    },
    [onGenerateTextTo3d],
  );

  const chat = useOpenAiAssistantChat({ onAction: handleAction });

  return (
    <aside className="meshy-ai-side">
      <header className="meshy-ai-side__header">
        <div className="meshy-ai-side__title">
          <span className="meshy-ai-side__title-mark" aria-hidden />
          AI 工作台
        </div>
        <p className="meshy-ai-side__subtitle">
          对话触发 MCP 工具调用
          {isTextTo3dBusy ? "（文字转 3D 进行中）" : ""}
        </p>
        <p className="meshy-ai-side__meta">当前 Meshy 模式：{activeMeshyMode || "auto"}</p>
      </header>

      <div className="meshy-ai-side__scroll">
        <div className="meshy-ai-side__stack">
          <SideChatSection chat={chat} />
        </div>
      </div>
    </aside>
  );
}
