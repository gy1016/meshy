import type { ChatAction } from "@/shared/types/chat-action.dto";

export type ChatCompletionRole = "system" | "user" | "assistant";

export interface ChatCompletionResult {
  message: string;
  actions: ChatAction[];
}

export async function sendChatCompletion(
  messages: { role: ChatCompletionRole; content: string }[],
): Promise<ChatCompletionResult> {
  const response = await fetch("/api/openai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error || body?.message || `对话请求失败（${response.status}）`;
    throw new Error(message);
  }

  const actions = Array.isArray(body?.actions) ? body.actions : [];
  return {
    message: String(body?.message ?? ""),
    actions,
  };
}
