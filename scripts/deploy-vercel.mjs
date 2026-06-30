import { execSync, spawnSync } from 'node:child_process'

const PRODUCTION_URL = 'https://lexiph.vercel.app'

function parseArgs(argv) {
  const args = {
    baseUrl: PRODUCTION_URL,
    preflightOnly: false,
    skipLocalChecks: false,
    skipPreflight: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--skip-local-checks') {
      args.skipLocalChecks = true
      continue
    }

    if (arg === '--skip-preflight') {
      args.skipPreflight = true
      continue
    }

    if (arg === '--preflight-only') {
      args.preflightOnly = true
      continue
    }

    if (arg === '--base-url') {
      args.baseUrl = argv[index + 1] || PRODUCTION_URL
      index += 1
      continue
    }

    if (arg.startsWith('--base-url=')) {
      args.baseUrl = arg.slice('--base-url='.length) || PRODUCTION_URL
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

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
const args = parseArgs(process.argv.slice(2))

if (!sha) {
  throw new Error('Failed to resolve local git commit SHA.')
}

console.log(`Deploy target: ${args.baseUrl}`)
console.log(`Expected commit SHA: ${sha}`)

const status = read('git status --short')

if (status) {
  console.error('Refusing to deploy with uncommitted changes. Commit or stash changes first.')
  console.error(status)
  process.exit(1)
}

if (!args.skipPreflight) {
  run('npm', ['run', 'check:deployment', '--', '--base-url', args.baseUrl, '--local-only', '--expect-sha', sha])
}

if (args.preflightOnly) {
  console.log('Preflight passed; exiting before deployment because --preflight-only was provided.')
  process.exit(0)
}

if (args.skipLocalChecks) {
  console.warn('Skipping npm run check:local because --skip-local-checks was provided.')
} else {
  run('npm', ['run', 'check:local'])
}

run('npx', [
  'vercel',
  '--prod',
  '--yes',
  '--env',
  `COMMIT_SHA=${sha}`,
  '--env',
  `NEXT_PUBLIC_APP_COMMIT_SHA=${sha}`,
])

run('npm', ['run', 'check:deployment', '--', '--base-url', args.baseUrl, '--expect-sha', sha])
run('npm', ['run', 'check:live', '--', '--base-url', args.baseUrl, '--expect-sha', sha])
