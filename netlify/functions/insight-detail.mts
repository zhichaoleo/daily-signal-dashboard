import type { Config, Context } from "@netlify/functions";

type DetailResponse = { detail: string; imageUrl: string; bullets: string[] };

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const params = new URL(req.url).searchParams;
  const sourceUrl = params.get("url") ?? "";
  const title = params.get("title") ?? "未命名话题";
  const fallbackImage = params.get("imageUrl") ?? "";
  if (!/^https?:\/\//.test(sourceUrl)) return json({ detail: "暂时没有更多源文内容。", imageUrl: fallbackImage, bullets: [] } satisfies DetailResponse, 200);

  const [html, readable] = await Promise.all([
    fetchText(sourceUrl).catch(() => ""),
    fetchReadable(sourceUrl).catch(() => ""),
  ]);
  const detail = extractReadableDetail(readable) || extractHtmlDetail(html) || `暂时没能从源站抓到更长的正文，先保留当前摘要。话题标题：${title}`;
  const bullets = detail.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 18).slice(0, 4);
  const imageUrl = toAbsoluteUrl(extractMetaImage(html), sourceUrl) || fallbackImage;

  return json({ detail, imageUrl, bullets } satisfies DetailResponse, 200, {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  });
};

export const config: Config = { path: "/api/insight-detail" };

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 insight-detail" } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.text();
}

async function fetchReadable(url: string): Promise<string> {
  const stripped = url.replace(/^https?:\/\//, "");
  const response = await fetch(`https://r.jina.ai/http://${stripped}`, { headers: { "User-Agent": "Mozilla/5.0 insight-detail" } });
  if (!response.ok) throw new Error(`Readable request failed with ${response.status}`);
  return response.text();
}

function extractReadableDetail(text: string): string {
  if (!text || text.startsWith("{\"data\":null")) return "";
  const marker = "Markdown Content:";
  const content = text.includes(marker) ? text.slice(text.indexOf(marker) + marker.length) : text;
  const cleaned = content
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^Title:.*$/gm, "")
    .replace(/^URL Source:.*$/gm, "")
    .replace(/^Warning:.*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 24 && !/^https?:/.test(line))
    .slice(0, 8)
    .join("\n\n");
  return cleaned.slice(0, 1800);
}

function extractHtmlDetail(html: string): string {
  if (!html) return "";
  const jsonLdBody = html.match(/"articleBody"\s*:\s*"([^"]+)"/i)?.[1];
  if (jsonLdBody) {
    return decodeEntities(jsonLdBody)
      .replace(/\\n/g, "\n")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1800);
  }

  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const paragraphs = Array.from(withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => decodeEntities(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 36)
    .slice(0, 8);
  return paragraphs.join("\n\n").slice(0, 1800);
}

function extractMetaImage(html: string): string {
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i);
  const twitter = html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)/i);
  return og?.[1] || twitter?.[1] || "";
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
