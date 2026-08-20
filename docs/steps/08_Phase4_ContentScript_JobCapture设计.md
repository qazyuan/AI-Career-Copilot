# Phase 4：Content Script + Job Capture 设计

## 阶段目标

用户打开一个真实招聘岗位页面后，插件能够获取当前页面的岗位内容，生成标准化 `CapturedJob / JobRecord`，然后复用已有：

```txt
JobAnalyzerAgent
+
MatchingAgent
```

完成：

```txt
当前网页岗位 → 岗位分析 → 与当前 ResumeProfile 匹配
```

本阶段拆分为：

```txt
Phase 4A：
通用当前页面抓取最小闭环

Phase 4B：
招聘网站 Adapter 架构
```

本阶段不做：

- 自动投递
- 岗位历史数据库
- Interview Agent
- 复杂 DOM selector 大全
- Content Script 直接调用 AI Provider

Phase 4A 优先证明：

```txt
当前网页 → Agent → Match
```

---

## 1. Content Script、Popup、Background Service Worker 职责

### Content Script

只负责页面数据采集。

职责：

- 读取当前页面 URL、title、host
- 从 DOM 中提取可能的岗位正文
- 执行 generic extractor
- 后续支持站点 Adapter
- 返回 `CapturedJob`

不负责：

- 不调用 AI Provider
- 不读取 API Key
- 不创建 Agent
- 不做 Matching
- 不保存长期数据

### Popup

负责用户触发和展示最小闭环结果。

职责：

- 显示当前 ResumeProfile 是否已准备好
- 用户点击 `Analyze Current Page`
- 请求 Background 获取当前 active tab
- 请求 Content Script 抓取当前页面岗位内容
- 调用已有 `JobAnalyzerAgent`
- 调用已有 `MatchingAgent`
- 展示抓取状态、岗位分析结果、匹配结果、错误信息

不负责：

- 不直接读取 DOM
- 不维护复杂历史记录
- 不做自动抓取

### Background Service Worker

作为扩展运行环境的协调层。

职责：

- 获取当前 active tab
- 向指定 tab 的 Content Script 转发抓取请求
- 处理 tab 不可访问、content script 未注入、权限不足等错误
- 可作为 Popup 与 Content Script 的消息中转

不负责：

- 不调用 AI Provider
- 不做 DOM 解析
- 不保存岗位历史数据库

---

## 2. Chrome Extension 消息通信流程

Phase 4A 建议流程：

```txt
用户打开招聘岗位页面
  ↓
点击插件图标打开 Popup
  ↓
Popup 点击 Analyze Current Page
  ↓
Popup → Background:
GET_ACTIVE_TAB_AND_CAPTURE_JOB
  ↓
Background 查询 active tab
  ↓
Background → Content Script:
CAPTURE_JOB_FROM_PAGE
  ↓
Content Script 执行 generic extractor
  ↓
Content Script → Background:
CapturedJob
  ↓
Background → Popup:
CapturedJob
  ↓
Popup 创建 AIProvider
  ↓
JobAnalyzerAgent.analyze({ jdText: capturedJob.contentText })
  ↓
MatchingAgent.match({ resumeProfile, jobAnalysis })
  ↓
Popup 展示结果
```

消息类型建议：

```ts
export type ExtensionMessage =
  | CaptureCurrentTabJobRequest
  | CaptureCurrentTabJobResponse
  | CaptureJobFromPageRequest
  | CaptureJobFromPageResponse

export interface CaptureCurrentTabJobRequest {
  type: 'CAPTURE_CURRENT_TAB_JOB'
}

export interface CaptureCurrentTabJobResponse {
  success: boolean
  capturedJob?: CapturedJob
  error?: string
}

export interface CaptureJobFromPageRequest {
  type: 'CAPTURE_JOB_FROM_PAGE'
}

export interface CaptureJobFromPageResponse {
  success: boolean
  capturedJob?: CapturedJob
  error?: string
}
```

---

## 3. CapturedJob 数据结构

`CapturedJob` 表示“从页面上抓到的一次岗位内容快照”。

```ts
export type CaptureSource = 'generic' | 'adapter'

export interface CapturedJob {
  url: string
  title: string | null
  siteName: string | null
  capturedAt: string
  source: CaptureSource
  adapterId: string | null
  contentText: string
  rawPageTitle: string
  metadata: CapturedJobMetadata
}

export interface CapturedJobMetadata {
  company?: string | null
  location?: string | null
  salary?: string | null
  jobTitle?: string | null
  confidence: 'low' | 'medium' | 'high'
  extractionWarnings: string[]
}
```

说明：

- `contentText` 是传给 `JobAnalyzerAgent` 的核心文本
- `metadata` 是 extractor 能从页面上直接拿到的浅层信息
- Phase 4A 不要求 metadata 准确，只要 `contentText` 足够可用
- `adapterId` 在 generic 情况下为 `null`

---

## 4. JobRecord Domain Model

`JobRecord` 是领域层模型，表示“一个被插件处理过的岗位”。

