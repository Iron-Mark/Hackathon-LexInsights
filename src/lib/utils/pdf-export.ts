import { downloadBlob } from '@/lib/utils/browser-actions'

interface PdfExportOptions {
  content: string
  fileName: string
  title?: string
}

type RGB = [number, number, number]

/**
 * Render Markdown compliance-report content to a PDF (PRD P1-1), mirroring the
 * structure of docx-export.ts: headings, color-coded finding sections,
 * checklists, and bullets. Uses jsPDF on the client with standard fonts, so
 * emoji status markers (checkmark / warning / prohibited) are mapped to text
 * colors rather than rendered as glyphs. The content passed in already includes
 * the P0-3 AI-use disclosure block appended by the caller.
 */
export async function exportToPdf({ content, fileName, title }: PdfExportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const write = (
    text: string,
    {
      size,
      bold = false,
      color = [15, 23, 42] as RGB,
      gapAfter = 6,
      indent = 0,
    }: { size: number; bold?: boolean; color?: RGB; gapAfter?: number; indent?: number }
  ) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(color[0], color[1], color[2])
    const wrapped = doc.splitTextToSize(text, maxWidth - indent) as string[]
    const lineHeight = size * 1.35
    for (const line of wrapped) {
      ensureSpace(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    }
    y += gapAfter
  }

  const strip = (s: string) => s.replace(/\*\*/g, '').replace(/`/g, '')
  const stripEmoji = (s: string) =>
    s.replace(/[☀-➿️\u{1F000}-\u{1FAFF}]/gu, '').replace(/\s{2,}/g, ' ').trim()

  if (title) {
    write(title, { size: 18, bold: true, gapAfter: 12 })
  }

  for (const raw of content.split('\n')) {
    const t = raw.trim()
    if (!t) {
      y += 6
      continue
    }

    if (t === '---' || t === '***') {
      ensureSpace(14)
      doc.setDrawColor(203, 213, 225)
      doc.line(margin, y, pageWidth - margin, y)
      y += 14
      continue
    }
    if (t.startsWith('### ')) {
      write(stripEmoji(strip(t.slice(4))), { size: 12, bold: true, gapAfter: 4 })
      continue
    }
    if (t.startsWith('## ')) {
      const text = t.slice(3)
      let color: RGB = [30, 41, 59]
      if (/✅/.test(text)) color = [22, 163, 74] // green: compliant
      else if (/⚠/.test(text)) color = [217, 119, 6] // amber: warning
      else if (/\u{1F6AB}|❌/u.test(text)) color = [220, 38, 38] // red: critical
      write(stripEmoji(strip(text)), { size: 14, bold: true, color, gapAfter: 6 })
      continue
    }
    if (t.startsWith('# ')) {
      write(stripEmoji(strip(t.slice(2))), { size: 16, bold: true, gapAfter: 8 })
      continue
    }

    const checkbox = t.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/)
    if (checkbox) {
      const checked = checkbox[1].toLowerCase() === 'x'
      write(`${checked ? '[x]' : '[ ]'} ${stripEmoji(strip(checkbox[2]))}`, { size: 11, indent: 14, gapAfter: 2 })
      continue
    }
    const bullet = t.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      write(`- ${stripEmoji(strip(bullet[1]))}`, { size: 11, indent: 14, gapAfter: 2 })
      continue
    }
    const numbered = t.match(/^(\d+)\.\s+(.*)$/)
    if (numbered) {
      write(`${numbered[1]}. ${stripEmoji(strip(numbered[2]))}`, { size: 11, indent: 14, gapAfter: 2 })
      continue
    }

    write(stripEmoji(strip(t)), { size: 11, gapAfter: 6 })
  }

  downloadBlob(doc.output('blob'), `${fileName}.pdf`)
}
