import type { Config, Context } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";

type Point = { date: string; close: number };
type WeatherReport = { id: string; district: string; condition: string; temperature: number | null; high: number | null; low: number | null; humidity: number | null; windSpeed: number | null; precipitationProbability: number | null; error?: string };
type HoroscopeDay = { date: string; summary: string; mood: string; focus: string; luckyColor: string; luckyNumber: number };
type HoroscopeReport = { sign: string; owner: string; days: HoroscopeDay[] };
type StockReport = { symbol: string; name: string; price: number | null; change: number | null; changePercent: number | null; currency: string; chart: Point[]; source: string; open?: number | null; high?: number | null; low?: number | null; volume?: number | null; marketCap?: number | null; fiftyTwoWeekHigh?: number | null; fiftyTwoWeekLow?: number | null; dayRange?: string | null; error?: string };
type InsightItem = { rank: number; title: string; source: string; summary: string; imageUrl: string; metric?: string; publishedAt?: string; tag?: string };
type MarketRow = { rank: number; code: string; name: string; price: number | string; changePercent: number | string; change?: number | string; turnover?: number | string; marketCap?: number | string; market?: string };
type MarketPulse = { markets: Array<{ market: string; gainers: MarketRow[]; losers: MarketRow[] }>; sectors: { gainers: MarketRow[]; losers: MarketRow[] } };
type TrendingRepo = { name: string; fullName: string; url: string; description: string; summary: string; stars: number; language: string | null; topics: string[]; updatedAt: string };
type DashboardResponse = { updatedAt: string; weather: WeatherReport[]; horoscopes: HoroscopeReport[]; stocks: StockReport[]; domesticNews: InsightItem[]; internationalNews: InsightItem[]; marketPulse: MarketPulse; trendingRepos: TrendingRepo[]; notices: string[] };

type OpenMeteoResponse = { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; wind_speed_10m?: number }; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] } };
type FinnhubQuote = { c?: number; d?: number; dp?: number };
type FinnhubCandles = { s?: string; t?: number[]; c?: number[] };
type AlphaVantageDaily = { "Time Series (Daily)"?: Record<string, { "4. close"?: string }> };
type YahooChartResponse = { chart?: { result?: Array<{ meta?: Record<string, number | string | undefined>; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
type GitHubSearchResponse = { items?: Array<{ name: string; full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null; topics?: string[]; updated_at: string }> };
type RssFeed = { rss?: { channel?: { item?: RssItem | RssItem[] } } };
type RssItem = { title?: string; link?: string; pubDate?: string; description?: string; source?: string | { "#text"?: string } };

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

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const symbols = parseSymbols(new URL(req.url).searchParams.get("symbols"));
  const [weather, stocks, domesticNews, internationalNews, marketPulse, trendingRepos] = await Promise.all([
    getWeatherReports(),
    getStockReports(symbols),
    getDomesticNews(),
    getInternationalNews(),
    getMarketPulse(),
    getTrendingRepos(),
  ]);

  const notices = [
    domesticNews.length === 0 ? "国内新闻暂时没有拉到数据。" : "",
    internationalNews.length === 0 ? "国际新闻暂时没有拉到数据。" : "",
  ].filter(Boolean);

  return json({ updatedAt: new Date().toISOString(), weather, horoscopes: getHoroscopeReports(), stocks, domesticNews, internationalNews, marketPulse, trendingRepos, notices } satisfies DashboardResponse, 200, {
    "Cache-Control": "public, max-age=180, stale-while-revalidate=600",
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
    const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: "Asia/Shanghai", current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m", daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max", forecast_days: "1" });
    const data = await fetchJson<OpenMeteoResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
    return { id: location.id, district: location.district, condition: weatherCodeText[data.current?.weather_code ?? -1] ?? "天气更新中", temperature: roundOrNull(data.current?.temperature_2m), high: roundOrNull(data.daily?.temperature_2m_max?.[0]), low: roundOrNull(data.daily?.temperature_2m_min?.[0]), humidity: roundOrNull(data.current?.relative_humidity_2m), windSpeed: roundOrNull(data.current?.wind_speed_10m), precipitationProbability: roundOrNull(data.daily?.precipitation_probability_max?.[0]) };
  }));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : { id: weatherLocations[index].id, district: weatherLocations[index].district, condition: "暂时不可用", temperature: null, high: null, low: null, humidity: null, windSpeed: null, precipitationProbability: null, error: getErrorMessage(result.reason, "Weather request failed") });
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

