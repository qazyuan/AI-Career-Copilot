# Phase 2：Resume Agent 设计

## 阶段目标

让插件能够读取用户上传的 PDF 简历，并生成结构化 `ResumeProfile`，为后续 Matching Agent 提供稳定输入。

本阶段继续保持单 Agent、最小闭环。

拆分为：

```txt
Phase 2A：
PDF 上传 → 本地文本提取

Phase 2B：
Resume Text → Resume Agent → ResumeProfile
```

本阶段不做：

- 岗位匹配
- 简历优化建议
- 职业规划
- Content Script
- 上传简历到本项目自己的服务器

Resume Agent 只负责“理解简历中已有事实”，不得编造简历中不存在的经历、技能和量化结果。

---

## 1. Resume Agent 职责边界

Resume Agent 负责把简历文本转成稳定的结构化 `ResumeProfile`。

它负责：

- 提取候选人基础信息
- 提取教育经历
- 提取工作经历
- 提取项目经历
- 提取技能
- 提取证书和语言能力
- 提取简历中明确出现的量化结果
- 归纳候选人的经验年限和主要方向
- 标记不确定或缺失信息

它不负责：

- 不做岗位匹配
- 不生成简历优化建议
- 不做职业规划
- 不编造经历、技能、公司、项目、数字
- 不根据常识补充简历中没有写的内容

---

## 2. ResumeProfile 数据结构

建议主结构：

```ts
export interface ResumeProfile {
  candidate: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    links: string[]
  }
  summary: string | null
  totalYearsOfExperience: number | null
  statedTargetRoles: string[]
  technicalSkills: string[]
  softSkills: string[]
  toolsAndPlatforms: string[]
  domainKeywords: string[]
  workExperiences: WorkExperience[]
  projects: ResumeProject[]
  education: EducationExperience[]
  certifications: string[]
  languages: string[]
  achievements: string[]
  uncertainties: string[]
}
```

子结构：

```ts
export interface WorkExperience {
  company: string | null
  title: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  responsibilities: string[]
  achievements: string[]
  technologies: string[]
}

export interface ResumeProject {
  name: string | null
  role: string | null
  description: string | null
  responsibilities: string[]
  achievements: string[]
  technologies: string[]
}

export interface EducationExperience {
  school: string | null
  degree: string | null
  major: string | null
  startDate: string | null
  endDate: string | null
}
```

日期先使用字符串，避免过早引入日期解析复杂度。Prompt 需要要求尽量标准化为：

```txt
YYYY-MM / YYYY / present / null
```

`totalYearsOfExperience` 只有在时间信息足够明确时计算，重叠工作经历不能重复累计。无法可靠计算时返回 `null`。

`statedTargetRoles` 只提取简历中明确写出的求职目标，不允许 Resume Agent 根据经历推断职业方向。

---

## 3. PDF 本地解析方案

Phase 2A 使用浏览器内 PDF 文本提取：

```txt
用户选择 PDF
  ↓
File API 读取 ArrayBuffer
  ↓
pdf.js / pdfjs-dist 解析 PDF
  ↓
逐页 getTextContent()
  ↓
合并文本
  ↓
展示提取结果
```

文本提取输出：

```ts
export interface ParsedResumeText {
  fileName: string
  pageCount: number
  text: string
}
```

注意：

- 不做 OCR
- 扫描版 PDF 可能提取不到文字
- 本阶段只处理可复制文本型 PDF
- 文件内容不进入本项目服务器
- PDF 解析失败时，需要给用户明确错误

---

## 4. 是否需要第三方依赖

建议需要：`pdfjs-dist`。

原因：

- 浏览器原生 API 不能直接可靠解析 PDF 文本
- `pdfjs-dist` 是 Mozilla PDF.js 的 NPM 预构建包
- 适合浏览器端 PDF 解析
- 不需要后端
- 包本身提供 TypeScript declarations

代价：

- 增加 bundle 体积
- 需要处理 worker 配置
- 对扫描版 PDF 无能为力，需要后续 OCR 才能处理

实现时应以官方 PDF.js / `pdfjs-dist` 文档为依据。

---

## 5. Resume Agent Prompt 设计

System Prompt 核心：

```txt
You are the Resume Agent for AI Career Copilot.

Your task:
Extract factual information from a resume and return structured JSON.

Rules:
- Only use facts explicitly present in the resume text.
- Do not invent experience, skills, metrics, projects, employers, dates, or education.
- Only extract statedTargetRoles when the resume explicitly states target roles. Do not infer career direction from experience.
- Calculate totalYearsOfExperience only when dates are clear enough. Do not double-count overlapping work periods. Use null when it cannot be calculated reliably.
- Normalize dates as YYYY-MM, YYYY, present, or null when possible.
- Do not optimize the resume.
- Do not give career advice.
- Do not match the resume to any job.
- If information is missing, use null, [] or unknown.
- Use the primary language of the resume for natural-language values.
- Keep technical terms and proper nouns in their original form.
- Return JSON only.
```

