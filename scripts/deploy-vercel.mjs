import { execSync, spawnSync } from 'node:child_process'

const PRODUCTION_URL = 'https://lexiph.vercel.app'

function run(command, args, options = {}) {
  const child = spawnSync(command, args, {
    shell: process.platform === 'win32',
    stdio: 'inherit',
    ...options,
  })

  if (child.status !== 0) {
    if (child.error) {
      console.error(child.error)
    }

    process.exit(child.status ?? 1)
  }
}

function read(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

const sha = read('git rev-parse HEAD')

if (!sha) {
  throw new Error('Failed to resolve local git commit SHA.')
}

const status = read('git status --short')

if (status) {
  console.error('Refusing to deploy with uncommitted changes. Commit or stash changes first.')
  console.error(status)
  process.exit(1)
}

run('npm', ['run', 'check:local'])

run('npx', [
  'vercel',
  '--prod',
  '--yes',
  '--env',
  `COMMIT_SHA=${sha}`,
  '--env',
  `NEXT_PUBLIC_APP_COMMIT_SHA=${sha}`,
])

run('npm', ['run', 'check:deployment', '--', '--base-url', PRODUCTION_URL, '--expect-sha', sha])
run('npm', ['run', 'check:live', '--', '--base-url', PRODUCTION_URL, '--expect-sha', sha])
