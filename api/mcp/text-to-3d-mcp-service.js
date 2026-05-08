export const TEXT_TO_3D_TOOL_NAME = "text_to_3d_generate";

function normalizePrompt(rawPrompt) {
  if (typeof rawPrompt !== "string") {
    throw new TypeError("prompt must be string");
  }

  const prompt = rawPrompt.trim();
  if (!prompt) {
    throw new Error("prompt is required");
  }

  return prompt;
}

export function getTextTo3dToolDefinition() {
  return {
    type: "function",
    function: {
      name: TEXT_TO_3D_TOOL_NAME,
      description: "将用户的自然语言描述转换为 3D 生成任务。",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "用于生成 3D 模型的文本描述",
          },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  };
}

export function callTextTo3dMcpTool(args) {
  const prompt = normalizePrompt(args?.prompt);

  return {
    content: [
      {
        type: "text",
        text: `已创建文字转 3D 任务：${prompt}`,
      },
    ],
    structuredContent: {
      action: {
        type: "text_to_3d_generate",
        prompt,
      },
    },
  };
}

