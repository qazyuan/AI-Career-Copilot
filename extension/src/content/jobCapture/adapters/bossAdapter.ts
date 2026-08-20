import type { CapturedJob } from '../../../shared/jobCapture'
import {
  cleanupBossDescriptionText,
  extractBossFields,
  isBossDesktopJobDetailPage,
} from './bossExtractors'
import type { JobSiteAdapter } from './types'

const bossAdapterId = 'boss'
const bossMinDescriptionLength = 120

export const bossAdapter: JobSiteAdapter = {
  id: bossAdapterId,
  label: 'BOSS直聘',
  canHandle: isBossDesktopJobDetailPage,
  capture: (context) => {
    const fields = extractBossFields(context.document)
    const jobDescription = fields.jobDescription

    if (!jobDescription || jobDescription.length < bossMinDescriptionLength) {
      return null
    }

    const contentText = buildBossCapturedContent(fields)
    const extractionWarnings = getBossExtractionWarnings(fields)

    return {
      url: context.location.href,
      title: fields.jobTitle,
      siteName: 'BOSS直聘',
      capturedAt: context.capturedAt,
      source: 'adapter',
      adapterId: bossAdapterId,
      contentText,
      rawPageTitle: context.document.title,
      metadata: {
        jobTitle: fields.jobTitle,
        company: fields.company,
        salary: fields.salary,
        location: fields.location,
        confidence: 'high',
        extractionWarnings,
      },
      stats: {
        textLength: contentText.length,
        textBlockCount: contentText.split('\n').filter(Boolean).length,
      },
    } satisfies CapturedJob
  },
}

function buildBossCapturedContent(fields: ReturnType<typeof extractBossFields>) {
  const lines = [
    formatField('职位', fields.jobTitle),
    formatField('公司', fields.company),
    formatField('薪资', fields.salary),
    formatField('地点', fields.location),
    formatField('经验要求', fields.experienceRequirement),
    formatField('学历要求', fields.educationRequirement),
    '职位描述',
    cleanupBossDescriptionText(fields.jobDescription ?? ''),
  ].filter(Boolean)

  return lines.join('\n')
}

function formatField(label: string, value: string | null) {
  return value ? `${label}: ${value}` : null
}

function getBossExtractionWarnings(fields: ReturnType<typeof extractBossFields>) {
  const warnings: string[] = []

  if (!fields.jobTitle) {
    warnings.push('BOSS adapter could not reliably extract the job title.')
  }

  if (!fields.company) {
    warnings.push('BOSS adapter could not reliably extract the company.')
  }

  if (!fields.salary) {
    warnings.push('BOSS adapter could not reliably extract the salary.')
  }

  if (!fields.location) {
    warnings.push('BOSS adapter could not reliably extract the location.')
  }

  return warnings
}