Phase 4 当前不做岗位历史数据库，但可以先设计结构：

```ts
export interface JobRecord {
  id: string
  capturedJob: CapturedJob
  jobAnalysis: JobAnalyzerResult | null
  matchResult: JobMatchResult | null
  status: JobRecordStatus
  createdAt: string
  updatedAt: string
}

export type JobRecordStatus =
  | 'captured'
  | 'analyzed'
  | 'matched'
  | 'failed'
```

Phase 4A 可以只在 Popup state 中临时维护：

```ts
CapturedJob
JobAnalyzerResult
JobMatchResult
```

不持久化 `JobRecord`。

---

## 5. 如何获取当前 active tab

由 Background Service Worker 执行：

```ts
const [tab] = await chrome.tabs.query({
  active: true,
  currentWindow: true,
})
```

需要注意：

- `tab.id` 可能不存在
- `chrome://`、`edge://`、扩展商店等页面不可注入 content script
- 当前 manifest 已有 `activeTab`
- 如果 content script 没有响应，需要给 Popup 返回可展示错误

Background 拿到 tab 后：

```ts
chrome.tabs.sendMessage(tab.id, {
  type: 'CAPTURE_JOB_FROM_PAGE',
})
```

---

## 6. 如何避免把整页无关文字传给 AI

核心原则：

> Content Script 要尽量提取页面主体中的岗位相关文本，而不是 `document.body.innerText` 全量丢给 AI。

Phase 4A 采用轻量过滤：

- 优先选择可能的主体容器
- 删除明显无关节点
- 限制文本长度
- 过滤常见导航、按钮、页脚、广告、推荐列表
- 保留含有岗位关键词的段落

需要排除的节点：

```txt
nav
header
footer
aside
script
style
noscript
button-heavy area
modal
cookie banner
ad container
comment area
recommendation list
```

文本限制：

```ts
const MAX_CAPTURED_JOB_TEXT_LENGTH = 12000
```

如果超长：

- 优先保留标题附近文本
- 优先保留包含岗位关键词的段落
- 截断前给 `extractionWarnings` 加提示

---

## 7. Generic Extractor 最小策略

Phase 4A 的 generic extractor 不做站点定制，只做通用启发式。

建议策略：

1. 克隆 `document.body`
2. 移除明显无关选择器：

```txt
nav, header, footer, aside, script, style, noscript, iframe
[role="navigation"]
[aria-label*="nav"]
.advertisement
.ad
.modal
.footer
.header
```

3. 优先找主体候选容器：

```txt
main
article
[role="main"]
section
```

4. 从候选容器中提取段落级文本：

```txt
h1, h2, h3, p, li, section, div
```

5. 对文本块打分：

加分关键词：

```txt
职位描述
岗位职责
任职要求
职位要求
工作职责
Responsibilities
Requirements
Qualifications
About the role
What you will do
```

6. 过滤过短、重复、明显 UI 文案：

```txt
收藏
立即沟通
举报
分享
登录
注册
隐私政策
相关推荐
```

7. 拼接为 `contentText`

8. 判断是否像岗位页面：

```ts
isLikelyJobPage =
  contentText includes responsibilities/requirements keywords
  OR text has enough job-like keywords
```

如果不像岗位页面，返回：

```txt
success: false
error: "This page does not look like a job posting."
```

---

## 8. 招聘网站 Adapter 架构

Phase 4B 引入站点 Adapter。

接口：

```ts
export interface JobSiteAdapter {
  id: string
  name: string
  matches(url: URL): boolean
  extract(document: Document): CapturedJob | null
}
```

Adapter registry：

```ts
const adapters: JobSiteAdapter[] = [
  bossAdapter,
  linkedinAdapter,
  liepinAdapter,
]

export function captureJobFromPage(document: Document, location: Location) {
  const url = new URL(location.href)
  const adapter = adapters.find((item) => item.matches(url))

  if (adapter) {
    const result = adapter.extract(document)

    if (result) return result
  }

  return genericExtractor(document, location)
}
```

### BOSS Adapter

可能提取：

- 职位名称
- 薪资
- 地点
- 年限
- 学历
- 公司名
- 职位描述正文

### LinkedIn Adapter

可能提取：

- job title
- company
- location
- workplace type
- job description
- requirements

### 猎聘 Adapter

可能提取：

- 职位名
- 公司
- 薪资
- 城市
- 职位描述
- 任职要求

Phase 4B 不需要一次性实现 selector 大全，可以从一个站点一个页面形态开始。

---

## 9. SPA 招聘网站切换岗位注意事项

很多招聘网站是 SPA：

- URL 变化但页面不刷新
- DOM 异步加载
- 用户在列表和详情间切换
- 详情内容可能延迟出现

注意事项：

1. Content Script 不应只在 `document_idle` 抓一次
2. 用户点击 Popup 时再抓当前 DOM
3. Generic extractor 应等待短时间稳定：

```txt
capture request received
  ↓
wait 300-800ms
  ↓
read DOM
```

4. Phase 4B Adapter 可以使用：

```ts
MutationObserver
```

