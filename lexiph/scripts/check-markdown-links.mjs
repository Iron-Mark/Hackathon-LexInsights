#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const IGNORED_DIRECTORIES = new Set(['.git', '.next', 'node_modules', 'test-results'])

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, '..')
const repoRoot = existsSync(resolve(appRoot, '..', '.git')) ? resolve(appRoot, '..') : appRoot

function walkMarkdownFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        walkMarkdownFiles(join(directory, entry.name), files)
      }

      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(join(directory, entry.name))
    }
  }

  return files
}

function isExternalLink(value) {
  return /^(https?:|mailto:|tel:|#|app:|file:)/i.test(value)
}

function withoutAnchor(value) {
  const hashIndex = value.indexOf('#')
  return hashIndex === -1 ? value : value.slice(0, hashIndex)
}

function cleanTarget(rawTarget, options = {}) {
  let target = rawTarget.trim()

  if (target.startsWith('<')) {
    const closingIndex = target.indexOf('>')
    target = closingIndex === -1 ? target.slice(1) : target.slice(1, closingIndex)
  } else if (!options.allowSpaces) {
    target = target.split(/\s+/)[0]
  }

  if (!target || isExternalLink(target)) {
    return null
  }

  return withoutAnchor(target)
}

function decodeTarget(target) {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

function resolveLocalTarget(markdownFile, target, root = repoRoot) {
  const decoded = decodeTarget(target)

  return decoded.startsWith('/')
    ? resolve(root, decoded.slice(1))
    : resolve(dirname(markdownFile), decoded)
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function maskFencedCodeBlocks(text) {
  const lines = text.split(/(\r?\n)/)
  let inFence = false

  return lines
    .map((part) => {
      if (part === '\n' || part === '\r\n') {
        return part
      }

      if (/^\s*```/.test(part)) {
        inFence = !inFence
        return part.replace(/[^\s`]/g, ' ')
      }

      return inFence ? part.replace(/[^\s]/g, ' ') : part
    })
    .join('')
}

function findInlineDestinationEnd(text, startIndex) {
  let depth = 0
  let inAngleDestination = false

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]
    const previousChar = index > 0 ? text[index - 1] : ''

    if (previousChar === '\\') {
      continue
    }

    if (inAngleDestination) {
      if (char === '>') {
        inAngleDestination = false
      }

      continue
    }

    if (char === '<' && depth === 0) {
      inAngleDestination = true
      continue
    }

    if (char === '(') {
      depth += 1
      continue
    }

    if (char === ')') {
      if (depth === 0) {
        return index
      }

      depth -= 1
    }
  }

  return -1
}

function collectInlineLinks(markdownFile, text) {
  const links = []
  const pattern = /!?\[[^\]]*\]\(/g
  let match

  while ((match = pattern.exec(text))) {
    const destinationStart = pattern.lastIndex
    const destinationEnd = findInlineDestinationEnd(text, destinationStart)

    if (destinationEnd === -1) {
      continue
    }

    const rawTarget = text.slice(destinationStart, destinationEnd)
    const target = cleanTarget(rawTarget)

    if (target) {
      links.push({
        line: lineNumberAt(text, match.index),
        raw: rawTarget.trim(),
        target,
        markdownFile,
      })
    }

    pattern.lastIndex = destinationEnd + 1
  }

  return links
}

function collectReferenceLinks(markdownFile, text) {
  const links = []
  const pattern = /^\s*\[[^\]]+\]:\s+(.+?)\s*$/gm
  let match

  while ((match = pattern.exec(text))) {
    const target = cleanTarget(match[1])

    if (target) {
      links.push({
        line: lineNumberAt(text, match.index),
        raw: match[1].trim(),
        target,
        markdownFile,
      })
    }
  }

  return links
}

function collectHtmlAttributeLinks(markdownFile, text) {
  const links = []
  const pattern = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/g
  let match

  while ((match = pattern.exec(text))) {
    const target = cleanTarget(match[2], { allowSpaces: true })

    if (target) {
      links.push({
        line: lineNumberAt(text, match.index),
        raw: match[2].trim(),
        target,
        markdownFile,
      })
    }
  }

  return links
}

function linkExists(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

function collectBrokenLinks(markdownFiles, root = repoRoot) {
  const broken = []

  for (const markdownFile of markdownFiles) {
    const text = readFileSync(markdownFile, 'utf8')
    const linkText = maskFencedCodeBlocks(text)
    const links = [
      ...collectInlineLinks(markdownFile, linkText),
      ...collectReferenceLinks(markdownFile, linkText),
      ...collectHtmlAttributeLinks(markdownFile, linkText),
    ]

    for (const link of links) {
      const resolved = resolveLocalTarget(markdownFile, link.target, root)

      if (!linkExists(resolved)) {
        broken.push({
          file: relative(root, markdownFile),
          line: link.line,
          target: link.raw,
        })
      }
    }
  }

  return broken
}

function run() {
  const markdownFiles = walkMarkdownFiles(repoRoot)
  const broken = collectBrokenLinks(markdownFiles, repoRoot)

  if (broken.length > 0) {
    console.error(`Markdown link check failed: ${broken.length} broken local link(s)`)

    for (const item of broken) {
      console.error(`- ${item.file}:${item.line} -> ${item.target}`)
    }

    process.exitCode = 1
    return
  }

  console.log(`Markdown link check passed: ${markdownFiles.length} file(s) scanned`)
}

export {
  cleanTarget,
  collectBrokenLinks,
  collectHtmlAttributeLinks,
  collectInlineLinks,
  collectReferenceLinks,
  findInlineDestinationEnd,
  linkExists,
  maskFencedCodeBlocks,
  resolveLocalTarget,
  withoutAnchor,
  walkMarkdownFiles,
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run()
}
