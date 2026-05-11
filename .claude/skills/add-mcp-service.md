---
name: add-mcp-service
description: 为 Meshy 项目新增 MCP 工具的标准化流程。当用户需要新增一个可通过 AI 对话触发的后端能力（如图片转 3D、纹理生成等）时使用。
---

# 新增 MCP 服务

本 skill 记录在 Meshy 项目中新增 MCP 工具的完整模式，基于 text-to-3d 和 image-to-3d 两个案例提炼。

## 架构概览

新增 MCP 工具涉及 4 层：

```
LLM（DeepSeek）→ /api/openai/chat（工具注册 + 调用分发）
              → /api/mcp/<name>.js（MCP HTTP 端点，独立可部署）
              → /api/mcp/<name>-mcp-service.js（工具定义 + 处理函数）
              → 前端 action 处理 → domain hook → 画布渲染
```

## 步骤清单

### 1. 创建 MCP 服务文件

**文件：** `api/mcp/<name>-mcp-service.js`

定义工具 schema 和处理函数：

```js
export const TOOL_NAME = "your_tool_name";

export function getToolDefinition() {
  return {
    type: "function",
    function: {
      name: TOOL_NAME,
      description: "工具的用途描述，LLM 据此决定何时调用",
      parameters: {
        type: "object",
        properties: {
          // 参数定义（可选，如果前端已有上下文可省略参数）
        },
        required: [],
        additionalProperties: false,
      },
    },
  };
}

export function callTool(args) {
  // 处理逻辑：校验参数、执行业务逻辑
  // 返回 structuredContent 携带 action 对象
  return {
    content: [{ type: "text", text: "用户可见的消息" }],
    structuredContent: {
      action: {
        type: "your_action_type",
        // ...action 携带的数据
      },
    },
  };
}
```

**关键设计决策：**
- 如果有前端上下文（如已上传的图片），工具参数可以留空，只作为"触发信号"
- 如果 LLM 需要提供数据（如文字描述），则参数必填
- `action.type` 是前后端约定的 action 类型标识

### 2. 创建 MCP HTTP 端点

**文件：** `api/mcp/<name>.js`

复制 `api/mcp/image-to-3d.js` 的结构，修改：
- 导入名和 TOOL_NAME
- `inputSchema`（对应工具参数）
- `createXxxMcpServer` 中调用 `callTool`

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { callTool, TOOL_NAME } from "../mcp/<name>-mcp-service.js";

function createMcpServer() {
  const server = new McpServer({
    name: "meshy-<name>-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    TOOL_NAME,
    {
      title: "工具标题",
      description: "工具描述",
      inputSchema: {
        // zod schema
      },
    },
    (args) => callTool(args),
  );

  return server;
}

// handler 结构固定：POST-only，StreamableHTTPServerTransport
```

### 3. 注册到聊天 API

**文件：** `api/openai/chat.js`

三处修改：

1. **导入**：顶部 import 新工具的定义和 TOOL_NAME
2. **注册工具**：在 `tools` 数组中追加 `getToolDefinition()`
3. **分发调用**：在 `resolveToolAction` 中增加 `TOOL_NAME` 分支

```js
if (toolName === TOOL_NAME) {
  const args = parseToolArguments(toolCall?.function?.arguments);
  const toolResult = await callTool(args);
  // ... 提取 action 和 message
  return { action, message };
}
```

### 4. 新增前端 Action 类型

**文件：** `src/shared/types/chat-action.dto.ts`

```ts
export interface YourChatAction {
  type: "your_action_type";
  // ...携带的数据字段
}

export type ChatAction = TextTo3DChatAction | ImageTo3DChatAction | YourChatAction;
```

### 5. 新增 Action UI 文案

**文件：** `src/infrastructure/openai/use-openai-assistant-chat.ts`

在 `createActionHint` 和 `getActionLabel` 中增加新 action 类型的分支。

### 6. 处理 Action + 调用 Domain Hook

**文件：** `src/application/ui/AiAssistantSidePanel.tsx`

在 `handleAction` 回调中增加新 action 类型的处理分支，调用对应的 domain hook。

如果需要前端上下文（如上传的图片），在此处做校验和上下文注入。

### 7. 实现画布交互

**文件：** `src/application/pages/CanvasEditorPage.tsx`

新增 handler 函数：
1. 在视口中心创建占位形状（复用 `placeTextToModelShapeAtViewportCenter` 的模式）
2. 调用 domain service 执行异步任务
3. 更新形状 props 写入结果
4. 错误时清理占位形状

## 已有参考

| 案例 | MCP 服务 | Domain | 参数来源 |
|------|---------|--------|---------|
| text-to-3d | `api/mcp/text-to-3d-mcp-service.js` | `src/domains/text-to-3d/` | LLM 提供 prompt |
| image-to-3d | `api/mcp/image-to-3d-mcp-service.js` | `src/domains/model-conversion/` | 前端上传的图片 Data URI |

## 注意事项

- MCP 工具在服务端只返回 action 描述，**不调用真正的 Meshy API**（API 调用在前端适配器层，由 `VITE_MESHY_MODE` 控制 mock/proxy/direct）
- 撤销/重做的一致性：形状替换用 `editor.markHistoryStoppingPoint` 包裹
- 前端校验：如果 action 需要前端上下文（如上传染的图片），在 `handleAction` 中检查并给用户明确提示
- 新 action 类型必须在 `ChatAction` 联合类型中注册，否则 `use-openai-assistant-chat.ts` 中的 switch 会漏掉
