# Phase 3：Matching Agent 设计

## 阶段目标

输入：

```txt
ResumeProfile + JobAnalyzerResult
```

输出：

```txt
结构化岗位匹配结果 JobMatchResult
```

当前阶段只判断：

> 这个候选人与这个岗位的匹配程度，以及是否值得投递。

本阶段不做：

- 简历优化
- 面试题生成
- 职业规划
- 原始 PDF 读取
- 原始 JD 读取
- Content Script
- 依赖 DeepSeek / OpenAI / Qwen 具体实现

必须支持“可迁移能力”判断，而不是只做关键词匹配。

---

## 1. Matching Agent 职责边界

Matching Agent 负责判断：

- 候选人与岗位的匹配程度
- 是否值得投递
- 匹配优势在哪里
- 明显差距在哪里
- 哪些能力可以迁移
- 哪些风险会影响投递成功率

它不负责：

- 不生成简历优化建议
- 不生成面试题
- 不做职业规划
- 不重新解析简历
- 不重新解析 JD
- 不读取原始 PDF
- 不读取原始 JD
- 不直接依赖 DeepSeek / OpenAI / Qwen

一句话：

**Matching Agent 只消费结构化输入，输出结构化匹配判断。**

---

## 2. JobMatchResult 数据结构

建议主结构：

```ts
export type RecommendationLevel =
  | 'strong_apply'
  | 'apply'
  | 'consider'
  | 'not_recommended'

export interface JobMatchResult {
  overallScore: number
  recommendation: RecommendationLevel
  summary: string
  scoreBreakdown: MatchScoreBreakdown
  matchedStrengths: MatchEvidence[]
  partialMatches: MatchEvidence[]
  gaps: MatchGap[]
  blockingGaps: BlockingGap[]
  transferableStrengths: TransferableStrength[]
  risks: MatchRisk[]
  mustHaveAssessment: RequirementAssessment[]
  niceToHaveAssessment: RequirementAssessment[]
  uncertainties: string[]
}
```

子结构：

```ts
export interface MatchScoreBreakdown {
  technicalFit: number
  experienceFit: number
  domainFit: number
  projectFit: number
  requirementFit: number
}

export interface MatchEvidence {
  requirement: string
  evidenceFromResume: string
  explanation: string
}

export interface MatchGap {
  requirement: string
  gapType: 'missing' | 'weak' | 'unclear'
  explanation: string
  severity: 'low' | 'medium' | 'high'
}

export interface BlockingGap {
  requirement: string
  reason: string
  severity: 'medium' | 'high'
  canBeMitigatedByTransferableStrength: boolean
}

export interface TransferableStrength {
  fromResume: string
  appliesToRequirement: string
  transferReason: string
  confidence: 'low' | 'medium' | 'high'
}

export interface MatchRisk {
  risk: string
  reason: string
  severity: 'low' | 'medium' | 'high'
}

export interface RequirementAssessment {
  requirement: string
  status: 'met' | 'partially_met' | 'not_met' | 'unclear'
  evidenceFromResume: string | null
  explanation: string
}
```

---

## 3. 匹配评分维度

建议 5 个维度，每个维度范围为 `0-100`。

```txt
technicalFit: 30%
experienceFit: 20%
domainFit: 15%
projectFit: 15%
requirementFit: 20%
```

说明：

- `technicalFit`：技术栈、工程能力、相邻技术迁移能力的匹配程度
- `experienceFit`：年限、职级、职责复杂度、独立交付能力的匹配程度
- `domainFit`：行业、业务场景、产品类型的匹配程度
- `projectFit`：简历项目与岗位职责、产品形态、复杂度的相似程度
- `requirementFit`：JD 明确要求的满足程度，重点依据 must-have，nice-to-have 只作为较小影响因素

`requirementFit` 不应重复计算所有技术栈，而是关注“JD 明确写出并会影响筛选结果的要求”。

must-have 不仅包含技术要求，还应覆盖：

- 工作地点 / remote 限制
- 工作许可
- 语言
- 学历
- 证书
- 明确年限
- 明确必须具备的行业或业务经验
- 明确必须具备的工具、平台、框架或技术

---

## 4. overallScore 如何生成

不要让模型随意给总分。

Prompt 要求模型先给 `scoreBreakdown`，再按固定公式生成：

