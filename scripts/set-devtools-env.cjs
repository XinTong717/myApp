const fs = require('fs')
const path = require('path')

const targetEnv = process.argv[2]

if (!targetEnv) {
  console.error('Missing target env id. Usage: node scripts/set-devtools-env.cjs <env-id>')
  process.exit(1)
}

const filePath = path.join(process.cwd(), 'project.config.json')
const raw = fs.readFileSync(filePath, 'utf8')
const json = JSON.parse(raw)

json.cloudenvironment = targetEnv

fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n')
console.log(`[devtools] project.config.json cloudenvironment -> ${targetEnv}`)
