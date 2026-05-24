import type { Config, Context } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";

type WeatherReport = {
  id: string;
  district: string;
  condition: string;
  temperature: number | null;
  high: number | null;
  low: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitationProbability: number | null;
  error?: string;
};

type HoroscopeDay = {
  date: string;
  summary: string;
  mood: string;
  focus: string;
  luckyColor: string;
  luckyNumber: number;
};

type HoroscopeReport = {
  sign: string;
  owner: string;
  days: HoroscopeDay[];
};

type StockPoint = {
  date: string;
  close: number;
};

type StockReport = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  chart: StockPoint[];
  source: string;
  error?: string;
};

type TrendingRepo = {
  name: string;
  fullName: string;
  url: string;
  description: string;
  summary: string;
  stars: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
};

type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "国内" | "国际";
  summary: string;
};

type DashboardResponse = {
  updatedAt: string;
  weather: WeatherReport[];
  horoscopes: HoroscopeReport[];
  stocks: StockReport[];
  trendingRepos: TrendingRepo[];
  news: NewsItem[];
  notices: string[];
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
};

type FinnhubCandles = {
  s?: string;
  t?: number[];
  c?: number[];
};

type AlphaVantageDaily = {
  "Time Series (Daily)"?: Record<
    string,
    {
      "4. close"?: string;
    }
  >;
};

type GitHubSearchResponse = {
  items?: Array<{
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    topics?: string[];
    updated_at: string;
  }>;
};

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
};

type RssFeed = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
};

const weatherLocations = [
  { id: "jiading", district: "上海嘉定", latitude: 31.3747, longitude: 121.2653 },
  { id: "pudong", district: "上海浦东", latitude: 31.2215, longitude: 121.544 },
];

const horoscopeSigns = [
  { sign: "天蝎座", owner: "我" },
  { sign: "双鱼座", owner: "老婆" },
];

const defaultStocks = [
  { symbol: "SAP", name: "SAP" },
  { symbol: "NVDA", name: "英伟达" },
  { symbol: "AAPL", name: "苹果" },
  { symbol: "SNDK", name: "闪迪" },
];

const stockNames: Record<string, string> = {
  AAPL: "苹果",
  AMD: "AMD",
  AMZN: "亚马逊",
  AVGO: "博通",
  BABA: "阿里巴巴",
  GOOGL: "Alphabet",
  META: "Meta",
  MSFT: "微软",
  NFLX: "Netflix",
  NVDA: "英伟达",
  SAP: "SAP",
  SNDK: "闪迪",
  TSLA: "特斯拉",
};

const weatherCodeText: Record<number, string> = {
  0: "晴朗",
  1: "晴间多云",
  2: "局部多云",
  3: "阴",
  45: "雾",
  48: "霜雾",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "较强毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  95: "雷雨",
};

const moods = ["沉稳", "清透", "笃定", "柔和", "敏锐", "松弛", "明亮", "从容"];
const focuses = ["沟通", "节奏", "财务", "健康", "创造力", "家庭", "判断力", "行动力"];
const colors = ["曜石黑", "雾蓝", "松石绿", "月光银", "酒红", "象牙白", "深海蓝", "鼠尾草绿"];
const summaries = [
  "今天适合把重要事项拆小，先处理最有确定性的部分。",
  "情绪会比平时更敏感，保持边界感反而能让关系更顺。",
  "有机会发现被忽略的细节，适合复盘计划和调整优先级。",
  "节奏不必太急，稳定推进会比临时冲刺更有效。",
  "适合主动沟通一个长期悬着的话题，语气越轻，效果越好。",
  "把注意力放在身体和睡眠上，状态会自然回到更好的轨道。",
  "小额决策可以果断，大额决策建议多留一个观察窗口。",
  "今天的好运来自秩序感，整理环境也会整理思路。",
];

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const symbols = parseSymbols(new URL(req.url).searchParams.get("symbols"));
  const [weather, stocks, trendingRepos, news] = await Promise.all([
    getWeatherReports(),
    getStockReports(symbols),
    getTrendingRepos(),
    getNewsItems(),
  ]);

  const notices = [
    ...collectErrors("GitHub 热门项目", trendingRepos.length),
    ...collectErrors("新闻", news.length),
  ];

  const body: DashboardResponse = {
    updatedAt: new Date().toISOString(),
    weather,
    horoscopes: getHoroscopeReports(),
    stocks,
    trendingRepos,
    news,
    notices,
  };

  return json(body, 200, {
    "Cache-Control": "public, max-age=180, stale-while-revalidate=600",
  });
};

export const config: Config = {
  path: "/api/dashboard",
};

function getEnv(key: string): string | undefined {
  return Netlify.env.get(key);
}

