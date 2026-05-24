import type { Config, Context } from "@netlify/functions";

type Point = { date: string; close: number };
type UsageMetric = {
  label: string;
  status: "live" | "missing-key" | "manual";
  totalCost: number | null;
  currency: string;
  budget: number | null;
  progress: number | null;
  inputTokens?: number;
  outputTokens?: number;
  requests?: number;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
  message: string;
  dailyCosts: Point[];
};
type OpenAiCostsResponse = { data?: Array<{ start_time?: number; results?: Array<{ amount?: { value?: number; currency?: string } }> }> };
type OpenAiUsageResponse = { data?: Array<{ results?: Array<{ input_tokens?: number; output_tokens?: number; num_model_requests?: number }> }> };

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => null) as { token?: string; budget?: number | null } | null;
  const token = String(body?.token ?? "").trim();
  const budget = typeof body?.budget === "number" && Number.isFinite(body.budget) && body.budget > 0 ? body.budget : null;
  if (!token) return json({ error: "Missing token" }, 400);

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);
  const startTime = String(Math.floor(start.getTime() / 1000));
  const endTime = String(Math.floor(now.getTime() / 1000));
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    const [costs, usage] = await Promise.all([
      fetchJson<OpenAiCostsResponse>(`https://api.openai.com/v1/organization/costs?${new URLSearchParams({ start_time: startTime, end_time: endTime, bucket_width: "1d", limit: "31" })}`, authHeaders),
      fetchJson<OpenAiUsageResponse>(`https://api.openai.com/v1/organization/usage/completions?${new URLSearchParams({ start_time: startTime, end_time: endTime, bucket_width: "1d", limit: "31" })}`, authHeaders).catch(() => ({ data: [] })),
    ]);

    const dailyCosts = (costs.data ?? []).map((bucket) => ({
      date: bucket.start_time ? new Date(bucket.start_time * 1000).toISOString().slice(0, 10) : periodStart,
      close: sumCost(bucket.results ?? []),
    }));
    const totalCost = Number(dailyCosts.reduce((sum, item) => sum + item.close, 0).toFixed(4));
    const currency = costs.data?.flatMap((bucket) => bucket.results ?? []).find((result) => result.amount?.currency)?.amount?.currency ?? "usd";
    const usageTotals = (usage.data ?? [])
      .flatMap((bucket) => bucket.results ?? [])
      .reduce((acc, item) => ({
        inputTokens: acc.inputTokens + Number(item.input_tokens ?? 0),
        outputTokens: acc.outputTokens + Number(item.output_tokens ?? 0),
        requests: acc.requests + Number(item.num_model_requests ?? 0),
      }), { inputTokens: 0, outputTokens: 0, requests: 0 });

    const metric: UsageMetric = {
      label: "OpenAI API",
      status: "live",
      totalCost,
      currency,
      budget,
      progress: budget ? Math.min(100, Number(((totalCost / budget) * 100).toFixed(1))) : null,
      ...usageTotals,
      periodStart,
      periodEnd,
      updatedAt: new Date().toISOString(),
      message: "本次数据是临时查询结果；token 不会被当前站点持久化保存。",
      dailyCosts,
    };

    return json({ metric }, 200, { "Cache-Control": "no-store" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Usage request failed";
    const status = /401|403/.test(message) ? 401 : 500;
    return json({ error: status === 401 ? "Token 无效，或不是可读取组织用量的 Admin token。" : "暂时无法读取用量数据。" }, status, { "Cache-Control": "no-store" });
  }
};

export const config: Config = { path: "/api/admin-usage" };

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return (await response.json()) as T;
}

function sumCost(results: Array<{ amount?: { value?: number } }>): number {
  return Number(results.reduce((sum, result) => sum + Number(result.amount?.value ?? 0), 0).toFixed(4));
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
