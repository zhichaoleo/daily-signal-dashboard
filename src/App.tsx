import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CloudSun,
  Github,
  ImagePlus,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type Point = { date: string; close: number };
type WeatherReport = { id: string; district: string; condition: string; temperature: number | null; high: number | null; low: number | null; humidity: number | null; windSpeed: number | null; precipitationProbability: number | null; error?: string };
type HoroscopeDay = { date: string; summary: string; mood: string; focus: string; luckyColor: string; luckyNumber: number };
type HoroscopeReport = { sign: string; owner: string; days: HoroscopeDay[] };
type StockReport = { symbol: string; name: string; price: number | null; change: number | null; changePercent: number | null; currency: string; chart: Point[]; source: string; open?: number | null; high?: number | null; low?: number | null; volume?: number | null; marketCap?: number | null; fiftyTwoWeekHigh?: number | null; fiftyTwoWeekLow?: number | null; dayRange?: string | null; error?: string };
type InsightItem = { rank: number; title: string; source: string; summary: string; imageUrl: string; metric?: string; publishedAt?: string; tag?: string };
type SocialBlock = { platform: "小红书" | "微博" | "知乎"; status: "live" | "needs-opencli" | "fallback"; items: InsightItem[] };
type MarketRow = { rank: number; code: string; name: string; price: number | string; changePercent: number | string; change?: number | string; turnover?: number | string; marketCap?: number | string };
type MarketPulse = { markets: Array<{ market: string; gainers: MarketRow[]; losers: MarketRow[] }>; sectors: { gainers: MarketRow[]; losers: MarketRow[] } };
type TrendingRepo = { name: string; fullName: string; url: string; description: string; summary: string; stars: number; language: string | null; topics: string[]; updatedAt: string };
type DashboardResponse = { updatedAt: string; weather: WeatherReport[]; horoscopes: HoroscopeReport[]; stocks: StockReport[]; domesticNews: InsightItem[]; internationalNews: InsightItem[]; socialTrends: SocialBlock[]; marketPulse: MarketPulse; trendingRepos: TrendingRepo[]; notices: string[] };
type PhotoItem = { id: string; src: string; name: string };
type LoadState = "loading" | "ready" | "error";

const defaultSymbols = ["SAP", "NVDA", "AAPL", "SNDK"];
const popularStocks = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN", "AMD", "AVGO", "NFLX", "SAP", "SNDK", "BABA", "ASML", "TSM", "CRM", "ORCL", "PLTR", "UBER", "SHOP"];
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [stockSymbols, setStockSymbols] = useStoredState<string[]>("daily-signal-stocks", defaultSymbols);
  const [photos, setPhotos] = useStoredState<PhotoItem[]>("daily-signal-photos", []);
  const [stockQuery, setStockQuery] = useState("");
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
    const nextPhotos = await Promise.all(Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 6).map(readPhoto));
    setPhotos([...nextPhotos, ...photos].slice(0, 8));
  }

  useEffect(() => { void loadDashboard(stockSymbols); }, [symbolKey]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);

  return (
    <main className="briefing-shell">
      <section className="hero">
        <div className="hero-mark">家庭内参</div>
        <h1>老🐷Dashboard</h1>
        <p>一个给家里人看的 24h 信息集合地：时事、社媒热度、资产波动、开源项目，以及一点自己的生活。</p>
        <div className="hero-meta">
          <span><CalendarDays size={16} />{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: "short" }).format(now)}</span>
          <span>上海时间 {new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}</span>
          <button type="button" onClick={() => void loadDashboard()}><RefreshCw size={16} className={state === "loading" ? "spin" : ""} />刷新</button>
        </div>
      </section>

      <StatusBar state={state} updatedText={updatedText} error={error} notices={data?.notices ?? []} />

      <section className="top-grid">
        {data?.weather.map((weather) => <WeatherCard key={weather.id} weather={weather} />) ?? <Skeleton />}
        <PhotoWall photos={photos} onUpload={handlePhotoUpload} onRemove={(id) => setPhotos(photos.filter((photo) => photo.id !== id))} />
      </section>

      <SectionHeader icon={<Newspaper size={18} />} title="新闻内参" meta="过去 24h · 国内 / 国际 Top 10" />
      <section className="news-board">
        <InsightColumn title="国内 Top 10" items={data?.domesticNews ?? []} />
        <InsightColumn title="国际 Top 10" items={data?.internationalNews ?? []} />
      </section>

      <SectionHeader icon={<Sparkles size={18} />} title="社媒热榜" meta="小红书 / 微博 / 知乎" />
      <section className="social-grid">
        {(data?.socialTrends ?? []).map((block) => <SocialPanel key={block.platform} block={block} />)}
      </section>

      <SectionHeader icon={<TrendingUp size={18} />} title="市场雷达" meta="自选股 + A/HK/US 涨跌榜 + 板块" />
      <StockControls query={stockQuery} suggestions={suggestions} symbols={stockSymbols} onAdd={addStock} onQuery={setStockQuery} onRemove={removeStock} />
      <section className="stock-grid">{data?.stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />) ?? <Skeleton />}</section>
      {data?.marketPulse ? <MarketPulseView pulse={data.marketPulse} /> : null}

      <SectionHeader icon={<Github size={18} />} title="开源雷达" meta="GitHub 活跃高星项目 Top 20" />
      <section className="repo-list">{data?.trendingRepos.map((repo, index) => <RepoCard key={repo.fullName} repo={repo} index={index + 1} />)}</section>

      <section className="section-block horoscope-bottom">
        <details>
          <summary>星座运势 <ChevronDown size={16} /></summary>
          <div className="horoscope-grid">{data?.horoscopes.map((report) => <HoroscopeCard key={report.sign} report={report} />)}</div>
        </details>
      </section>
    </main>
  );
}

