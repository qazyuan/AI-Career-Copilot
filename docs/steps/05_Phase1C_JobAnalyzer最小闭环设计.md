# Phase 1C：Job Analyzer 最小闭环设计

## 阶段目标

当前阶段目标不是做岗位匹配，而是验证第一个 Agent 能否通过 `AIProvider` 正确理解一段招聘 JD。

本阶段只处理手动输入或测试 JD，不读取真实招聘网页，避免同时引入 Content Script 复杂度。

本阶段不做：

- Resume Matching
- 简历分析
- 网页 JD 抓取
- 多 Agent Workflow

目标闭环：

```txt
用户配置 AI Provider
  ↓
手动输入 JD
  ↓
Job Analyzer Agent 调用 AIProvider
  ↓
AI 返回结构化岗位理解结果
  ↓
Options 页面展示结果
```

---

## 1. Job Analyzer 职责边界

Job Analyzer 只负责把一段招聘 JD 转成结构化岗位理解结果。

它负责：

- 识别职位名称
- 识别公司名称，如果 JD 中有
- 提取工作地点、工作模式
- 提取岗位职责
- 提取必备要求
- 提取加分项
- 提取技术栈、工具、关键词
- 归纳岗位资历级别
- 给出简短岗位摘要
- 标记信息缺失或不确定点

它不负责：

- 不计算候选人与岗位匹配度
- 不读取简历
- 不给简历优化建议
- 不生成面试题
- 不抓取网页
- 不保存岗位记录
- 不触发多 Agent workflow

一句话：

**Job Analyzer 是 JD → Structured Job Analysis 的单一 Agent。**

---

## 2. 输入数据结构

Phase 1C 的最小输入：

```ts
export interface AnalyzeJobInput {
  jdText: string
}
```

网页来源信息以后由 Content Script / Job Record 层负责，当前不进入 Agent 输入。

输入校验：

- `jdText.trim()` 不能为空
- 最小长度可以设为 30 或 50 字符，避免误点
- 太长暂时不做复杂切分
- Phase 1C 可以先通过 textarea 提示用户粘贴一段完整 JD

---

## 3. 输出结构化 TypeScript 类型

建议输出类型：

```ts
export type JobSeniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'unknown'

export type WorkMode =
  | 'onsite'
  | 'hybrid'
  | 'remote'
  | 'unknown'

export interface JobAnalyzerResult {
  title: string | null
  company: string | null
  location: string | null
  workMode: WorkMode
  seniority: JobSeniority
  summary: string | null
  responsibilities: string[]
  requiredQualifications: string[]
  preferredQualifications: string[]
  technicalSkills: string[]
  toolsAndPlatforms: string[]
  domainKeywords: string[]
  uncertainties: string[]
}
```

Agent 外层返回：

```ts
export interface AnalyzeJobOutput {
  result: JobAnalyzerResult
  debug?: {
    rawText: string
  }
}
```

说明：

- `result` 是 UI 和后续业务使用的结构化结果
- `debug.rawText` 是 AI 原始文本响应，只用于 Phase 1C 调试
- 失败结果不混在成功类型里，建议由 Agent 抛标准错误，UI 捕获后展示 message

---

## 4. Prompt 组织方式

建议拆成独立 prompt 文件或函数：

```txt
agents/jobAnalyzer/
  prompts.ts
```

Prompt 由两部分组成：

- `system prompt`：定义角色、职责边界、输出格式
- `user prompt`：传入 JD 文本

System Prompt 核心内容：

```txt
You are the Job Analyzer Agent for AI Career Copilot.

Your task:
Analyze a job description and return structured JSON.

Rules:
- Only analyze the job description.
- Do not compare it with any resume.
- Do not make candidate matching recommendations.
- Do not invent missing information.
- If information is missing, use null, "unknown", or [].
- Return JSON only. No markdown. No explanation.
```

User Prompt：

```txt
Analyze this job description:

<JD>
{jdText}
</JD>

Return JSON matching this schema:
{
  "title": "string|null",
  "company": "string|null",
  "location": "string|null",
  "workMode": "onsite|hybrid|remote|unknown",
  "seniority": "intern|junior|mid|senior|lead|manager|unknown",
  "summary": "string|null",
  "responsibilities": ["string"],
  "requiredQualifications": ["string"],
  "preferredQualifications": ["string"],
  "technicalSkills": ["string"],
  "toolsAndPlatforms": ["string"],
  "domainKeywords": ["string"],
  "uncertainties": ["string"]
}
```

建议请求参数：

```ts
temperature: 0.2
maxTokens: 1200
```

Phase 1C 先不依赖 Provider 的 JSON mode，因为 DeepSeek、OpenAI、Qwen、Custom Provider 不一定完全同构。

当前策略：

```txt
JSON only prompt
  ↓
本地 JSON 解析
  ↓
轻量 schema 校验
  ↓
失败时给 UI 明确错误
```

---

