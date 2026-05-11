#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function extractConst(content, name, filePath) {
  const pattern = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*['\"]([^'\"]+)['\"]`)
  const match = content.match(pattern)
  if (!match) {
    throw new Error(`Cannot find ${name} in ${filePath}`)
  }
  return match[1]
}

const frontendPath = 'src/constants/legal.ts'
const backendPath = 'cloudfunctions/appService/lib/legalConsent.js'
const frontend = read(frontendPath)
const backend = read(backendPath)

const checks = [
  'CURRENT_TERMS_VERSION',
  'CURRENT_PRIVACY_VERSION',
]

const failures = []

for (const name of checks) {
  const frontValue = extractConst(frontend, name, frontendPath)
  const backValue = extractConst(backend, name, backendPath)
  if (frontValue !== backValue) {
    failures.push(`${name}: frontend=${frontValue} backend=${backValue}`)
  }
}

console.log('Legal version check')
console.log('===================')
for (const name of checks) {
  console.log(`${name}: ${extractConst(frontend, name, frontendPath)}`)
}

if (failures.length > 0) {
  console.error('\nLegal version mismatch:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('\nLegal version check passed. 📜')
