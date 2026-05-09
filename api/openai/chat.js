import {
  callTextTo3dMcpTool,
  getTextTo3dToolDefinition,
  TEXT_TO_3D_TOOL_NAME,
} from "../mcp/text-to-3d-mcp-service.js";
import { ProxyAgent, setGlobalDispatcher } from "undici";

function getApiKey() {
  const apiKey =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing DEEPSEEK_API_KEY (or OPENAI_API_KEY) in server environment.",
    );
  }

  return apiKey;
}

function formatServerError(error) {
  if (!(error instanceof Error)) {
    return "Unknown server error";
  }

  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const causeMessage =
      "message" in cause && typeof cause.message === "string" ? cause.message : "";
    const causeCode = "code" in cause && cause.code ? String(cause.code) : "";

    if (causeMessage || causeCode) {
      return [error.message, causeCode, causeMessage].filter(Boolean).join(" | ");
    }
  }

  return error.message || "Unknown server error";
}

function parseToolArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== "string") {
    return {};
  }

  try {
    return JSON.parse(rawArguments);
  } catch {
    return {};
  }
}

let proxyConfigured = false;

function ensureLlmProxy() {
  if (proxyConfigured) return;

  const proxyUrl =
    process.env.DEEPSEEK_PROXY_URL?.trim() ||
    process.env.OPENAI_PROXY_URL?.trim();
  if (!proxyUrl) {
    proxyConfigured = true;
    return;
  }

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  proxyConfigured = true;
}

async function resolveToolAction(toolCall) {
  const toolName = toolCall?.function?.name;
  if (toolName !== TEXT_TO_3D_TOOL_NAME) return null;

  const args = parseToolArguments(toolCall?.function?.arguments);
  const toolResult = await callTextTo3dMcpTool(args);
  const action = toolResult?.structuredContent?.action ?? null;
  const message = toolResult?.content?.[0]?.text ?? "已触发文字转 3D。";

  if (!action) return null;
  return { action, message };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const messages = validateChatMessages(req.body?.messages);
    const completion = await requestOpenAiCompletion(messages);
    const payload = await resolveChatPayload(completion);
    res.status(200).json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "messages array is required.") {
      res.status(400).json({ error: error.message });
      return;
    }

    const message = formatServerError(error);
    res.status(500).json({ error: message });
  }
}

function validateChatMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new Error("messages array is required.");
  }

  return rawMessages;
}

async function requestOpenAiCompletion(messages) {
  ensureLlmProxy();
  const model =
    process.env.DEEPSEEK_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "deepseek-chat";
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: [getTextTo3dToolDefinition()],
      tool_choice: "auto",
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `DeepSeek request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

async function resolveChatPayload(completionBody) {
  const message = completionBody?.choices?.[0]?.message ?? {};
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  if (toolCalls.length > 0) {
    const firstResult = await resolveToolAction(toolCalls[0]);
    if (firstResult) {
      return {
        message: firstResult.message,
        actions: [firstResult.action],
      };
    }
  }

  return {
    message: String(message.content ?? ""),
    actions: [],
  };
}
