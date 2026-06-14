import { execSync, spawnSync } from 'node:child_process'

const sha = execSync('git rev-parse HEAD', {
  encoding: 'utf8',
}).trim()

if (!sha) {
  throw new Error('Failed to resolve local git commit SHA.')
}

const command = [
  'npx',
  'vercel',
  '--prod',
  '--yes',
  '--env',
  `COMMIT_SHA=${sha}`,
  '--env',
  `NEXT_PUBLIC_APP_COMMIT_SHA=${sha}`,
].join(' ')

const child = spawnSync(command, {
  shell: true,
  stdio: 'inherit',
})

if (child.status !== 0) {
  if (child.error) {
    console.error(child.error)
  }
  process.exit(child.status ?? 1)
}
