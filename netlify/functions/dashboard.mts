import type { Config, Context } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";
import { weiboSnapshot } from "./weibo-snapshot.mjs";

type Point = { date: string; close: number };
type NewsRegion = "domestic" | "international";
type WeatherDay = { date: string; condition: string; high: number | null; low: number | null; precipitationProbability: number | null };
type WeatherReport = { id: string; district: string; condition: string; temperature: number | null; high: number | null; low: number | null; humidity: number | null; windSpeed: number | null; precipitationProbability: number | null; forecast: WeatherDay[]; error?: string };
type HoroscopeDay = { date: string; summary: string; mood: string; focus: string; luckyColor: string; luckyNumber: number };
type HoroscopeReport = { sign: string; owner: string; days: HoroscopeDay[] };
type StockReport = { symbol: string; name: string; price: number | null; change: number | null; changePercent: number | null; currency: string; chart: Point[]; source: string; open?: number | null; high?: number | null; low?: number | null; volume?: number | null; marketCap?: number | null; fiftyTwoWeekHigh?: number | null; fiftyTwoWeekLow?: number | null; dayRange?: string | null; error?: string };
type InsightItem = { rank: number; title: string; source: string; summary: string; imageUrl: string; metric?: string; publishedAt?: string; tag?: string; detail?: string; bullets?: string[]; sourceUrl?: string; relatedPosts?: Array<{ author: string; title: string; time?: string; url?: string }>; sourceId?: string; region?: NewsRegion; siteUrl?: string };
type NewsSource = { id: string; label: string; region: NewsRegion; feedUrl: string; siteUrl: string };
type TrendingRepo = { name: string; fullName: string; url: string; description: string; summary: string; stars: number; language: string | null; topics: string[]; updatedAt: string };
type DashboardResponse = { updatedAt: string; weather: WeatherReport[]; horoscopes: HoroscopeReport[]; stocks: StockReport[]; newsFeed: InsightItem[]; newsSources: NewsSource[]; weiboHot: InsightItem[]; trendingRepos: TrendingRepo[]; notices: string[] };

