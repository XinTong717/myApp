const fs = require('fs')
const path = require('path')

const targetEnv = process.argv[2]
const mode = process.argv[3] || 'dev'

if (!targetEnv) {
  console.error('Missing target env id. Usage: node scripts/set-devtools-env.cjs <env-id> [dev|prod|prod-upload]')
  process.exit(1)
}

const MODES = new Set(['dev', 'prod', 'prod-upload'])
if (!MODES.has(mode)) {
  console.error(`Invalid mode: ${mode}. Expected one of: ${Array.from(MODES).join(', ')}`)
  process.exit(1)
}

const filePath = path.join(process.cwd(), 'project.config.json')
const raw = fs.readFileSync(filePath, 'utf8')
const json = JSON.parse(raw)

json.cloudenvironment = targetEnv
json.setting = json.setting || {}

if (mode === 'prod-upload') {
  json.setting.minified = true
  json.setting.uploadWithSourceMap = false
  json.setting.compileHotReLoad = false
} else {
  json.setting.minified = false
  json.setting.uploadWithSourceMap = true
  json.setting.compileHotReLoad = false
}

fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n')
console.log(`[devtools] project.config.json cloudenvironment -> ${targetEnv}`)
console.log(`[devtools] mode -> ${mode}`)
console.log(`[devtools] minified -> ${json.setting.minified}`)
console.log(`[devtools] uploadWithSourceMap -> ${json.setting.uploadWithSourceMap}`)
