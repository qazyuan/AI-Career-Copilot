import type { AIProvider } from '../../services/ai'
import { JobAnalyzerError } from './errors'
import {
  buildJobAnalyzerJsonRepairMessages,
  buildJobAnalyzerMessages,
} from './prompts'
import { parseJobAnalyzerResponse } from './parseJobAnalyzerResponse'
import type { AnalyzeJobInput, AnalyzeJobOutput } from './types'

const jobAnalyzerMaxTokens = 4096

export class JobAnalyzerAgent {
  private aiProvider: AIProvider

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider
  }

  async analyze(input: AnalyzeJobInput): Promise<AnalyzeJobOutput> {
    const jdText = input.jdText.trim()

    if (!jdText) {
      throw new JobAnalyzerError('Please paste a job description.', 'empty-input')
    }

    try {
      const response = await this.aiProvider.chat({
        messages: buildJobAnalyzerMessages(jdText),
        temperature: 0.2,
        maxTokens: jobAnalyzerMaxTokens,
        responseFormat: 'json_object',
      })
      const result = await this.parseOrRepairResponse(jdText, response.content)

      return {
        result,
        debug: {
          rawText: response.content,
        },
      }
    } catch (error) {
      if (error instanceof JobAnalyzerError) {
        throw error
      }

      throw new JobAnalyzerError(
        'Unable to analyze this job description.',
        'ai-request-failed',
      )
    }
  }

  private async parseOrRepairResponse(jdText: string, content: string) {
    try {
      return parseJobAnalyzerResponse(content)
    } catch (error) {
      if (!(error instanceof JobAnalyzerError)) {
        throw error
      }

      const repairedResponse = await this.aiProvider.chat({
        messages: buildJobAnalyzerJsonRepairMessages(jdText, content),
        temperature: 0,
        maxTokens: jobAnalyzerMaxTokens,
        responseFormat: 'json_object',
      })

      return parseJobAnalyzerResponse(repairedResponse.content)
    }
  }
}
