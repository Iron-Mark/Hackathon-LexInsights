function normalizeSectionLine(line: string) {
  return line
    .trim()
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .replace(/^__(.*)__$/, '$1')
    .trim()
}

function isPracticalChecklistHeading(line: string) {
  return /^(#{1,6}\s*)?Practical Checklist\s*:?\s*$/i.test(normalizeSectionLine(line))
}

function isChecklistEndHeading(line: string) {
  return /^#{1,6}\s+\S/.test(line.trim()) ||
    /^(Answer|Better Search|Citation Coverage|Common Drafting or Compliance Gaps to Check|Gaps To Avoid|How This Was Found|Limits|Provider Mode|Relevant Authorities|Likely Relevant Authorities|Result|To Make This More Precise|What You Can Try)\s*:?\s*$/i.test(
      normalizeSectionLine(line)
    )
}

function removeStandaloneQueryLines(content: string) {
  const lines = content.split('\n')
  const nextLines: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    if (/^Query:\s*/i.test(lines[index].trim())) {
      if (lines[index + 1]?.trim() === '') {
        index += 1
      }

      continue
    }

    nextLines.push(lines[index])
  }

  return nextLines.join('\n')
}

export function formatPracticalChecklistMarkdown(content: string) {
  let insidePracticalChecklist = false

  return content
    .split('\n')
    .map((line) => {
      if (isPracticalChecklistHeading(line)) {
        insidePracticalChecklist = true
        return line
      }

      if (insidePracticalChecklist && isChecklistEndHeading(line)) {
        insidePracticalChecklist = false
      }

      if (!insidePracticalChecklist) {
        return line
      }

      const bulletMatch = line.match(/^(\s*)([-*\u2022])\s+(?!\[[ xX]\]\s)(.+)$/)

      if (!bulletMatch) {
        return line
      }

      return `${bulletMatch[1]}- [ ] ${bulletMatch[3]}`
    })
    .join('\n')
}

export function formatReportMarkdownForPreview(content: string) {
  return formatPracticalChecklistMarkdown(removeStandaloneQueryLines(content))
}
