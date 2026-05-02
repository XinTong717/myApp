const fs = require('fs')
const path = require('path')

const distDir = path.join(process.cwd(), 'dist')
const DEV_CLOUD_ENV = 'cloud1-9g8njw4c79fb1322'
const PROD_CLOUD_ENV = 'keque-prod-d5gc6ylp793fabaea'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(fullPath, acc)
    else acc.push(fullPath)
  }
  return acc
}

const files = walk(distDir).filter((file) => /\.(js|json|wxml|wxss)$/i.test(file))

if (files.length === 0) {
  console.error('[cloud-env-check] dist is missing or empty. Build the mini program before running this check.')
  process.exit(1)
}

const devHits = []
let hasProdEnv = false

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes(DEV_CLOUD_ENV)) devHits.push(path.relative(process.cwd(), file))
  if (text.includes(PROD_CLOUD_ENV)) hasProdEnv = true
}

if (devHits.length > 0) {
  console.error('[cloud-env-check] Refuse prod artifact: dev cloud env id found in dist:')
  devHits.slice(0, 20).forEach((file) => console.error(`- ${file}`))
  if (devHits.length > 20) console.error(`...and ${devHits.length - 20} more files`)
  process.exit(1)
}

if (!hasProdEnv) {
  console.error('[cloud-env-check] Refuse prod artifact: prod cloud env id was not found in dist.')
  process.exit(1)
}

console.log('[cloud-env-check] dist uses the production cloud env and contains no dev env id.')
