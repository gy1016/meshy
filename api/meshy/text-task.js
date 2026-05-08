const MESHY_BASE_URL = "https://api.meshy.ai/openapi/v2/text-to-3d";
const LOCAL_ASSET_PROXY_PATH = "/api/meshy/asset?url=";

function getApiKey() {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing MESHY_API_KEY in server environment.");
  }

  return apiKey;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const taskId = req.query?.taskId;
    if (!taskId || typeof taskId !== "string") {
      res.status(400).json({ error: "taskId is required." });
      return;
    }

    const response = await fetch(`${MESHY_BASE_URL}/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({
        error: body?.message || body?.error || `Meshy request failed (${response.status})`,
      });
      return;
    }

    const glbUrl = body?.model_urls?.glb;
    if (typeof glbUrl === "string" && glbUrl) {
      body.model_urls.glb = `${LOCAL_ASSET_PROXY_PATH}${encodeURIComponent(glbUrl)}`;
    }

    res.status(200).json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
}
