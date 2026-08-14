import type { AIProvider } from '../../services/ai'
import { ResumeAgentError } from './errors'
import {
  buildResumeAgentMessages,
  buildResumeJsonRepairMessages,
} from './prompts'
import { parseResumeProfileResponse } from './parseResumeProfileResponse'
import type { AnalyzeResumeInput, AnalyzeResumeOutput } from './types'

const resumeAgentMaxTokens = 8192

export class ResumeAgent {
  private aiProvider: AIProvider

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider
  }

  async analyze(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
    const resumeText = input.resumeText.trim()

    if (!resumeText) {
      throw new ResumeAgentError('Please extract resume text first.', 'empty-input')
    }

    try {
      const response = await this.aiProvider.chat({
        messages: buildResumeAgentMessages(resumeText),
        temperature: 0.1,
        maxTokens: resumeAgentMaxTokens,
        responseFormat: 'json_object',
      })
      const profile = await this.parseOrRepairResponse(
        resumeText,
        response.content,
      )

      return {
        profile,
        debug: {
          rawText: response.content,
        },
      }
    } catch (error) {
      if (error instanceof ResumeAgentError) {
        throw error
      }

      throw new ResumeAgentError(
        'Unable to analyze this resume.',
        'ai-request-failed',
      )
    }
  }

  private async parseOrRepairResponse(resumeText: string, content: string) {
    try {
      return parseResumeProfileResponse(content)
    } catch (error) {
      if (!(error instanceof ResumeAgentError)) {
        throw error
      }

      const repairedResponse = await this.aiProvider.chat({
        messages: buildResumeJsonRepairMessages(resumeText),
        temperature: 0,
        maxTokens: resumeAgentMaxTokens,
        responseFormat: 'json_object',
      })

      return parseResumeProfileResponse(repairedResponse.content)
    }
  }
}
