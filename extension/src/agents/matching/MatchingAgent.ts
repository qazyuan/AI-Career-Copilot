import type { AIProvider } from '../../services/ai'
import { MatchingAgentError } from './errors'
import {
  buildMatchingAgentMessages,
  buildMatchingJsonRepairMessages,
} from './prompts'
import { parseJobMatchResponse } from './parseJobMatchResponse'
import type { MatchJobInput, MatchJobOutput } from './types'

const matchingAgentMaxTokens = 8192

export class MatchingAgent {
  private aiProvider: AIProvider

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider
  }

  async match(input: MatchJobInput): Promise<MatchJobOutput> {
    if (!input.resumeProfile || !input.jobAnalysis) {
      throw new MatchingAgentError(
        'Please analyze both a resume and a job description first.',
        'missing-input',
      )
    }

    try {
      const response = await this.aiProvider.chat({
        messages: buildMatchingAgentMessages(
          input.resumeProfile,
          input.jobAnalysis,
        ),
        temperature: 0.1,
        maxTokens: matchingAgentMaxTokens,
        responseFormat: 'json_object',
      })
      const result = await this.parseOrRepairResponse(input, response.content)

      return {
        result,
        debug: {
          rawText: response.content,
        },
      }
    } catch (error) {
      if (error instanceof MatchingAgentError) {
        throw error
      }

      throw new MatchingAgentError(
        'Unable to analyze this match.',
        'ai-request-failed',
      )
    }
  }

  private async parseOrRepairResponse(input: MatchJobInput, content: string) {
    try {
      return parseJobMatchResponse(content)
    } catch (error) {
      if (!(error instanceof MatchingAgentError)) {
        throw error
      }

      const repairedResponse = await this.aiProvider.chat({
        messages: buildMatchingJsonRepairMessages(
          input.resumeProfile,
          input.jobAnalysis,
        ),
        temperature: 0,
        maxTokens: matchingAgentMaxTokens,
        responseFormat: 'json_object',
      })

      return parseJobMatchResponse(repairedResponse.content)
    }
  }
}
