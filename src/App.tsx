import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Point = { date: string; close: number };
type NewsFilter = "全部" | string;

type WeatherDay = {
  date: string;
  condition: string;
  high: number | null;
  low: number | null;
  precipitationProbability: number | null;
};

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
  uvIndex: number | null;
  forecast: WeatherDay[];
  error?: string;
};

type StockReport = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  chart: Point[];
  source: string;
  error?: string;
};

type NewsItem = {
  rank: number;
  title: string;
  source: string;
  sourceId?: string;
  summary: string;
  detail?: string;
  imageUrl: string;
  publishedAt?: string;
  tag?: string;
  sourceUrl?: string;
  metric?: string;
  relatedPosts?: Array<{ author: string; title: string; time?: string; url?: string }>;
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

type DashboardResponse = {
  updatedAt: string;
  weather: WeatherReport[];
  stocks: StockReport[];
  newsFeed: NewsItem[];
  weiboHot: NewsItem[];
  trendingRepos: TrendingRepo[];
  notices: string[];
};

type DetailResponse = { detail: string; imageUrl: string; bullets: string[] };
type LoadState = "loading" | "ready" | "error";

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_SYMBOLS = ["SAP", "NVDA", "AAPL", "SNDK"];
const POPULAR_STOCKS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN",
  "AMD", "SAP", "SNDK", "BABA", "ASML", "TSM", "PLTR", "UBER",
];
const STOCK_NAMES: Record<string, string> = {
  AAPL: "苹果", MSFT: "微软", NVDA: "英伟达", GOOGL: "谷歌", META: "Meta",
  TSLA: "特斯拉", AMZN: "亚马逊", AMD: "AMD", SAP: "SAP", SNDK: "闪迪",
  BABA: "阿里巴巴", ASML: "ASML", TSM: "台积电", PLTR: "Palantir", UBER: "Uber",
};
const NEWS_SOURCES = ["澎湃新闻", "财新网", "新京报", "36氪", "虎嗅网", "BBC中文", "路透中文", "德国之声", "FT中文网", "观察者网"] as const;
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });

// ── Utils ──────────────────────────────────────────────────────────────────
function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue] as const;
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function makePoster(seed: string): string {
  let h = 2166136261;
  for (const c of seed) {
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},54%,88%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360},48%,74%)"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/><circle cx="768" cy="136" r="152" fill="rgba(255,255,255,.28)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getChartPath(points: Point[]): string {
  const min = Math.min(...points.map((p) => p.close));
  const max = Math.max(...points.map((p) => p.close));
  const range = max - min || 1;
  return points
    .map((p, i) => {
      const x = (16 + (i / Math.max(points.length - 1, 1)) * 208).toFixed(2);
      const y = (86 - ((p.close - min) / range) * 64).toFixed(2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

// ── TickerTape ─────────────────────────────────────────────────────────────
function TickerTape({ stocks }: { stocks: StockReport[] }) {
  // TODO: replace with live index/commodity data from backend
  const fixed = [
    { sym: "沪指",   price: "3,312.45", up: true,  pct: "+0.62%" },
    { sym: "深成指", price: "10,847.22", up: false, pct: "-0.18%" },
    { sym: "恒生",   price: "18,542.30", up: true,  pct: "+0.94%" },
    { sym: "BTC",    price: "$68,420",   up: true,  pct: "+3.21%" },
    { sym: "黄金",   price: "$2,341",    up: false, pct: "-0.31%" },
    { sym: "人民币", price: "7.2418",    up: true,  pct: "+0.05%" },
  ];

  const stockItems = stocks.map((s) => ({
    sym: s.symbol,
    price:
      s.price !== null
        ? s.price >= 100
          ? money.format(s.price)
          : s.price.toFixed(2)
        : "--",
    up: (s.changePercent ?? 0) >= 0,
    pct:
      s.changePercent !== null
        ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`
        : "--",
  }));

  const items = [...stockItems, ...fixed];
  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap">
      <div className="ticker-label">行情</div>
      <div className="ticker-overflow">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="t-sym">{item.sym}</span>
              <span className="t-price">{item.price}</span>
              <span className={item.up ? "t-up" : "t-down"}>
                {item.up ? "▲" : "▼"} {item.pct}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WeatherBar ─────────────────────────────────────────────────────────────
const WEATHER_ICONS: Record<string, string> = {
  晴朗: "☀️", 晴间多云: "⛅", 局部多云: "🌤", 阴: "☁️",
  雾: "🌫", 霜雾: "🌫", 小毛毛雨: "🌦", 毛毛雨: "🌦",
  较强毛毛雨: "🌧", 小雨: "🌧", 中雨: "🌧", 大雨: "⛈",
  阵雨: "🌦", 较强阵雨: "🌧", 强阵雨: "⛈", 雷雨: "⛈",
  小雪: "🌨", 中雪: "❄️", 大雪: "❄️",
};

function WeatherBar({ weather }: { weather: WeatherReport | null }) {
  if (!weather) return null;

  const days = weather.forecast.slice(0, 3);
  const dayLabels = ["今天", "明天", "后天"];

  return (
    <div className="weather-bar">
      {days.map((day, i) => (
        <div key={day.date} className="weather-day">
          <div className="weather-day-label">{dayLabels[i]}</div>
          <div className="weather-day-icon">{WEATHER_ICONS[day.condition] ?? "🌡"}</div>
          <div className="weather-day-temp">
            {day.high ?? "--"}° / {day.low ?? "--"}°
          </div>
          <div className="weather-day-desc">{day.condition}</div>
        </div>
      ))}
      <div className="weather-extras">
        <span>📍 嘉定 / 浦东</span>
        {weather.humidity !== null && (
          <span>💧 湿度 <strong>{weather.humidity}%</strong></span>
        )}
        {weather.windSpeed !== null && (
          <span>💨 风 <strong>{weather.windSpeed} km/h</strong></span>
        )}
        {weather.precipitationProbability !== null && (
          <span>☔ 降雨 <strong>{weather.precipitationProbability}%</strong></span>
        )}
        {weather.uvIndex !== null && (
          <span>
            😎 紫外线{" "}
            <strong>
              {weather.uvIndex <= 2
                ? "低"
                : weather.uvIndex <= 5
                ? "中等"
                : weather.uvIndex <= 7
                ? "高"
                : "极高"}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}

// ── NewsFeed ───────────────────────────────────────────────────────────────
function NewsFeed({
  items,
  onSelect,
}: {
  items: NewsItem[];
  onSelect: (item: NewsItem) => void;
}) {
  if (items.length === 0)
    return (
      <p
        style={{
          color: "var(--ink-light)",
          fontSize: 14,
          fontFamily: "var(--f-sans)",
          padding: "20px 0",
        }}
      >
        暂无新闻数据
      </p>
    );

  const [hero, ...rest] = items;

  return (
    <>
      <button type="button" className="news-hero" onClick={() => onSelect(hero)}>
        <div className="news-hero-img">
          <img
            src={hero.imageUrl || makePoster(hero.title)}
            alt=""
            onError={(e) => {
              e.currentTarget.src = makePoster(hero.title);
            }}
          />
        </div>
        <div>
          <div className="news-source-tag">{hero.source}</div>
          <div className="news-hero-title">{hero.title}</div>
          <div className="news-hero-summary">{hero.summary}</div>
          <div className="news-meta">
            {hero.publishedAt ? formatTime(hero.publishedAt) : ""} · 点击阅读全文
          </div>
        </div>
      </button>

      {rest.slice(0, 19).map((item) => (
        <button
          key={`${item.sourceId ?? item.source}-${item.title}`}
          type="button"
          className="news-item"
          onClick={() => onSelect(item)}
        >
          <div className="news-item-img">
            <img
              src={item.imageUrl || makePoster(item.title)}
              alt=""
              onError={(e) => {
                e.currentTarget.src = makePoster(item.title);
              }}
            />
          </div>
          <div>
            <div className="news-source-tag">{item.source}</div>
            <div className="news-item-title">{item.title}</div>
            <div className="news-item-summary">{item.summary}</div>
            <div className="news-meta">
              {item.publishedAt ? formatTime(item.publishedAt) : ""}
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

// ── StockSearch ────────────────────────────────────────────────────────────
function StockSearch({
  query,
  suggestions,
  open,
  onQuery,
  onAdd,
  onClose,
}: {
  query: string;
  suggestions: string[];
  open: boolean;
  onQuery: (q: string) => void;
  onAdd: (sym: string) => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="stock-add-bar">
      <div className="stock-search-wrap" ref={wrapRef}>
        <span className="stock-search-icon">🔍</span>
        <input
          className="stock-search-input"
          type="text"
          value={query}
          placeholder="搜索代码或名称，如 TSLA、BABA…"
          autoComplete="off"
          onChange={(e) => onQuery(e.target.value)}
        />
        {open && suggestions.length > 0 && (
          <div className="stock-dropdown">
            {suggestions.map((sym) => (
              <button
                key={sym}
                type="button"
                className="stock-dropdown-item"
                onClick={() => onAdd(sym)}
              >
                <div>
                  <div className="stock-dropdown-sym">{sym}</div>
                  <div className="stock-dropdown-name">
                    {STOCK_NAMES[sym] ?? sym}
                  </div>
                </div>
                <span className="stock-dropdown-add">+ 添加</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="stock-hint">从常用股票中搜索添加</span>
    </div>
  );
}

// ── StockSparkline ─────────────────────────────────────────────────────────
function StockSparkline({ points, up }: { points: Point[]; up: boolean }) {
  if (points.length < 2) return <div className={`sparkline${up ? "" : " s-down"}`} />;
  const path = getChartPath(points);
  const fillPath = `${path} L 224 92 L 16 92 Z`;
  const color = up ? "#c0392b" : "#27826a";
  const fillColor = up ? "rgba(192,57,43,.1)" : "rgba(39,130,106,.1)";
  return (
    <svg
      className="sparkline-svg"
      viewBox="0 0 240 100"
      preserveAspectRatio="none"
    >
      <path d={fillPath} fill={fillColor} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── StockGrid ──────────────────────────────────────────────────────────────
function StockGrid({
  stocks,
  symbols,
  onRemove,
}: {
  stocks: StockReport[];
  symbols: string[];
  onRemove: (sym: string) => void;
}) {
  const ordered = symbols
    .map((sym) => stocks.find((s) => s.symbol === sym))
    .filter(Boolean) as StockReport[];

  return (
    <div className="stock-grid">
      {ordered.map((stock) => {
        const up = (stock.changePercent ?? 0) >= 0;
        const priceFmt =
          stock.price !== null ? `$${money.format(stock.price)}` : "--";
        const changeFmt =
          stock.changePercent !== null
            ? `${up ? "▲" : "▼"} ${Math.abs(stock.changePercent).toFixed(2)}%`
            : "--";

        return (
          <div key={stock.symbol} className="stock-card">
            <button
              type="button"
              className="stock-card-remove"
              onClick={() => onRemove(stock.symbol)}
            >
              ×
            </button>
            <div className="stock-symbol">{stock.symbol}</div>
            <div className="stock-name">{stock.name}</div>
            <div className="stock-price">{priceFmt}</div>
            <StockSparkline points={stock.chart} up={up} />
            <div className={`stock-change ${up ? "t-up" : "t-down"}`}>
              {changeFmt}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WeiboList ──────────────────────────────────────────────────────────────
function WeiboList({
  items,
  onSelect,
}: {
  items: NewsItem[];
  onSelect: (item: NewsItem) => void;
}) {
  return (
    <div className="weibo-list">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          className="weibo-item"
          onClick={() => onSelect(item)}
        >
          <span className={`weibo-rank${i < 2 ? " hot" : ""}`}>{i + 1}</span>
          <span className="weibo-title">{item.title}</span>
          <span className="weibo-heat">{item.metric ?? ""}</span>
        </button>
      ))}
    </div>
  );
}

// ── RepoList ───────────────────────────────────────────────────────────────
function RepoList({ repos }: { repos: TrendingRepo[] }) {
  return (
    <div className="repo-list">
      {repos.map((repo, i) => (
        <a
          key={repo.fullName}
          className="repo-item"
          href={repo.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="repo-rank">{i + 1}</span>
          <div>
            <div className="repo-name">{repo.fullName}</div>
            <div className="repo-desc">{repo.summary || repo.description}</div>
            <div className="repo-meta">
              {repo.language ?? "Mixed"} · {compact.format(repo.stars)} ★
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── NewsModal ──────────────────────────────────────────────────────────────
function NewsModal({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item.sourceUrl || item.source === "微博热搜") return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      url: item.sourceUrl,
      title: item.title,
      source: item.source,
      imageUrl: item.imageUrl,
    });
    fetch(`/api/insight-detail?${params}`)
      .then((r) => r.json() as Promise<DetailResponse>)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  const imageUrl =
    detail?.imageUrl || item.imageUrl || makePoster(item.title);
  const text = detail?.detail || item.detail || item.summary || "";
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-img">
          <img
            src={imageUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.src = makePoster(item.title);
            }}
          />
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-source-row">
            <span className="modal-source-tag">{item.source}</span>
            {item.publishedAt && (
              <span className="modal-time">{formatTime(item.publishedAt)}</span>
            )}
          </div>
          <div className="modal-title">{item.title}</div>
          {loading && (
            <div className="modal-loading">正在加载全文…</div>
          )}
          <div className="modal-text">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="modal-footer">
            <span>
              {text.replace(/\s+/g, "").length > 0
                ? `约 ${Math.round(text.replace(/\s+/g, "").length)} 字`
                : ""}
            </span>
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                阅读原文 →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [symbols, setSymbols] = useLocalStorage<string[]>(
    "zhu-stocks",
    DEFAULT_SYMBOLS
  );
  const [category, setCategory] = useState<NewsFilter>("全部");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const symbolKey = symbols.join(",");

  const filteredNews = (data?.newsFeed ?? []).filter((item) => {
    if (category === "全部") return true;
    return item.source === category;
  });

  const suggestions = POPULAR_STOCKS.filter(
    (s) => s.includes(stockQuery.toUpperCase()) && !symbols.includes(s)
  ).slice(0, 5);

  async function loadDashboard(syms = symbols) {
    setLoadState("loading");
    setLoadError(null);
    try {
      const res = await fetch(`/api/dashboard?symbols=${syms.join(",")}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData((await res.json()) as DashboardResponse);
      setLoadState("ready");
    } catch (e) {
      setLoadState("error");
      setLoadError(e instanceof Error ? e.message : "请求失败");
    }
  }

  function addStock(sym: string) {
    const s = sym.trim().toUpperCase();
    if (!/^[A-Z.]{1,8}$/.test(s) || symbols.includes(s)) return;
    setSymbols([...symbols, s].slice(0, 24));
    setStockQuery("");
    setDropdownOpen(false);
  }

  function removeStock(sym: string) {
    const next = symbols.filter((s) => s !== sym);
    setSymbols(next.length ? next : DEFAULT_SYMBOLS);
  }

  useEffect(() => {
    void loadDashboard(symbols);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const dateStr = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const primaryWeather = data?.weather?.[0] ?? null;

  return (
    <>
      <TickerTape stocks={data?.stocks ?? []} />

      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 15 Q5 7 8 12 Q11 17 14 6 Q17 -3 22 10"
                  stroke="#f2ede4"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="logo-zh">猪社</div>
              <div className="logo-en">Zhu Daily</div>
            </div>
          </div>
          <div className="header-meta">
            <span>{dateStr}</span>
            <span>上海时间 {timeStr}</span>
            {loadState === "ready" && (
              <span className="updated">● 已更新</span>
            )}
            {loadState === "loading" && (
              <span style={{ color: "var(--ink-light)" }}>● 加载中…</span>
            )}
            {loadState === "error" && (
              <span style={{ color: "var(--up)" }}>● {loadError}</span>
            )}
          </div>
        </div>
      </header>

      <WeatherBar weather={primaryWeather} />

      <div className="main-content">
        <div className="section-label">
          今日要闻
          <span>精选来源 · 各取最新10条合并</span>
        </div>

        <div className="news-filters">
          {(["全部", ...NEWS_SOURCES] as const).map((src) => (
            <button
              key={src}
              type="button"
              className={`filter-btn${category === src ? " active" : ""}`}
              onClick={() => setCategory(src)}
            >
              {src}
            </button>
          ))}
        </div>

        <NewsFeed items={filteredNews} onSelect={setSelectedNews} />

        <div className="section-label" style={{ marginBottom: "10px" }}>
          自选股
          <span>实时行情</span>
        </div>

        <StockSearch
          query={stockQuery}
          suggestions={suggestions}
          open={dropdownOpen}
          onQuery={(q) => {
            setStockQuery(q);
            setDropdownOpen(q.length > 0);
          }}
          onAdd={addStock}
          onClose={() => setDropdownOpen(false)}
        />
        <StockGrid
          stocks={data?.stocks ?? []}
          symbols={symbols}
          onRemove={removeStock}
        />

        <div className="section-label">
          微博热搜 <span>实时 Top 10</span>
        </div>
        <WeiboList items={data?.weiboHot ?? []} onSelect={setSelectedNews} />

        <div className="section-label">
          开源雷达 <span>GitHub 高星活跃 Top 10</span>
        </div>
        <RepoList repos={data?.trendingRepos ?? []} />
      </div>

      <footer className="site-footer">猪社 · ZHU DAILY · 🐷</footer>

      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </>
  );
}

export default App;
