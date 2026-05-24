import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CloudSun,
  Gauge,
  Github,
  ImagePlus,
  Newspaper,
  Palette,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Point = { date: string; close: number };
type WeatherDay = { date: string; condition: string; high: number | null; low: number | null; precipitationProbability: number | null };
type WeatherReport = { id: string; district: string; condition: string; temperature: number | null; high: number | null; low: number | null; humidity: number | null; windSpeed: number | null; precipitationProbability: number | null; forecast: WeatherDay[]; error?: string };
type HoroscopeDay = { date: string; summary: string; mood: string; focus: string; luckyColor: string; luckyNumber: number };
type HoroscopeReport = { sign: string; owner: string; days: HoroscopeDay[] };
type StockReport = { symbol: string; name: string; price: number | null; change: number | null; changePercent: number | null; currency: string; chart: Point[]; source: string; open?: number | null; high?: number | null; low?: number | null; volume?: number | null; marketCap?: number | null; fiftyTwoWeekHigh?: number | null; fiftyTwoWeekLow?: number | null; dayRange?: string | null; error?: string };
type InsightItem = { rank: number; title: string; source: string; summary: string; imageUrl: string; metric?: string; publishedAt?: string; tag?: string; detail?: string; bullets?: string[]; sourceUrl?: string };
type MarketRow = { rank: number; code: string; name: string; price: number | string; changePercent: number | string; change?: number | string; turnover?: number | string; marketCap?: number | string };
type MarketPulse = { markets: Array<{ market: string; gainers: MarketRow[]; losers: MarketRow[] }>; sectors: { gainers: MarketRow[]; losers: MarketRow[] } };
type TrendingRepo = { name: string; fullName: string; url: string; description: string; summary: string; stars: number; language: string | null; topics: string[]; updatedAt: string };
type UsageMetric = { label: string; status: "live" | "missing-key" | "manual"; totalCost: number | null; currency: string; budget: number | null; progress: number | null; inputTokens?: number; outputTokens?: number; requests?: number; periodStart: string; periodEnd: string; updatedAt: string; message: string; dailyCosts: Point[] };
type UsageSummary = { openai: UsageMetric; codex: UsageMetric };
type DashboardResponse = { updatedAt: string; weather: WeatherReport[]; horoscopes: HoroscopeReport[]; stocks: StockReport[]; domesticNews: InsightItem[]; internationalNews: InsightItem[]; weiboHot: InsightItem[]; usage: UsageSummary; marketPulse: MarketPulse; trendingRepos: TrendingRepo[]; notices: string[] };
type PhotoItem = { id: string; src: string; name: string };
type LoadState = "loading" | "ready" | "error";
type ThemeId = "atelier" | "liquid" | "paper" | "midnight";

