import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod";
import { callTextTo3dMcpTool, TEXT_TO_3D_TOOL_NAME } from "../mcp/text-to-3d-mcp-service.js";

function createTextTo3dMcpServer() {
  const server = new McpServer({
    name: "meshy-text-to-3d-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    TEXT_TO_3D_TOOL_NAME,
    {
      title: "Text To 3D",
      description: "从文本描述触发 3D 生成动作",
      inputSchema: {
        prompt: z.string().min(1),
      },
    },
    ({ prompt }) => callTextTo3dMcpTool({ prompt }),
  );

  return server;
}

function sendMethodNotAllowed(res) {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed",
    },
    id: null,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return;
  }

  const server = createTextTo3dMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message,
        },
        id: null,
      });
    }
  } finally {
    transport.close();
    await server.close();
  }
}

