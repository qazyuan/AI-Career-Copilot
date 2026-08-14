import type { AIChatMessage } from '../../services/ai'

const jsonSchema = [
  '{',
  '  "title": "string|null",',
  '  "company": "string|null",',
  '  "location": "string|null",',
  '  "workMode": "onsite|hybrid|remote|unknown",',
  '  "seniority": "intern|junior|mid|senior|lead|manager|unknown",',
  '  "summary": "string|null",',
  '  "responsibilities": ["string"],',
  '  "requiredQualifications": ["string"],',
  '  "preferredQualifications": ["string"],',
  '  "technicalSkills": ["string"],',
  '  "toolsAndPlatforms": ["string"],',
  '  "domainKeywords": ["string"],',
  '  "uncertainties": ["string"]',
  '}',
].join('\n')

export function buildJobAnalyzerMessages(jdText: string): AIChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are the Job Analyzer Agent for AI Career Copilot.',
        '',
        'Your task:',
        'Analyze a job description and return structured JSON.',
        '',
        'Rules:',
        '- Only analyze the job description.',
        '- Do not compare it with any resume.',
        '- Do not make candidate matching recommendations.',
        '- Do not invent missing information.',
        '- If information is missing, use null, "unknown", or [].',
        '- Write natural-language field values in the primary language of the job description.',
        '- If the job description is Chinese, use Chinese for summaries, responsibilities, qualifications, keywords, and uncertainties.',
        '- Keep technical terms, programming languages, frameworks, product names, and proper nouns in their original form, such as React, CSS, HTML, JavaScript, TypeScript, Node.js.',
        '- Return JSON only. No markdown. No explanation.',
        '- The first character of your response must be "{" and the last character must be "}".',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        'Analyze this job description:',
        '',
        '<JD>',
        jdText,
        '</JD>',
        '',
        'Return JSON matching this schema:',
        jsonSchema,
      ].join('\n'),
    },
  ]
}

export function buildJobAnalyzerJsonRepairMessages(
  jdText: string,
  previousResponse: string,
): AIChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You repair AI output for the Job Analyzer Agent.',
        'Return valid JSON only. No markdown. No explanation.',
        'The first character must be "{" and the last character must be "}".',
        'Use the primary language of the original job description for natural-language values.',
        'Keep technical terms and proper nouns in their original form.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        'The previous response was not parseable as valid JSON.',
        'Convert it into valid JSON matching this schema.',
        '',
        'Schema:',
        jsonSchema,
        '',
        'Original job description:',
        '<JD>',
        jdText,
        '</JD>',
        '',
        'Previous response:',
        '<RESPONSE>',
        previousResponse,
        '</RESPONSE>',
      ].join('\n'),
    },
  ]
}