const defaultSymbols = ["SAP", "NVDA", "AAPL", "SNDK"];
const maxPhotoCount = 20;
const popularStocks = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN", "AMD", "AVGO", "NFLX", "SAP", "SNDK", "BABA", "ASML", "TSM", "CRM", "ORCL", "PLTR", "UBER", "SHOP"];
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
const themeOptions: Array<{ id: ThemeId; name: string; tone: string }> = [
  { id: "atelier", name: "晨雾画廊", tone: "Editorial" },
  { id: "liquid", name: "冰川毛玻璃", tone: "Liquid" },
  { id: "paper", name: "宣纸晨光", tone: "Paper" },
  { id: "midnight", name: "夜航仪表", tone: "Nocturne" },
];

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [stockSymbols, setStockSymbols] = useStoredState<string[]>("daily-signal-stocks", defaultSymbols);
  const [photos, setPhotos] = useStoredState<PhotoItem[]>("daily-signal-photos", []);
  const [theme, setTheme] = useStoredState<ThemeId>("daily-signal-theme", "liquid");
  const [stockQuery, setStockQuery] = useState("");
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);
  const symbolKey = stockSymbols.join(",");
  const suggestions = useMemo(() => popularStocks.filter((symbol) => symbol.includes(stockQuery.trim().toUpperCase()) && !stockSymbols.includes(symbol)).slice(0, 6), [stockQuery, stockSymbols]);
  const updatedText = data?.updatedAt ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" }).format(new Date(data.updatedAt)) : "等待更新";

  async function loadDashboard(symbols = stockSymbols) {
    setState("loading");
    setError(null);
    try {
      const response = await fetch(`/api/dashboard?${new URLSearchParams({ symbols: symbols.join(",") })}`);
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      setData((await response.json()) as DashboardResponse);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(loadError instanceof Error ? loadError.message : "Dashboard request failed");
    }
  }

  function addStock(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z.]{1,8}$/.test(normalized) || stockSymbols.includes(normalized)) return;
    setStockSymbols([...stockSymbols, normalized].slice(0, 24));
    setStockQuery("");
  }

  function removeStock(symbol: string) {
    const nextSymbols = stockSymbols.filter((item) => item !== symbol);
    setStockSymbols(nextSymbols.length ? nextSymbols : defaultSymbols);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    const availableSlots = Math.max(maxPhotoCount - photos.length, 0);
    if (availableSlots === 0) return;
    const nextPhotos = await Promise.all(Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, availableSlots).map(readPhoto));
    setPhotos([...nextPhotos, ...photos].slice(0, maxPhotoCount));
  }

  useEffect(() => { void loadDashboard(stockSymbols); }, [symbolKey]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);

  return (
    <main className="briefing-shell" data-theme={theme}>
      <section className="hero">
        <div className="hero-mark">家庭内参</div>
        <h1>老🐷Dashboard</h1>
        <p>一个给家里人看的 24h 信息集合地：中文新闻、微博热榜、资产波动、开源项目，以及一点自己的生活。</p>
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <div className="hero-meta">
          <span><CalendarDays size={16} />{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: "short" }).format(now)}</span>
          <span>上海时间 {new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}</span>
          <button type="button" onClick={() => void loadDashboard()}><RefreshCw size={16} className={state === "loading" ? "spin" : ""} />刷新</button>
        </div>
      </section>

      <StatusBar state={state} updatedText={updatedText} error={error} notices={data?.notices ?? []} />
      <UsageMonitor usage={data?.usage} />

      <section className="home-grid">
        <PhotoWall photos={photos} onUpload={handlePhotoUpload} onRemove={(id) => setPhotos(photos.filter((photo) => photo.id !== id))} />
        <WeatherBoard weather={data?.weather ?? []} />
      </section>

      <SectionHeader icon={<Newspaper size={18} />} title="新闻内参" meta="过去 24h · 中文新闻 · 点击看详情" />
      <section className="news-board">
        <InsightColumn title="国内 Top 10" items={data?.domesticNews ?? []} onSelect={setSelectedInsight} />
        <InsightColumn title="国际中文 Top 10" items={data?.internationalNews ?? []} onSelect={setSelectedInsight} />
      </section>

      <SectionHeader icon={<BarChart3 size={18} />} title="微博热榜" meta="opencli 快照 · 站内详情" />
      <section className="weibo-strip">
        {(data?.weiboHot ?? []).map((item) => <InsightCard key={`weibo-${item.rank}-${item.title}`} item={item} onSelect={setSelectedInsight} compact />)}
      </section>

      <SectionHeader icon={<TrendingUp size={18} />} title="市场雷达" meta="自选股 + A/HK/US Top 10 + 板块" />
      <StockControls query={stockQuery} suggestions={suggestions} symbols={stockSymbols} onAdd={addStock} onQuery={setStockQuery} onRemove={removeStock} />
      <section className="stock-grid">{data?.stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />) ?? <Skeleton />}</section>
      {data?.marketPulse ? <MarketPulseView pulse={data.marketPulse} /> : null}

      <SectionHeader icon={<Github size={18} />} title="开源雷达" meta="GitHub 活跃高星项目 Top 10" />
      <section className="repo-list">{data?.trendingRepos.map((repo, index) => <RepoCard key={repo.fullName} repo={repo} index={index + 1} />)}</section>

      <section className="section-block horoscope-bottom">
        <details>
          <summary>星座运势 <ChevronDown size={16} /></summary>
          <div className="horoscope-grid">{data?.horoscopes.map((report) => <HoroscopeCard key={report.sign} report={report} />)}</div>
        </details>
      </section>

      {selectedInsight ? <InsightModal item={selectedInsight} onClose={() => setSelectedInsight(null)} /> : null}
    </main>
  );
}

