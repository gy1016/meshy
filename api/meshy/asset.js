function resolveAssetUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const isHttps = parsed.protocol === "https:";
    const isAllowedHost = parsed.hostname === "assets.meshy.ai";
    if (!isHttps || !isAllowedHost) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const target = resolveAssetUrl(req.query?.url);
  if (!target) {
    res.status(400).json({ error: "A valid Meshy asset URL is required." });
    return;
  }

  try {
    const upstream = await fetch(target);
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `Failed to fetch Meshy asset (${upstream.status})`,
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "model/gltf-binary";
    const cacheControl = upstream.headers.get("cache-control") || "public, max-age=300";
    const arrayBuffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("Content-Length", String(arrayBuffer.byteLength));
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
}
