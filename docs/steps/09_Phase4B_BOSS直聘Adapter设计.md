# Phase 4B：BOSS直聘 Job Site Adapter 设计

## 0. 阶段目标

在 Phase 4A 已完成的 Generic Job Capture 基础上，建立可扩展的 `JobSiteAdapter` 架构，并先实现 BOSS直聘 Adapter。

Phase 4B 的目标不是新增 Agent 能力，而是提升真实招聘网站页面抓取的稳定性：

当前 BOSS 职位详情页

→ BOSS Adapter 结构化抓取

→ 统一输出 `CapturedJob`

→ 继续复用现有 `JobAnalyzerAgent`

→ 继续复用现有 `MatchingAgent`

本阶段不修改 `JobAnalyzerAgent`、不修改 `MatchingAgent`，也不让 Adapter 调用 AI。

---

## 1. JobSiteAdapter Interface

建议新增一个站点适配器接口：

```ts
export interface JobSiteAdapter {
  id: string
  label: string
  canHandle(context: JobSiteAdapterContext): boolean
  capture(context: JobSiteAdapterContext): CapturedJob | null
}

export interface JobSiteAdapterContext {
  document: Document
  location: Location
  capturedAt: string
}
```

设计原则：

- `canHandle()` 只负责判断当前页面是否属于该 Adapter 的目标站点。
- `capture()` 只负责从 DOM 中采集岗位内容，并转换为平台无关的 `CapturedJob`。
- `capture()` 不调用 AI，不读 Chrome Storage，不关心用户简历，也不关心匹配逻辑。
- `capture()` 可以返回 `null` 表示无法可靠抓取，应 fallback 到 Generic Extractor。
- 单个字段提取失败不应抛错，也不应导致整个 Adapter 失败。
- 只有正文 `jobDescription` 为空或过短时，才认为 Adapter 整体失败。

---

## 2. Adapter Registry

建议新增 Adapter Registry，统一选择最合适的抓取方式：

```ts
export function captureJobFromPage(document: Document): CapturedJob {
  const context = {
    document,
    location: window.location,
    capturedAt: new Date().toISOString(),
  }

  const adapter = jobSiteAdapters.find((item) => item.canHandle(context))
  const capturedByAdapter = adapter?.capture(context)

  if (capturedByAdapter) {
    return capturedByAdapter
  }

  return captureJobWithGenericExtractor(document)
}
```

Registry 第一版只注册：

```ts
export const jobSiteAdapters = [bossAdapter]
```

后续可继续加入：

- `linkedinAdapter`
- `liepinAdapter`
- `lagouAdapter`
- `genericChineseJobAdapter`

Registry 的价值：

- Content Script 不需要知道每个招聘网站的细节。
- 新增站点时不影响 Popup / Background / Agent / Workflow。
- 所有站点最终仍统一返回 `CapturedJob`。

---

## 3. BOSS URL 识别策略

BOSS Adapter 第一版只识别 BOSS直聘职位详情页，不一次适配多个页面形态。

建议 `canHandle()` 使用 URL + 页面内容双重判断：

### URL 判断

匹配 host：

- `www.zhipin.com`
- `m.zhipin.com`
- 其他 `*.zhipin.com` 可谨慎支持

匹配 path：

- 包含 `/job_detail/`
- 或 URL 中包含 `jobId`

### 页面内容辅助判断

页面文本中至少出现部分招聘详情页信号：

- `职位描述`
- `任职要求`
- `立即沟通`
- `收藏`
- `公司`
- `经验`
- `学历`

### 不做绝对阻断

`canHandle()` 只判断“是否应该尝试 BOSS Adapter”。

即使 BOSS Adapter 尝试后失败，也必须 fallback 到 `genericExtractor`。

---

## 4. BOSS 职位详情页目标字段

BOSS Adapter 第一版目标字段：

```ts
interface BossCapturedFields {
  jobTitle: string | null
  company: string | null
  salary: string | null
  location: string | null
  experienceRequirement: string | null
  educationRequirement: string | null
  jobDescription: string | null
  pageUrl: string
  capturedAt: string
}
```

这些字段不作为新的跨平台业务模型长期扩散，而是用于构造当前已有的 `CapturedJob`：

