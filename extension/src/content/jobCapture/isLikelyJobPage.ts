const strongJobKeywords = [
  '职位描述',
  '岗位职责',
  '任职要求',
  '职位要求',
  '工作职责',
  'responsibilities',
  'requirements',
  'qualifications',
  'about the role',
  'what you will do',
]

const weakJobKeywords = [
  '薪资',
  '经验',
  '学历',
  'react',
  'vue',
  'javascript',
  'typescript',
  'node.js',
]

export function getJobPageConfidence(text: string) {
  const lowerText = text.toLowerCase()
  const strongHits = strongJobKeywords.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase()),
  )
  const weakHits = weakJobKeywords.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase()),
  )

  if (strongHits.length >= 2 || (strongHits.length >= 1 && weakHits.length >= 2)) {
    return 'high'
  }

  if (strongHits.length >= 1 || weakHits.length >= 2) {
    return 'medium'
  }

  return 'low'
}
