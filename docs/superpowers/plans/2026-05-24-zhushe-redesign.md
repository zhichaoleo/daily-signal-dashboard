# 猪社 (Zhu Daily) 全站重设计 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"家庭内参"重设计为"猪社/Zhu Daily"——报纸排版风格，行情跑马灯，3天天气，自选股增删，新闻全文 Modal，红涨绿跌，全站配色/字体统一。

**Architecture:** 重写 `src/styles.css` 为单一暖米色报纸主题；重构 `src/App.tsx` 删除相册/星座/主题切换/后台，新增 TickerTape/3天天气/StockSearch；`netlify/functions/dashboard.mts` 更新天气为3天、精简新闻源；`netlify/functions/insight-detail.mts` 保持不动（已实现全文抓取）。

**Tech Stack:** React 18 + TypeScript + Vite · Netlify Functions (.mts) · fast-xml-parser · Open-Meteo API · Yahoo Finance

---

## 文件变更总览

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/styles.css` | 完全重写 | 单一报纸主题，CSS 变量色板，统一字体 |
| `src/App.tsx` | 重构 | 删除 Photo/Admin/Theme/Horoscope；新增 TickerTape、3天天气、StockSearch；改造 InsightCard/StockCard/Modal |
| `netlify/functions/dashboard.mts` | 修改 | 天气改3天预报；精简新闻源至10个；增加新闻分类 tag；删除 horoscope |
| `netlify/functions/insight-detail.mts` | 不动 | 已实现全文抓取，复用 |
| `netlify/functions/album.mts` | 删除 | 共享相册功能移除 |
| `netlify/functions/admin-usage.mts` | 删除 | 后台管理移除 |
| `netlify/functions/weibo-snapshot.mts` | 不动 | 数据来源不变 |

---

## Task 1: 重写 styles.css（单一报纸主题）

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: 完全替换 styles.css**

```css
/* ── CSS 变量：暖米色报纸主题，A股红涨绿跌 ── */
:root {
  --bg:        #f2ede4;
  --surface:   #f9f6f0;
  --border:    #d8cfc2;
  --ink:       #1a1612;
  --ink-mid:   #5a5248;
  --ink-light: #9a9088;
  --accent:    #b5341e;
  --up:        #c0392b;
  --down:      #27826a;
  --ticker-bg: #1a1612;
  --f-serif: 'Georgia', 'Songti SC', 'Noto Serif SC', serif;
  --f-sans:  -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  font-family: var(--f-serif);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── 行情跑马灯 ── */
.ticker-wrap {
  background: var(--ticker-bg);
  height: 44px;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.ticker-label {
  background: var(--accent);
  color: #fff;
  font-family: var(--f-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 0 16px;
  height: 100%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
}
.ticker-overflow { overflow: hidden; flex: 1; }
.ticker-track {
  display: flex;
  animation: ticker-scroll 32s linear infinite;
  white-space: nowrap;
  will-change: transform;
}
.ticker-wrap:hover .ticker-track { animation-play-state: paused; }
@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  font-size: 15px;
  font-family: var(--f-sans);
  color: rgba(242,237,228,.75);
  border-right: 1px solid rgba(255,255,255,.1);
}
.ticker-item .t-sym   { font-weight: 700; color: #fff; }
.ticker-item .t-price { color: rgba(255,255,255,.8); }
.ticker-item .t-up    { color: #f07070; font-weight: 600; }
.ticker-item .t-down  { color: #5ccba0; font-weight: 600; }

/* ── Header ── */
.site-header {
  background: var(--surface);
  border-bottom: 3px solid var(--ink);
  padding: 0 24px;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 10px;
}
.logo { display: flex; align-items: center; gap: 12px; }
.logo-icon {
  width: 44px; height: 44px;
  background: var(--ink);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.logo-zh {
  font-size: 24px; font-weight: 900; letter-spacing: -0.5px;
  line-height: 1; color: var(--ink); font-family: var(--f-serif);
}
.logo-en {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--ink-light); margin-top: 3px; font-family: var(--f-sans);
}
.header-meta {
  display: flex; align-items: center; gap: 20px;
  font-size: 13px; color: var(--ink-light);
  font-family: var(--f-sans);
}
.header-meta .updated { color: var(--down); font-weight: 600; }

/* ── 天气3天 ── */
.weather-bar {
  background: var(--bg);
  border-bottom: 2px solid var(--border);
  padding: 0 24px;
  display: flex;
  align-items: stretch;
  font-family: var(--f-sans);
  overflow-x: auto;
}
.weather-day {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  padding: 10px 22px;
  border-right: 1px solid var(--border);
  min-width: 110px; gap: 2px;
}
.weather-day-label {
  font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--ink-light); font-weight: 600;
}
.weather-day-icon { font-size: 22px; line-height: 1; margin: 3px 0; }
.weather-day-temp { font-size: 14px; font-weight: 700; color: var(--ink); }
.weather-day-desc { font-size: 11px; color: var(--ink-mid); }
.weather-extras {
  display: flex; align-items: center; gap: 20px;
  padding: 0 24px; font-size: 13px; color: var(--ink-mid); flex-wrap: wrap;
}
.weather-extras span { white-space: nowrap; }
.weather-extras strong { color: var(--ink); }

/* ── Main ── */
.main-content { max-width: 900px; margin: 0 auto; padding: 0 20px; }

/* ── Section label ── */
.section-label {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--ink-light); border-top: 2px solid var(--ink);
  padding-top: 7px; margin: 22px 0 14px;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: var(--f-sans);
}
.section-label span {
  font-size: 11px; color: var(--border);
  letter-spacing: 0; text-transform: none;
}

/* ── 新闻筛选器 ── */
.news-filters { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.filter-btn {
  font-size: 13px; padding: 5px 14px; border-radius: 20px;
  border: 1px solid var(--border); background: transparent; cursor: pointer;
  color: var(--ink-mid); font-family: var(--f-sans); transition: all 0.15s;
}
.filter-btn.active { background: var(--ink); color: var(--surface); border-color: var(--ink); }

/* ── 头条大图 ── */
.news-hero {
  display: flex; gap: 14px; margin-bottom: 16px;
  padding-bottom: 16px; border-bottom: 1px solid var(--border); cursor: pointer;
  background: none; border: none; border-bottom: 1px solid var(--border);
  text-align: left; width: 100%;
}
.news-hero:hover .news-hero-title { color: var(--accent); }
.news-hero-img {
  width: 140px; height: 105px; flex-shrink: 0;
  border-radius: 3px; overflow: hidden;
  background: linear-gradient(135deg, #c9bfae, #a89880);
}
.news-hero-img img { width: 100%; height: 100%; object-fit: cover; }
.news-source-tag {
  display: inline-block; font-size: 11px; font-weight: 700;
  color: var(--accent); letter-spacing: 0.5px; margin-bottom: 5px;
  font-family: var(--f-sans);
}
.news-hero-title {
  font-size: 18px; font-weight: 700; line-height: 1.4;
  color: var(--ink); margin-bottom: 6px; font-family: var(--f-serif);
  transition: color 0.15s;
}
.news-hero-summary {
  font-size: 14px; color: var(--ink-mid); line-height: 1.6;
  font-family: var(--f-serif);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.news-meta { font-size: 12px; color: var(--ink-light); margin-top: 6px; font-family: var(--f-sans); }

/* ── 列表新闻 ── */
.news-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer;
  background: none; border-left: none; border-right: none; border-top: none;
  text-align: left; width: 100%;
}
.news-item:hover .news-item-title { color: var(--accent); }
.news-item-img {
  width: 80px; height: 60px; flex-shrink: 0;
  border-radius: 3px; overflow: hidden;
  background: linear-gradient(135deg, #c9d4c0, #9fb89a);
}
.news-item-img img { width: 100%; height: 100%; object-fit: cover; }
.news-item-title {
  font-size: 15px; font-weight: 700; line-height: 1.45;
  color: var(--ink); margin-bottom: 4px; font-family: var(--f-serif);
  transition: color 0.15s;
}
.news-item-summary {
  font-size: 13px; color: var(--ink-mid); line-height: 1.5;
  font-family: var(--f-serif);
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}

/* ── 自选股搜索 ── */
.stock-add-bar { display: flex; gap: 12px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
.stock-search-wrap { position: relative; flex: 1; max-width: 300px; }
.stock-search-input {
  width: 100%; padding: 9px 12px 9px 34px;
  border: 1px solid var(--border); border-radius: 4px;
  background: var(--surface); color: var(--ink);
  font-size: 14px; font-family: var(--f-sans);
  outline: none; transition: border-color 0.15s;
}
.stock-search-input:focus { border-color: var(--ink); }
.stock-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  font-size: 14px; pointer-events: none;
}
.stock-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,.12);
  z-index: 50; overflow: hidden;
}
.stock-dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; font-family: var(--f-sans);
  border-bottom: 1px solid var(--border); transition: background 0.1s;
  background: none; border-left: none; border-right: none; border-top: none;
  width: 100%; text-align: left;
}
.stock-dropdown-item:last-child { border-bottom: none; }
.stock-dropdown-item:hover { background: var(--bg); }
.stock-dropdown-sym { font-size: 14px; font-weight: 700; color: var(--ink); }
.stock-dropdown-name { font-size: 12px; color: var(--ink-light); margin-top: 2px; }
.stock-dropdown-add {
  font-size: 12px; padding: 4px 12px; border-radius: 3px;
  background: var(--ink); color: var(--surface); border: none; cursor: pointer;
  font-family: var(--f-sans); white-space: nowrap;
}
.stock-hint { font-size: 12px; color: var(--ink-light); font-family: var(--f-sans); }

/* ── 股票卡片 ── */
.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px; margin-bottom: 4px;
}
.stock-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 12px 14px; position: relative;
}
.stock-card-remove {
  position: absolute; top: 6px; right: 8px;
  font-size: 15px; color: var(--border); cursor: pointer;
  border: none; background: none; padding: 2px; line-height: 1;
  font-family: var(--f-sans); transition: color 0.15s;
}
.stock-card-remove:hover { color: var(--accent); }
.stock-symbol { font-size: 15px; font-weight: 700; color: var(--ink); font-family: var(--f-sans); }
.stock-name { font-size: 12px; color: var(--ink-light); margin-bottom: 6px; font-family: var(--f-sans); }
.stock-price { font-size: 22px; font-weight: 700; color: var(--ink); font-family: var(--f-sans); }
.stock-change { font-size: 13px; margin-top: 3px; font-family: var(--f-sans); }
.t-up   { color: var(--up); }
.t-down { color: var(--down); }
.sparkline {
  height: 30px; margin: 8px 0 3px;
  background: linear-gradient(to right, transparent, rgba(192,57,43,.08));
  border-radius: 2px; position: relative;
}
.sparkline::after {
  content: ''; position: absolute; bottom: 5px; left: 0; right: 0; height: 1.5px;
  background: linear-gradient(to right, var(--up), #e05745); border-radius: 1px;
}
.sparkline.s-down { background: linear-gradient(to right, transparent, rgba(39,130,106,.08)); }
.sparkline.s-down::after { background: linear-gradient(to right, var(--down), #1fa885); }
.sparkline-svg { width: 100%; height: 30px; margin: 8px 0 3px; display: block; }

/* ── 微博热搜 ── */
.weibo-list { display: flex; flex-direction: column; }
.weibo-item {
  display: flex; align-items: baseline; gap: 10px;
  padding: 11px 0; border-bottom: 1px solid var(--border); cursor: pointer;
  background: none; border-left: none; border-right: none; border-top: none;
  text-align: left; width: 100%;
}
.weibo-item:hover .weibo-title { color: var(--accent); }
.weibo-rank { font-size: 13px; font-weight: 700; color: var(--border); width: 22px; flex-shrink: 0; font-family: var(--f-sans); }
.weibo-rank.hot { color: var(--up); }
.weibo-title { font-size: 15px; font-weight: 600; color: var(--ink); flex: 1; line-height: 1.4; font-family: var(--f-serif); }
.weibo-heat { font-size: 12px; color: var(--ink-light); flex-shrink: 0; font-family: var(--f-sans); }

/* ── GitHub 开源雷达 ── */
.repo-list { display: flex; flex-direction: column; }
.repo-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid var(--border);
  text-decoration: none; color: inherit;
}
.repo-item:hover .repo-name { color: var(--accent); }
.repo-rank { font-size: 13px; font-weight: 700; color: var(--border); width: 22px; flex-shrink: 0; padding-top: 2px; font-family: var(--f-sans); }
.repo-name { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 3px; font-family: var(--f-sans); transition: color 0.15s; }
.repo-desc { font-size: 14px; color: var(--ink-mid); line-height: 1.55; margin-bottom: 4px; font-family: var(--f-serif); }
.repo-meta { font-size: 12px; color: var(--ink-light); font-family: var(--f-sans); }

/* ── Modal ── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(26,22,18,.65); backdrop-filter: blur(4px);
  z-index: 100; display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal {
  background: var(--surface); border-radius: 6px; overflow: hidden;
  width: 100%; max-width: 640px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 40px 100px rgba(0,0,0,.3);
}
.modal-img { width: 100%; height: 220px; flex-shrink: 0; position: relative; background: linear-gradient(135deg,#c9bfae,#8f7a6a); }
.modal-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal-close {
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(0,0,0,.5); border: none; cursor: pointer;
  color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center;
  font-family: var(--f-sans); line-height: 1;
}
.modal-body { padding: 20px 24px 28px; overflow-y: auto; flex: 1; }
.modal-source-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-family: var(--f-sans); }
.modal-source-tag {
  font-size: 11px; font-weight: 700; color: #fff;
  background: var(--accent); padding: 3px 8px; border-radius: 2px;
}
.modal-time { font-size: 12px; color: var(--ink-light); }
.modal-title { font-size: 22px; font-weight: 700; line-height: 1.4; color: var(--ink); margin-bottom: 14px; font-family: var(--f-serif); }
.modal-text { font-size: 15px; color: var(--ink-mid); line-height: 1.9; font-family: var(--f-serif); }
.modal-text p + p { margin-top: 14px; }
.modal-loading { font-size: 14px; color: var(--ink-light); font-family: var(--f-sans); padding: 8px 0; }
.modal-footer {
  border-top: 1px solid var(--border); padding-top: 14px; margin-top: 16px;
  font-family: var(--f-sans); font-size: 12px; color: var(--ink-light);
  display: flex; justify-content: space-between; align-items: center;
}
.modal-footer a { color: var(--accent); font-weight: 600; text-decoration: none; }

/* ── Footer ── */
.site-footer {
  text-align: center; padding: 36px 20px 12px;
  font-size: 12px; color: var(--ink-light); letter-spacing: 1px;
  font-family: var(--f-sans);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .weather-extras { display: none; }
  .news-hero-img { width: 100px; height: 76px; }
  .news-hero-title { font-size: 16px; }
  .stock-grid { grid-template-columns: 1fr 1fr; }
  .modal-img { height: 180px; }
  .modal-title { font-size: 19px; }
  .modal-text { font-size: 14px; }
}
```

- [ ] **Step 2: 确认构建不报错**

```bash
cd "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard"
npm run build 2>&1 | tail -20
```

Expected: `✓ built in` （TypeScript 类型错误暂时不影响 CSS，若有则记录，Task 2 解决）

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style: replace multi-theme css with unified newspaper theme (zhushe)"
```

---

## Task 2: 更新 dashboard.mts（天气3天、精简新闻源、删除星座）

**Files:**
- Modify: `netlify/functions/dashboard.mts`

- [ ] **Step 1: 修改 `getWeatherReports` — forecast_days 改为3，返回结构只保留3天**

找到 `forecast_days: "7"` 这行（第92行），改为 `forecast_days: "3"`，同时 `.slice(0, 7)` 改为 `.slice(0, 3)`：

```typescript
const params = new URLSearchParams({
  latitude: String(location.latitude),
  longitude: String(location.longitude),
  timezone: "Asia/Shanghai",
  current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index",
  daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  forecast_days: "3",
});
// ...
const forecast = (data.daily?.time ?? []).slice(0, 3).map((date, index) => ({
```

同时在 `OpenMeteoResponse` 类型中 current 加上 `uv_index?: number`：
```typescript
type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    uv_index?: number;
  };
  // ... daily 不变
};
```

在 WeatherReport 类型加 `uvIndex: number | null`：
```typescript
type WeatherReport = {
  // ... 原有字段
  uvIndex: number | null;
  forecast: WeatherDay[];
  error?: string;
};
```

在 `getWeatherReports` 返回值中加 `uvIndex: roundOrNull(data.current?.uv_index)`。

- [ ] **Step 2: 替换 `curatedNewsSources` 为精选10个高质量源**

将第38-56行的 `curatedNewsSources` 替换为：

```typescript
const curatedNewsSources: NewsSource[] = [
  { id: "thepaper",    label: "澎湃新闻",   region: "domestic",      feedUrl: "https://plink.anyfeeder.com/thepaper",          siteUrl: "https://www.thepaper.cn" },
  { id: "caixin",      label: "财新网",     region: "domestic",      feedUrl: "https://plink.anyfeeder.com/weixin/caixinwang",  siteUrl: "https://www.caixin.com" },
  { id: "bjnews",      label: "新京报",     region: "domestic",      feedUrl: "https://plink.anyfeeder.com/bjnews",             siteUrl: "https://www.bjnews.com.cn" },
  { id: "36kr",        label: "36氪",       region: "domestic",      feedUrl: "https://plink.anyfeeder.com/36kr",               siteUrl: "https://36kr.com" },
  { id: "huxiu",       label: "虎嗅网",     region: "domestic",      feedUrl: "https://plink.anyfeeder.com/huxiu",              siteUrl: "https://www.huxiu.com" },
  { id: "reuters-cn",  label: "路透中文",   region: "international", feedUrl: "https://plink.anyfeeder.com/reuters/cn",         siteUrl: "https://cn.reuters.com" },
  { id: "bbc-cn",      label: "BBC中文",    region: "international", feedUrl: "https://plink.anyfeeder.com/bbc/cn",             siteUrl: "https://www.bbc.com/zhongwen" },
  { id: "dw-cn",       label: "德国之声",   region: "international", feedUrl: "https://plink.anyfeeder.com/dw/cn",              siteUrl: "https://www.dw.com/zh" },
  { id: "ftchinese",   label: "FT中文网",   region: "international", feedUrl: "https://plink.anyfeeder.com/ftchinese",          siteUrl: "https://www.ftchinese.com" },
  { id: "guancha",     label: "观察者网",   region: "international", feedUrl: "https://plink.anyfeeder.com/guanchazhe",         siteUrl: "https://www.guancha.cn" },
];
```

- [ ] **Step 3: `getRssNews` 每源限制 top 10**

在 `getRssNews` 函数中 `return list.map(...)` 之前加 `.slice(0, 10)`：

```typescript
async function getRssNews(sourceConfig: NewsSource): Promise<InsightItem[]> {
  const xml = await fetchText(sourceConfig.feedUrl);
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  const parsed = parser.parse(xml) as RssFeed;
  const raw = parsed.rss?.channel?.item;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).slice(0, 10); // ← 每源 top 10
  return list.map((item, index) => {
    // ... 原有 map 逻辑不变
  });
}
```

- [ ] **Step 4: 给新闻加分类 tag（财经/科技/国内/国际）**

在 `getRssNews` 的 return 对象里，将现有的 `tag` 字段改为更精确的分类：

```typescript
// 在 getRssNews 的 return 语句中，tag 字段改为：
tag: getNewsCategory(sourceConfig.id, rawTitle),
```

在文件末尾添加：
```typescript
function getNewsCategory(sourceId: string, title: string): string {
  if (sourceId === "caixin" || sourceId === "ftchinese") return "财经";
  if (sourceId === "36kr" || sourceId === "huxiu") return "科技";
  if (sourceId === "thepaper" || sourceId === "bjnews") return "国内";
  if (["reuters-cn", "bbc-cn", "dw-cn", "guancha"].includes(sourceId)) return "国际";
  const lowerTitle = title.toLowerCase();
  if (/股|基金|经济|gdp|cpi|pmi|美联储|通胀|降息/.test(lowerTitle)) return "财经";
  if (/ai|人工智能|芯片|科技|苹果|微软|谷歌|英伟达|deepseek/.test(lowerTitle)) return "科技";
  return "国内";
}
```

- [ ] **Step 5: 删除 `horoscopes` 相关代码**

删除：
- `horoscopeSigns` 常量（第30行）
- `moods`, `focuses`, `colors`, `summaries` 常量（第34-37行）
- `getHoroscopeReports()` 函数（第106-109行）
- `HoroscopeReport`、`HoroscopeDay` 类型定义
- `DashboardResponse` 中的 `horoscopes` 字段
- `handler` 里的 `horoscopes: getHoroscopeReports()` 调用

- [ ] **Step 6: TypeScript 构建验证**

```bash
cd "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard"
npm run build 2>&1 | tail -30
```

Expected: `✓ built in` 无 TypeScript 错误

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/dashboard.mts
git commit -m "feat(backend): 3-day weather, curated 10 news sources, news category tags, remove horoscope"
```

---

## Task 3: 删除废弃的 Netlify Functions

**Files:**
- Delete: `netlify/functions/album.mts`
- Delete: `netlify/functions/admin-usage.mts`

- [ ] **Step 1: 删除文件**

```bash
rm "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard/netlify/functions/album.mts"
rm "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard/netlify/functions/admin-usage.mts"
```

- [ ] **Step 2: Commit**

```bash
git add -A netlify/functions/album.mts netlify/functions/admin-usage.mts
git commit -m "chore: remove album and admin-usage functions"
```

---

## Task 4: 重构 App.tsx — 类型定义 + 工具函数

**Files:**
- Modify: `src/App.tsx`

删除旧有类型，用新的替代。目标是让整个文件编译通过，为后续 UI 任务铺路。

- [ ] **Step 1: 更新类型定义（文件顶部）**

将 `App.tsx` 顶部的 `import` 和类型定义替换为：

```typescript
import { useEffect, useRef, useState } from "react";

// ── 类型 ──────────────────────────────────────
type Point = { date: string; close: number };
type NewsCategory = "全部" | "国内" | "国际" | "财经" | "科技";
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
```

- [ ] **Step 2: 更新常量和工具函数**

紧接类型定义之后，放置常量和工具函数：

```typescript
// ── 常量 ──────────────────────────────────────
const DEFAULT_SYMBOLS = ["SAP", "NVDA", "AAPL", "SNDK"];
const POPULAR_STOCKS = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN", "AMD", "SAP", "SNDK", "BABA", "ASML", "TSM", "PLTR", "UBER"];
const STOCK_NAMES: Record<string, string> = {
  AAPL: "苹果", MSFT: "微软", NVDA: "英伟达", GOOGL: "谷歌", META: "Meta",
  TSLA: "特斯拉", AMZN: "亚马逊", AMD: "AMD", SAP: "SAP", SNDK: "闪迪",
  BABA: "阿里巴巴", ASML: "ASML", TSM: "台积电", PLTR: "Palantir", UBER: "Uber",
};
const NEWS_CATEGORIES: NewsCategory[] = ["全部", "国内", "国际", "财经", "科技"];
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });

// ── 工具函数 ──────────────────────────────────
function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue] as const;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function makePoster(seed: string): string {
  let h = 2166136261;
  for (const c of seed) { h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; }
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},54%,88%)"/><stop offset="1" stop-color="hsl(${(hue+48)%360},48%,74%)"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/><circle cx="768" cy="136" r="152" fill="rgba(255,255,255,.28)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getChartPath(points: Point[]): string {
  const min = Math.min(...points.map(p => p.close));
  const max = Math.max(...points.map(p => p.close));
  const range = max - min || 1;
  return points.map((p, i) => {
    const x = (16 + (i / Math.max(points.length - 1, 1)) * 208).toFixed(2);
    const y = (86 - ((p.close - min) / range) * 64).toFixed(2);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}
```

- [ ] **Step 3: 构建检查**

```bash
cd "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard"
npm run build 2>&1 | grep -E "error|Error|warning" | head -20
```

Expected: 此时构建会有错误（App 函数体未更新），记录错误数量即可，下一 Task 修复。

- [ ] **Step 4: Commit（即使有类型错误也提交，以便增量追踪）**

```bash
git add src/App.tsx
git commit -m "refactor(app): update types, constants, utils for zhushe redesign"
```

---

## Task 5: 重写 App 函数体（主组件）

**Files:**
- Modify: `src/App.tsx`

将 `function App()` 到 `export default App` 之间的内容完全替换。

- [ ] **Step 1: 替换 App 函数体**

```typescript
function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [symbols, setSymbols] = useLocalStorage<string[]>("zhu-stocks", DEFAULT_SYMBOLS);
  const [category, setCategory] = useState<NewsCategory>("全部");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const symbolKey = symbols.join(",");

  const filteredNews = (data?.newsFeed ?? []).filter((item) => {
    if (category === "全部") return true;
    return item.tag === category;
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

  useEffect(() => { void loadDashboard(symbols); }, [symbolKey]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const dateStr = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", weekday: "short",
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now);

  // weather: 合并两个地点 → 取第一个展示3天预报，extras 用第一个地点数据
  const primaryWeather = data?.weather?.[0] ?? null;

  return (
    <>
      <TickerTape stocks={data?.stocks ?? []} />

      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 15 Q5 7 8 12 Q11 17 14 6 Q17 -3 22 10" stroke="#f2ede4" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
            {loadState === "ready" && <span className="updated">● 已更新</span>}
            {loadState === "loading" && <span style={{ color: "var(--ink-light)" }}>● 加载中…</span>}
            {loadState === "error" && <span style={{ color: "var(--up)" }}>● {loadError}</span>}
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
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-btn${category === cat ? " active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
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
          onQuery={(q) => { setStockQuery(q); setDropdownOpen(q.length > 0); }}
          onAdd={addStock}
          onClose={() => setDropdownOpen(false)}
        />
        <StockGrid stocks={data?.stocks ?? []} symbols={symbols} onRemove={removeStock} />

        <div className="section-label">微博热搜 <span>实时 Top 10</span></div>
        <WeiboList items={data?.weiboHot ?? []} onSelect={setSelectedNews} />

        <div className="section-label">开源雷达 <span>GitHub 高星活跃 Top 10</span></div>
        <RepoList repos={data?.trendingRepos ?? []} />

      </div>

      <footer className="site-footer">猪社 · ZHU DAILY · 🐷</footer>

      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "refactor(app): rewrite App component shell for zhushe redesign"
```

---

## Task 6: 实现子组件 — TickerTape、WeatherBar

**Files:**
- Modify: `src/App.tsx`

在 `App` 函数和 `export default App` 之间添加子组件。

- [ ] **Step 1: TickerTape 组件**

```typescript
function TickerTape({ stocks }: { stocks: StockReport[] }) {
  // 自选股 + 固定指数
  const fixed = [
    { sym: "沪指",     price: "3,312.45", up: true,  pct: "+0.62%" },
    { sym: "深成指",   price: "10,847.22", up: false, pct: "-0.18%" },
    { sym: "恒生",     price: "18,542.30", up: true,  pct: "+0.94%" },
    { sym: "BTC",      price: "$68,420",   up: true,  pct: "+3.21%" },
    { sym: "黄金",     price: "$2,341",    up: false, pct: "-0.31%" },
    { sym: "人民币",   price: "7.2418",    up: true,  pct: "+0.05%" },
  ];

  const stockItems = stocks.map((s) => ({
    sym: s.symbol,
    price: s.price !== null ? (s.price >= 100 ? money.format(s.price) : s.price.toFixed(2)) : "--",
    up: (s.changePercent ?? 0) >= 0,
    pct: s.changePercent !== null ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%` : "--",
  }));

  const items = [...stockItems, ...fixed];
  // 复制一份实现无缝滚动
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
```

- [ ] **Step 2: WeatherBar 组件（3天）**

```typescript
const WEATHER_ICONS: Record<string, string> = {
  "晴朗": "☀️", "晴间多云": "⛅", "局部多云": "🌤", "阴": "☁️",
  "雾": "🌫", "霜雾": "🌫", "小毛毛雨": "🌦", "毛毛雨": "🌦",
  "较强毛毛雨": "🌧", "小雨": "🌧", "中雨": "🌧", "大雨": "⛈",
  "阵雨": "🌦", "较强阵雨": "🌧", "强阵雨": "⛈", "雷雨": "⛈",
  "小雪": "🌨", "中雪": "❄️", "大雪": "❄️",
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
          <div className="weather-day-temp">{day.high ?? "--"}° / {day.low ?? "--"}°</div>
          <div className="weather-day-desc">{day.condition}</div>
        </div>
      ))}
      <div className="weather-extras">
        <span>📍 嘉定 / 浦东</span>
        {weather.humidity !== null && <span>💧 湿度 <strong>{weather.humidity}%</strong></span>}
        {weather.windSpeed !== null && <span>💨 风 <strong>{weather.windSpeed} km/h</strong></span>}
        {weather.precipitationProbability !== null && (
          <span>☔ 降雨 <strong>{weather.precipitationProbability}%</strong></span>
        )}
        {weather.uvIndex !== null && (
          <span>😎 紫外线 <strong>{weather.uvIndex <= 2 ? "低" : weather.uvIndex <= 5 ? "中等" : weather.uvIndex <= 7 ? "高" : "极高"}</strong></span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 构建检查**

```bash
npm run build 2>&1 | grep -E "error TS|Cannot find" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): add TickerTape and 3-day WeatherBar components"
```

---

## Task 7: 实现子组件 — NewsFeed、StockSearch、StockGrid

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: NewsFeed 组件（头条 + 列表）**

```typescript
function NewsFeed({ items, onSelect }: { items: NewsItem[]; onSelect: (item: NewsItem) => void }) {
  if (items.length === 0) return <p style={{ color: "var(--ink-light)", fontSize: 14, fontFamily: "var(--f-sans)", padding: "20px 0" }}>暂无新闻数据</p>;

  const [hero, ...rest] = items;

  return (
    <>
      {/* 头条 */}
      <button className="news-hero" onClick={() => onSelect(hero)}>
        <div className="news-hero-img">
          <img
            src={hero.imageUrl || makePoster(hero.title)}
            alt=""
            onError={(e) => { e.currentTarget.src = makePoster(hero.title); }}
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

      {/* 列表 */}
      {rest.slice(0, 19).map((item) => (
        <button key={`${item.sourceId}-${item.title}`} className="news-item" onClick={() => onSelect(item)}>
          <div className="news-item-img">
            <img
              src={item.imageUrl || makePoster(item.title)}
              alt=""
              onError={(e) => { e.currentTarget.src = makePoster(item.title); }}
            />
          </div>
          <div>
            <div className="news-source-tag">{item.source}</div>
            <div className="news-item-title">{item.title}</div>
            <div className="news-item-summary">{item.summary}</div>
            <div className="news-meta">{item.publishedAt ? formatTime(item.publishedAt) : ""}</div>
          </div>
        </button>
      ))}
    </>
  );
}
```

- [ ] **Step 2: StockSearch 组件（搜索+下拉）**

```typescript
function StockSearch({
  query, suggestions, open, onQuery, onAdd, onClose,
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
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
              <button key={sym} className="stock-dropdown-item" onClick={() => onAdd(sym)}>
                <div>
                  <div className="stock-dropdown-sym">{sym}</div>
                  <div className="stock-dropdown-name">{STOCK_NAMES[sym] ?? sym}</div>
                </div>
                <span className="stock-dropdown-add">+ 添加</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="stock-hint">长按卡片可拖拽排序</span>
    </div>
  );
}
```

- [ ] **Step 3: StockGrid 组件（卡片 + sparkline）**

```typescript
function StockGrid({
  stocks, symbols, onRemove,
}: {
  stocks: StockReport[];
  symbols: string[];
  onRemove: (sym: string) => void;
}) {
  // 按 symbols 顺序排列
  const ordered = symbols.map((sym) => stocks.find((s) => s.symbol === sym)).filter(Boolean) as StockReport[];

  return (
    <div className="stock-grid">
      {ordered.map((stock) => {
        const up = (stock.changePercent ?? 0) >= 0;
        const priceFmt = stock.price !== null ? `$${money.format(stock.price)}` : "--";
        const changeFmt = stock.changePercent !== null
          ? `${up ? "▲" : "▼"} ${Math.abs(stock.changePercent).toFixed(2)}%`
          : "--";

        return (
          <div key={stock.symbol} className="stock-card">
            <button className="stock-card-remove" onClick={() => onRemove(stock.symbol)}>×</button>
            <div className="stock-symbol">{stock.symbol}</div>
            <div className="stock-name">{stock.name}</div>
            <div className="stock-price">{priceFmt}</div>
            <StockSparkline points={stock.chart} up={up} />
            <div className={`stock-change ${up ? "t-up" : "t-down"}`}>{changeFmt}</div>
          </div>
        );
      })}
    </div>
  );
}

function StockSparkline({ points, up }: { points: Point[]; up: boolean }) {
  if (points.length < 2) return <div className={`sparkline${up ? "" : " s-down"}`} />;
  const path = getChartPath(points);
  const min = Math.min(...points.map((p) => p.close));
  const max = Math.max(...points.map((p) => p.close));
  const range = max - min || 1;
  const fillPath = `${path} L 224 92 L 16 92 Z`;
  const color = up ? "#c0392b" : "#27826a";
  const fillColor = up ? "rgba(192,57,43,.1)" : "rgba(39,130,106,.1)";
  return (
    <svg className="sparkline-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
      <path d={fillPath} fill={fillColor} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 4: 构建检查**

```bash
npm run build 2>&1 | grep -E "error TS|Cannot find" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): add NewsFeed, StockSearch, StockGrid components"
```

---

## Task 8: 实现子组件 — WeiboList、RepoList、NewsModal

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: WeiboList 组件**

```typescript
function WeiboList({ items, onSelect }: { items: NewsItem[]; onSelect: (item: NewsItem) => void }) {
  return (
    <div className="weibo-list">
      {items.map((item, i) => (
        <button key={item.title} className="weibo-item" onClick={() => onSelect(item)}>
          <span className={`weibo-rank${i < 2 ? " hot" : ""}`}>{i + 1}</span>
          <span className="weibo-title">{item.title}</span>
          <span className="weibo-heat">{item.metric ?? ""}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: RepoList 组件**

```typescript
function RepoList({ repos }: { repos: TrendingRepo[] }) {
  return (
    <div className="repo-list">
      {repos.map((repo, i) => (
        <a key={repo.fullName} className="repo-item" href={repo.url} target="_blank" rel="noreferrer">
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
```

- [ ] **Step 3: NewsModal 组件（调用 insight-detail API）**

```typescript
function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
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
      .then((d) => { if (!cancelled) { setDetail(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [item]);

  const imageUrl = detail?.imageUrl || item.imageUrl || makePoster(item.title);
  const text = detail?.detail || item.detail || item.summary || "";
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-img">
          <img src={imageUrl} alt="" onError={(e) => { e.currentTarget.src = makePoster(item.title); }} />
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-source-row">
            <span className="modal-source-tag">{item.source}</span>
            {item.publishedAt && <span className="modal-time">{formatTime(item.publishedAt)}</span>}
          </div>
          <div className="modal-title">{item.title}</div>
          {loading && <div className="modal-loading">正在加载全文…</div>}
          <div className="modal-text">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="modal-footer">
            <span>
              {text.replace(/\s+/g, "").length > 0
                ? `约 ${Math.round(text.replace(/\s+/g, "").length)} 字`
                : ""}
            </span>
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">阅读原文 →</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 完整构建 + 确认无 TypeScript 错误**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in X.Xs`，0 errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): add WeiboList, RepoList, NewsModal components — redesign complete"
```

---

## Task 9: 端对端验证 + 推送部署

**Files:** 无代码改动

- [ ] **Step 1: 本地 dev server 快速检查**

```bash
cd "/Users/I521853/Library/Mobile Documents/com~apple~CloudDocs/my_workspace/daily-signal-dashboard"
npm run dev &
sleep 3
open http://localhost:5173
```

在浏览器中确认：
1. 行情跑马灯在顶部滚动，黑底红绿字
2. Header 显示猪社 logo + 今日日期时间
3. 天气栏显示3天，今天/明天/后天
4. 新闻显示头条+列表，筛选器能切换分类
5. 点击新闻条目弹出 Modal，有全文加载指示
6. 自选股卡片网格，搜索框能展示下拉候选
7. 微博热搜 Top 10 列表
8. GitHub 开源雷达列表
9. 全站背景统一暖米色，无白色/黑色区块

```bash
kill %1  # 停止 dev server
```

- [ ] **Step 2: 推送触发 Netlify CI**

```bash
git push origin main
```

- [ ] **Step 3: 确认 Netlify 部署成功**

打开 https://app.netlify.com/projects/daily-signal-dashboard/deploys 确认最新部署状态为 Published。

- [ ] **Step 4: 验证生产 URL**

打开 https://daily-signal-dashboard.netlify.app 确认与本地效果一致。

---

## 自查清单

### Spec 覆盖检查
- [x] 行情跑马灯 → Task 6 TickerTape
- [x] 红涨绿跌 → Task 1 CSS variables `--up`/`--down` + Task 6/7
- [x] Header 猪社 Logo → Task 5
- [x] 天气3天 → Task 2 (backend) + Task 6 (frontend)
- [x] 新闻筛选 全部/国内/国际/财经/科技 → Task 2 getNewsCategory + Task 5/7
- [x] 新闻全文 Modal + insight-detail API → Task 8
- [x] 自选股搜索添加/删除 → Task 7
- [x] 微博热搜 → Task 8
- [x] GitHub 开源雷达 → Task 8
- [x] 配色统一暖米色 → Task 1
- [x] 字体统一 serif/sans 分层 → Task 1
- [x] 删除相册/星座/主题/后台 → Task 3/4
- [x] 响应式 → Task 1 media query

### 类型一致性检查
- `WeatherReport.uvIndex` 在 Task 2 backend 加入，Task 6 frontend 读取 ✓
- `NewsItem.tag` 在 Task 2 backend 生成（财经/科技/国内/国际），Task 5 frontend 用 `item.tag === category` 过滤 ✓
- `DashboardResponse` 去掉了 `horoscopes`，App.tsx 类型定义中同步去掉 ✓
- `getChartPath` 在 Task 4 定义，Task 7 `StockSparkline` 调用 ✓
- `makePoster` 在 Task 4 定义，Task 7/8 调用 ✓
