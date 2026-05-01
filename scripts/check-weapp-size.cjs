#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const distDir = path.join(repoRoot, 'dist')
const MB = 1024 * 1024
const TOTAL_LIMIT = 20 * MB
const PACKAGE_LIMIT = 2 * MB
const LARGE_FILE_WARN = 500 * 1024

const knownPackageRoots = new Set(['pages', 'pkg', 'assets'])

function bytesText(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function walk(dir, prefix = '') {
  if (!fs.existsSync(dir)) return []
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const rel = path.join(prefix, entry.name)
    if (entry.isDirectory()) result.push(...walk(abs, rel))
    else if (entry.isFile()) result.push({ abs, rel, size: fs.statSync(abs).size })
  }
  return result
}

function sum(files) {
  return files.reduce((acc, item) => acc + item.size, 0)
}

function topLevelRoot(rel) {
  return rel.split(path.sep)[0] || ''
}

function packageKey(rel) {
  const parts = rel.split(path.sep)
  const root = parts[0]
  if (root === 'pkg') return parts.slice(0, 2).join('/') || 'pkg'
  if (root === 'pages') {
    const pageRoot = parts[1]
    if (pageRoot === 'school-detail' || pageRoot === 'event-detail' || pageRoot === 'admin') return parts.slice(0, 2).join('/')
    return 'main'
  }
  if (root === 'assets') return 'main'
  return 'main'
}

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run npm run build:weapp:prod first.')
  process.exit(1)
}

const files = walk(distDir)
const total = sum(files)
const byPackage = new Map()

for (const file of files) {
  const key = knownPackageRoots.has(topLevelRoot(file.rel)) ? packageKey(file.rel) : 'main'
  byPackage.set(key, (byPackage.get(key) || 0) + file.size)
}

const largeFiles = files
  .filter((file) => file.size >= LARGE_FILE_WARN)
  .sort((a, b) => b.size - a.size)
  .slice(0, 20)

console.log('\nWeChat Mini Program bundle size report')
console.log('====================================')
console.log(`Total dist size: ${bytesText(total)} ${total > TOTAL_LIMIT ? '❌ over 20 MB' : '✅'}`)
console.log('\nPackages:')

Array.from(byPackage.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, size]) => {
    console.log(`- ${name.padEnd(20)} ${bytesText(size).padStart(10)} ${size > PACKAGE_LIMIT ? '❌ over 2 MB' : '✅'}`)
  })

if (largeFiles.length > 0) {
  console.log('\nLarge files >= 500 KB:')
  largeFiles.forEach((file) => {
    console.log(`- ${file.rel} ${bytesText(file.size)}`)
  })
}

const failed = total > TOTAL_LIMIT || Array.from(byPackage.values()).some((size) => size > PACKAGE_LIMIT)
if (failed) {
  console.log('\nSize check failed. Consider moving pages/assets to subpackages or reducing duplicated dependencies.')
  process.exit(1)
}

console.log('\nSize check passed. 🧳')