```txt
overallScore =
technicalFit * 0.30 +
experienceFit * 0.20 +
domainFit * 0.15 +
projectFit * 0.15 +
requirementFit * 0.20
```

本地代码也应该重新计算 `overallScore`，不要完全信模型返回值。

策略：

```txt
模型返回每个维度分数和解释
  ↓
本地 clamp 到 0-100
  ↓
本地按权重重新计算 overallScore
  ↓
结合 blockingGaps 生成 recommendation
```

基础推荐等级先由分数生成：

```ts
>= 85: 'strong_apply'
>= 70: 'apply'
>= 55: 'consider'
< 55: 'not_recommended'
```

然后再根据 `blockingGaps` 施加上限。

这样可以避免模型“拍脑袋给分”，也避免因为其他维度高分而掩盖关键硬性缺口。

---

## 5. 匹配结果字段定义

### matchedStrengths

明确匹配项。

JD 要求和简历证据之间有直接对应关系。

例：

```txt
JD 要 React，简历有 React 项目经验。
```

### partialMatches

部分匹配项。

候选人有相近经验，但不完全等同。

例：

```txt
JD 要 React Native，简历有 React 和 uni-app，但没有 React Native。
```

### gaps

差距项。

JD 要求中简历没有体现、体现较弱、或无法判断。

例：

```txt
JD 要 5 年后端经验，简历只有前端和少量 Node.js。
```

### blockingGaps

关键阻断缺口。

用于表示：

```txt
JD 明确为 must-have
  +
简历中没有证据显示满足
  +
也没有合理的可迁移能力可以弥补
```

`blockingGaps` 只应来自明确硬性要求，不应来自模糊偏好或 nice-to-have。

可以成为 blockingGap 的例子：

- JD 明确要求必须有工作许可，简历没有体现且无法从其他信息推断
- JD 明确要求必须英语作为工作语言，简历没有语言能力证据
- JD 明确要求必须在上海现场办公，候选人地点明显不匹配且无 relocation/remote 信息
- JD 明确要求 5 年以上 React Native 商业项目经验，简历完全没有移动端或相邻跨端经验
- JD 明确要求特定证书，简历未体现

不能成为 blockingGap 的例子：

- JD 要 React，简历主要是 Vue，但有 React 项目、组件化后台、状态管理经验
- JD 要 React Native，简历没有 React Native，但有 React + uni-app 跨端经验
- JD 写“熟悉某工具优先”，简历未体现该工具
- 简历未写某项信息，但 JD 本身没有把它表达为硬性要求

### transferableStrengths

可迁移能力。

不是关键词直接命中，但能力模式相近，可以迁移。

例：

```txt
候选人做过 Vue3 大型后台、组件库、权限系统，
可以迁移到 React 后台系统开发。
```

### risks

投递风险。

会影响投递成功率或面试通过率的因素。

例：

```txt
岗位明确要求 React Native，简历未体现移动端原生 / React Native。
```

`risks` 与 `blockingGaps` 的区别：

- `risks` 可以是一般投递风险，不一定阻断投递
- `blockingGaps` 是明确 must-have 且无法由合理迁移能力弥补的关键缺口
- 一个 high severity blockingGap 必须限制 recommendation 上限

---

## 6. 特殊情况处理

### Vue → React

处理原则：

- 不应简单判为不匹配
- 如果候选人有组件化、状态管理、后台系统、工程化经验，可标为 `partialMatches` 或 `transferableStrengths`
- 如果 JD 明确 must-have React，而简历只有 Vue、没有 React，则不能算完全满足
- 但 Vue → React 通常不应直接判为 `blockingGap`，除非 JD 明确要求不可替代的 React 深度经验，且简历既没有 React 证据，也没有足够相邻前端架构、组件化、状态管理经验

### 相邻技术栈

示例：

```txt
Vue / React / Angular
Node.js / NestJS / Express
Vite / Webpack / Rollup
Pinia / Redux / Zustand
uni-app / React Native / Flutter
```

处理原则：

- 相邻技术可产生可迁移能力
- 不能冒充直接经验
- 必须解释迁移理由和信心等级
- 存在合理相邻经验时，应优先进入 `partialMatches` 或 `transferableStrengths`，而不是直接进入 `blockingGaps`

