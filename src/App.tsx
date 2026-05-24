import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CloudSun,
  Droplets,
  MoonStar,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Waves,
  Wind,
} from "lucide-react";
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

type DashboardResponse = {
  updatedAt: string;
  weather: WeatherReport[];
  horoscopes: HoroscopeReport[];
  stocks: StockReport[];
  notices: string[];
};

type LoadState = "loading" | "ready" | "error";

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

  async function loadDashboard() {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/dashboard");
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

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-panel glass-panel">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Daily Signal
          </div>
          <h1>今日信息流</h1>
          <p>上海时间 {shanghaiTimeFormat.format(now)}，把天气、星运和持仓波动收进一个安静的早晨。</p>
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

      <StatusBar state={state} updatedText={updatedText} error={error} notices={data?.notices ?? []} />

      <section className="dashboard-grid weather-grid" aria-label="天气">
        {state === "loading" && !data
          ? Array.from({ length: 2 }, (_, index) => <WeatherSkeleton key={index} />)
          : data?.weather.map((weather) => <WeatherCard key={weather.id} weather={weather} />)}
      </section>

      <section className="section-block" aria-label="星座运势">
        <SectionTitle icon={<MoonStar size={18} aria-hidden="true" />} title="星座运势" meta="今天 + 未来三天" />
        <div className="dashboard-grid horoscope-grid">
          {state === "loading" && !data
            ? Array.from({ length: 2 }, (_, index) => <HoroscopeSkeleton key={index} />)
            : data?.horoscopes.map((report) => <HoroscopeCard key={report.sign} report={report} />)}
        </div>
      </section>

      <section className="section-block" aria-label="股票">
        <SectionTitle icon={<TrendingUp size={18} aria-hidden="true" />} title="关注股票" meta="最新价 + 5 日走势" />
        <div className="dashboard-grid stock-grid">
          {state === "loading" && !data
            ? Array.from({ length: 4 }, (_, index) => <StockSkeleton key={index} />)
            : data?.stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />)}
        </div>
      </section>
    </main>
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

function SectionTitle({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
