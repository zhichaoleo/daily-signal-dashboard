# 猪社 · Zhu Daily — CLAUDE.md

## 项目概述

个人每日简报仪表板，品牌名"猪社 / Zhu Daily"。报纸编辑风格单一主题，手机/平板/桌面自适应。

- **前端**: React 18 + TypeScript + Vite，单文件组件 `src/App.tsx`
- **后端**: Netlify Functions（`.mts`，Node.js ESM）
- **部署**: Netlify，GitHub push 触发自动构建，完全独立运行，不依赖本地任何工具

## 常用命令

```bash
npx netlify dev      # 本地开发（Vite + Functions 同时启动），访问 http://localhost:8888
npm run dev          # 仅 Vite 前端（Functions 不启动）
npm run build        # 生产构建（tsc + vite build），输出 dist/
npm run typecheck    # 类型检查
npm run sync:weibo   # 手动同步微博热搜快照
```

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/App.tsx` | 全部 UI 组件（单文件，按模块 section 组织） |
| `src/styles.css` | 全站样式，单一报纸主题，CSS 变量定义 |
| `netlify/functions/dashboard.mts` | 主数据聚合：天气 / 股票 / 新闻 / GitHub / 微博 |
| `netlify/functions/insight-detail.mts` | 文章全文抓取（服务端绕 CORS，Jina.ai reader） |
| `public/weibo-snapshot.json` | 微博热搜静态快照 |

## 设计规范

### 色板（严格遵守，A股惯例）

```css
--bg:         #f2ede4   /* 全站背景，暖米色 */
--surface:    #f9f6f0   /* 卡片 / Header 背景 */
--border:     #d8cfc2   /* 分割线、边框 */
--ink:        #1a1612   /* 主文字、标题 */
--ink-mid:    #5a5248   /* 次要文字、摘要 */
--ink-light:  #9a9088   /* 元信息、时间戳 */
--accent:     #b5341e   /* 标签、链接强调 */
--up:         #c0392b   /* 涨价 — 红色（A股惯例，红涨） */
--down:       #27826a   /* 跌价 — 绿色（A股惯例，绿跌） */
--ticker-bg:  #1a1612   /* 行情跑马灯背景 */
```

**禁止**：不得在任何地方使用纯白 `#fff` 或纯黑 `#000`，保持暖米色系统统一。

### 字体

```css
--f-serif: Georgia, 'Songti SC', 'Noto Serif SC', serif   /* 正文、标题 */
--f-sans:  -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif  /* UI、数字 */
```

### 响应式断点

- `< 640px`：天气 extras 隐藏；新闻图片缩小；股票卡片 `1fr 1fr`；Modal 图片 180px
- `640–900px`：主内容区自然收缩
- `> 900px`：主内容区固定 `max-width: 900px` 居中

## API 接口

### GET /api/dashboard

返回结构：
```typescript
{
  weather: WeatherReport[],  // 3 天预报
  stocks: StockQuote[],      // 自选股行情
  news: NewsItem[],          // 合并排序后的新闻列表
  weibo: WeiboItem[],        // 微博热搜 Top 10
  repos: RepoItem[],         // GitHub 开源雷达 Top 10
}
```

### GET /api/insight-detail?url=&title=&source=&imageUrl=

服务端抓取文章全文，返回：
```typescript
{ title, image, publishedAt, text, wordCount }
```

### GET /api/dashboard?stockSearch=query

股票搜索（Yahoo Finance），返回候选列表供前端下拉展示。

## 数据来源

| 数据 | 来源 | 需要 Key |
|---|---|---|
| 天气（3天） | Open-Meteo | 否 |
| 股票行情 | Yahoo Finance | 否 |
| 股票行情（备用） | Finnhub | 是，`FINNHUB_API_KEY` |
| 新闻 RSS | 10 个精选源（见 README） | 否 |
| 微博热搜 | 本地快照 | 否 |
| GitHub 开源雷达 | GitHub Search API | 否 |

## 模块结构（App.tsx 内部）

```
App()
├── TickerTape         行情跑马灯（黑底，CSS 无缝滚动）
├── Header             Logo + 日期时间 + 更新状态
├── WeatherBar         3天天气预报
└── main (max-width 900px)
    ├── NewsFeed        筛选器 + 头条 + 列表
    ├── StockSearch     搜索添加自选股
    ├── StockGrid       自选股卡片网格（含 sparkline + × 移除）
    ├── WeiboList       微博热搜 Top 10
    └── RepoList        开源雷达 Top 10
NewsModal               点击新闻弹出的全文 Modal
```

## 注意事项

- `insight-detail.mts` 保持不动，NewsFeed 点击后直接调用该接口获取全文
- 微博快照由 `scripts/sync-weibo.mjs` 生成，写入 `public/weibo-snapshot.json`；`dashboard.mts` 直接读取该文件，不实时抓取
- `album.mts` 和 `admin-usage.mts` 已删除（原共享相册 / Admin 面板功能不在此次范围内）
- ThemeSwitcher、HoroscopeCard、PhotoWall、AdminPanel 组件已移除

## 详细文档

- 设计规格：`docs/superpowers/specs/2026-05-24-zhushe-redesign-design.md`
- 实施计划：`docs/superpowers/plans/2026-05-24-zhushe-redesign.md`
