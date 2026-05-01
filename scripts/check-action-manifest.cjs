#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

const files = {
  appServiceIndex: path.join(repoRoot, 'cloudfunctions/appService/index.js'),
  rateLimitConfig: path.join(repoRoot, 'cloudfunctions/appService/lib/rateLimits.config.js'),
  cloudService: path.join(repoRoot, 'src/services/cloud.ts'),
}

const STANDALONE_ALLOWED_ACTIONS = new Set([])
const ROUTE_EXEMPT_ACTIONS = new Set([])
const RATE_LIMIT_EXEMPT_ACTIONS = new Set([])

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function extractObjectKeys(source, objectName) {
  const startMarker = `const ${objectName} = {`
  const start = source.indexOf(startMarker)
  if (start === -1) return []

  let depth = 0
  let end = -1
  for (let i = start + startMarker.length - 1; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) return []
  const body = source.slice(start + startMarker.length, end)
  const keys = []
  const keyRe = /^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm
  let match
  while ((match = keyRe.exec(body)) !== null) {
    const key = match[1]
    if (!key.startsWith('...')) keys.push(key)
  }
  return keys
}

function extractSetStrings(source, variableName) {
  const startMarker = `const ${variableName} = new Set([`
  const start = source.indexOf(startMarker)
  if (start === -1) return []
  const end = source.indexOf('])', start)
  if (end === -1) return []
  const body = source.slice(start + startMarker.length, end)
  return Array.from(body.matchAll(/['"]([^'"]+)['"]/g)).map((match) => match[1])
}

function extractRateLimitKeys(source) {
  return new Set([
    ...extractObjectKeys(source, 'READ_ACTION_RATE_LIMITS'),
    ...extractObjectKeys(source, 'WRITE_ACTION_RATE_LIMITS'),
    ...extractObjectKeys(source, 'ADMIN_ACTION_RATE_LIMITS'),
  ])
}

function asSortedList(setLike) {
  return Array.from(setLike).sort((a, b) => a.localeCompare(b))
}

function diff(left, right) {
  return asSortedList(left).filter((item) => !right.has(item))
}

function printList(title, list) {
  if (list.length === 0) return
  console.log(`\n${title}`)
  list.forEach((item) => console.log(`- ${item}`))
}

const appServiceSource = readFile(files.appServiceIndex)
const rateLimitSource = readFile(files.rateLimitConfig)
const cloudServiceSource = readFile(files.cloudService)

const appServiceActions = new Set([
  ...extractObjectKeys(appServiceSource, 'actionHandlers'),
  ...extractObjectKeys(appServiceSource, 'publicActionHandlers'),
  ...extractObjectKeys(appServiceSource, 'userActionHandlers'),
  ...extractObjectKeys(appServiceSource, 'adminActionHandlers'),
])

const routedActions = new Set(extractSetStrings(cloudServiceSource, 'ROUTED_ACTIONS'))
const rateLimitedActions = extractRateLimitKeys(rateLimitSource)
const failClosedActions = new Set(extractSetStrings(appServiceSource, 'FAIL_CLOSED_RATE_LIMIT_ACTIONS'))

const appServiceMissingRoute = diff(appServiceActions, new Set([...routedActions, ...ROUTE_EXEMPT_ACTIONS]))
const routedMissingHandler = diff(routedActions, new Set([...appServiceActions, ...STANDALONE_ALLOWED_ACTIONS]))
const appServiceMissingRateLimit = diff(appServiceActions, new Set([...rateLimitedActions, ...RATE_LIMIT_EXEMPT_ACTIONS]))
const failClosedMissingRateLimit = diff(failClosedActions, rateLimitedActions)
const failClosedMissingHandler = diff(failClosedActions, appServiceActions)

console.log('\nappService action manifest check')
console.log('================================')
console.log(`appService actions: ${appServiceActions.size}`)
console.log(`frontend routed actions: ${routedActions.size}`)
console.log(`rate-limited actions: ${rateLimitedActions.size}`)
console.log(`fail-closed actions: ${failClosedActions.size}`)

printList('appService actions missing from frontend ROUTED_ACTIONS:', appServiceMissingRoute)
printList('frontend ROUTED_ACTIONS without appService handler:', routedMissingHandler)
printList('appService actions missing rate-limit config:', appServiceMissingRateLimit)
printList('fail-closed actions missing rate-limit config:', failClosedMissingRateLimit)
printList('fail-closed actions missing appService handler:', failClosedMissingHandler)

const failed = [
  appServiceMissingRoute,
  routedMissingHandler,
  appServiceMissingRateLimit,
  failClosedMissingRateLimit,
  failClosedMissingHandler,
].some((items) => items.length > 0)

if (failed) {
  console.log('\nAction manifest check failed. Keep appService/index.js, src/services/cloud.ts, and rateLimits.config.js in sync.')
  process.exit(1)
}

console.log('\nAction manifest check passed. 🧭')