### 转行岗位

处理原则：

- 看是否有领域、项目、能力模式可迁移
- 不应因为关键词少就直接低分
- 如果核心职责完全不同，风险要明确

### 年限略低但能力接近

处理原则：

- 如果 JD 要 5 年，候选人 4 年但项目复杂度强，可以 partial match
- 不能把年限直接补齐
- `experienceFit` 可给中高分，但 `risks` 要标明年限略低

### must-have 和 nice-to-have

处理原则：

- must-have 权重大
- must-have 缺失会显著影响 `requirementFit`
- must-have 如果明确、关键、无法通过迁移能力弥补，应进入 `blockingGaps`
- nice-to-have 缺失只轻微扣分
- Prompt 要求分别输出：
  - `mustHaveAssessment`
  - `niceToHaveAssessment`
- 对缺失信息保持 `unclear`，不得将“简历未写”直接判断为“不具备”

---

## 6.1 blockingGap 判定规则

一个 gap 只有同时满足以下条件，才可以进入 `blockingGaps`：

```txt
1. 该要求来自 JD 中明确的 must-have / 任职要求 / 硬性限制
2. 该要求会明显影响候选人是否能被筛选通过
3. ResumeProfile 中没有直接证据显示满足
4. ResumeProfile 中没有足够强的相邻经验或可迁移能力可以合理弥补
5. 该要求不是 nice-to-have，也不是模糊偏好
```

如果简历只是“未写”，但无法判断候选人是否具备：

```txt
status = 'unclear'
gapType = 'unclear'
不要直接放入 blockingGaps
```

除非 JD 明确该项是硬性门槛，并且缺失信息本身就会导致无法投递或无法通过筛选，例如：

```txt
必须持有某证书
必须具备工作许可
必须满足特定地点/现场办公限制
```

---

## 6.2 recommendation 生成规则

`recommendation` 不得只根据 `overallScore`。

推荐等级分两步生成。

第一步：根据 `overallScore` 得到基础推荐：

```ts
function getBaseRecommendation(score: number): RecommendationLevel {
  if (score >= 85) return 'strong_apply'
  if (score >= 70) return 'apply'
  if (score >= 55) return 'consider'
  return 'not_recommended'
}
```

第二步：根据 `blockingGaps` 施加上限：

```ts
function applyBlockingGapCap(
  base: RecommendationLevel,
  blockingGaps: BlockingGap[],
): RecommendationLevel {
  const hasHighBlockingGap = blockingGaps.some(
    (gap) => gap.severity === 'high',
  )

  const hasMediumBlockingGap = blockingGaps.some(
    (gap) => gap.severity === 'medium',
  )

  if (hasHighBlockingGap) {
    return minRecommendation(base, 'consider')
  }

  if (hasMediumBlockingGap) {
    return minRecommendation(base, 'apply')
  }

  return base
}
```

推荐上限：

```txt
high severity blockingGap:
  recommendation 最高只能是 consider

medium severity blockingGap:
  recommendation 最高只能是 apply

无 blockingGap:
  recommendation 按 overallScore 正常生成
```

这样即使候选人在其他维度很强，也不会因为总分高而掩盖硬性不满足项。

---

## 7. Prompt 设计

System Prompt 核心：

```txt
You are the Matching Agent for AI Career Copilot.

Your task:
Compare a structured ResumeProfile with a structured JobAnalyzerResult and return a structured job match result.

Rules:
- Only use the provided ResumeProfile and JobAnalyzerResult.
- Do not read or infer from original resume text.
- Do not read or infer from original job description text.
- Do not invent experience, skills, projects, or job requirements.
- Do not generate resume optimization advice.
- Do not generate interview questions.
- Do not give career planning advice.
- Support transferable skill reasoning.
- Do not rely on keyword matching only.
- Distinguish direct matches, partial matches, gaps, transferable strengths, and risks.
- Identify blockingGaps only for explicit must-have requirements that cannot be reasonably mitigated by transferable strengths.
- Do not treat missing resume information as not qualified. Use unclear when evidence is missing.
- Must-have requirements include technical requirements, location or remote constraints, work authorization, language, education, certifications, explicit years of experience, and other hard constraints.
- Return JSON only.
```

User Prompt 内容：