```ts
CapturedJob {
  url: pageUrl
  title: jobTitle
  siteName: 'BOSS直聘'
  capturedAt
  source: 'adapter'
  adapterId: 'boss'
  contentText: normalizedContentText
  rawPageTitle: document.title
  metadata: {
    jobTitle,
    company,
    location,
    salary,
    confidence,
    extractionWarnings,
  }
  stats: {
    textLength,
    textBlockCount,
  }
}
```

`experienceRequirement` 和 `educationRequirement` 第一版可以进入 `contentText`，不强行扩展 `CapturedJobMetadata`。如果后续多个站点都稳定需要这些字段，再升级共享 metadata 类型。

---

## 5. BOSS 页面 DOM 提取策略

### 总体策略

优先使用语义结构、标题层级、稳定属性和文本关系，避免大量绑定易变 CSS class。

提取顺序建议：

1. 定位主要详情区域。
2. 从主要区域中提取标题、薪资、地点、经验、学历、公司。
3. 通过“职位描述 / 任职要求”等文本锚点提取正文。
4. 将字段拼装为规范化 `contentText`。
5. 校验正文长度，不可靠则 fallback 到 Generic Extractor。

### 主区域定位

第一版可以按优先级选择：

- `main`
- `[role="main"]`
- 包含 `职位描述` 的最近较大容器
- `document.body`

核心不是找到完美容器，而是尽量减少导航、推荐职位、广告区域进入正文。

### 字段提取

#### jobTitle

优先来源：

- `h1`
- 页面标题中与岗位名称相关的片段
- 薪资附近的短文本
- 包含岗位词的短文本，例如 `前端开发工程师`、`React工程师`、`资深前端开发工程师`

过滤：

- 导航文本：`首页 职位 公司 校园 APP`
- 操作文本：`收藏`、`立即沟通`、`举报`
- 过长文本
- 包含正文锚点的文本：`职位描述`、`任职要求`

#### salary

通过文本模式提取：

- `50-70K`
- `20-35K·13薪`
- `薪资面议`
- `15-25k`

不依赖固定 class。

#### location

优先从标题附近的短文本提取：

- `上海`
- `北京·朝阳区`
- `深圳·南山区`

避免从公司地址、推荐职位、页面 footer 中误抓。

#### experienceRequirement

通过短文本模式识别：

- `3-5年`
- `5-10年`
- `经验不限`
- `应届生`

#### educationRequirement

通过短文本模式识别：

- `本科`
- `大专`
- `硕士`
- `博士`
- `学历不限`

#### company

优先从职位详情主区域附近提取：

- 公司名短文本
- 页面标题中的公司片段
- 与岗位标题相邻但不等于薪资/地点/经验/学历的文本

第一版不要追求 100% 准确。公司抓不到时返回 `null`，不影响正文抓取。

#### jobDescription

正文提取是 BOSS Adapter 是否成功的关键。

优先使用文本锚点：

- `职位描述`
- `岗位职责`
- `任职要求`
- `职位要求`
- `工作职责`

策略：

- 找到包含这些锚点的最小有效容器。
- 提取该容器内的可见文本。
- 清理操作文本、重复导航、推荐职位、扫码提示。
- 如果正文仍明显过短，则认为 Adapter 失败，交给 Generic Extractor。

---

## 6. 如何减少对脆弱 CSS Class Selector 的依赖

BOSS 页面 class 可能经常变化，因此第一版不建立大量 class selector。

优先级：

1. 文本锚点：`职位描述`、`任职要求`。
2. 标题层级：`h1`、`h2`。
3. 文本模式：薪资、经验、学历、城市。
4. DOM 相邻关系：标题附近的短文本。
5. 少量宽泛属性：`main`、`article`、`role="main"`。

允许使用少量 class 作为低优先级增强，但不能成为唯一路径。

不建议第一版绑定：

- 哈希化 class
- 过深 DOM 路径
- `nth-child`
- 大量页面形态 selector 列表

---

## 7. Selector 部分失效时的局部 Fallback

每个字段独立提取，独立 fallback：

```ts
const jobTitle = extractBossJobTitle(root, document) ?? null
const salary = extractBossSalary(root) ?? null
const location = extractBossLocation(root) ?? null
const jobDescription = extractBossJobDescription(root) ?? null
```

字段失败策略：

