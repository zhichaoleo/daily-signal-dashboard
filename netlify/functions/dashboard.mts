import type { Config, Context } from "@netlify/functions";

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

type DashboardResponse = {
  updatedAt: string;
  weather: WeatherReport[];
  horoscopes: HoroscopeReport[];
  stocks: StockReport[];
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
    time?: string[];
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
  "Error Message"?: string;
  Note?: string;
};

const weatherLocations = [
  { id: "jiading", district: "上海嘉定", latitude: 31.3747, longitude: 121.2653 },
  { id: "pudong", district: "上海浦东", latitude: 31.2215, longitude: 121.544 },
];

const horoscopeSigns = [
  { sign: "天蝎座", owner: "我" },
  { sign: "双鱼座", owner: "老婆" },
];

const watchedStocks = [
  { symbol: "SAP", name: "SAP" },
  { symbol: "NVDA", name: "英伟达" },
  { symbol: "AAPL", name: "苹果" },
  { symbol: "SNDK", name: "闪迪" },
];

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

  const [weatherResults, stocks] = await Promise.all([
    getWeatherReports(),
    getStockReports(),
  ]);

  const notices: string[] = [];
  const finnhubKey = getEnv("FINNHUB_API_KEY");
  const alphaKey = getEnv("ALPHA_VANTAGE_API_KEY");

  if (!finnhubKey) {
    notices.push("FINNHUB_API_KEY is not configured. Live quotes are unavailable.");
  }

  if (!alphaKey) {
    notices.push("ALPHA_VANTAGE_API_KEY is not configured. Chart fallback is unavailable.");
  }

  const body: DashboardResponse = {
    updatedAt: new Date().toISOString(),
    weather: weatherResults,
    horoscopes: getHoroscopeReports(),
    stocks,
    notices,
  };

  return json(body, 200, {
    "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  });
};

export const config: Config = {
  path: "/api/dashboard",
};

function getEnv(key: string): string | undefined {
  return Netlify.env.get(key);
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
      error: result.reason instanceof Error ? result.reason.message : "Weather request failed",
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

async function getStockReports(): Promise<StockReport[]> {
  const results = await Promise.allSettled(watchedStocks.map((stock) => getStockReport(stock)));

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const stock = watchedStocks[index];
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: null,
      change: null,
      changePercent: null,
      currency: "USD",
      chart: [],
      source: "unavailable",
      error: result.reason instanceof Error ? result.reason.message : "Stock request failed",
    };
  });
}

async function getStockReport(stock: { symbol: string; name: string }): Promise<StockReport> {
  const finnhubKey = getEnv("FINNHUB_API_KEY");
  const alphaKey = getEnv("ALPHA_VANTAGE_API_KEY");
  const quote = finnhubKey ? await getFinnhubQuote(stock.symbol, finnhubKey).catch(() => null) : null;
  let chart: StockPoint[] = [];
  let source = "finnhub";

  if (finnhubKey) {
    chart = await getFinnhubCandles(stock.symbol, finnhubKey).catch(() => []);
  }

  if (chart.length < 2 && alphaKey) {
    chart = await getAlphaVantageDaily(stock.symbol, alphaKey).catch(() => []);
    source = chart.length > 0 ? "alpha-vantage" : source;
  }

  const fallbackPrice = chart.at(-1)?.close ?? null;
  const price = toNumberOrNull(quote?.c) ?? fallbackPrice;

  return {
    symbol: stock.symbol,
    name: stock.name,
    price,
    change: toNumberOrNull(quote?.d),
    changePercent: toNumberOrNull(quote?.dp),
    currency: "USD",
    chart,
    source,
    error: getStockError(finnhubKey, alphaKey, quote, chart),
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
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

function getStockError(
  finnhubKey: string | undefined,
  alphaKey: string | undefined,
  quote: FinnhubQuote | null,
  chart: StockPoint[],
): string | undefined {
  if (!finnhubKey) {
    return "Missing FINNHUB_API_KEY";
  }

  if (!quote?.c && chart.length === 0) {
    return alphaKey
      ? "Stock data is temporarily unavailable"
      : "Missing ALPHA_VANTAGE_API_KEY for chart fallback";
  }

  return undefined;
}
