#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const appServiceDir = path.join(repoRoot, 'cloudfunctions/appService')

const files = {
  appServiceIndex: path.join(appServiceDir, 'index.js'),
  rateLimitConfig: path.join(appServiceDir, 'lib/rateLimits.config.js'),
  cloudService: path.join(repoRoot, 'src/services/cloud.ts'),
}

const STANDALONE_ALLOWED_ACTIONS = new Set([])
const ROUTE_EXEMPT_ACTIONS = new Set([])
const RATE_LIMIT_EXEMPT_ACTIONS = new Set([])

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function findBalancedBlock(source, startIndex, openChar = '{', closeChar = '}') {
  const openIndex = source.indexOf(openChar, startIndex)
  if (openIndex === -1) return ''

  let depth = 0
  let quote = ''
  let escaped = false

  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]

    if (quote) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === quote) {
        quote = ''
      }
      continue
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      quote = ch
      continue
    }

    if (ch === openChar) depth += 1
    if (ch === closeChar) {
      depth -= 1
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
  }

  return ''
}

function extractObjectBody(source, objectName) {
  const marker = `const ${objectName} =`
  const start = source.indexOf(marker)
  if (start === -1) return ''
  return findBalancedBlock(source, start, '{', '}')
}

function extractObjectKeysFromBody(body) {
  const keys = []
  const keyRe = /^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm
  let match
  while ((match = keyRe.exec(body)) !== null) {
    keys.push(match[1])
  }
  return keys
}

function extractObjectKeys(source, objectName) {
  return extractObjectKeysFromBody(extractObjectBody(source, objectName))
}

function extractSetStrings(source, variableName) {
  const marker = `const ${variableName} = new Set(`
  const start = source.indexOf(marker)
  if (start === -1) return []
  const body = findBalancedBlock(source, start, '[', ']')
  return Array.from(body.matchAll(/['"]([^'"]+)['"]/g)).map((match) => match[1])
}

function extractRequireMap(source) {
  const map = new Map()
  const requireRe = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*require\(['"](.+?)['"]\)/gm
  let match
  while ((match = requireRe.exec(source)) !== null) {
    const [, variableName, requiredPath] = match
    if (!requiredPath.startsWith('./')) continue
    map.set(variableName, path.join(appServiceDir, requiredPath) + '.js')
  }
  return map
}

function extractSpreadVariablesFromObject(source, objectName) {
  const body = extractObjectBody(source, objectName)
  return Array.from(body.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)).map((match) => match[1])
}

function extractModuleExportKeys(filePath) {
  const source = readFile(filePath)
  const marker = 'module.exports ='
  const start = source.indexOf(marker)
  if (start === -1) return []
  return extractObjectKeysFromBody(findBalancedBlock(source, start, '{', '}'))
}

function extractAppServiceActions(source) {
  const requireMap = extractRequireMap(source)
  const actionHandlers = new Set(extractObjectKeys(source, 'actionHandlers'))
  const groupNames = ['publicActionHandlers', 'userActionHandlers', 'adminActionHandlers']

  for (const groupName of groupNames) {
    extractObjectKeys(source, groupName).forEach((key) => actionHandlers.add(key))

    for (const variableName of extractSpreadVariablesFromObject(source, groupName)) {
      const modulePath = requireMap.get(variableName)
      if (!modulePath || !fs.existsSync(modulePath)) {
        console.warn(`[check-actions] cannot resolve spread module ${variableName} in ${groupName}`)
        continue
      }
      extractModuleExportKeys(modulePath).forEach((key) => actionHandlers.add(key))
    }
  }

  return actionHandlers
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

const appServiceActions = extractAppServiceActions(appServiceSource)
const routedActions = new Set(extractSetStrings(cloudServiceSource, 'ROUTED_ACTIONS'))
const rateLimitedActions = extractRateLimitKeys(rateLimitSource)
const failClosedActions = new Set(extractSetStrings(appServiceSource, 'FAIL_CLOSED_RATE_LIMIT_ACTIONS'))

const appServiceMissingRoute = diff(appServiceActions, new Set([...routedActions, ...ROUTE_EXEMPT_ACTIONS]))
const routedMissingHandler = diff(routedActions, new Set([...appServiceActions, ...STANDALONE_ALLOWED_ACTIONS]))
const appServiceMissingRateLimit = diff(appServiceActions, new Set([...rateLimitedActions, ...RATE_LIMIT_EXEMPT_ACTIONS]))
const rateLimitMissingHandler = diff(rateLimitedActions, new Set([...appServiceActions, ...STANDALONE_ALLOWED_ACTIONS]))
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
printList('rate-limit config actions without appService handler:', rateLimitMissingHandler)
printList('fail-closed actions missing rate-limit config:', failClosedMissingRateLimit)
printList('fail-closed actions missing appService handler:', failClosedMissingHandler)

const failed = [
  appServiceMissingRoute,
  routedMissingHandler,
  appServiceMissingRateLimit,
  rateLimitMissingHandler,
  failClosedMissingRateLimit,
  failClosedMissingHandler,
].some((items) => items.length > 0)

if (failed) {
  console.log('\nAction manifest check failed. Keep appService/index.js, src/services/cloud.ts, and rateLimits.config.js in sync.')
  process.exit(1)
}

console.log('\nAction manifest check passed. 🧭')