- `jobTitle` 抓不到：`CapturedJob.title = null`，由 Job Analyzer 后续从正文理解标题。
- `company` 抓不到：metadata 中为 `null`。
- `salary` 抓不到：metadata 中为 `null`。
- `location` 抓不到：metadata 中为 `null`。
- `experienceRequirement` / `educationRequirement` 抓不到：不阻断。
- `jobDescription` 抓不到或过短：整个 BOSS Adapter 返回 `null`，Registry fallback 到 Generic Extractor。

这样可以避免“一个字段坏了，整页都坏了”。

---

## 8. bossAdapter 完全失败时如何 Fallback 到 genericExtractor

失败定义：

- 找不到正文。
- 正文长度低于最小阈值，例如 `< 120`。
- 正文中缺少基本岗位信号，例如既没有 `职位描述`，也没有 `任职要求`，也没有明显技能/职责文本。
- 提取过程中发生异常。

Fallback 策略：

```ts
try {
  const captured = bossAdapter.capture(context)

  if (captured) {
    return captured
  }
} catch (error) {
  // 记录 warning，不向用户暴露技术栈细节
}

return captureJobWithGenericExtractor(document)
```

注意：

- Adapter 失败不是用户可见的致命错误。
- 用户只需要看到最终捕获结果。
- 如果 fallback 到 Generic，也可以在 `metadata.extractionWarnings` 中加入：
  `BOSS adapter could not reliably extract the job description. Generic extraction was used.`

---

## 9. BOSS SPA 切换职位时如何保证读取最新页面内容

Phase 4A 已明确不做复杂持续 DOM 监听，Phase 4B 也保持这个边界。

第一版策略：

1. 用户点击 Popup 时，Content Script 读取当前 DOM。
2. 读取前等待一个很短的稳定窗口，例如 `300-500ms`。
3. 读取 `window.location.href` 和 `document.title`。
4. 抓取完成前后再次检查 `window.location.href`。
5. 如果 URL 已变化，做一次短延迟 retry。
6. 最多 retry 一次，不做 MutationObserver。

建议抽象：

```ts
async function captureStableCurrentPage() {
  const startUrl = window.location.href
  await wait(400)
  const captured = captureJobFromPage(document)
  const endUrl = window.location.href

  if (startUrl !== endUrl) {
    await wait(400)
    return captureJobFromPage(document)
  }

  return captured
}
```

这样可以覆盖用户刚切换岗位、DOM 尚未稳定的常见场景，同时避免引入长期监听复杂度。

---

## 10. CapturedJob 如何继续保持平台无关

`CapturedJob` 不应变成 BOSS 专用类型。

BOSS 特有字段只做三件事：

1. 映射到已有通用字段：
   - `jobTitle` → `title` / `metadata.jobTitle`
   - `company` → `metadata.company`
   - `salary` → `metadata.salary`
   - `location` → `metadata.location`
2. 拼入 `contentText`：
   - `职位：...`
   - `公司：...`
   - `薪资：...`
   - `地点：...`
   - `经验要求：...`
   - `学历要求：...`
   - `职位描述：...`
3. 通过 `adapterId: 'boss'` 标识来源。

不建议在 Phase 4B 为 BOSS 单独扩展跨平台类型，除非多个站点都需要同样字段。

---

## 11. BOSS Adapter 错误处理

错误分层：

### 字段级错误

例如公司名、薪资、地点抓不到。

处理：

- 返回 `null`。
- 添加 extraction warning 可选。
- 不阻断 Adapter。

### 正文级错误

例如正文为空、过短、明显不是 JD。

处理：

- `bossAdapter.capture()` 返回 `null`。
- Registry fallback 到 Generic Extractor。

### 程序异常

例如 DOM API 异常、页面结构意外。

处理：

- try/catch 捕获。
- fallback 到 Generic Extractor。
- 不把内部错误直接展示给用户。

### 用户可见错误

只有 Generic Extractor 也失败时，才由现有 Content Script / Popup 流程展示错误，例如：

- 文本为空或过短。
- chrome:// 页面无法访问。
- 权限不足。

---

## 12. 手动测试方案

### 测试 1：BOSS 职位详情页

步骤：

1. 打开一个 BOSS 真实职位详情页。
2. 点击扩展 Popup。
3. 点击 Capture / Analyze 当前页面。

预期：

- `CapturedJob.source = 'adapter'`
- `adapterId = 'boss'`
- `title` 是真实岗位标题，不是导航文本。
- `metadata.company` 尽量有值。
- `metadata.salary` 尽量有值。
- `metadata.location` 尽量有值。
- `contentText` 包含岗位标题、薪资、地点、经验、学历和正文。
- Job Analyzer 和 Matching Agent 继续正常运行。

