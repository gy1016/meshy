import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { sendChatCompletion, type ChatCompletionRole } from "@/infrastructure/openai/openai-chat-client";
import type { ChatAction } from "@/shared/types/chat-action.dto";
import type { ChatMessage } from "@/shared/types/chat-message.dto";

interface UseOpenAiAssistantChatOptions {
  onAction?: (action: ChatAction) => Promise<void> | void;
  systemHint?: string;
}

export interface ChatToolStatus {
  phase: "idle" | "running" | "success" | "error";
  label: string;
}

function createActionHint(action: ChatAction) {
  if (action.type === "text_to_3d_generate") {
    return `已识别“文字转 3D”请求，正在执行：${action.prompt}`;
  }

  if (action.type === "image_to_3d_generate") {
    return `已识别“图片转 3D”请求，正在执行转换`;
  }

  return `已识别到工具调用。`;
}

function getActionLabel(action: ChatAction) {
  if (action.type === "text_to_3d_generate") {
    return `文字转 3D`;
  }

  if (action.type === "image_to_3d_generate") {
    return `图片转 3D`;
  }

  return `工具调用`;
}

function createIdleToolStatus(): ChatToolStatus {
  return {
    phase: "idle",
    label: "待命",
  };
}

function appendAssistantMessage(setMessages: Dispatch<SetStateAction<ChatMessage[]>>, content: string) {
  setMessages((previous) => [...previous, { role: "assistant", content }]);
}

async function runChatActions(
  actions: ChatAction[],
  onAction: UseOpenAiAssistantChatOptions["onAction"],
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setToolStatus: Dispatch<SetStateAction<ChatToolStatus>>,
) {
  for (const action of actions) {
    const label = getActionLabel(action);
    setToolStatus({ phase: "running", label: `${label}执行中` });
    appendAssistantMessage(setMessages, createActionHint(action));

    try {
      await onAction?.(action);
      setToolStatus({ phase: "success", label: `${label}已触发` });
    } catch {
      setToolStatus({ phase: "error", label: `${label}执行失败` });
      throw new Error(`${label}执行失败`);
    }
  }
}

async function executeChatSend(params: {
  nextMessages: ChatMessage[];
  onAction: UseOpenAiAssistantChatOptions["onAction"];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setToolStatus: Dispatch<SetStateAction<ChatToolStatus>>;
  systemHint?: string;
}) {
  const payload: { role: ChatCompletionRole; content: string }[] = params.nextMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (params.systemHint) {
    payload.unshift({ role: "system", content: params.systemHint });
  }

  const result = await sendChatCompletion(payload);
  const reply = result.message || "（无回复）";

  appendAssistantMessage(params.setMessages, reply);
  await runChatActions(result.actions, params.onAction, params.setMessages, params.setToolStatus);
  if (result.actions.length === 0) {
    params.setToolStatus(createIdleToolStatus());
  }
}

export function useOpenAiAssistantChat(options: UseOpenAiAssistantChatOptions = {}) {
  const onAction = options.onAction;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        `你好，我是助手。你可以直接在对话里说"帮我生成一个 3D 模型：xxx"，我会自动调用文字转 3D。也可以上传图片后说"帮我把这张图转成 3D"。`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toolStatus, setToolStatus] = useState<ChatToolStatus>(() => createIdleToolStatus());

  const sendUserMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setChatInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];

    setMessages(nextMessages);

    try {
      await executeChatSend({ nextMessages, onAction, setMessages, setToolStatus, systemHint: options.systemHint });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      appendAssistantMessage(setMessages, `请求失败：${messageText}`);
      setToolStatus({ phase: "error", label: "调用失败" });
    } finally {
      setSending(false);
    }
  }, [chatInput, messages, onAction, sending]);

  return {
    messages,
    chatInput,
    setChatInput,
    sending,
    toolStatus,
    sendUserMessage,
  };
}
