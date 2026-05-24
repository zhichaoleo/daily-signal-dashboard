# 猪社 (Zhu Daily) — 全站重设计规格文档

**日期**: 2026-05-24  
**状态**: 用户已批准

---

## 1. 项目概述

将现有的"家庭内参"仪表板重新设计并重新品牌化为"猪社 / Zhu Daily"。目标是一个高端、优雅的报纸编辑风格，在手机、平板、桌面三端自适应展示。

---

## 2. 品牌与视觉规格

### 品牌名称
- 中文：猪社
- 英文：Zhu Daily
- Footer 文案：猪社 · ZHU DAILY · 🐷

### Logo（方案 B：图标 + 文字）
- 黑色圆角方块（44×44px，border-radius 6px）
- 内嵌信号波形 SVG（stroke #f2ede4，线宽 2.2）
- 右侧：中文大字"猪社"（24px，font-weight 900）+ 英文小字"ZHU DAILY"（10px，letter-spacing 3px）

### 色板（全站统一，A股红涨绿跌）
| Token | 值 | 用途 |
|---|---|---|
| `--bg` | `#f2ede4` | 全站背景（暖米色） |
| `--surface` | `#f9f6f0` | 卡片/Header 背景 |
| `--border` | `#d8cfc2` | 分割线、边框 |
| `--ink` | `#1a1612` | 主文字、标题 |
| `--ink-mid` | `#5a5248` | 次要文字、摘要 |
| `--ink-light` | `#9a9088` | 元信息、时间戳 |
| `--accent` | `#b5341e` | 标签、链接强调色 |
| `--up` | `#c0392b` | 涨价（红） |
| `--down` | `#27826a` | 跌价（绿） |
| `--ticker-bg` | `#1a1612` | 行情跑马灯背景 |

### 字体
- `--f-serif`: Georgia, Songti SC, Noto Serif SC（正文、标题）
- `--f-sans`: -apple-system, PingFang SC, Helvetica Neue（UI 元素、数字）

### 字体分层
| 用途 | 字号 | 字重 | 字体 |
|---|---|---|---|
| 头条标题 | 18px | 700 | serif |
| Modal 标题 | 22px | 700 | serif |
| 列表新闻标题 | 15px | 700 | serif |
| 摘要 | 13–14px | 400 | serif |
| Modal 正文 | 15px | 400 | serif |
| 股价大字 | 22px | 700 | sans |
| 股票代码 | 15px | 700 | sans |
| 涨跌幅 | 13px | 400 | sans |
| 行情条 | 15px | 700/400 | sans |
| 元信息、时间 | 11–12px | 400 | sans |
| Section 标签 | 11px | 400 | sans（大写，letter-spacing 3px） |

---

## 3. 页面结构（自上而下）

```
[行情跑马灯]         ← 黑底，15px，CSS animation 滚动
[Header]            ← 猪社 Logo + 日期/时间/已更新
[天气栏 — 3天]      ← 今天/明天/后天 + 气象指数
[主内容区 max-width 900px]
  [今日要闻]         ← 筛选器 + 头条大图 + 列表
  [自选股]           ← 搜索添加 + 卡片网格（含 × 移除）
  [微博热搜]         ← Top 10 排行
  [开源雷达]         ← GitHub 高星 Top 10
[Footer]
[新闻详情 Modal]    ← 点击任意新闻卡片弹出
```

---

## 4. 各模块详细规格

### 4.1 行情跑马灯

- 高度 44px，背景 `--ticker-bg`
- 左侧"行情"标签，`--accent` 背景，白字，12px
- 内容：SAP、NVDA、AAPL、SNDK（自选股）+ 沪指、深成指、恒生、BTC、黄金、人民币/美元
- CSS keyframe animation，两组内容首尾相接实现无缝循环
- hover 时暂停
- 涨价用 `--up`（红），跌价用 `--down`（绿）

### 4.2 Header

- 背景 `--surface`，底部 3px solid `--ink`
- 左侧：Logo（图标 + 文字）
- 右侧：日期 · 星期 | 上海时间 HH:MM | ● 已更新（绿色）

### 4.3 天气栏（3天）

- 数据来源：Open-Meteo API（已有）
- 展示今天 + 第2天 + 第3天
- 每日显示：星期标签 / 天气图标 emoji / 最高°/最低° / 天气描述
- 右侧 extras：位置、湿度、风速、降雨概率、紫外线
- 响应式：< 640px 时 extras 隐藏

### 4.4 今日要闻