async function getDomesticNews(): Promise<InsightItem[]> {
  const data = await fetchJson<{ data?: Array<Record<string, unknown>> }>("https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc", { "User-Agent": "Mozilla/5.0", Referer: "https://www.toutiao.com/" }).catch(() => ({ data: [] }));
  return (data.data ?? []).slice(0, 10).map((item, index) => {
    const title = String(item.Title ?? item.title ?? "热点新闻");
    const image = item.Image && typeof item.Image === "object" && "url" in item.Image ? String(item.Image.url) : "";
    return { rank: index + 1, title, source: "今日头条热榜", summary: `过去 24 小时国内热度较高的话题：${title}。`, imageUrl: image || String(item.image_url ?? item.LabelUrl ?? makePoster(title)), metric: formatCompact(Number(item.HotValue ?? item.hot_value ?? 0)), tag: String(item.Label ?? "hot") };
  });
}

async function getInternationalNews(): Promise<InsightItem[]> {
  const url = "https://news.google.com/rss/search?q=(Reuters%20OR%20BBC%20OR%20AP%20OR%20Bloomberg%20OR%20CNBC)%20when%3A1d&hl=zh-CN&gl=US&ceid=US%3Azh-Hans";
  return getRssNews(url, "国际").then((items) => items.slice(0, 10));
}

async function getRssNews(url: string, tag: string): Promise<InsightItem[]> {
  const xml = await fetchText(url); const parser = new XMLParser({ ignoreAttributes: false, trimValues: true }); const parsed = parser.parse(xml) as RssFeed;
  const raw = parsed.rss?.channel?.item; const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((item, index) => {
    const rawTitle = stripHtml(item.title ?? "未命名新闻"); const source = getNewsSource(item.source, rawTitle); const title = rawTitle.replace(/\s+-\s+[^-]+$/, "");
    return { rank: index + 1, title, source, summary: stripHtml(item.description ?? "") || `${source} 发布的${tag}新闻。`, imageUrl: makePoster(title), publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(), tag };
  });
}

async function getMarketPulse(): Promise<MarketPulse> {
  const aUp = await getEastmoneyRank("hs-a", "change");
  const aDown = await getEastmoneyRank("hs-a", "drop");
  const hkUp = await getEastmoneyRank("hk", "change");
  const hkDown = await getEastmoneyRank("hk", "drop");
  const usUp = await getYahooMovers("day_gainers");
  const usDown = await getYahooMovers("day_losers");
  const secUp = await getEastmoneySectors("change");
  const secDown = await getEastmoneySectors("drop");
  return { markets: [{ market: "A股", gainers: aUp, losers: aDown }, { market: "港股", gainers: hkUp, losers: hkDown }, { market: "美股", gainers: usUp, losers: usDown }], sectors: { gainers: secUp, losers: secDown } };
}

