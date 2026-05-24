import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CloudSun,
  Droplets,
  ExternalLink,
  Github,
  ImagePlus,
  MoonStar,
  Newspaper,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  Waves,
  Wind,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

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

type PhotoItem = {
  id: string;
  src: string;
  name: string;
};

type LoadState = "loading" | "ready" | "error";
type ThemeId = "morning" | "aqua" | "pearl" | "garden";

const defaultSymbols = ["SAP", "NVDA", "AAPL", "SNDK"];

const themeOptions: Array<{ id: ThemeId; name: string; hint: string }> = [
  { id: "morning", name: "晨光", hint: "清爽暖白" },
  { id: "aqua", name: "水雾", hint: "蓝绿通透" },
  { id: "pearl", name: "珍珠", hint: "柔和高级" },
  { id: "garden", name: "青庭", hint: "自然清新" },
];

const popularStocks = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "META",
  "TSLA",
  "AMZN",
  "AMD",
  "AVGO",
  "NFLX",
  "SAP",
  "SNDK",
  "BABA",
  "ASML",
  "TSM",
  "CRM",
  "ORCL",
  "PLTR",
  "UBER",
  "SHOP",
];

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormat = new Intl.NumberFormat("en-US");

const compactDate = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  weekday: "short",
});

const shanghaiTimeFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useStoredState<ThemeId>("daily-signal-theme", "morning");
  const [stockSymbols, setStockSymbols] = useStoredState<string[]>("daily-signal-stocks", defaultSymbols);
  const [photos, setPhotos] = useStoredState<PhotoItem[]>("daily-signal-photos", []);
  const [stockQuery, setStockQuery] = useState("");

  const symbolKey = stockSymbols.join(",");
  const suggestions = useMemo(() => {
    const query = stockQuery.trim().toUpperCase();
    return popularStocks
      .filter((symbol) => symbol.includes(query) && !stockSymbols.includes(symbol))
      .slice(0, 6);
  }, [stockQuery, stockSymbols]);

  const updatedText = useMemo(() => {
    if (!data?.updatedAt) {
      return "等待更新";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(data.updatedAt));
  }, [data?.updatedAt]);

  async function loadDashboard(symbols = stockSymbols) {
    setState("loading");
    setError(null);

    try {
      const params = new URLSearchParams({ symbols: symbols.join(",") });
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Dashboard API returned ${response.status}`);
      }

      const nextData = (await response.json()) as DashboardResponse;
      setData(nextData);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(loadError instanceof Error ? loadError.message : "Dashboard request failed");
    }
  }

  function addStock(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z.]{1,8}$/.test(normalized) || stockSymbols.includes(normalized)) {
      return;
    }

    const nextSymbols = [...stockSymbols, normalized].slice(0, 24);
    setStockSymbols(nextSymbols);
    setStockQuery("");
  }

  function removeStock(symbol: string) {
    const nextSymbols = stockSymbols.filter((item) => item !== symbol);
    setStockSymbols(nextSymbols.length ? nextSymbols : defaultSymbols);
  }

  function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addStock(stockQuery);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const nextPhotos = await Promise.all(
      Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, 6)
        .map(readPhoto),
    );

    setPhotos([...nextPhotos, ...photos].slice(0, 8));
  }

  useEffect(() => {
    void loadDashboard(stockSymbols);
  }, [symbolKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={`app-shell theme-${theme}`}>
      <section className="hero-panel glass-panel">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Lao Zhu
          </div>
          <h1>老朱Dashboard</h1>
          <p>上海时间 {shanghaiTimeFormat.format(now)}，天气、星运、市场、开源趋势和新闻都在这里。</p>
        </div>

        <div className="hero-actions">
          <div className="time-chip">
            <CalendarDays size={16} aria-hidden="true" />
            {compactDate.format(now)}
          </div>
          <button className="icon-button" type="button" onClick={() => void loadDashboard()}>
            <RefreshCw size={18} aria-hidden="true" className={state === "loading" ? "spin" : ""} />
            <span>刷新</span>
          </button>
        </div>
      </section>

      <ThemeSwitcher activeTheme={theme} onChange={setTheme} />
      <StatusBar state={state} updatedText={updatedText} error={error} notices={data?.notices ?? []} />

      <section className="dashboard-grid weather-grid" aria-label="天气">
        {state === "loading" && !data
          ? Array.from({ length: 2 }, (_, index) => <WeatherSkeleton key={index} />)
          : data?.weather.map((weather) => <WeatherCard key={weather.id} weather={weather} />)}
      </section>

      <PhotoWall photos={photos} onUpload={handlePhotoUpload} onRemove={(id) => setPhotos(photos.filter((photo) => photo.id !== id))} />

      <section className="section-block" aria-label="星座运势">
        <SectionTitle icon={<MoonStar size={18} aria-hidden="true" />} title="星座运势" meta="今天 + 未来三天" />
        <div className="dashboard-grid horoscope-grid">
          {state === "loading" && !data
            ? Array.from({ length: 2 }, (_, index) => <HoroscopeSkeleton key={index} />)
            : data?.horoscopes.map((report) => <HoroscopeCard key={report.sign} report={report} />)}
        </div>
      </section>

      <section className="section-block" aria-label="股票">
        <SectionTitle icon={<TrendingUp size={18} aria-hidden="true" />} title="关注股票" meta="搜索添加 + 5 日走势" />
        <StockControls
          query={stockQuery}
          suggestions={suggestions}
          symbols={stockSymbols}
          onAdd={addStock}
          onQuery={setStockQuery}
          onRemove={removeStock}
          onSubmit={handleStockSubmit}
        />
        <div className="dashboard-grid stock-grid">
          {state === "loading" && !data
            ? Array.from({ length: Math.min(stockSymbols.length, 8) }, (_, index) => <StockSkeleton key={index} />)
            : data?.stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />)}
        </div>
      </section>

      <section className="section-block" aria-label="GitHub 热门项目">
        <SectionTitle icon={<Github size={18} aria-hidden="true" />} title="GitHub 热门项目" meta="Top 20" />
        <div className="repo-list">
          {state === "loading" && !data
            ? Array.from({ length: 6 }, (_, index) => <ListSkeleton key={index} />)
            : data?.trendingRepos.map((repo, index) => <RepoCard key={repo.fullName} repo={repo} index={index + 1} />)}
        </div>
      </section>

      <section className="section-block" aria-label="热点新闻">
        <SectionTitle icon={<Newspaper size={18} aria-hidden="true" />} title="热点新闻" meta="国内 + 国际 20 条" />
        <div className="news-list">
          {state === "loading" && !data
            ? Array.from({ length: 6 }, (_, index) => <ListSkeleton key={index} />)
            : data?.news.map((item, index) => <NewsCard key={`${item.url}-${index}`} item={item} index={index + 1} />)}
        </div>
      </section>
    </main>
  );
}

function ThemeSwitcher({ activeTheme, onChange }: { activeTheme: ThemeId; onChange: (theme: ThemeId) => void }) {
  return (
    <section className="theme-switcher glass-panel" aria-label="主题选择">
      <div className="theme-title">
        <Palette size={17} aria-hidden="true" />
        <span>主题</span>
      </div>
      <div className="theme-options">
        {themeOptions.map((option) => (
          <button
            className={`theme-choice theme-dot-${option.id} ${activeTheme === option.id ? "active" : ""}`}
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
          >
            <span className="theme-swatch" />
            <strong>{option.name}</strong>
            <small>{option.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusBar({
  state,
  updatedText,
  error,
  notices,
}: {
  state: LoadState;
  updatedText: string;
  error: string | null;
  notices: string[];
}) {
  return (
    <section className="status-row" aria-live="polite">
      <div className="status-pill">
        <span className={`status-dot ${state}`} />
        {state === "loading" ? "同步中" : state === "ready" ? `更新于 ${updatedText}` : "同步失败"}
      </div>
      {error ? (
        <div className="status-pill warning">
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {notices.map((notice) => (
        <div className="status-pill muted" key={notice}>
          <AlertCircle size={15} aria-hidden="true" />
          {notice}
        </div>
      ))}
    </section>
  );
}

function SectionTitle({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return (
    <div className="section-title">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      <span>{meta}</span>
    </div>
  );
}

function PhotoWall({
  photos,
  onUpload,
  onRemove,
}: {
  photos: PhotoItem[];
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="section-block" aria-label="照片">
      <SectionTitle icon={<ImagePlus size={18} aria-hidden="true" />} title="生活相册" meta="本地保存" />
      <div className="photo-grid">
        <label className="glass-panel photo-upload">
          <Upload size={24} aria-hidden="true" />
          <strong>上传照片</strong>
          <span>我和老婆的瞬间</span>
          <input type="file" accept="image/*" multiple onChange={(event) => void onUpload(event.target.files)} />
        </label>

        {photos.map((photo) => (
          <figure className="glass-panel photo-card" key={photo.id}>
            <img src={photo.src} alt={photo.name} />
            <button type="button" onClick={() => onRemove(photo.id)} aria-label={`删除 ${photo.name}`}>
              <X size={15} aria-hidden="true" />
            </button>
          </figure>
        ))}
      </div>
    </section>
  );
}

function StockControls({
  query,
  suggestions,
  symbols,
  onAdd,
  onQuery,
  onRemove,
  onSubmit,
}: {
  query: string;
  suggestions: string[];
  symbols: string[];
  onAdd: (symbol: string) => void;
  onQuery: (query: string) => void;
  onRemove: (symbol: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="stock-controls glass-panel">
      <form className="stock-search" onSubmit={onSubmit}>
        <Search size={17} aria-hidden="true" />
        <input
          value={query}
          placeholder="搜索或输入股票代码"
          aria-label="搜索或输入股票代码"
          onChange={(event) => onQuery(event.target.value)}
        />
        <button type="submit" aria-label="添加股票">
          <Plus size={17} aria-hidden="true" />
        </button>
      </form>

      <div className="suggestion-row">
        {suggestions.map((symbol) => (
          <button type="button" key={symbol} onClick={() => onAdd(symbol)}>
            {symbol}
          </button>
        ))}
      </div>

      <div className="symbol-row">
        {symbols.map((symbol) => (
          <button type="button" className="symbol-chip" key={symbol} onClick={() => onRemove(symbol)}>
            {symbol}
            <X size={13} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function WeatherCard({ weather }: { weather: WeatherReport }) {
  return (
    <article className="glass-panel weather-card">
      <div className="card-topline">
        <div>
          <span className="label">天气</span>
          <h2>{weather.district}</h2>
        </div>
        <CloudSun size={30} aria-hidden="true" />
      </div>

      <div className="weather-main">
        <strong>{weather.temperature === null ? "--" : `${weather.temperature}°`}</strong>
        <span>{weather.condition}</span>
      </div>

      <div className="metric-grid">
        <Metric icon={<Waves size={15} />} label="高低温" value={`${formatTemp(weather.low)} / ${formatTemp(weather.high)}`} />
        <Metric icon={<Droplets size={15} />} label="湿度" value={formatPercent(weather.humidity)} />
        <Metric icon={<Wind size={15} />} label="风速" value={weather.windSpeed === null ? "--" : `${weather.windSpeed} km/h`} />
        <Metric icon={<Droplets size={15} />} label="降雨" value={formatPercent(weather.precipitationProbability)} />
      </div>

      {weather.error ? <p className="card-error">{weather.error}</p> : null}
    </article>
  );
}

function HoroscopeCard({ report }: { report: HoroscopeReport }) {
  const today = report.days[0];

  return (
    <article className="glass-panel horoscope-card">
      <div className="card-topline">
        <div>
          <span className="label">{report.owner}</span>
          <h2>{report.sign}</h2>
        </div>
        <MoonStar size={28} aria-hidden="true" />
      </div>

      <p className="horoscope-summary">{today?.summary}</p>

      <div className="fortune-strip">
        {report.days.map((day, index) => (
          <div className="fortune-day" key={`${report.sign}-${day.date}`}>
            <span>{index === 0 ? "今天" : compactDay(day.date)}</span>
            <strong>{day.mood}</strong>
            <small>{day.focus}</small>
          </div>
        ))}
      </div>

      <div className="detail-row">
        <span>{today?.luckyColor}</span>
        <span>幸运数 {today?.luckyNumber}</span>
      </div>
    </article>
  );
}

function StockCard({ stock }: { stock: StockReport }) {
  const isUp = (stock.change ?? 0) >= 0;

  return (
    <article className="glass-panel stock-card">
      <div className="stock-heading">
        <div>
          <span className="label">{stock.symbol}</span>
          <h2>{stock.name}</h2>
        </div>
        <span className={`move-badge ${isUp ? "up" : "down"}`}>
          {isUp ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}
          {stock.changePercent === null ? "--" : `${stock.changePercent.toFixed(2)}%`}
        </span>
      </div>

      <div className="stock-price">
        <strong>{stock.price === null ? "--" : `$${numberFormat.format(stock.price)}`}</strong>
        <span>{stock.change === null ? "变化待更新" : `${isUp ? "+" : ""}${stock.change.toFixed(2)} ${stock.currency}`}</span>
      </div>

      <MiniChart points={stock.chart} positive={isUp} />

      <div className="stock-foot">
        <span>{stock.source}</span>
        {stock.error ? <span className="stock-error">{stock.error}</span> : null}
      </div>
    </article>
  );
}

function RepoCard({ repo, index }: { repo: TrendingRepo; index: number }) {
  return (
    <article className="glass-panel list-card repo-card">
      <div className="rank-badge">{index}</div>
      <div className="list-content">
        <div className="list-heading">
          <div>
            <span className="label">{repo.language ?? "Mixed"}</span>
            <h3>{repo.fullName}</h3>
          </div>
          <a href={repo.url} target="_blank" rel="noreferrer" aria-label={`打开 ${repo.fullName}`}>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p>{repo.summary}</p>
        <div className="meta-row">
          <span>
            <Star size={14} aria-hidden="true" />
            {integerFormat.format(repo.stars)}
          </span>
          <span>{formatDate(repo.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <article className="glass-panel list-card news-card">
      <div className="rank-badge">{index}</div>
      <div className="list-content">
        <div className="list-heading">
          <div>
            <span className="label">{item.category} · {item.source}</span>
            <h3>{item.title}</h3>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`打开 ${item.title}`}>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p>{item.summary}</p>
        <div className="meta-row">
          <span>{formatDate(item.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function MiniChart({ points, positive }: { points: StockPoint[]; positive: boolean }) {
  const path = getChartPath(points);
  const fill = getChartFillPath(points);

  return (
    <div className="mini-chart" aria-label="5 日走势图">
      {points.length >= 2 ? (
        <svg viewBox="0 0 240 110" role="img">
          <path className={`chart-fill ${positive ? "positive" : "negative"}`} d={fill} />
          <path className={`chart-line ${positive ? "positive" : "negative"}`} d={path} />
          {points.map((point, index) => {
            const { x, y } = mapPoint(point.close, index, points);
            return <circle key={`${point.date}-${point.close}`} cx={x} cy={y} r={3.8} />;
          })}
        </svg>
      ) : (
        <div className="chart-empty">走势待更新</div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeatherSkeleton() {
  return <div className="glass-panel skeleton-card tall" />;
}

function HoroscopeSkeleton() {
  return <div className="glass-panel skeleton-card medium" />;
}

function StockSkeleton() {
  return <div className="glass-panel skeleton-card stock" />;
}

function ListSkeleton() {
  return <div className="glass-panel skeleton-card list" />;
}

function useStoredState<T>(key: string, fallback: T) {
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
    } catch {
      // Local storage can fail for large photo uploads or private browsing.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function readPhoto(file: File): Promise<PhotoItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        src: String(reader.result),
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatTemp(value: number | null) {
  return value === null ? "--" : `${value}°`;
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

function compactDay(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(date));
}

function getChartPath(points: StockPoint[]) {
  return points
    .map((point, index) => {
      const { x, y } = mapPoint(point.close, index, points);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getChartFillPath(points: StockPoint[]) {
  const line = getChartPath(points);
  return `${line} L 224 98 L 16 98 Z`;
}

function mapPoint(value: number, index: number, points: StockPoint[]) {
  const values = points.map((point) => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = 16 + (index / Math.max(points.length - 1, 1)) * 208;
  const y = 92 - ((value - min) / range) * 68;

  return { x, y };
}

export default App;