```txt
ResumeProfile:
{resumeProfileJson}

JobAnalyzerResult:
{jobAnalyzerResultJson}

Use this scoring formula:
technicalFit 30%
experienceFit 20%
domainFit 15%
projectFit 15%
requirementFit 20%

Recommendation must be determined by both overallScore and blockingGaps.
If any high severity blockingGap exists, recommendation cannot be higher than consider.
If any medium severity blockingGap exists, recommendation cannot be higher than apply.

Return JSON matching schema:
...
```

请求参数：

```ts
temperature: 0.1
maxTokens: 4096 或 8192
responseFormat: 'json_object'
```

---

## 8. 只依赖 ResumeProfile + JobAnalyzerResult

调用方式：

```ts
const provider = createAIProvider(config)
const agent = new MatchingAgent(provider)

const result = await agent.match({
  resumeProfile,
  jobAnalysis,
})
```

输入结构：

```ts
export interface MatchJobInput {
  resumeProfile: ResumeProfile
  jobAnalysis: JobAnalyzerResult
}
```

Agent 不接收：

- PDF text
- JD text
- file name
- page url
- content script data

这样 Matching Agent 后续可以稳定复用，无论 `JobAnalyzerResult` 来自手动输入还是网页抓取。

---

## 9. JSON 解析与校验策略

沿用 Phase 1C / Phase 2B：

- JSON only prompt
- `responseFormat: 'json_object'`
- 本地提取 JSON
- `JSON.parse`
- 轻量 schema normalize
- 解析失败时可做一次 JSON repair
- 本地重新计算 `overallScore`
- 本地根据 `overallScore` 生成基础 `recommendation`，再根据 `blockingGaps` 施加推荐上限

校验重点：

- 分数字段必须 clamp 到 `0-100`
- 数组字段非数组则 `[]`
- 枚举非法则 fallback
- `overallScore` 不直接信模型，按 breakdown 重新计算
- `recommendation` 不直接信模型，按本地规则由 `overallScore + blockingGaps` 共同生成

---

## 10. 最小测试 UI 位置

继续放在 Options 页面，作为测试区块：

```txt
Options
  Provider configuration
  Job Analyzer Test
  Resume PDF Text Extraction / Resume Agent
  Matching Agent Test
    Show current ResumeProfile status
    Show current JobAnalyzerResult status
    Button: Analyze Match
    Loading state
    Error state
    JobMatchResult preview
```

最小 UI 不需要重新输入数据，直接使用当前页面状态：

- 最近一次 `ResumeProfile`
- 最近一次 `JobAnalyzerResult`

如果缺失：

- 没有 ResumeProfile：提示先分析简历
- 没有 JobAnalyzerResult：提示先分析 JD

---

## 11. 新增/修改文件规划

新增：

```txt
extension/src/agents/matching/types.ts
extension/src/agents/matching/errors.ts
extension/src/agents/matching/prompts.ts
extension/src/agents/matching/parseJobMatchResponse.ts
extension/src/agents/matching/calculateMatchScore.ts
extension/src/agents/matching/MatchingAgent.ts
extension/src/agents/matching/index.ts
```

Options UI：

```txt
extension/src/options/components/MatchingAgentTestPanel.tsx
```

Storage 可选：

```txt
extension/src/services/storage/jobMatchStorage.ts
```

当前 Phase 3 如果只做测试闭环，可以先不持久化 `JobMatchResult`。如果要刷新后保留结果，再加 storage。

需要修改：

```txt
extension/src/agents/index.ts
extension/src/options/Options.tsx
extension/src/options/options.css
docs/steps/07_Phase3_MatchingAgent设计.md
```

---

## Phase 3 最小闭环

```txt
已有 ResumeProfile
  +
已有 JobAnalyzerResult
  ↓
createAIProvider(config)
  ↓
new MatchingAgent(provider)
  ↓
agent.match({ resumeProfile, jobAnalysis })
  ↓
AIProvider.chat()
  ↓
parseJobMatchResponse()
  ↓
本地重算 overallScore / recommendation
  ↓
Options 展示 JobMatchResult
```

Phase 3 完成后，核心链路变成：

```txt
PDF 简历 → ResumeProfile
手动 JD → JobAnalyzerResult
ResumeProfile + JobAnalyzerResult → JobMatchResult
```