type OpenMeteoResponse = { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; wind_speed_10m?: number }; daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] } };
type FinnhubQuote = { c?: number; d?: number; dp?: number };
type FinnhubCandles = { s?: string; t?: number[]; c?: number[] };
type AlphaVantageDaily = { "Time Series (Daily)"?: Record<string, { "4. close"?: string }> };
type YahooChartResponse = { chart?: { result?: Array<{ meta?: Record<string, number | string | undefined>; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
type GitHubSearchResponse = { items?: Array<{ name: string; full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null; topics?: string[]; updated_at: string }> };
type RssFeed = { rss?: { channel?: { item?: RssItem | RssItem[] } } };
type RssItem = { title?: string; link?: string; pubDate?: string; description?: string; source?: string | { "#text"?: string }; "media:thumbnail"?: { "@_url"?: string } | Array<{ "@_url"?: string }> };

const weatherLocations = [
  { id: "jiading", district: "上海嘉定", latitude: 31.3747, longitude: 121.2653 },
  { id: "pudong", district: "上海浦东", latitude: 31.2215, longitude: 121.544 },
];
const horoscopeSigns = [{ sign: "天蝎座", owner: "我" }, { sign: "双鱼座", owner: "老婆" }];
const defaultStocks = [{ symbol: "SAP", name: "SAP" }, { symbol: "NVDA", name: "英伟达" }, { symbol: "AAPL", name: "苹果" }, { symbol: "SNDK", name: "闪迪" }];
const stockNames: Record<string, string> = { AAPL: "苹果", AMD: "AMD", AMZN: "亚马逊", AVGO: "博通", BABA: "阿里巴巴", GOOGL: "Alphabet", META: "Meta", MSFT: "微软", NFLX: "Netflix", NVDA: "英伟达", SAP: "SAP", SNDK: "闪迪", TSLA: "特斯拉" };
const weatherCodeText: Record<number, string> = { 0: "晴朗", 1: "晴间多云", 2: "局部多云", 3: "阴", 45: "雾", 48: "霜雾", 51: "小毛毛雨", 53: "毛毛雨", 55: "较强毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "较强阵雨", 82: "强阵雨", 95: "雷雨" };
const moods = ["沉稳", "清透", "笃定", "柔和", "敏锐", "松弛", "明亮", "从容"];
const focuses = ["沟通", "节奏", "财务", "健康", "创造力", "家庭", "判断力", "行动力"];
const colors = ["曜石黑", "雾蓝", "松石绿", "月光银", "酒红", "象牙白", "深海蓝", "鼠尾草绿"];
const summaries = ["今天适合把重要事项拆小，先处理最有确定性的部分。", "情绪会比平时更敏感，保持边界感反而能让关系更顺。", "有机会发现被忽略的细节，适合复盘计划和调整优先级。", "节奏不必太急，稳定推进会比临时冲刺更有效。", "适合主动沟通一个长期悬着的话题，语气越轻，效果越好。", "把注意力放在身体和睡眠上，状态会自然回到更好的轨道。", "小额决策可以果断，大额决策建议多留一个观察窗口。", "今天的好运来自秩序感，整理环境也会整理思路。"];
const curatedNewsSources: NewsSource[] = [
  { id: "thepaper", label: "澎湃新闻", region: "domestic", feedUrl: "https://plink.anyfeeder.com/thepaper", siteUrl: "https://www.thepaper.cn" },
  { id: "qq-china", label: "腾讯新闻：国内", region: "domestic", feedUrl: "https://plink.anyfeeder.com/qq/news/china", siteUrl: "https://news.qq.com" },
  { id: "xinhua", label: "新华社新闻_新华网", region: "domestic", feedUrl: "https://plink.anyfeeder.com/newscn/whxw", siteUrl: "https://www.news.cn" },
  { id: "people-daily", label: "人民日报", region: "domestic", feedUrl: "https://plink.anyfeeder.com/weixin/rmrbwx", siteUrl: "https://www.people.com.cn" },
  { id: "people", label: "人民网", region: "domestic", feedUrl: "https://plink.anyfeeder.com/people", siteUrl: "https://www.people.com.cn" },
  { id: "guangming", label: "光明日报", region: "domestic", feedUrl: "https://plink.anyfeeder.com/guangmingribao", siteUrl: "https://www.gmw.cn" },
  { id: "chinadaily", label: "中国日报：时政", region: "domestic", feedUrl: "https://plink.anyfeeder.com/chinadaily/china", siteUrl: "https://cn.chinadaily.com.cn" },
  { id: "bjnews", label: "新京报", region: "domestic", feedUrl: "https://plink.anyfeeder.com/bjnews", siteUrl: "https://www.bjnews.com.cn" },
  { id: "qq-world", label: "腾讯新闻：国际", region: "international", feedUrl: "https://plink.anyfeeder.com/qq/news/world", siteUrl: "https://news.qq.com" },
  { id: "reuters-cn", label: "路透中文", region: "international", feedUrl: "https://plink.anyfeeder.com/reuters/cn", siteUrl: "https://cn.reuters.com" },
  { id: "ckxx", label: "参考消息", region: "international", feedUrl: "https://plink.anyfeeder.com/weixin/ckxxwx", siteUrl: "http://www.cankaoxiaoxi.com" },
  { id: "fortunechina", label: "财富中文网", region: "international", feedUrl: "https://plink.anyfeeder.com/fortunechina", siteUrl: "https://www.fortunechina.com" },
  { id: "bbc-cn", label: "BBC 中文", region: "international", feedUrl: "https://plink.anyfeeder.com/bbc/cn", siteUrl: "https://www.bbc.com/zhongwen" },
  { id: "nytimes-cn", label: "纽约时报中文网", region: "international", feedUrl: "http://cn.nytimes.com/rss/news.xml", siteUrl: "https://cn.nytimes.com" },
  { id: "wsj-cn", label: "华尔街日报", region: "international", feedUrl: "https://cn.wsj.com/zh-hans/rss", siteUrl: "https://cn.wsj.com" },
  { id: "globaltimes", label: "环球时报", region: "international", feedUrl: "https://plink.anyfeeder.com/weixin/hqsbwx", siteUrl: "https://www.globaltimes.cn" },
  { id: "eeo", label: "经济观察网", region: "international", feedUrl: "https://plink.anyfeeder.com/eeo", siteUrl: "https://www.eeo.com.cn" },
];

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const symbols = parseSymbols(new URL(req.url).searchParams.get("symbols"));
  const [weather, stocks, newsFeed, trendingRepos] = await Promise.all([
    getWeatherReports(),
    getStockReports(symbols),
    getNewsFeed(),
    getTrendingRepos(),
  ]);
  const weiboHot = getWeiboHot();

  const notices = [
    newsFeed.length === 0 ? "新闻流暂时没有拉到数据。" : "",
    weiboHot.length === 0 ? "微博热榜快照暂时为空，可在本机运行 npm run sync:weibo 更新。" : "",
  ].filter(Boolean);

  return json({ updatedAt: new Date().toISOString(), weather, horoscopes: getHoroscopeReports(), stocks, newsFeed, newsSources: curatedNewsSources, weiboHot, trendingRepos, notices } satisfies DashboardResponse, 200, {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
  });
};

export const config: Config = { path: "/api/dashboard" };

function getEnv(key: string): string | undefined { return Netlify.env.get(key); }

function parseSymbols(value: string | null): Array<{ symbol: string; name: string }> {
  const symbols = (value ?? "").split(",").map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z.]{1,8}$/.test(item)).slice(0, 24);
  const unique = Array.from(new Set(symbols.length > 0 ? symbols : defaultStocks.map((item) => item.symbol)));
  return unique.map((symbol) => ({ symbol, name: stockNames[symbol] ?? symbol }));
}

async function getWeatherReports(): Promise<WeatherReport[]> {
  const results = await Promise.allSettled(weatherLocations.map(async (location) => {
    const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: "Asia/Shanghai", current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", forecast_days: "7" });
    const data = await fetchJson<OpenMeteoResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
    const forecast = (data.daily?.time ?? []).slice(0, 7).map((date, index) => ({
      date,
      condition: weatherCodeText[data.daily?.weather_code?.[index] ?? -1] ?? "更新中",
      high: roundOrNull(data.daily?.temperature_2m_max?.[index]),
      low: roundOrNull(data.daily?.temperature_2m_min?.[index]),
      precipitationProbability: roundOrNull(data.daily?.precipitation_probability_max?.[index]),
    }));
    return { id: location.id, district: location.district, condition: weatherCodeText[data.current?.weather_code ?? -1] ?? forecast[0]?.condition ?? "天气更新中", temperature: roundOrNull(data.current?.temperature_2m), high: forecast[0]?.high ?? null, low: forecast[0]?.low ?? null, humidity: roundOrNull(data.current?.relative_humidity_2m), windSpeed: roundOrNull(data.current?.wind_speed_10m), precipitationProbability: forecast[0]?.precipitationProbability ?? null, forecast };
  }));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : { id: weatherLocations[index].id, district: weatherLocations[index].district, condition: "暂时不可用", temperature: null, high: null, low: null, humidity: null, windSpeed: null, precipitationProbability: null, forecast: [], error: getErrorMessage(result.reason, "Weather request failed") });
}