## 5. Agent 如何依赖 AIProvider

Agent 构造时接收 `AIProvider`：

```ts
export class JobAnalyzerAgent {
  constructor(private aiProvider: AIProvider) {}

  async analyze(input: AnalyzeJobInput): Promise<AnalyzeJobOutput> {
    const response = await this.aiProvider.chat(...)
    const result = parseJobAnalyzerResponse(response.content)

    return {
      result,
      rawText: response.content,
    }
  }
}
```

调用方负责从配置创建 Provider：

```ts
const config = await getAIProviderConfig()
const provider = createAIProvider(config)
const agent = new JobAnalyzerAgent(provider)
const output = await agent.analyze({ jdText })
```

这样：

- Job Analyzer 不知道 DeepSeek、OpenAI、Qwen
- Job Analyzer 不知道 API Key
- Job Analyzer 不知道 baseUrl
- Job Analyzer 只知道 `AIProvider.chat()`

这就是 Provider 可替换边界。

---

## 6. JSON 解析与失败处理

建议专门放解析函数：

```txt
agents/jobAnalyzer/parseJobAnalyzerResponse.ts
```

解析流程：

```txt
接收 response.content
  ↓
去除可能的 markdown 包裹
  ↓
尝试 JSON.parse
  ↓
校验字段类型
  ↓
对缺失字段做有限兜底
  ↓
如果关键字段完全不可用，抛出 JobAnalyzerError
```

需要处理的 markdown 包裹：

```txt
```json
{...}
```
```

错误类型：

```ts
export type JobAnalyzerErrorCode =
  | 'empty-input'
  | 'ai-request-failed'
  | 'invalid-json'
  | 'invalid-schema'

export class JobAnalyzerError extends Error {
  code: JobAnalyzerErrorCode
}
```

字段兜底原则：

- `company` / `location` 可为 `null`
- `workMode` / `seniority` 不合法则设为 `'unknown'`
- 数组字段不是数组则设为 `[]`
- `title` 缺失则设为 `null`
- `summary` 缺失则设为 `null`
- 如果整段 JSON 解析失败，直接失败，UI 显示：`AI response was not valid JSON.`

Phase 1C 不需要引入 schema 校验库，不引入额外依赖，手写轻量 type guard 即可。

---

## 7. 最小测试 UI 位置

建议放在 `Options` 页面下方的独立 section，而不是 popup。

理由：

- Options 已经能读取 AI 配置
- 当前是开发验证闭环，不是正式用户主流程
- popup 面积小，适合后续展示岗位分析结果，不适合长 JD 手动输入
- 避免引入 Content Script 和网页读取复杂度

建议 UI：

```txt
Options
  Provider configuration
  Job Analyzer Test
    Textarea: Paste job description
    Button: Analyze JD
    Loading state
    Error message
    Result preview
```

可以拆组件：

```txt
src/options/components/JobAnalyzerTestPanel.tsx
```

结果展示保持最小化：

- Title
- Company
- Location
- Work Mode
- Seniority
- Summary
- Skills
- Responsibilities
- Required Qualifications
- Uncertainties

这只是 Phase 1C 测试面板，不代表最终产品 UI。

---

## 8. 新增/修改文件计划

新增：

```txt
extension/src/agents/jobAnalyzer/types.ts
extension/src/agents/jobAnalyzer/prompts.ts
extension/src/agents/jobAnalyzer/JobAnalyzerAgent.ts
extension/src/agents/jobAnalyzer/parseJobAnalyzerResponse.ts
extension/src/agents/jobAnalyzer/errors.ts
extension/src/agents/jobAnalyzer/index.ts

extension/src/options/components/JobAnalyzerTestPanel.tsx
```

修改：

```txt
extension/src/agents/index.ts
extension/src/options/Options.tsx
extension/src/options/options.css
```

可能修改：

```txt
extension/src/services/ai/types.ts
```

当前 `AIChatRequest` 已经有：

```ts
maxTokens?: number
```

因此大概率不需要修改 `services/ai/types.ts`。

不修改：

```txt
extension/src/content/*
extension/src/popup/*
extension/src/background/*
extension/src/services/storage/*
extension/public/manifest.json
```

---

## 最小闭环数据流

```txt
Options 页面读取已保存 AI config
  ↓
用户粘贴 JD
  ↓
点击 Analyze JD
  ↓
Options 创建 provider:
createAIProvider(config)
  ↓
创建 JobAnalyzerAgent(provider)
  ↓
agent.analyze({ jdText })
  ↓
agent 调用 provider.chat()
  ↓
provider 真实请求 DeepSeek/OpenAI/Qwen/Custom
  ↓
agent 解析 JSON
  ↓
Options 展示结构化结果或错误
```

Phase 1C 完成后，项目将拥有第一个真实 Agent 闭环：

**用户配置 Provider → 手动输入 JD → Agent 调用 AIProvider → 返回结构化岗位理解结果。**