### 测试 2：BOSS 页面字段缺失

场景：

- 页面未展示薪资。
- 公司名位置变化。
- 学历要求缺失。

预期：

- 单个字段为 `null`。
- Adapter 不整体失败。
- 正文能提取时仍 `source = 'adapter'`。

### 测试 3：BOSS 页面正文提取失败

可以用页面加载中、反爬异常页、登录遮挡页测试。

预期：

- bossAdapter 返回 `null`。
- Registry fallback 到 Generic Extractor。
- 如果 Generic 也抓不到足够文本，才展示当前已有错误。

### 测试 4：BOSS SPA 快速切换岗位

步骤：

1. 在 BOSS 列表页或详情页快速切换岗位。
2. 页面刚变化后立即点击 Popup。

预期：

- Content Script 短延迟读取。
- 如果 URL 在读取中变化，最多 retry 一次。
- 最终抓取的是当前 URL 对应内容。

### 测试 5：非 BOSS 招聘页

预期：

- `bossAdapter.canHandle()` 返回 false。
- 继续使用 Generic Extractor。

### 测试 6：普通网页 / chrome:// 页面

预期：

- 普通网页沿用 Phase 4A 行为：低置信度 warning，但不绝对阻断。
- `chrome://` 页面沿用现有无法访问提示。

---

## 13. 新增 / 修改文件结构

### 新增文件

```text
extension/src/content/jobCapture/adapters/types.ts
extension/src/content/jobCapture/adapters/registry.ts
extension/src/content/jobCapture/adapters/bossAdapter.ts
extension/src/content/jobCapture/adapters/bossExtractors.ts
extension/src/content/jobCapture/adapters/textUtils.ts
```

说明：

- `types.ts`：定义 `JobSiteAdapter` 和 `JobSiteAdapterContext`。
- `registry.ts`：统一选择 adapter，并处理 fallback 到 Generic Extractor。
- `bossAdapter.ts`：BOSS Adapter 主入口，负责组装 `CapturedJob`。
- `bossExtractors.ts`：BOSS 字段提取函数。
- `textUtils.ts`：通用文本清理、去重、短文本候选过滤等工具。

### 修改文件

```text
extension/src/content/contentScript.ts
extension/src/content/jobCapture/index.ts
extension/src/shared/jobCapture/types.ts
```

说明：

- `contentScript.ts`：从直接调用 Generic Extractor 改为调用 Registry 统一入口。
- `jobCapture/index.ts`：导出 Registry 捕获入口。
- `types.ts`：如果需要，可小幅扩展 `CapturedJobStats`，例如增加 `adapterId` 不需要，因为已有顶层字段；第一版尽量不改共享类型。

### 尽量不修改

```text
extension/src/agents/jobAnalyzer/*
extension/src/agents/matching/*
extension/src/services/jobWorkflow/*
extension/src/popup/*
```

Phase 4B 是采集层增强，不应影响 Agent 和业务编排层。

---

## 14. 建议实现顺序

1. 新增 `JobSiteAdapter` 类型。
2. 新增 `bossAdapter` 的 URL 识别。
3. 新增 BOSS 字段提取函数。
4. 新增 Adapter Registry，并 fallback 到 Generic Extractor。
5. 将 Content Script 改为调用 Registry。
6. 加入短延迟稳定读取 + URL 变化 retry。
7. build / lint。
8. 用真实 BOSS 页面、普通网页、chrome:// 页面做手动验证。

---

## 15. 本阶段边界

本阶段不做：

- 不修改 `JobAnalyzerAgent`
- 不修改 `MatchingAgent`
- 不让 `bossAdapter` 调用 AI
- 不做自动投递
- 不做岗位数据库
- 不做复杂持续 DOM 监听
- 不一次适配多个 BOSS 页面形态
- 不建立大量脆弱 CSS class selector

验收重点：

- BOSS 页面能优先走 `bossAdapter`。
- BOSS Adapter 字段缺失时局部 fallback。
- BOSS Adapter 正文失败时整体 fallback 到 Generic Extractor。
- 最终仍统一返回现有 `CapturedJob`。
- 现有 Popup → Workflow → Agent → Match 链路不被破坏。
