import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

type AlbumPhoto = { id: string; src: string; name: string; createdAt: string };

export default async (req: Request, _context: Context) => {
  const store = getAlbumStore();

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "photos/" });
    const photos = await Promise.all(blobs.map(async (blob) => store.get(blob.key, { type: "json" }) as Promise<AlbumPhoto | null>));
    return json({ photos: photos.filter(Boolean).sort((left, right) => right!.createdAt.localeCompare(left!.createdAt)) }, 200, {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    });
  }

  if (req.method === "POST") {
    const payload = await req.json() as Partial<AlbumPhoto>;
    const id = crypto.randomUUID();
    const photo: AlbumPhoto = {
      id,
      name: String(payload.name ?? "shared-photo"),
      src: String(payload.src ?? ""),
      createdAt: new Date().toISOString(),
    };
    if (!photo.src.startsWith("data:image/")) return json({ error: "Invalid photo payload" }, 400);

    const { blobs } = await store.list({ prefix: "photos/" });
    if (blobs.length >= 20) return json({ error: "Album is full" }, 409);

    await store.setJSON(`photos/${id}.json`, photo);
    return json({ ok: true, photo }, 200);
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, 400);
    await store.delete(`photos/${id}.json`);
    return json({ ok: true }, 200);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = { path: "/api/album" };

function getAlbumStore() {
  if (Netlify.context?.deploy?.context === "production") {
    return getStore("zhu-dashboard-album", { consistency: "strong" });
  }
  return getDeployStore("zhu-dashboard-album");
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
