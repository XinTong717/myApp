#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

const ALLOWED_HEX = new Set([
  'src/app.config.ts',
  'src/theme/palette.ts',
])

const ALLOWED_FONT_SIZE = new Set([
  'src/theme/typography.ts',
])

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  })
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

const files = walk(srcRoot).filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
const violations = []
const hexRe = /#[0-9A-Fa-f]{6}\b/g
const fontSizeRe = /fontSize\s*:/g

for (const file of files) {
  const rel = toRepoPath(file)
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (!ALLOWED_HEX.has(rel) && hexRe.test(line)) {
      violations.push(`${rel}:${index + 1} uses raw hex color. Use palette/CSS vars instead.`)
    }
    hexRe.lastIndex = 0

    if (!ALLOWED_FONT_SIZE.has(rel) && fontSizeRe.test(line)) {
      violations.push(`${rel}:${index + 1} uses raw fontSize. Use typography/.text-* instead.`)
    }
    fontSizeRe.lastIndex = 0
  })
}

if (violations.length > 0) {
  console.log('\nDesign system check failed')
  console.log('==========================')
  violations.slice(0, 120).forEach((item) => console.log(`- ${item}`))
  if (violations.length > 120) console.log(`...and ${violations.length - 120} more`)
  console.log('\nMove colors to palette/CSS vars and font sizes to typography/text classes, or add a narrow allowlist exception with a reason.')
  process.exit(1)
}

console.log('Design system check passed. 🎨')