但 Phase 4A 不做持续监听，避免复杂度。

5. 如果提取文本过短：

```txt
提示用户等待页面加载完成后重试
```

---

## 10. 失败场景处理

### 页面抓取失败

可能原因：

- Content Script 未注入
- 页面不允许访问
- DOM 为空
- 页面还未加载完

错误文案：

```txt
Unable to capture this page. Please refresh the page and try again.
```

### 非岗位页面

判断：

- 没有岗位相关关键词
- 文本太短
- 提取内容主要是导航或列表

错误文案：

```txt
This page does not look like a job posting.
```

### 权限不足

可能页面：

- `chrome://`
- Chrome Web Store
- PDF viewer
- 浏览器内部页面

错误文案：

```txt
This page cannot be accessed by the extension.
```

### ResumeProfile 缺失

Popup 调 Matching 前检查：

```txt
Please analyze your resume in Options first.
```

### AI 配置缺失

Popup 调 Agent 前检查：

```txt
Please configure your AI provider in Options first.
```

---

## 11. 如何复用现有 JobAnalyzerAgent 和 MatchingAgent

Popup 中调用：

```ts
const provider = createAIProvider(config)

const jobAnalyzer = new JobAnalyzerAgent(provider)
const jobOutput = await jobAnalyzer.analyze({
  jdText: capturedJob.contentText,
})

const matchingAgent = new MatchingAgent(provider)
const matchOutput = await matchingAgent.match({
  resumeProfile,
  jobAnalysis: jobOutput.result,
})
```

数据流：

```txt
CapturedJob.contentText
  ↓
JobAnalyzerAgent
  ↓
JobAnalyzerResult
  +
ResumeProfile
  ↓
MatchingAgent
  ↓
JobMatchResult
```

Content Script 不参与 AI 调用。

---

## 12. 最小测试 UI 放在 Popup 还是 Options

Phase 4A 最小测试 UI 应放在 Popup。

理由：

- 用户已经在真实招聘页面上
- Popup 天然对应“当前页面操作”
- Options 更适合配置、PDF 上传、开发测试面板
- 当前阶段目标是证明“当前网页 → Agent → Match”链路
- Popup 可以直接表达当前页面状态和结果

Popup 最小 UI：

```txt
AI Career Copilot

ResumeProfile:
Ready / Missing

Current page:
Not captured / Captured / Failed

[Analyze Current Page]

Captured title/company/location preview
Job analysis summary
Match score
Recommendation
Blocking gaps
Top strengths
Top risks
```

Phase 4A 不需要复杂页面。

---

## 13. 新增/修改文件规划

### Shared message / domain types

```txt
extension/src/shared/messages.ts
extension/src/shared/jobCapture/types.ts
extension/src/shared/jobCapture/index.ts
```

### Content Script

```txt
extension/src/content/contentScript.ts
extension/src/content/jobCapture/genericExtractor.ts
extension/src/content/jobCapture/extractTextBlocks.ts
extension/src/content/jobCapture/isLikelyJobPage.ts
extension/src/content/jobCapture/index.ts
```

### Background

```txt
extension/src/background/serviceWorker.ts
extension/src/background/captureCurrentTabJob.ts
```

### Popup

```txt
extension/src/popup/Popup.tsx
extension/src/popup/popup.css
extension/src/popup/components/CaptureStatusPanel.tsx
extension/src/popup/components/MatchSummaryPanel.tsx
```

### Future Adapters

Phase 4B 预留：

```txt
extension/src/content/jobCapture/adapters/types.ts
extension/src/content/jobCapture/adapters/registry.ts
extension/src/content/jobCapture/adapters/bossAdapter.ts
extension/src/content/jobCapture/adapters/linkedinAdapter.ts
extension/src/content/jobCapture/adapters/liepinAdapter.ts
```

### 可能修改

```txt
extension/public/manifest.json
extension/src/services/storage/index.ts
extension/src/agents/index.ts
```

当前 manifest 已有：

```json
"permissions": ["storage", "activeTab"]
```

Phase 4A 理论上可以继续使用现有权限。

---

## Phase 4A 最小闭环

```txt
真实招聘页面
  ↓
Popup: Analyze Current Page
  ↓
Background 获取 active tab
  ↓
Content Script generic extractor
  ↓
CapturedJob
  ↓
Popup 调 JobAnalyzerAgent
  ↓
JobAnalyzerResult
  +
当前 ResumeProfile
  ↓
Popup 调 MatchingAgent
  ↓
JobMatchResult
  ↓
Popup 展示结果
```

---

## Phase 4B Adapter 演进

```txt
Generic extractor 跑通
  ↓
选择第一个真实站点，例如 BOSS
  ↓
实现 bossAdapter
  ↓
用 adapter 精准提取 title/company/location/salary/jd
  ↓
保留 generic fallback
  ↓
逐步扩展 LinkedIn / 猎聘
```

Adapter 架构的目标不是一开始覆盖所有招聘网站，而是让每个站点的规则被隔离，避免 generic extractor 越写越乱。
