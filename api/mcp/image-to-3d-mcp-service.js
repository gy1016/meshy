export const IMAGE_TO_3D_TOOL_NAME = "image_to_3d_generate";

export function getImageTo3dToolDefinition() {
  return {
    type: "function",
    function: {
      name: IMAGE_TO_3D_TOOL_NAME,
      description: "将用户已上传的图片转换为3D模型。当用户说'把这张图片转成3D''帮我生成这个图的模型'等类似表述时调用。调用前请确认用户已在对话框上方上传了图片。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  };
}

export function callImageTo3dMcpTool() {
  return {
    content: [
      {
        type: "text",
        text: "已创建图片转 3D 任务。",
      },
    ],
    structuredContent: {
      action: {
        type: "image_to_3d_generate",
      },
    },
  };
}