function parseSymbols(value: string | null): Array<{ symbol: string; name: string }> {
  const symbols = (value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^[A-Z.]{1,8}$/.test(item))
    .slice(0, 24);

  const unique = Array.from(new Set(symbols.length > 0 ? symbols : defaultStocks.map((item) => item.symbol)));
  return unique.map((symbol) => ({ symbol, name: stockNames[symbol] ?? symbol }));
}

async function getWeatherReports(): Promise<WeatherReport[]> {
  const results = await Promise.allSettled(
    weatherLocations.map(async (location) => {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        timezone: "Asia/Shanghai",
        current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        forecast_days: "1",
      });

      const data = await fetchJson<OpenMeteoResponse>(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      );

      return {
        id: location.id,
        district: location.district,
        condition: weatherCodeText[data.current?.weather_code ?? -1] ?? "天气更新中",
        temperature: roundOrNull(data.current?.temperature_2m),
        high: roundOrNull(data.daily?.temperature_2m_max?.[0]),
        low: roundOrNull(data.daily?.temperature_2m_min?.[0]),
        humidity: roundOrNull(data.current?.relative_humidity_2m),
        windSpeed: roundOrNull(data.current?.wind_speed_10m),
        precipitationProbability: roundOrNull(data.daily?.precipitation_probability_max?.[0]),
      };
    }),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const fallback = weatherLocations[index];
    return {
      id: fallback.id,
      district: fallback.district,
      condition: "暂时不可用",
      temperature: null,
      high: null,
      low: null,
      humidity: null,
      windSpeed: null,
      precipitationProbability: null,
      error: getErrorMessage(result.reason, "Weather request failed"),
    };
  });
}

function getHoroscopeReports(): HoroscopeReport[] {
  const dates = Array.from({ length: 4 }, (_, offset) => dateInShanghai(offset));

  return horoscopeSigns.map((profile) => ({
    ...profile,
    days: dates.map((date) => {
      const seed = hash(`${profile.sign}-${date}`);
      return {
        date,
        summary: summaries[seed % summaries.length],
        mood: moods[(seed >>> 3) % moods.length],
        focus: focuses[(seed >>> 6) % focuses.length],
        luckyColor: colors[(seed >>> 9) % colors.length],
        luckyNumber: (seed % 9) + 1,
      };
    }),
  }));
}

async function getStockReports(stocks: Array<{ symbol: string; name: string }>): Promise<StockReport[]> {
  const results = await Promise.allSettled(stocks.map((stock) => getStockReport(stock)));

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const stock = stocks[index];
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: null,
      change: null,
      changePercent: null,
      currency: "USD",
      chart: [],
      source: "unavailable",
      error: getErrorMessage(result.reason, "Stock request failed"),
    };
  });
}

async function getStockReport(stock: { symbol: string; name: string }): Promise<StockReport> {
  const finnhubKey = getEnv("FINNHUB_API_KEY");
  const alphaKey = getEnv("ALPHA_VANTAGE_API_KEY");
  const quote = finnhubKey ? await getFinnhubQuote(stock.symbol, finnhubKey).catch(() => null) : null;
  let chart: StockPoint[] = [];
  let source = "stooq";

  if (finnhubKey) {
    chart = await getFinnhubCandles(stock.symbol, finnhubKey).catch(() => []);
    source = chart.length > 0 ? "finnhub" : source;
  }

  if (chart.length < 2 && alphaKey) {
    chart = await getAlphaVantageDaily(stock.symbol, alphaKey).catch(() => []);
    source = chart.length > 0 ? "alpha-vantage" : source;
  }

  if (chart.length < 2) {
    chart = await getStooqDaily(stock.symbol).catch(() => []);
    source = chart.length > 0 ? "stooq" : source;
  }

  const fallbackPrice = chart.at(-1)?.close ?? null;
  const previous = chart.at(-2)?.close ?? null;
  const price = toNumberOrNull(quote?.c) ?? fallbackPrice;
  const change = toNumberOrNull(quote?.d) ?? calculateChange(price, previous);
  const changePercent = toNumberOrNull(quote?.dp) ?? calculateChangePercent(change, previous);

  return {
    symbol: stock.symbol,
    name: stock.name,
    price,
    change,
    changePercent,
    currency: "USD",
    chart,
    source,
    error: price === null && chart.length === 0 ? "暂时没有找到这个股票的数据" : undefined,
  };
}

async function getFinnhubQuote(symbol: string, token: string): Promise<FinnhubQuote> {
  const params = new URLSearchParams({ symbol, token });
  return fetchJson<FinnhubQuote>(`https://finnhub.io/api/v1/quote?${params.toString()}`);
}

