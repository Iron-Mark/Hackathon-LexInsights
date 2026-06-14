import { execFileSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'

const projectRoot = process.cwd()
const nextBinary = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')

function detectCommitSha() {
  if (process.env.NEXT_PUBLIC_APP_COMMIT_SHA?.trim()) {
    return process.env.NEXT_PUBLIC_APP_COMMIT_SHA.trim()
  }

  if (process.env.VERCEL_GIT_COMMIT_SHA?.trim()) {
    return process.env.VERCEL_GIT_COMMIT_SHA.trim()
  }

  if (process.env.GITHUB_SHA?.trim()) {
    return process.env.GITHUB_SHA.trim()
  }

  if (process.env.COMMIT_SHA?.trim()) {
    return process.env.COMMIT_SHA.trim()
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    }).trim()
  } catch {
    return null
  }
}

const buildSha = detectCommitSha()

const child = spawnSync(
  process.execPath,
  [nextBinary, 'build'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_COMMIT_SHA: buildSha || process.env.NEXT_PUBLIC_APP_COMMIT_SHA || '',
    },
  }
)

if (child.status !== 0) {
  if (child.error) {
    console.error(child.error)
  }

  process.exit(child.status ?? 1)
}