请求参数建议：

```ts
temperature: 0.1
maxTokens: 4096
responseFormat: 'json_object'
```

必要时复用 Phase 1C 的策略：第一次 JSON 解析失败后，发起一次 JSON repair 请求。

---

## 6. AIProvider 依赖方式

Resume Agent 构造时接收 `AIProvider`：

```ts
const provider = createAIProvider(config)
const agent = new ResumeAgent(provider)
const output = await agent.analyze({ resumeText })
```

Agent 内部只调用：

```ts
aiProvider.chat(...)
```

它不知道：

- DeepSeek / OpenAI / Qwen
- API Key
- Base URL
- Model 细节

后续 Matching Agent 可以稳定接收 `ResumeProfile`，而不是依赖某个具体 Provider 的输出。

---

## 7. 错误类型

PDF 解析错误：

```ts
type ResumePdfParseErrorCode =
  | 'invalid-file-type'
  | 'file-too-large'
  | 'pdf-load-failed'
  | 'empty-pdf-text'
  | 'encrypted-pdf'
  | 'unsupported-pdf'
```

AI 解析错误：

```ts
type ResumeAgentErrorCode =
  | 'empty-input'
  | 'ai-request-failed'
  | 'invalid-json'
  | 'invalid-schema'
```

典型场景：

- 用户上传的不是 PDF
- PDF 是扫描件，提取文本为空
- PDF 加密或损坏
- AI 返回空内容
- AI 返回非 JSON
- JSON 字段结构不符合预期

---

## 8. 简历数据后续如何保存

Phase 2 当前只持久化 `ResumeProfile`，原始 PDF 文本先不长期保存到 Chrome Storage。

后续如果简历文本较长，或要保存多个版本，再迁移到 IndexedDB：

```txt
Chrome Storage:
  当前 resumeProfile
  当前 resumeProfileId

IndexedDB:
  resume text snapshot
  resume profile history
  uploaded file metadata
```

Matching Agent 后续只依赖：

```ts
ResumeProfile + JobAnalyzerResult
```

不直接依赖 PDF 文件或原始简历文本。

---

## 9. 最小测试 UI 位置

建议继续放在 Options 页面下方，作为 Phase 2 测试面板：

```txt
Options
  Provider configuration
  Job Analyzer Test
  Resume Agent Test
    Upload PDF
    Extract text
    Show extracted text preview
    Analyze Resume
    Show ResumeProfile result
```

理由：

- Options 已经有 AI 配置
- PDF 上传和长文本预览不适合 popup
- Phase 2 是开发验证闭环，不是最终产品界面
- 暂不引入 Content Script

---

## 10. 文件规划

Phase 2A 新增：

```txt
extension/src/services/resumePdf/types.ts
extension/src/services/resumePdf/errors.ts
extension/src/services/resumePdf/extractTextFromPdf.ts
extension/src/services/resumePdf/index.ts
```

Phase 2B 新增：

```txt
extension/src/agents/resume/types.ts
extension/src/agents/resume/errors.ts
extension/src/agents/resume/prompts.ts
extension/src/agents/resume/parseResumeProfileResponse.ts
extension/src/agents/resume/ResumeAgent.ts
extension/src/agents/resume/index.ts
```

Phase 2B Storage 新增：

```txt
extension/src/services/storage/resumeProfileStorage.ts
```

Options 测试 UI 新增：

```txt
extension/src/options/components/ResumeAgentTestPanel.tsx
```

当前实现可以复用 Phase 2A 的 PDF 面板，在同一面板中增加：

```txt
Analyze Resume
loading 状态
错误状态
ResumeProfile 结构化预览
```

需要修改：

```txt
extension/src/agents/index.ts
extension/src/options/Options.tsx
extension/src/options/options.css
extension/package.json
extension/package-lock.json
```

`package.json` 修改是为了加入 `pdfjs-dist`。

---

## Phase 2 最小闭环

```txt
上传 PDF
  ↓
本地提取 resume text
  ↓
用户点击 Analyze Resume
  ↓
createAIProvider(config)
  ↓
new ResumeAgent(provider)
  ↓
ResumeAgent.analyze({ resumeText })
  ↓
返回 ResumeProfile
  ↓
Options 展示结构化结果
```
