import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { callImageTo3dMcpTool, IMAGE_TO_3D_TOOL_NAME } from "../mcp/image-to-3d-mcp-service.js";

function createImageTo3dMcpServer() {
  const server = new McpServer({
    name: "meshy-image-to-3d-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    IMAGE_TO_3D_TOOL_NAME,
    {
      title: "Image To 3D",
      description: "将用户上传的图片转换为 3D 模型",
      inputSchema: {},
    },
    () => callImageTo3dMcpTool(),
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

  const server = createImageTo3dMcpServer();
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