function getHoroscopeReports(): HoroscopeReport[] {
  const dates = Array.from({ length: 4 }, (_, offset) => dateInShanghai(offset));
  return horoscopeSigns.map((profile) => ({ ...profile, days: dates.map((date) => { const seed = hash(`${profile.sign}-${date}`); return { date, summary: summaries[seed % summaries.length], mood: moods[(seed >>> 3) % moods.length], focus: focuses[(seed >>> 6) % focuses.length], luckyColor: colors[(seed >>> 9) % colors.length], luckyNumber: (seed % 9) + 1 }; }) }));
}

async function getStockReports(stocks: Array<{ symbol: string; name: string }>): Promise<StockReport[]> {
  const results = await Promise.allSettled(stocks.map((stock) => getStockReport(stock)));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : { symbol: stocks[index].symbol, name: stocks[index].name, price: null, change: null, changePercent: null, currency: "USD", chart: [], source: "unavailable", error: getErrorMessage(result.reason, "Stock request failed") });
}

async function getStockReport(stock: { symbol: string; name: string }): Promise<StockReport> {
  const finnhubKey = getEnv("FINNHUB_API_KEY");
  const alphaKey = getEnv("ALPHA_VANTAGE_API_KEY");
  const [quote, yahoo] = await Promise.all([
    finnhubKey ? getFinnhubQuote(stock.symbol, finnhubKey).catch(() => null) : Promise.resolve(null),
    getYahooChart(stock.symbol).catch(() => ({ chart: [], meta: {} as Record<string, number | string | undefined> })),
  ]);
  let chart = yahoo.chart;
  let source = chart.length ? "yahoo" : "unavailable";
  if (chart.length < 2 && finnhubKey) { chart = await getFinnhubCandles(stock.symbol, finnhubKey).catch(() => []); source = chart.length ? "finnhub" : source; }
  if (chart.length < 2 && alphaKey) { chart = await getAlphaVantageDaily(stock.symbol, alphaKey).catch(() => []); source = chart.length ? "alpha-vantage" : source; }

  const previous = chart.at(-2)?.close ?? null;
  const price = toNumberOrNull(quote?.c) ?? toNumberOrNull(Number(yahoo.meta.regularMarketPrice)) ?? chart.at(-1)?.close ?? null;
  const change = toNumberOrNull(quote?.d) ?? calculateChange(price, previous);
  const changePercent = toNumberOrNull(quote?.dp) ?? calculateChangePercent(change, previous);
  return { symbol: stock.symbol, name: stock.name, price, change, changePercent, currency: String(yahoo.meta.currency ?? "USD"), chart, source, open: toNumberOrNull(Number(yahoo.meta.regularMarketOpen)), high: toNumberOrNull(Number(yahoo.meta.regularMarketDayHigh)), low: toNumberOrNull(Number(yahoo.meta.regularMarketDayLow)), volume: toNumberOrNull(Number(yahoo.meta.regularMarketVolume)), marketCap: toNumberOrNull(Number(yahoo.meta.marketCap)), fiftyTwoWeekHigh: toNumberOrNull(Number(yahoo.meta.fiftyTwoWeekHigh)), fiftyTwoWeekLow: toNumberOrNull(Number(yahoo.meta.fiftyTwoWeekLow)), dayRange: typeof yahoo.meta.regularMarketDayRange === "string" ? yahoo.meta.regularMarketDayRange : null, error: price === null && chart.length === 0 ? "暂时没有找到这个股票的数据" : undefined };
}