function StatusBar({ state, updatedText, error, notices }: { state: LoadState; updatedText: string; error: string | null; notices: string[] }) {
  return <section className="status-row"><span className={`status-dot ${state}`} />{state === "loading" ? "同步中" : `更新于 ${updatedText}`}{error ? <b><AlertCircle size={14} />{error}</b> : null}{notices.map((notice) => <b key={notice}><AlertCircle size={14} />{notice}</b>)}</section>;
}

function SectionHeader({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return <div className="section-header"><div>{icon}<h2>{title}</h2></div><span>{meta}</span></div>;
}

function WeatherCard({ weather }: { weather: WeatherReport }) {
  return <article className="glass weather-card"><CloudSun size={28} /><span>{weather.district}</span><strong>{weather.temperature ?? "--"}°</strong><p>{weather.condition} · {weather.low}° / {weather.high}° · 湿度 {weather.humidity}%</p></article>;
}

function PhotoWall({ photos, onUpload, onRemove }: { photos: PhotoItem[]; onUpload: (files: FileList | null) => void; onRemove: (id: string) => void }) {
  return <article className="glass photo-wall"><label className="photo-upload"><ImagePlus size={22} /><strong>生活相册</strong><span>上传你和老婆的照片</span><input type="file" accept="image/*" multiple onChange={(event) => void onUpload(event.target.files)} /></label>{photos.slice(0, 3).map((photo) => <figure key={photo.id}><img src={photo.src} alt={photo.name} /><button type="button" onClick={() => onRemove(photo.id)}><X size={13} /></button></figure>)}<Upload className="ghost-icon" size={76} /></article>;
}

function InsightColumn({ title, items }: { title: string; items: InsightItem[] }) {
  return <article className="glass insight-column"><h3>{title}</h3>{items.slice(0, 10).map((item) => <InsightCard key={`${title}-${item.rank}-${item.title}`} item={item} />)}</article>;
}

function InsightCard({ item }: { item: InsightItem }) {
  return <div className="insight-card"><img src={item.imageUrl} alt="" /><div><span>{item.rank.toString().padStart(2, "0")} · {item.source}{item.metric ? ` · ${item.metric}` : ""}</span><h4>{item.title}</h4><p>{item.summary}</p></div></div>;
}

function SocialPanel({ block }: { block: SocialBlock }) {
  return <article className="glass social-panel"><h3>{block.platform}<span>{block.status === "live" ? "Live" : "OpenCLI"}</span></h3>{block.items.slice(0, 10).map((item) => <InsightCard key={`${block.platform}-${item.rank}`} item={item} />)}</article>;
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
  return <div className="market-list"><b>{title}</b>{rows.slice(0, 5).map((row) => <p key={`${title}-${row.code}`}><span>{row.name}</span><em>{row.changePercent}%</em></p>)}</div>;
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
function readPhoto(file: File): Promise<PhotoItem> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, name: file.name, src: String(reader.result) }); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
function formatValue(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? money.format(value) : "--"; }
function formatCompact(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? compact.format(value) : "--"; }
function getChartPath(points: Point[]) { return points.map((point, index) => { const { x, y } = mapPoint(point.close, index, points); return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`; }).join(" "); }
function getChartFillPath(points: Point[]) { return `${getChartPath(points)} L 224 92 L 16 92 Z`; }
function mapPoint(value: number, index: number, points: Point[]) { const values = points.map((point) => point.close); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1; return { x: 16 + (index / Math.max(points.length - 1, 1)) * 208, y: 86 - ((value - min) / range) * 64 }; }

export default App;
