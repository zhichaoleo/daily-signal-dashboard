import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CloudSun,
  ExternalLink,
  Filter,
  Gauge,
  Github,
  ImagePlus,
  LoaderCircle,
  Newspaper,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Upload,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

type Point = { date: string; close: number };
type NewsRegion = "domestic" | "international";
type WeatherDay = { date: string; condition: string; high: number | null; low: number | null; precipitationProbability: number | null };
type WeatherReport = { id: string; district: string; condition: string; temperature: number | null; high: number | null; low: number | null; humidity: number | null; windSpeed: number | null; precipitationProbability: number | null; forecast: WeatherDay[]; error?: string };
type HoroscopeDay = { date: string; summary: string; mood: string; focus: string; luckyColor: string; luckyNumber: number };
type HoroscopeReport = { sign: string; owner: string; days: HoroscopeDay[] };
type StockReport = { symbol: string; name: string; price: number | null; change: number | null; changePercent: number | null; currency: string; chart: Point[]; source: string; open?: number | null; high?: number | null; low?: number | null; volume?: number | null; marketCap?: number | null; fiftyTwoWeekHigh?: number | null; fiftyTwoWeekLow?: number | null; dayRange?: string | null; error?: string };
type RelatedPost = { author: string; title: string; time?: string; url?: string };
type InsightItem = { rank: number; title: string; source: string; summary: string; imageUrl: string; metric?: string; publishedAt?: string; tag?: string; detail?: string; bullets?: string[]; sourceUrl?: string; relatedPosts?: RelatedPost[]; sourceId?: string; region?: NewsRegion; siteUrl?: string };
type NewsSource = { id: string; label: string; region: NewsRegion; feedUrl: string; siteUrl: string };
type TrendingRepo = { name: string; fullName: string; url: string; description: string; summary: string; stars: number; language: string | null; topics: string[]; updatedAt: string };
type UsageMetric = { label: string; status: "live" | "missing-key" | "manual"; totalCost: number | null; currency: string; budget: number | null; progress: number | null; inputTokens?: number; outputTokens?: number; requests?: number; periodStart: string; periodEnd: string; updatedAt: string; message: string; dailyCosts: Point[] };
type DashboardResponse = { updatedAt: string; weather: WeatherReport[]; horoscopes: HoroscopeReport[]; stocks: StockReport[]; newsFeed: InsightItem[]; newsSources: NewsSource[]; weiboHot: InsightItem[]; trendingRepos: TrendingRepo[]; notices: string[] };
type SharedPhoto = { id: string; src: string; name: string; createdAt: string };
type InsightDetailResponse = { detail?: string; imageUrl?: string; bullets?: string[] };
type AdminUsageResponse = { metric?: UsageMetric; error?: string };
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
const dashboardFeedRevision = "multi-source-news-v1";

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [stockSymbols, setStockSymbols] = useStoredState<string[]>("daily-signal-stocks", defaultSymbols);
  const [theme, setTheme] = useStoredState<ThemeId>("daily-signal-theme", "atelier");
  const [stockQuery, setStockQuery] = useState("");
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [photoState, setPhotoState] = useState<LoadState>("loading");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [newsRegion, setNewsRegion] = useState<"all" | NewsRegion>("all");
  const [newsSourceId, setNewsSourceId] = useState("all");
  const [adminOpen, setAdminOpen] = useState(false);
  const symbolKey = stockSymbols.join(",");
  const updatedText = data?.updatedAt ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" }).format(new Date(data.updatedAt)) : "等待更新";
  const suggestions = popularStocks.filter((symbol) => symbol.includes(stockQuery.trim().toUpperCase()) && !stockSymbols.includes(symbol)).slice(0, 6);
  const newsSources = data?.newsSources ?? [];
  const visibleSourceOptions = newsRegion === "all" ? newsSources : newsSources.filter((source) => source.region === newsRegion);
  const filteredNews = (data?.newsFeed ?? [])
    .filter((item) => newsRegion === "all" || item.region === newsRegion)
    .filter((item) => newsSourceId === "all" || item.sourceId === newsSourceId)
    .slice(0, 40);

  async function loadDashboard(symbols = stockSymbols) {
    setState("loading");
    setError(null);
    try {
      const response = await fetch(`/api/dashboard?${new URLSearchParams({ symbols: symbols.join(","), rev: dashboardFeedRevision })}`);
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      setData((await response.json()) as DashboardResponse);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(loadError instanceof Error ? loadError.message : "Dashboard request failed");
    }
  }

  async function loadAlbum() {
    setPhotoState("loading");
    setPhotoError(null);
    try {
      const response = await fetch("/api/album");
      if (!response.ok) throw new Error(`Album API returned ${response.status}`);
      const payload = await response.json() as { photos: SharedPhoto[] };
      setPhotos(payload.photos ?? []);
      setPhotoState("ready");
    } catch (loadError) {
      setPhotoState("error");
      setPhotoError(loadError instanceof Error ? loadError.message : "Album request failed");
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
    setPhotoState("loading");
    try {
      for (const photo of nextPhotos) {
        await fetch("/api/album", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(photo),
        });
      }
      await loadAlbum();
    } catch (uploadError) {
      setPhotoState("error");
      setPhotoError(uploadError instanceof Error ? uploadError.message : "Album upload failed");
    }
  }

  async function handlePhotoRemove(id: string) {
    setPhotoState("loading");
    try {
      const response = await fetch(`/api/album?${new URLSearchParams({ id })}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Delete failed with ${response.status}`);
      await loadAlbum();
    } catch (removeError) {
      setPhotoState("error");
      setPhotoError(removeError instanceof Error ? removeError.message : "Album delete failed");
    }
  }

  useEffect(() => { void loadDashboard(stockSymbols); }, [symbolKey]);
  useEffect(() => { void loadAlbum(); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (newsSourceId !== "all" && !visibleSourceOptions.some((source) => source.id === newsSourceId)) setNewsSourceId("all");
  }, [newsRegion, newsSourceId, visibleSourceOptions]);

  return (
    <main className="briefing-shell" data-theme={theme}>
      <section className="hero">
        <div className="hero-mark">家庭内参</div>
        <div className="hero-brand">
          <img className="hero-logo" src="/zhu-dashboard-mark.svg" alt="🐷Dashboard logo" />
          <h1>🐷Dashboard</h1>
        </div>
        <p>一个给家里人看的 24h 信息集合地：中文新闻、微博热搜、自选股、开源项目，还有真正的共享生活相册。</p>
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <div className="hero-meta">
          <span><CalendarDays size={16} />{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: "short" }).format(now)}</span>
          <span>上海时间 {new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}</span>
          <button type="button" onClick={() => void Promise.all([loadDashboard(), loadAlbum()])}><RefreshCw size={16} className={state === "loading" || photoState === "loading" ? "spin" : ""} />刷新</button>
          <button type="button" className="hero-admin" onClick={() => setAdminOpen(true)}><Shield size={16} />后台</button>
        </div>
      </section>

      <StatusBar state={state} updatedText={updatedText} error={error} notices={data?.notices ?? []} />

      <SectionHeader icon={<CloudSun size={18} />} title="天气" meta="上海嘉定 / 浦东 · 今日 + 未来 7 天" />
      <section className="weather-row">{(data?.weather ?? []).map((item) => <WeatherCard key={item.id} weather={item} />)}</section>

      <SectionHeader icon={<ImagePlus size={18} />} title="共享相册" meta="Netlify Blobs · 全设备同步" />
      <PhotoWall photos={photos} state={photoState} error={photoError} onUpload={handlePhotoUpload} onRemove={handlePhotoRemove} />

      <SectionHeader icon={<Newspaper size={18} />} title="新闻内参" meta="权威来源 · 过去 24h · 按时间排序" />
      <NewsToolbar
        region={newsRegion}
        sourceId={newsSourceId}
        sources={visibleSourceOptions}
        onRegionChange={setNewsRegion}
        onSourceChange={setNewsSourceId}
      />
      <section className="source-directory">
        {newsSources.map((source) => (
          <a key={source.id} className={newsSourceId === source.id ? "glass source-card active" : "glass source-card"} href={source.siteUrl} target="_blank" rel="noreferrer">
            <div>
              <strong>{source.label}</strong>
              <span>{source.region === "domestic" ? "国内" : "国际"}</span>
            </div>
            <ExternalLink size={14} />
          </a>
        ))}
      </section>
      <section className="news-feed">
        {filteredNews.map((item, index) => <InsightCard key={`${item.sourceId}-${item.title}-${index}`} item={{ ...item, rank: index + 1 }} onSelect={setSelectedInsight} />)}
      </section>

      <SectionHeader icon={<Newspaper size={18} />} title="微博热搜" meta="话题详情里直接看最热 3 条微博" />
      <section className="weibo-strip">
        {(data?.weiboHot ?? []).map((item) => <InsightCard key={`weibo-${item.rank}-${item.title}`} item={item} onSelect={setSelectedInsight} compact />)}
      </section>

      <SectionHeader icon={<Gauge size={18} />} title="股票" meta="自选股实时概览" />
      <StockControls query={stockQuery} suggestions={suggestions} symbols={stockSymbols} onAdd={addStock} onQuery={setStockQuery} onRemove={removeStock} />
      <section className="stock-grid">{data?.stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />) ?? <Skeleton />}</section>

      <SectionHeader icon={<Github size={18} />} title="开源雷达" meta="GitHub 高星活跃项目 Top 10" />
      <section className="repo-list">{data?.trendingRepos.map((repo, index) => <RepoCard key={repo.fullName} repo={repo} index={index + 1} />)}</section>

      <section className="section-block horoscope-bottom">
        <details>
          <summary>星座运势 <ChevronDown size={16} /></summary>
          <div className="horoscope-grid">{data?.horoscopes.map((report) => <HoroscopeCard key={report.sign} report={report} />)}</div>
        </details>
      </section>

      {selectedInsight ? <InsightModal item={selectedInsight} onClose={() => setSelectedInsight(null)} /> : null}
      {adminOpen ? <AdminPanel onClose={() => setAdminOpen(false)} /> : null}
    </main>
  );
}

