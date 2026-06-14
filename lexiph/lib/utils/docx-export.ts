interface DocxExportOptions {
  content: string
  fileName: string
  title?: string
}

/**
 * Convert markdown content to DOCX format
 * Handles basic markdown syntax: headers, bold, lists, etc.
 */
export async function exportToDocx({ content, fileName, title }: DocxExportOptions): Promise<void> {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Packer } = await import('docx')
  const lines = content.split('\n')
  const paragraphs: InstanceType<typeof Paragraph>[] = []

  // Add title if provided
  if (title) {
    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    )
  }

  let inList = false
  let listLevel = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (inList) {
        inList = false
        listLevel = 0
      }
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }))
      continue
    }

    // Headers
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      )
      inList = false
    } else if (trimmedLine.startsWith('## ')) {
      const text = trimmedLine.slice(3)
      const color = text.includes('✅') ? '16a34a' : text.includes('⚠️') ? 'd97706' : text.includes('🚫') ? 'dc2626' : '1e293b'
      
      paragraphs.push(
        new Paragraph({
          text: text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          border: {
            left: {
              color: color,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 24,
            },
          },
        })
      )
      inList = false
    } else if (trimmedLine.startsWith('### ')) {
      const text = trimmedLine.slice(4)
      const color = text.includes('✅') ? '16a34a' : text.includes('⚠️') ? 'd97706' : text.includes('🚫') ? 'dc2626' : '475569'
      
      paragraphs.push(
        new Paragraph({
          text: text,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          border: {
            left: {
              color: color,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 16,
            },
          },
        })
      )
      inList = false
    }
    // Horizontal rule
    else if (trimmedLine === '---') {
      paragraphs.push(
        new Paragraph({
          text: '',
          border: {
            bottom: {
              color: 'cbd5e1',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { before: 120, after: 120 },
        })
      )
      inList = false
    }
    // List items
    else if (trimmedLine.startsWith('- ') || /^\d+\./.test(trimmedLine)) {
      const isNumbered = /^\d+\./.test(trimmedLine)
      const text = isNumbered ? trimmedLine.replace(/^\d+\.\s*/, '') : trimmedLine.slice(2)
      
      // Determine color based on status emoji
      let color = '334155'
      let bold = false
      if (text.includes('✅')) {
        color = '16a34a'
        bold = true
      } else if (text.includes('⚠️')) {
        color = 'd97706'
        bold = true
      } else if (text.includes('🚫')) {
        color = 'dc2626'
        bold = true
      }
      
      paragraphs.push(
        new Paragraph({
          text: text,
          bullet: isNumbered ? undefined : { level: listLevel },
          numbering: isNumbered ? { reference: 'default-numbering', level: listLevel } : undefined,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: text,
              color: color,
              bold: bold,
            }),
          ],
        })
      )
      inList = true
    }
    // Bold text (standalone)
    else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.slice(2, -2),
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        })
      )
      inList = false
    }
    // Regular paragraphs with inline formatting
    else {
      const children: InstanceType<typeof TextRun>[] = []
      let currentText = ''
      let isBold = false
      
      // Simple inline bold parsing
      for (let j = 0; j < trimmedLine.length; j++) {
        if (trimmedLine[j] === '*' && trimmedLine[j + 1] === '*') {
          if (currentText) {
            children.push(new TextRun({ text: currentText, bold: isBold }))
            currentText = ''
          }
          isBold = !isBold
          j++ // Skip next asterisk
        } else {
          currentText += trimmedLine[j]
        }
      }
      
      if (currentText) {
        children.push(new TextRun({ text: currentText, bold: isBold }))
      }
      
      paragraphs.push(
        new Paragraph({
          children: children.length > 0 ? children : [new TextRun({ text: trimmedLine })],
          spacing: { after: 100 },
        })
      )
      inList = false
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
