# 猪社 · Zhu Daily

个人每日简报仪表板。报纸编辑风格，手机/平板/桌面自适应。

**无需本地 Claude，无需本地任何依赖** — 部署到 Netlify 后完全独立运行。

## 功能模块

| 模块 | 数据来源 | 说明 |
|---|---|---|
| 行情跑马灯 | Yahoo Finance + Finnhub | 自选股实时价格，CSS 无缝滚动 |
| 天气预报（3天） | [Open-Meteo](https://open-meteo.com/)（免费，无需 API Key） | 上海嘉定 / 浦东 |
| 今日要闻 | 10 个精选 RSS 源 | 澎湃、财新、路透、BBC中文等，点击弹窗阅读全文 |
| 自选股 | Yahoo Finance + Finnhub | 搜索添加，localStorage 持久化，含 sparkline |
| 微博热搜 | 本地快照（`scripts/sync-weibo.mjs` 定时更新） | Top 10 |
| 开源雷达 | GitHub Search API（无需 Key） | 高星活跃仓库 Top 10 |

色板：A股惯例，**红涨绿跌**（`--up: #c0392b` / `--down: #27826a`）。

设计规格详见 [`docs/superpowers/specs/2026-05-24-zhushe-redesign-design.md`](docs/superpowers/specs/2026-05-24-zhushe-redesign-design.md)。

---

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量（见下方说明）
cp .env.example .env   # 如无此文件，手动创建 .env

# 启动本地开发服务器（同时启动 Vite + Netlify Functions）
npx netlify dev
```

访问 `http://localhost:8888`。

### 仅前端调试

```bash
npm run dev     # Vite dev server，默认 http://localhost:5173
                # 注意：Functions 不会启动，API 请求会失败
```

### 类型检查

```bash
npm run typecheck
```

### 生产构建（本地验证）

```bash
npm run build   # tsc 编译 + Vite 打包，输出到 dist/
npm run preview # 预览 dist/ 目录
```

### 同步微博热搜（手动）

```bash
npm run sync:weibo   # 更新 public/weibo-snapshot.json
```

---

## 环境变量

在项目根目录创建 `.env` 文件：

```env
# 股票行情主力（可选，有则用，无则降级到 Yahoo Finance）
FINNHUB_API_KEY=your_key_here

# 备用行情源（可选）
ALPHA_VANTAGE_API_KEY=your_key_here
```

**无需配置即可运行的数据源**（服务端直接调用，无需 Key）：
- Open-Meteo 天气（免费开放）
- Yahoo Finance 股票行情
- GitHub Search API（公开仓库）
- 所有 RSS 新闻源（公开 Feed）

**在 Netlify 后台配置**（`Site settings → Environment variables`），与本地 `.env` 等效。

---

## 部署

### Netlify（推荐）

1. 将仓库推送到 GitHub
2. 在 Netlify 新建项目，连接该仓库
3. 构建设置（通常自动读取 `netlify.toml`）：
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. 在 `Site settings → Environment variables` 添加 API Keys（可选）
5. 推送代码 → Netlify 自动构建并部署

**部署后完全独立运行，不依赖任何本地环境、不依赖本地 Claude。**

### 架构说明

```
浏览器
  └─ GET /api/dashboard      ← Netlify Function (dashboard.mts)
       ├─ Open-Meteo API      (天气 3 天预报)
       ├─ Yahoo Finance API   (股票行情)
       ├─ Finnhub API         (备用股票行情，需 Key)
       ├─ 10 × RSS Feed       (新闻，fast-xml-parser 解析)
       ├─ GitHub Search API   (开源雷达)
       └─ weibo-snapshot.json (微博热搜，静态文件)

  └─ GET /api/insight-detail?url=... ← Netlify Function (insight-detail.mts)
       └─ 服务端抓取文章全文 (Jina.ai reader + HTML 解析，绕过 CORS)
```

所有 API 调用都在 **Netlify Functions（服务端）** 完成，浏览器只和自己的域名通信。

---

## 项目结构

```
daily-signal-dashboard/
├── src/
│   ├── App.tsx              # 主组件（所有 UI 模块）
│   └── styles.css           # 全站样式（单一报纸主题，CSS 变量）
├── netlify/functions/
│   ├── dashboard.mts        # 主数据聚合接口
│   └── insight-detail.mts   # 文章全文抓取接口
├── public/
│   └── weibo-snapshot.json  # 微博热搜快照
├── scripts/
│   └── sync-weibo.mjs       # 微博数据同步脚本
├── docs/superpowers/
│   ├── specs/               # 设计规格文档
│   └── plans/               # 实施计划
├── netlify.toml             # Netlify 构建配置
└── vite.config.ts
```

---

## RSS 新闻源

| # | 来源 | Feed URL |
|---|---|---|
| 1 | 澎湃新闻 | `https://www.thepaper.cn/rss_ori.xml` |
| 2 | 财新网 | `https://api.caixin.com/rss/` |
| 3 | 路透中文 | `https://feeds.reuters.com/reuters/CNTopNews` |
| 4 | BBC 中文 | `https://feeds.bbci.co.uk/zhongwen/simp/rss.xml` |
| 5 | 36氪 | `https://36kr.com/feed` |
| 6 | 虎嗅网 | `https://www.huxiu.com/rss/0.xml` |
| 7 | 观察者网 | `https://www.guancha.cn/rss.xml` |
| 8 | 德国之声中文 | `https://rss.dw.com/xml/rss-chi-all` |
| 9 | 金融时报中文 | `https://www.ftchinese.com/rss/news` |
| 10 | 新华社 | `https://www.news.cn/rss/world.xml` |