function ThemeSwitcher({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return <div className="theme-switcher" aria-label="主题切换"><Palette size={16} />{themeOptions.map((option) => <button type="button" key={option.id} className={value === option.id ? "active" : ""} onClick={() => onChange(option.id)}><b>{option.name}</b><span>{option.tone}</span></button>)}</div>;
}

function StatusBar({ state, updatedText, error, notices }: { state: LoadState; updatedText: string; error: string | null; notices: string[] }) {
  return <section className="status-row"><span className={`status-dot ${state}`} />{state === "loading" ? "同步中" : `更新于 ${updatedText}`}{error ? <b><AlertCircle size={14} />{error}</b> : null}{notices.map((notice) => <b key={notice}><AlertCircle size={14} />{notice}</b>)}</section>;
}

function SectionHeader({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return <div className="section-header"><div>{icon}<h2>{title}</h2></div><span>{meta}</span></div>;
}

function WeatherCard({ weather }: { weather: WeatherReport }) {
  return <article className="glass weather-card"><div className="weather-head"><CloudSun size={22} /><span>{weather.district}</span><strong>{weather.temperature ?? "--"}°</strong></div><p>{weather.condition} · 湿度 {weather.humidity ?? "--"}% · 风 {weather.windSpeed ?? "--"}km/h</p><div className="forecast-row">{weather.forecast.slice(0, 7).map((day, index) => <div key={day.date}><b>{index === 0 ? "今天" : day.date.slice(5)}</b><span>{day.condition}</span><em>{day.low ?? "--"} / {day.high ?? "--"}°</em></div>)}</div></article>;
}

function PhotoWall({ photos, state, error, onUpload, onRemove }: { photos: SharedPhoto[]; state: LoadState; error: string | null; onUpload: (files: FileList | null) => void; onRemove: (id: string) => void }) {
  const carouselPhotos = photos.length > 1 ? [...photos, ...photos] : photos;
  const full = photos.length >= maxPhotoCount;
  return (
    <article className="glass photo-wall shared">
      <div className="photo-wall-head">
        <div><strong>家庭共享相册</strong><span>{photos.length}/{maxPhotoCount} · Netlify 云端保存 · 慢速播放</span></div>
        <label className={full ? "photo-action disabled" : "photo-action"} title={full ? "最多 20 张，删除后可继续上传" : "上传照片"}>
          <ImagePlus size={18} />
          <input type="file" accept="image/*" multiple disabled={full} onChange={(event) => void onUpload(event.target.files)} />
        </label>
      </div>
      {state === "loading" ? <div className="photo-empty"><LoaderCircle className="spin" size={24} /><strong>相册同步中</strong><span>我们正在拉取共享照片</span></div> : null}
      {state === "error" ? <div className="photo-empty"><AlertCircle size={24} /><strong>相册暂时不可用</strong><span>{error || "请稍后再试"}</span></div> : null}
      {state === "ready" && photos.length ? (
        <div className="photo-carousel" style={{ "--photo-count": Math.max(photos.length, 1) } as CSSProperties}>
          <div className={photos.length > 1 ? "photo-track" : "photo-track still"}>
            {carouselPhotos.map((photo, index) => (
              <figure key={`${photo.id}-${index}`}>
                <img src={photo.src} alt={photo.name} />
                {index < photos.length ? <button type="button" onClick={() => void onRemove(photo.id)}><X size={13} /></button> : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}
      {state === "ready" && photos.length === 0 ? (
        <label className="photo-empty">
          <Upload size={28} />
          <strong>放几张你们的照片</strong>
          <span>现在是全设备共享相册了，最多 20 张</span>
          <input type="file" accept="image/*" multiple onChange={(event) => void onUpload(event.target.files)} />
        </label>
      ) : null}
    </article>
  );
}

function NewsToolbar({
  region,
  sourceId,
  sources,
  onRegionChange,
  onSourceChange,
}: {
  region: "all" | NewsRegion;
  sourceId: string;
  sources: NewsSource[];
  onRegionChange: (value: "all" | NewsRegion) => void;
  onSourceChange: (value: string) => void;
}) {
  return (
    <article className="glass news-toolbar">
      <div className="news-segmented" aria-label="新闻区域筛选">
        <button type="button" className={region === "all" ? "active" : ""} onClick={() => onRegionChange("all")}>全部</button>
        <button type="button" className={region === "domestic" ? "active" : ""} onClick={() => onRegionChange("domestic")}>国内</button>
        <button type="button" className={region === "international" ? "active" : ""} onClick={() => onRegionChange("international")}>国际</button>
      </div>
      <label className="source-select">
        <Filter size={16} />
        <select value={sourceId} onChange={(event) => onSourceChange(event.target.value)}>
          <option value="all">全部来源</option>
          {sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
        </select>
      </label>
    </article>
  );
}

function AdminPanel({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState("");
  const [budget, setBudget] = useState("");
  const [state, setState] = useState<LoadState>("ready");
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<UsageMetric | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);
    setMetric(null);
    try {
      const response = await fetch("/api/admin-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          budget: budget.trim() ? Number(budget) : null,
        }),
      });
      const payload = await response.json() as AdminUsageResponse;
      if (!response.ok || !payload.metric) throw new Error(payload.error || `Request failed with ${response.status}`);
      setMetric(payload.metric);
      setState("ready");
    } catch (submitError) {
      setState("error");
      setError(submitError instanceof Error ? submitError.message : "Usage request failed");
    }
  }

  function handleClose() {
    setToken("");
    setBudget("");
    setMetric(null);
    setError(null);
    setState("ready");
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <article className="glass admin-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={handleClose}><X size={16} /></button>
        <div className="admin-copy">
          <span><Shield size={14} />一次性用量查询</span>
          <h2>OpenAI Admin</h2>
          <p>这里不会把 token 写进本地存储、GitHub 或 Netlify 环境变量。它只在这次请求里经过一次函数内存，用完即丢。</p>
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              <b>Admin token</b>
              <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="sk-admin-..." autoComplete="off" />
            </label>
            <label>
              <b>本月预算（可选）</b>
              <input type="number" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="200" />
            </label>
            <div className="admin-actions">
              <button type="submit" disabled={!token.trim() || state === "loading"}>{state === "loading" ? <LoaderCircle size={16} className="spin" /> : <Shield size={16} />}查询现状</button>
              <button type="button" className="ghost" onClick={handleClose}>关闭</button>
            </div>
          </form>
          {error ? <div className="admin-error"><AlertCircle size={16} />{error}</div> : null}
          {metric ? <UsageResult metric={metric} /> : null}
        </div>
      </article>
    </div>
  );
}

function UsageResult({ metric }: { metric: UsageMetric }) {
  const value = metric.totalCost === null ? "--" : `$${money.format(metric.totalCost)}`;
  return (
    <article className="glass admin-result">
      <div className="admin-result-head">
        <div>
          <strong>{metric.label}</strong>
          <span>{metric.periodStart} 至 {metric.periodEnd}</span>
        </div>
        <em>{metric.status === "live" ? "Live" : metric.status}</em>
      </div>
      <div className="admin-metrics">
        <div><small>花费</small><b>{value}</b></div>
        <div><small>请求数</small><b>{metric.requests ? compact.format(metric.requests) : "--"}</b></div>
        <div><small>输入 token</small><b>{metric.inputTokens ? compact.format(metric.inputTokens) : "--"}</b></div>
        <div><small>输出 token</small><b>{metric.outputTokens ? compact.format(metric.outputTokens) : "--"}</b></div>
      </div>
      {metric.budget ? <div className="progress"><i style={{ width: `${metric.progress ?? 0}%` }} /></div> : null}
      {metric.dailyCosts.length >= 2 ? <MiniChart points={metric.dailyCosts} positive /> : null}
      <p>{metric.message}</p>
    </article>
  );
}

function InsightCard({ item, onSelect, compact: isCompact = false }: { item: InsightItem; onSelect: (item: InsightItem) => void; compact?: boolean }) {
  return <button type="button" className={isCompact ? "insight-card compact" : "insight-card"} onClick={() => onSelect(item)}>{shouldRenderInsightImage(item) ? <InsightImage item={item} /> : <div className="insight-thumb-empty"><Newspaper size={18} /></div>}<div><span>{item.source}{item.publishedAt ? ` · ${formatDateTime(item.publishedAt)}` : ""}{item.metric ? ` · ${item.metric}` : ""}</span><h4>{item.title}</h4><p>{item.summary}</p></div></button>;
}

function InsightImage({ item }: { item: InsightItem }) {
  return <img src={item.imageUrl || makeClientPoster(item.title)} alt="" onError={(event) => { event.currentTarget.src = makeClientPoster(item.title); }} />;
}

function InsightModal({ item, onClose }: { item: InsightItem; onClose: () => void }) {
  const [remoteDetail, setRemoteDetail] = useState<InsightDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!item.sourceUrl || item.source === "微博热搜") {
      setRemoteDetail(null);
      return;
    }
    const params = new URLSearchParams({ url: item.sourceUrl, title: item.title, source: item.source, imageUrl: item.imageUrl });
    setLoading(true);
    fetch(`/api/insight-detail?${params}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Detail request failed with ${response.status}`);
        return response.json() as Promise<InsightDetailResponse>;
      })
      .then((payload) => {
        if (!cancelled) setRemoteDetail(payload);
      })
      .catch(() => {
        if (!cancelled) setRemoteDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [item]);

  const imageUrl = remoteDetail?.imageUrl || item.imageUrl;
  const detailText = remoteDetail?.detail || item.detail || item.summary;
  const detailParagraphs = detailText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const bullets = remoteDetail?.bullets?.length ? remoteDetail.bullets : item.bullets;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article className="glass insight-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={16} /></button>
        {shouldRenderInsightImage({ ...item, imageUrl }) ? <img src={imageUrl} alt="" onError={(event) => { event.currentTarget.src = makeClientPoster(item.title); }} /> : null}
        <div className="modal-copy">
          <span>{item.source} · #{item.rank}{item.publishedAt ? ` · ${formatDateTime(item.publishedAt)}` : ""}</span>
          <h2>{item.title}</h2>
          {loading ? <p className="detail-loading"><LoaderCircle className="spin" size={16} /> 正在补充详情…</p> : null}
          <div className="modal-paragraphs">
            {detailParagraphs.map((paragraph, index) => <p key={`${item.title}-${index}`}>{paragraph}</p>)}
          </div>
          {item.relatedPosts?.length ? <div className="related-posts">{item.relatedPosts.slice(0, 3).map((post, index) => <article key={`${post.author}-${index}`}><b>{post.author}</b><span>{post.time || "微博"}</span><p>{post.title}</p></article>)}</div> : null}
          {bullets?.length ? <ul>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
        </div>
      </article>
    </div>
  );
}

function StockControls({ query, suggestions, symbols, onAdd, onQuery, onRemove }: { query: string; suggestions: string[]; symbols: string[]; onAdd: (symbol: string) => void; onQuery: (query: string) => void; onRemove: (symbol: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onAdd(query); }
  return <div className="glass stock-controls"><form onSubmit={submit}><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索或输入股票代码" /><button type="submit"><Plus size={16} /></button></form><div>{suggestions.map((symbol) => <button type="button" key={symbol} onClick={() => onAdd(symbol)}>{symbol}</button>)}</div><div>{symbols.map((symbol) => <button type="button" key={symbol} onClick={() => onRemove(symbol)}>{symbol}<X size={12} /></button>)}</div></div>;
}

function StockCard({ stock }: { stock: StockReport }) {
  const up = (stock.changePercent ?? 0) >= 0;
  return <article className="glass stock-card"><div><span>{stock.symbol}</span><b>{stock.name}</b><em className={up ? "up" : "down"}>{up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{stock.changePercent ?? "--"}%</em></div><strong>{stock.price === null ? "--" : `$${money.format(stock.price)}`}</strong><MiniChart points={stock.chart} positive={up} /><dl><div><dt>开盘</dt><dd>{formatValue(stock.open)}</dd></div><div><dt>高/低</dt><dd>{formatValue(stock.high)} / {formatValue(stock.low)}</dd></div><div><dt>成交量</dt><dd>{formatCompact(stock.volume)}</dd></div><div><dt>市值</dt><dd>{formatCompact(stock.marketCap)}</dd></div><div><dt>52周</dt><dd>{formatValue(stock.fiftyTwoWeekLow)} / {formatValue(stock.fiftyTwoWeekHigh)}</dd></div><div><dt>来源</dt><dd>{stock.source}</dd></div></dl></article>;
}

function RepoCard({ repo, index }: { repo: TrendingRepo; index: number }) {
  return <a className="glass repo-card repo-link" href={repo.url} target="_blank" rel="noreferrer"><span>{index}</span><div><h3>{repo.fullName}</h3><p>{repo.summary}</p><small>{repo.language ?? "Mixed"} · {compact.format(repo.stars)} stars</small></div><ExternalLink size={16} /></a>;
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
function shouldRenderInsightImage(item: Pick<InsightItem, "source" | "imageUrl" | "title">) { return !(item.source === "微博热搜" && (!item.imageUrl || item.imageUrl.startsWith("data:image/svg"))); }
function readPhoto(file: File): Promise<Pick<SharedPhoto, "name" | "src">> {
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
      resolve({ name: file.name, src: canvas.toDataURL("image/jpeg", 0.78) });
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
