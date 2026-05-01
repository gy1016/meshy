const MESHY_BASE_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

function getApiKey() {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing MESHY_API_KEY in server environment.");
  }

  return apiKey;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const imageDataUri = req.body?.imageDataUri;
    if (!imageDataUri || typeof imageDataUri !== "string") {
      res.status(400).json({ error: "imageDataUri is required." });
      return;
    }

    const response = await fetch(MESHY_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageDataUri,
        ai_model: "latest",
        should_texture: true,
        target_formats: ["glb"],
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({
        error: body?.message || body?.error || `Meshy request failed (${response.status})`,
      });
      return;
    }

    res.status(200).json({ taskId: body.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
}
