import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { ResumePdfParseError } from './errors'
import type { ParsedResumeText } from './types'

const maxPdfFileSize = 10 * 1024 * 1024

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractTextFromPdf(file: File): Promise<ParsedResumeText> {
  validatePdfFile(file)

  const data = await file.arrayBuffer()

  try {
    const pdf = await pdfjs.getDocument({ data }).promise
    const pageTexts: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const textItems = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)

      pageTexts.push(textItems.join(' '))
    }

    const text = pageTexts.join('\n\n').trim()

    if (!text) {
      throw new ResumePdfParseError(
        'No selectable text was found in this PDF. Scanned PDFs are not supported yet.',
        'empty-pdf-text',
      )
    }

    return {
      fileName: file.name,
      pageCount: pdf.numPages,
      text,
    }
  } catch (error) {
    if (error instanceof ResumePdfParseError) {
      throw error
    }

    throw new ResumePdfParseError(
      'Unable to read this PDF. It may be encrypted, damaged, or unsupported.',
      'pdf-load-failed',
    )
  }
}

function validatePdfFile(file: File) {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    throw new ResumePdfParseError('Please upload a PDF file.', 'invalid-file-type')
  }

  if (file.size > maxPdfFileSize) {
    throw new ResumePdfParseError(
      'Please upload a PDF smaller than 10 MB.',
      'file-too-large',
    )
  }
}
