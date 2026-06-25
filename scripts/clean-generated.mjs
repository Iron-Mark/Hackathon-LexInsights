#!/usr/bin/env node

import { existsSync, lstatSync, readdirSync, rmSync, rmdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = process.cwd()
const rootPath = resolve(rootDir)

const explicitTargets = [
  '.tmp',
  'test-results',
  'playwright-report',
  'coverage',
  'tsconfig.tsbuildinfo',
]

const generatedFilePatterns = [
  /^dev-server\..*\.log$/,
  /^start-server\..*\.log$/,
  /^npm-debug\.log.*$/,
  /^yarn-debug\.log.*$/,
  /^yarn-error\.log.*$/,
  /^\.pnpm-debug\.log.*$/,
]

function assertInsideRoot(targetPath) {
  const resolvedTarget = resolve(rootPath, targetPath)

  if (resolvedTarget !== rootPath && !resolvedTarget.startsWith(`${rootPath}\\`) && !resolvedTarget.startsWith(`${rootPath}/`)) {
    throw new Error(`Refusing to clean outside the project root: ${resolvedTarget}`)
  }

  return resolvedTarget
}

function removePath(resolvedTarget, label) {
  if (!existsSync(resolvedTarget)) {
    return true
  }

  const stats = lstatSync(resolvedTarget)

  if (!stats.isDirectory()) {
    try {
      unlinkSync(resolvedTarget)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Skipped locked generated artifact: ${label} (${message})`)
      return false
    }
  }

  let removedEverything = true

  for (const entry of readdirSync(resolvedTarget)) {
    const childLabel = `${label}/${entry}`
    const childPath = resolve(resolvedTarget, entry)
    removedEverything = removePath(childPath, childLabel) && removedEverything
  }

  try {
    rmdirSync(resolvedTarget)
    return removedEverything
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Kept generated directory with locked entries: ${label} (${message})`)
    return false
  }
}

function removeTarget(targetPath) {
  const resolvedTarget = assertInsideRoot(targetPath)

  try {
    return removePath(resolvedTarget, targetPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      rmSync(resolvedTarget, { recursive: true, force: true })
      return true
    } catch {
      console.warn(`Skipped locked generated artifact: ${targetPath} (${message})`)
    }

    return false
  }
}

let removedCount = 0

for (const target of explicitTargets) {
  if (removeTarget(target)) {
    removedCount += 1
  }
}

for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
  if (!entry.isFile()) {
    continue
  }

  if (generatedFilePatterns.some((pattern) => pattern.test(entry.name))) {
    if (removeTarget(entry.name)) {
      removedCount += 1
    }
  }
}

console.log(`Generated artifact cleanup completed. Checked ${removedCount} target(s).`)