**RSS 来源（精选10个，每源 top 10 合并排序）**：
1. 澎湃新闻 `https://www.thepaper.cn/rss_ori.xml`
2. 财新网 `https://api.caixin.com/rss/`（或备用）
3. 路透中文 `https://feeds.reuters.com/reuters/CNTopNews`
4. BBC中文 `https://feeds.bbci.co.uk/zhongwen/simp/rss.xml`
5. 36氪 `https://36kr.com/feed`
6. 虎嗅网 `https://www.huxiu.com/rss/0.xml`
7. 观察者网 `https://www.guancha.cn/rss.xml`
8. 德国之声中文 `https://rss.dw.com/xml/rss-chi-all`
9. 金融时报中文 `https://www.ftchinese.com/rss/news`
10. 新华社 `https://www.news.cn/rss/world.xml`

**图片保障（3 层 fallback）**：
1. RSS `<enclosure>` / `<media:content>` 缩略图
2. 服务端抓取文章页 OG:image（`/api/article?url=...`）
3. 基于文章类别生成的渐变色 SVG 占位图

**UI**：
- 筛选器：全部 / 国内 / 国际 / 财经 / 科技
- 第一条：头条大图（140×105px 缩略图 + 18px 标题 + 2行摘要）
- 其余：列表式（80×60px 缩略图 + 15px 标题 + 1行摘要）
- 点击任意条目 → 打开 Modal

**Modal（新闻详情）**：
- 顶部大图 220px + × 关闭按钮
- 来源标签（红底白字）+ 发布时间
- 22px 标题 + 15px 全文正文
- 底部：字数/阅读时间 + "阅读原文 →" 链接
- 全文通过 `/api/article` Netlify Function 服务端获取，解决 CORS/403

### 4.5 自选股

**搜索/添加**：
- 搜索框（宽 300px，含放大镜图标）
- 输入时展示候选下拉（代码 + 中文名称 + "添加"按钮）
- 候选数据来自后端 stock search API（Yahoo Finance `/v1/finance/search`）
- 添加后保存到 localStorage，刷新后保留

**卡片网格**：
- `auto-fill minmax(180px, 1fr)`
- 每张卡：代码 / 中文名 / 大字价格 / sparkline / 涨跌幅
- 右上角 × 按钮移除
- Sparkline：上涨时红色渐变线，下跌时绿色渐变线

**实时行情**：来自后端 `/api/dashboard` 的 stock 字段（Yahoo Finance + Finnhub 双路）

### 4.6 微博热搜

- 数据来自 `/api/dashboard` weibo 字段（本地快照 + 定时更新）
- 展示 Top 10，排名 1–2 用 `--up` 红色高亮
- 点击条目 → 跳转微博搜索页

### 4.7 开源雷达

- 数据来自 GitHub Search API（已有）
- 展示高星且近期活跃 Top 10
- 字段：序号 / 仓库名 / 描述 / 语言·⭐·更新时间

---

## 5. 后端变更

### 新增：`/api/article` Netlify Function

```
GET /api/article?url=<encoded-article-url>
```

服务端：
1. fetch 文章 URL（绕过浏览器 CORS）
2. 用 cheerio 提取：`og:image`、`article:published_time`、正文（`<article>` / `.article-content` 等）
3. 返回 JSON：`{ title, image, publishedAt, text, wordCount }`

### 修改：`/api/dashboard`

- 天气改为返回 3 天预报数据（Open-Meteo `forecast_days=3`）
- 股票行情接口不变，但新增 stock search 接口
- 新闻每源返回 top 10，前端合并排序

### 删除

- Netlify Blobs 相关代码（共享相册）
- Admin 面板相关接口

---

## 6. 前端变更

### 删除的模块
- PhotoWall（共享相册）
- AdminPanel
- ThemeSwitcher（4主题切换 → 单一主题）
- HoroscopeCard（星座运势）

### 新增的模块
- TickerTape（行情跑马灯）
- WeatherForecast（3天天气）
- StockSearch（搜索添加自选股）
- NewsModal（全文弹窗）

### 文件结构变更
- `src/App.tsx` — 大幅重构，按模块拆分
- `src/styles.css` → 重写为单一报纸主题
- `netlify/functions/dashboard.mts` — 更新天气/新闻逻辑
- `netlify/functions/article.mts` — 新增全文抓取函数

---

## 7. 响应式断点

| 断点 | 变化 |
|---|---|
| < 640px | 天气 extras 隐藏；新闻图片缩小；股票卡片 1fr 1fr；Modal 图片高度 180px |
| 640px–900px | 主内容区自然收缩 |
| > 900px | 固定 900px 最大宽度居中 |

---

## 8. 不在此次范围内

- 用户登录/权限系统
- 推送通知
- 评论功能
- 暗色主题