async function getEastmoneyRank(market: string, sort: "change" | "drop"): Promise<MarketRow[]> {
  const markets: Record<string, string> = { "hs-a": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048", hk: "m:116+t:3,m:116+t:4,m:116+t:1,m:116+t:2", us: "m:105,m:106,m:107" };
  const url = eastmoneyUrl(markets[market], "f3", sort === "change" ? "1" : "0", "f2,f3,f4,f5,f6,f8,f9,f12,f14,f20", 8);
  const data = await fetchJson<{ data?: { diff?: Array<Record<string, unknown>> } }>(url, { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" }).catch(() => ({ data: { diff: [] } }));
  return mapMarketRows(data.data?.diff ?? []);
}

async function getEastmoneySectors(sort: "change" | "drop"): Promise<MarketRow[]> {
  const url = eastmoneyUrl("m:90+t:2", "f3", sort === "change" ? "1" : "0", "f12,f14,f2,f3,f62,f128,f136", 8);
  const data = await fetchJson<{ data?: { diff?: Array<Record<string, unknown>> } }>(url, { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" }).catch(() => ({ data: { diff: [] } }));
  return mapMarketRows(data.data?.diff ?? []);
}

async function getYahooMovers(scrId: "day_gainers" | "day_losers"): Promise<MarketRow[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?${new URLSearchParams({ scrIds: scrId, count: "8" })}`;
  const data = await fetchJson<{ finance?: { result?: Array<{ quotes?: Array<Record<string, unknown>> }> } }>(url, { "User-Agent": "Mozilla/5.0 daily-dashboard" }).catch(() => ({ finance: { result: [] } }));
  const quotes = data.finance?.result?.[0]?.quotes ?? [];
  return quotes.map((quote, index) => ({
    rank: index + 1,
    code: String(quote.symbol ?? ""),
    name: String(quote.shortName ?? quote.longName ?? quote.symbol ?? ""),
    price: Number(quote.regularMarketPrice),
    changePercent: Number(quote.regularMarketChangePercent),
    change: Number(quote.regularMarketChange),
    turnover: Number(quote.regularMarketVolume),
    marketCap: Number(quote.marketCap),
    market: "US",
  }));
}

function eastmoneyUrl(fs: string, fid: string, po: string, fields: string, limit: number) {
  const url = new URL("https://push2.eastmoney.com/api/qt/clist/get");
  Object.entries({ pn: "1", pz: String(limit), po, np: "1", fltt: "2", invt: "2", fid, fs, fields, ut: "bd1d9ddb04089700cf9c27f6f7426281" }).forEach(([key, value]) => url.searchParams.set(key, value));
  return String(url);
}

function mapMarketRows(rows: Array<Record<string, unknown>>): MarketRow[] {
  return rows.map((it, index) => ({ rank: index + 1, code: String(it.f12 ?? ""), name: String(it.f14 ?? ""), price: Number(it.f2), changePercent: Number(it.f3), change: Number(it.f4), turnover: Number(it.f6), marketCap: Number(it.f20) }));
}

async function getTrendingRepos(): Promise<TrendingRepo[]> {
  const pushedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const data = await fetchJson<GitHubSearchResponse>(`https://api.github.com/search/repositories?${new URLSearchParams({ q: `stars:>1000 pushed:>${pushedAfter}`, sort: "stars", order: "desc", per_page: "20" })}`, { Accept: "application/vnd.github+json", "User-Agent": "daily-dashboard" }).catch(() => ({ items: [] }));
  return (data.items ?? []).slice(0, 20).map((repo) => ({ name: repo.name, fullName: repo.full_name, url: repo.html_url, description: repo.description?.trim() || "这个项目暂无简介。", summary: `近期仍活跃的高星项目，主要语言 ${repo.language ?? "未标注"}。${repo.description ?? ""}`, stars: repo.stargazers_count, language: repo.language, topics: repo.topics ?? [], updatedAt: repo.updated_at }));
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
function hash(value: string): number { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; }
function roundOrNull(value: number | undefined): number | null { return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null; }
function toNumberOrNull(value: number | undefined): number | null { return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(2)) : null; }
function calculateChange(price: number | null, previous: number | null): number | null { return price === null || previous === null ? null : Number((price - previous).toFixed(2)); }
function calculateChangePercent(change: number | null, previous: number | null): number | null { return change === null || previous === null || previous === 0 ? null : Number(((change / previous) * 100).toFixed(2)); }
function stripHtml(value: string): string { return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim(); }
function getNewsSource(source: RssItem["source"], title: string): string { if (typeof source === "string" && source.trim()) return source.trim(); if (source && typeof source === "object" && source["#text"]) return source["#text"]; return title.split(" - ").at(-1)?.trim() || "News"; }
function getErrorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function formatCompact(value: number): string { return Number.isFinite(value) && value > 0 ? new Intl.NumberFormat("zh-CN", { notation: "compact" }).format(value) : ""; }
function makePoster(seed: string): string {
  const hue = hash(seed) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},65%,84%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},60%,72%)"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/><circle cx="760" cy="120" r="170" fill="rgba(255,255,255,.28)"/><circle cx="180" cy="430" r="220" fill="rgba(255,255,255,.2)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
