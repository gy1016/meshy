# 2026-05-08 MCP Chat + Text-to-3D Worklog

## 本次目标

- 在画布右侧仅保留 AI 对话窗口。
- 支持对话触发文字转 3D，不再依赖单独输入框按钮。
- 引入 MCP Tool 思路，统一工具调用语义。
- 保障本地开发与 Vercel 部署可运行。

## 主要实现内容

### 1) OpenAI 对话后端增强

- 新增 `api/openai/chat.js` 的 tools 调用流程：
  - 请求 `chat/completions` 时携带 `text_to_3d_generate` tool 定义。
  - 当模型返回 tool call 时，转成前端可消费的 `actions`。
- 增强错误信息透出，便于定位网络与代理问题。
- 增加显式代理支持（读取 `OPENAI_PROXY_URL`），减少不同 shell 环境变量透传差异带来的不稳定。

### 2) MCP 相关服务端能力

- 新增 MCP 路由：`api/mcp/text-to-3d.js`。
- 新增 MCP 工具服务：`api/mcp/text-to-3d-mcp-service.js`。
- 通过 `@modelcontextprotocol/sdk` 注册 `text_to_3d_generate` 工具。

### 3) 前端对话与工具执行联动

- 右侧面板改为单聊天窗口（保留会话区）。
- `use-openai-assistant-chat` 支持接收 `actions` 并回调执行。
- 新增工具状态标签（待命/执行中/成功/失败），提升可观测性。
- 聊天列表改为虚拟列表，处理长会话性能问题：
  - 可视区渲染 + overscan。
  - 动态测量行高。
  - 仅当用户停留底部时自动滚动。

### 4) 文字转 3D 画布体验对齐

- 文字转 3D 流程改为：
  1. 先在视口中心创建占位 `meshy-model` shape。
  2. 在该 shape 上显示进度蒙层（与图片转 3D 风格一致）。
  3. 完成后回填真实 `assetUrl`。
  4. 失败时删除占位 shape。
- `VITE_MESHY_MODE` 解析增加 `trim()`，避免环境变量前后空白导致模式误判。

## 关键问题与处理

### 问题 A：OpenAI 调用超时（`UND_ERR_CONNECT_TIMEOUT`）

- 现象：`fetch failed | UND_ERR_CONNECT_TIMEOUT`。
- 原因：Node 进程未稳定走代理（不同 shell 行为不同）。
- 处理：
  - 增加 `dev:vercel:bash` 脚本并通过 `cross-env` 注入代理变量。
  - 后端补充 `OPENAI_PROXY_URL` 显式代理路径，减少运行环境差异。

## 验证结果

- `pnpm lint` 通过。
- `pnpm test` 通过。
- `pnpm build` 通过。
- 本地 API 验证：
  - `/api/openai/chat` 可返回 `message + actions`。
  - 对话触发文字转 3D action 可正常进入画布生成链路。