async function getFinnhubCandles(symbol: string, token: string): Promise<StockPoint[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 14 * 24 * 60 * 60;
  const params = new URLSearchParams({
    symbol,
    resolution: "D",
    from: String(from),
    to: String(to),
    token,
  });

  const data = await fetchJson<FinnhubCandles>(
    `https://finnhub.io/api/v1/stock/candle?${params.toString()}`,
  );

  if (data.s !== "ok" || !data.t || !data.c) {
    return [];
  }

  return data.t
    .map((time, index) => ({
      date: new Date(time * 1000).toISOString().slice(0, 10),
      close: Number(data.c?.[index]),
    }))
    .filter((point) => Number.isFinite(point.close))
    .slice(-5);
}

async function getAlphaVantageDaily(symbol: string, apikey: string): Promise<StockPoint[]> {
  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
    apikey,
  });

  const data = await fetchJson<AlphaVantageDaily>(
    `https://www.alphavantage.co/query?${params.toString()}`,
  );

  const series = data["Time Series (Daily)"];
  if (!series) {
    return [];
  }

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      close: Number(values["4. close"]),
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);
}

async function getStooqDaily(symbol: string): Promise<StockPoint[]> {
  const normalized = `${symbol.toLowerCase().replace(".", "-")}.us`;
  const params = new URLSearchParams({ s: normalized, i: "d" });
  const text = await fetchText(`https://stooq.com/q/d/l/?${params.toString()}`);
  const rows = text
    .trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split(","))
    .filter((row) => row.length >= 5);

  return rows
    .map((row) => ({
      date: row[0],
      close: Number(row[4]),
    }))
    .filter((point) => point.date && Number.isFinite(point.close))
    .slice(-5);
}

async function getTrendingRepos(): Promise<TrendingRepo[]> {
  const pushedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    q: `stars:>1000 pushed:>${pushedAfter}`,
    sort: "stars",
    order: "desc",
    per_page: "20",
  });

  const data = await fetchJson<GitHubSearchResponse>(`https://api.github.com/search/repositories?${params}`, {
    Accept: "application/vnd.github+json",
    "User-Agent": "daily-signal-dashboard",
  }).catch(() => ({ items: [] }));

  return (data.items ?? []).slice(0, 20).map((repo) => {
    const description = repo.description?.trim() || "这个项目暂无简介。";
    const language = repo.language ? `，主要语言是 ${repo.language}` : "";
    const topicText = repo.topics?.length ? `，主题包括 ${repo.topics.slice(0, 3).join("、")}` : "";

    return {
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description,
      summary: `这是一个近期仍活跃的高星项目${language}${topicText}。${description}`,
      stars: repo.stargazers_count,
      language: repo.language,
      topics: repo.topics ?? [],
      updatedAt: repo.updated_at,
    };
  });
}

async function getNewsItems(): Promise<NewsItem[]> {
  const domesticUrl =
    "https://news.google.com/rss/search?q=%E4%B8%AD%E5%9B%BD%20when%3A1d&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans";
  const globalUrl =
    "https://news.google.com/rss/search?q=%E5%9B%BD%E9%99%85%20OR%20world%20when%3A1d&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans";

  const [domestic, international] = await Promise.all([
    getRssNews(domesticUrl, "国内").catch(() => []),
    getRssNews(globalUrl, "国际").catch(() => []),
  ]);

  return [...domestic.slice(0, 10), ...international.slice(0, 10)].slice(0, 20);
}

async function getRssNews(url: string, category: "国内" | "国际"): Promise<NewsItem[]> {
  const xml = await fetchText(url);
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as RssFeed;
  const items = parsed.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.map((item) => {
    const rawTitle = stripHtml(item.title ?? "未命名新闻");
    const source = getNewsSource(item.source, rawTitle);
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, "");
    const summary = stripHtml(item.description ?? "").replace(rawTitle, "").trim();

    return {
      title,
      source,
      url: item.link ?? "#",
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      category,
      summary: summary || `${source} 发布的${category}热点新闻。`,
    };
  });
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/plain, text/csv, application/rss+xml, application/xml, text/xml",
      "User-Agent": "daily-signal-dashboard",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.text();
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function dateInShanghai(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function roundOrNull(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value);
}

function toNumberOrNull(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}

function calculateChange(price: number | null, previous: number | null): number | null {
  if (price === null || previous === null) {
    return null;
  }

  return Number((price - previous).toFixed(2));
}

function calculateChangePercent(change: number | null, previous: number | null): number | null {
  if (change === null || previous === null || previous === 0) {
    return null;
  }

  return Number(((change / previous) * 100).toFixed(2));
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getNewsSource(source: RssItem["source"], title: string): string {
  if (typeof source === "string" && source.trim()) {
    return source.trim();
  }

  if (source && typeof source === "object" && source["#text"]) {
    return source["#text"];
  }

  return title.split(" - ").at(-1)?.trim() || "News";
}

function collectErrors(label: string, length: number): string[] {
  return length === 0 ? [`${label}暂时没有拉到数据，稍后会自动重试。`] : [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