function ThemeSwitcher({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return <div className="theme-switcher" aria-label="主题切换"><Palette size={16} />{themeOptions.map((option) => <button type="button" key={option.id} className={value === option.id ? "active" : ""} onClick={() => onChange(option.id)}><b>{option.name}</b><span>{option.tone}</span></button>)}</div>;
}

function StatusBar({ state, updatedText, error, notices }: { state: LoadState; updatedText: string; error: string | null; notices: string[] }) {
  return <section className="status-row"><span className={`status-dot ${state}`} />{state === "loading" ? "同步中" : `更新于 ${updatedText}`}{error ? <b><AlertCircle size={14} />{error}</b> : null}{notices.map((notice) => <b key={notice}><AlertCircle size={14} />{notice}</b>)}</section>;
}

function UsageMonitor({ usage }: { usage?: UsageSummary }) {
  if (!usage) return <section className="usage-grid"><Skeleton /><Skeleton /></section>;
  return <section className="usage-grid"><UsageCard metric={usage.openai} /><UsageCard metric={usage.codex} /></section>;
}

function UsageCard({ metric }: { metric: UsageMetric }) {
  const value = metric.totalCost === null ? "--" : `$${money.format(metric.totalCost)}`;
  return <article className="glass usage-card"><div><Gauge size={18} /><span>{metric.label}</span><em>{metric.status === "live" ? "Live" : metric.status === "manual" ? "Manual" : "Setup"}</em></div><strong>{value}</strong><p>{metric.message}</p><div className="progress"><i style={{ width: `${metric.progress ?? 0}%` }} /></div><small>{metric.requests ? `${compact.format(metric.requests)} requests · ` : ""}{metric.inputTokens ? `${compact.format(metric.inputTokens)} in / ${compact.format(metric.outputTokens ?? 0)} out` : `${metric.periodStart} 至 ${metric.periodEnd}`}</small></article>;
}

function SectionHeader({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return <div className="section-header"><div>{icon}<h2>{title}</h2></div><span>{meta}</span></div>;
}

function WeatherBoard({ weather }: { weather: WeatherReport[] }) {
  return <section className="weather-board">{weather.length ? weather.map((item) => <WeatherCard key={item.id} weather={item} />) : <Skeleton />}</section>;
}

function WeatherCard({ weather }: { weather: WeatherReport }) {
  return <article className="glass weather-card"><div className="weather-head"><CloudSun size={22} /><span>{weather.district}</span><strong>{weather.temperature ?? "--"}°</strong></div><p>{weather.condition} · 湿度 {weather.humidity ?? "--"}% · 风 {weather.windSpeed ?? "--"}km/h</p><div className="forecast-row">{weather.forecast.slice(0, 7).map((day, index) => <div key={day.date}><b>{index === 0 ? "今天" : day.date.slice(5)}</b><span>{day.condition}</span><em>{day.low ?? "--"} / {day.high ?? "--"}°</em></div>)}</div></article>;
}

function PhotoWall({ photos, onUpload, onRemove }: { photos: PhotoItem[]; onUpload: (files: FileList | null) => void; onRemove: (id: string) => void }) {
  const carouselPhotos = photos.length > 1 ? [...photos, ...photos] : photos;
  const full = photos.length >= maxPhotoCount;
  return (
    <article className="glass photo-wall">
      <div className="photo-wall-head">
        <div><strong>生活相册</strong><span>{photos.length}/{maxPhotoCount} · 仅当前设备可见 · 慢速播放</span></div>
        <label className={full ? "photo-action disabled" : "photo-action"} title={full ? "最多 20 张，删除后可继续上传" : "上传照片"}>
          <ImagePlus size={18} />
          <input type="file" accept="image/*" multiple disabled={full} onChange={(event) => void onUpload(event.target.files)} />
        </label>
      </div>
      {photos.length ? (
        <div className="photo-carousel" style={{ "--photo-count": Math.max(photos.length, 1) } as CSSProperties}>
          <div className={photos.length > 1 ? "photo-track" : "photo-track still"}>
            {carouselPhotos.map((photo, index) => (
              <figure key={`${photo.id}-${index}`}>
                <img src={photo.src} alt={photo.name} />
                {index < photos.length ? <button type="button" onClick={() => onRemove(photo.id)}><X size={13} /></button> : null}
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <label className="photo-empty">
          <Upload size={28} />
          <strong>放几张你们的照片</strong>
          <span>先存在当前浏览器，最多 20 张。共享相册需要后端存储。</span>
          <input type="file" accept="image/*" multiple onChange={(event) => void onUpload(event.target.files)} />
        </label>
      )}
    </article>
  );
}

function InsightColumn({ title, items, onSelect }: { title: string; items: InsightItem[]; onSelect: (item: InsightItem) => void }) {
  return <article className="glass insight-column"><h3>{title}</h3>{items.slice(0, 10).map((item) => <InsightCard key={`${title}-${item.rank}-${item.title}`} item={item} onSelect={onSelect} />)}</article>;
}

function InsightCard({ item, onSelect, compact: isCompact = false }: { item: InsightItem; onSelect: (item: InsightItem) => void; compact?: boolean }) {
  return <button type="button" className={isCompact ? "insight-card compact" : "insight-card"} onClick={() => onSelect(item)}><InsightImage item={item} /><div><span>{item.rank.toString().padStart(2, "0")} · {item.source}{item.metric ? ` · ${item.metric}` : ""}</span><h4>{item.title}</h4><p>{item.summary}</p></div></button>;
}

function InsightImage({ item }: { item: InsightItem }) {
  return <img src={item.imageUrl || makeClientPoster(item.title)} alt="" onError={(event) => { event.currentTarget.src = makeClientPoster(item.title); }} />;
}

function InsightModal({ item, onClose }: { item: InsightItem; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><article className="glass insight-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={16} /></button><InsightImage item={item} /><div className="modal-copy"><span>{item.source} · #{item.rank}{item.publishedAt ? ` · ${formatDateTime(item.publishedAt)}` : ""}</span><h2>{item.title}</h2><p>{item.detail || item.summary}</p>{item.bullets?.length ? <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div></article></div>;
}

function StockControls({ query, suggestions, symbols, onAdd, onQuery, onRemove }: { query: string; suggestions: string[]; symbols: string[]; onAdd: (symbol: string) => void; onQuery: (query: string) => void; onRemove: (symbol: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onAdd(query); }
  return <div className="glass stock-controls"><form onSubmit={submit}><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索或输入股票代码" /><button type="submit"><Plus size={16} /></button></form><div>{suggestions.map((symbol) => <button type="button" key={symbol} onClick={() => onAdd(symbol)}>{symbol}</button>)}</div><div>{symbols.map((symbol) => <button type="button" key={symbol} onClick={() => onRemove(symbol)}>{symbol}<X size={12} /></button>)}</div></div>;
}

function StockCard({ stock }: { stock: StockReport }) {
  const up = (stock.changePercent ?? 0) >= 0;
  return <article className="glass stock-card"><div><span>{stock.symbol}</span><b>{stock.name}</b><em className={up ? "up" : "down"}>{up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{stock.changePercent ?? "--"}%</em></div><strong>{stock.price === null ? "--" : `$${money.format(stock.price)}`}</strong><MiniChart points={stock.chart} positive={up} /><dl><div><dt>开盘</dt><dd>{formatValue(stock.open)}</dd></div><div><dt>高/低</dt><dd>{formatValue(stock.high)} / {formatValue(stock.low)}</dd></div><div><dt>成交量</dt><dd>{formatCompact(stock.volume)}</dd></div><div><dt>市值</dt><dd>{formatCompact(stock.marketCap)}</dd></div><div><dt>52周</dt><dd>{formatValue(stock.fiftyTwoWeekLow)} / {formatValue(stock.fiftyTwoWeekHigh)}</dd></div><div><dt>来源</dt><dd>{stock.source}</dd></div></dl></article>;
}

function MarketPulseView({ pulse }: { pulse: MarketPulse }) {
  return <section className="market-grid">{pulse.markets.map((market) => <article className="glass market-panel" key={market.market}><h3>{market.market}</h3><MarketList title="涨幅" rows={market.gainers} /><MarketList title="跌幅" rows={market.losers} /></article>)}<article className="glass market-panel"><h3>板块</h3><MarketList title="领涨" rows={pulse.sectors.gainers} /><MarketList title="领跌" rows={pulse.sectors.losers} /></article></section>;
}

function MarketList({ title, rows }: { title: string; rows: MarketRow[] }) {
  return <div className="market-list"><b>{title}</b>{rows.slice(0, 10).map((row) => <p key={`${title}-${row.code}-${row.rank}`}><span>{row.rank}. {row.name}</span><em>{row.changePercent}%</em></p>)}</div>;
}

function RepoCard({ repo, index }: { repo: TrendingRepo; index: number }) {
  return <article className="glass repo-card"><span>{index}</span><div><h3>{repo.fullName}</h3><p>{repo.summary}</p><small>{repo.language ?? "Mixed"} · {compact.format(repo.stars)} stars</small></div></article>;
}

function HoroscopeCard({ report }: { report: HoroscopeReport }) {
  return <article className="glass horoscope-card"><h3>{report.owner} · {report.sign}</h3>{report.days.map((day, index) => <p key={day.date}><b>{index === 0 ? "今天" : day.date.slice(5)}</b>{day.mood} / {day.focus} · {day.summary}</p>)}</article>;
}

function MiniChart({ points, positive }: { points: Point[]; positive: boolean }) {
  const path = getChartPath(points); const fill = getChartFillPath(points);
  return <div className="mini-chart">{points.length >= 2 ? <svg viewBox="0 0 240 100"><path className={positive ? "fill up" : "fill down"} d={fill} /><path className={positive ? "line up" : "line down"} d={path} /></svg> : <span>走势待更新</span>}</div>;
}

function Skeleton() { return <div className="glass skeleton" />; }
function useStoredState<T>(key: string, fallback: T) { const [value, setValue] = useState<T>(() => { try { const stored = window.localStorage.getItem(key); return stored ? JSON.parse(stored) as T : fallback; } catch { return fallback; } }); useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }, [key, value]); return [value, setValue] as const; }
function readPhoto(file: File): Promise<PhotoItem> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxEdge = 1440;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, name: file.name, src: canvas.toDataURL("image/jpeg", 0.78) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Photo decode failed"));
    };
    image.src = objectUrl;
  });
}
function formatValue(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? money.format(value) : "--"; }
function formatCompact(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? compact.format(value) : "--"; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function getChartPath(points: Point[]) { return points.map((point, index) => { const { x, y } = mapPoint(point.close, index, points); return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`; }).join(" "); }
function getChartFillPath(points: Point[]) { return `${getChartPath(points)} L 224 92 L 16 92 Z`; }
function mapPoint(value: number, index: number, points: Point[]) { const values = points.map((point) => point.close); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1; return { x: 16 + (index / Math.max(points.length - 1, 1)) * 208, y: 86 - ((value - min) / range) * 64 }; }
function makeClientPoster(seed: string) { const hue = Array.from(seed).reduce((acc, char) => (acc + char.charCodeAt(0) * 17) % 360, 0); const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},54%,88%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360},48%,74%)"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/><circle cx="740" cy="130" r="150" fill="rgba(255,255,255,.3)"/></svg>`; return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }

export default App;