async function getFinnhubQuote(symbol: string, token: string): Promise<FinnhubQuote> { return fetchJson<FinnhubQuote>(`https://finnhub.io/api/v1/quote?${new URLSearchParams({ symbol, token })}`); }
async function getFinnhubCandles(symbol: string, token: string): Promise<Point[]> {
  const to = Math.floor(Date.now() / 1000); const from = to - 14 * 24 * 60 * 60;
  const data = await fetchJson<FinnhubCandles>(`https://finnhub.io/api/v1/stock/candle?${new URLSearchParams({ symbol, resolution: "D", from: String(from), to: String(to), token })}`);
  if (data.s !== "ok" || !data.t || !data.c) return [];
  return data.t.map((time, index) => ({ date: new Date(time * 1000).toISOString().slice(0, 10), close: Number(data.c?.[index]) })).filter((point) => Number.isFinite(point.close)).slice(-5);
}
async function getAlphaVantageDaily(symbol: string, apikey: string): Promise<Point[]> {
  const data = await fetchJson<AlphaVantageDaily>(`https://www.alphavantage.co/query?${new URLSearchParams({ function: "TIME_SERIES_DAILY", symbol, outputsize: "compact", apikey })}`);
  return Object.entries(data["Time Series (Daily)"] ?? {}).map(([date, values]) => ({ date, close: Number(values["4. close"]) })).filter((point) => Number.isFinite(point.close)).sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
}
async function getYahooChart(symbol: string): Promise<{ chart: Point[]; meta: Record<string, number | string | undefined> }> {
  const data = await fetchJson<YahooChartResponse>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${new URLSearchParams({ range: "5d", interval: "1d" })}`, { "User-Agent": "Mozilla/5.0 daily-dashboard" });
  const result = data.chart?.result?.[0]; const timestamps = result?.timestamp ?? []; const closes = result?.indicators?.quote?.[0]?.close ?? [];
  return { meta: result?.meta ?? {}, chart: timestamps.map((time, index) => ({ date: new Date(time * 1000).toISOString().slice(0, 10), close: Number(closes[index]) })).filter((point) => Number.isFinite(point.close)).slice(-5) };
}

async function getNewsFeed(): Promise<InsightItem[]> {
  const results = await Promise.allSettled(curatedNewsSources.map((source) => getRssNews(source)));
  const merged = results
    .filter((result): result is PromiseFulfilledResult<InsightItem[]> => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .filter((item) => item.publishedAt)
    .sort((left, right) => new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime());

  const deduped = new Map<string, InsightItem>();
  for (const item of merged) {
    const key = item.title.replace(/\s+/g, "").slice(0, 80);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return Array.from(deduped.values()).slice(0, 60).map((item, index) => ({ ...item, rank: index + 1 }));
}

async function getRssNews(sourceConfig: NewsSource): Promise<InsightItem[]> {
  const xml = await fetchText(sourceConfig.feedUrl); const parser = new XMLParser({ ignoreAttributes: false, trimValues: true }); const parsed = parser.parse(xml) as RssFeed;
  const raw = parsed.rss?.channel?.item; const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((item, index) => {
    const rawTitle = stripHtml(item.title ?? "未命名新闻");
    const source = sourceConfig.label || getNewsSource(item.source, rawTitle);
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, "");
    const descriptionHtml = String(item.description ?? "");
    const summary = getSummaryFromHtml(descriptionHtml) || stripHtml(descriptionHtml) || `${source} 发布的新闻。`;
    const detail = getDetailFromHtml(descriptionHtml) || summary;
    const imageUrl = getRssThumbnail(item) || extractImageFromHtml(descriptionHtml) || makePoster(title);
    return {
      rank: index + 1,
      title,
      source,
      summary,
      detail,
      bullets: [`来源：${source}`, `发布时间：${item.pubDate ? formatShanghaiTime(item.pubDate) : "更新中"}`, "点击卡片后在站内看摘要与正文片段。"],
      imageUrl,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      tag: sourceConfig.region === "domestic" ? "国内" : "国际",
      sourceUrl: decodeXml(item.link ?? ""),
      sourceId: sourceConfig.id,
      region: sourceConfig.region,
      siteUrl: sourceConfig.siteUrl,
    };
  });
}

function getWeiboHot(): InsightItem[] {
  return weiboSnapshot.items.slice(0, 10).map((item, index) => {
    const title = item.word || "微博热搜";
    const metric = formatCompact(Number(item.hot_value ?? 0));
    const posts = "posts" in item && Array.isArray(item.posts) ? item.posts : [];
    return { rank: index + 1, title, source: "微博热搜", summary: posts[0]?.title ? stripHtml(String(posts[0].title)).slice(0, 120) : `过去 24 小时微博高热话题：${title}。`, detail: `微博 opencli 当前热榜快照。热搜词为“${title}”，分类为“${item.category || "未标注"}”，热度值 ${metric || item.hot_value || "更新中"}。详情页里会直接列出这个话题下最热的 3 条微博。`, bullets: [`分类：${item.category || "未标注"}`, `热度：${metric || item.hot_value || "更新中"}`, `标签：${item.label || "普通热搜"}`], imageUrl: makePoster(`微博-${title}`), metric, tag: item.label || item.category || "hot", publishedAt: weiboSnapshot.updatedAt, sourceUrl: item.url, relatedPosts: posts.slice(0, 3).map((post) => ({ author: String(post.author ?? "微博用户"), title: stripHtml(String(post.title ?? "")), time: String(post.time ?? ""), url: String(post.url ?? "") })) };
  });
}

async function getTrendingRepos(): Promise<TrendingRepo[]> {
  const pushedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const data = await fetchJson<GitHubSearchResponse>(`https://api.github.com/search/repositories?${new URLSearchParams({ q: `stars:>1000 pushed:>${pushedAfter}`, sort: "stars", order: "desc", per_page: "10" })}`, { Accept: "application/vnd.github+json", "User-Agent": "daily-dashboard" }).catch(() => ({ items: [] }));
  return (data.items ?? []).slice(0, 10).map((repo) => ({ name: repo.name, fullName: repo.full_name, url: repo.html_url, description: repo.description?.trim() || "这个项目暂无简介。", summary: `近期仍活跃的高星项目，主要语言 ${repo.language ?? "未标注"}。${repo.description ?? ""}`, stars: repo.stargazers_count, language: repo.language, topics: repo.topics ?? [], updatedAt: repo.updated_at }));
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return (await response.json()) as T;
}
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml, text/plain", "User-Agent": "Mozilla/5.0 daily-dashboard" } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.text();
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } }); }
function dateInShanghai(offsetDays: number): string { const date = new Date(); date.setUTCDate(date.getUTCDate() + offsetDays); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function formatShanghaiTime(value: string): string { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function hash(value: string): number { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; }
function getRssThumbnail(item: RssItem): string {
  const thumb = item["media:thumbnail"];
  if (Array.isArray(thumb)) return String(thumb[0]?.["@_url"] ?? "");
  return typeof thumb === "object" && thumb ? String(thumb["@_url"] ?? "") : "";
}
function extractImageFromHtml(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ? decodeXml(match[1]) : "";
}
function getSummaryFromHtml(html: string): string {
  return extractParagraphsFromHtml(html)[0]?.slice(0, 160) ?? "";
}
function getDetailFromHtml(html: string): string {
  return extractParagraphsFromHtml(html).slice(0, 5).join("\n\n").slice(0, 1800);
}
function extractParagraphsFromHtml(html: string): string[] {
  return Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtml(match[1]))
    .filter((line) => line.length > 18);
}
function roundOrNull(value: number | undefined): number | null { return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null; }
function toNumberOrNull(value: number | undefined): number | null { return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(2)) : null; }
function calculateChange(price: number | null, previous: number | null): number | null { return price === null || previous === null ? null : Number((price - previous).toFixed(2)); }
function calculateChangePercent(change: number | null, previous: number | null): number | null { return change === null || previous === null || previous === 0 ? null : Number(((change / previous) * 100).toFixed(2)); }
function stripHtml(value: string): string { return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim(); }
function getNewsSource(source: RssItem["source"], title: string): string { if (typeof source === "string" && source.trim()) return source.trim(); if (source && typeof source === "object" && source["#text"]) return source["#text"]; return title.split(" - ").at(-1)?.trim() || "News"; }
function getErrorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function formatCompact(value: number): string { return Number.isFinite(value) && value > 0 ? new Intl.NumberFormat("zh-CN", { notation: "compact" }).format(value) : ""; }
function decodeXml(value: string): string { return value.replace(/&amp;/g, "&"); }
function makePoster(seed: string): string {
  const hue = hash(seed) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},54%,88%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360},48%,74%)"/></linearGradient><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="960" height="540" fill="url(#g)"/><rect width="960" height="540" opacity=".08" filter="url(#n)"/><path d="M70 420 C260 240 360 520 560 300 S780 120 910 250" fill="none" stroke="rgba(36,31,26,.18)" stroke-width="3"/><circle cx="768" cy="136" r="152" fill="rgba(255,255,255,.28)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
