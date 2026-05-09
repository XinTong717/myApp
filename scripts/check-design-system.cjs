#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const DEFAULT_BASE_REF = process.env.DESIGN_SYSTEM_CHECK_BASE || 'origin/main'

// Existing legacy files can be cleaned gradually. This check blocks newly added
// raw design-system drift in source diffs: raw hex colors, inline fontSize,
// bare borderRadius pixel literals, and bare spacing pixel literals. Use
// palette / typography / radius / space tokens instead.
const ALLOWED_HEX = new Set([
  'src/app.config.ts',
  'src/theme/palette.ts',
])

const ALLOWED_FONT_SIZE = new Set([
  'src/components/common/AppIcon.tsx',
])

const ALLOWED_BORDER_RADIUS = new Set([
  'src/components/common/AppIcon.tsx',
])

const ALLOWED_SPACING_PIXEL = new Set([
  'src/components/common/AppIcon.tsx',
])

const hexRe = /#[0-9A-Fa-f]{6}\b/g
const fontSizeRe = /\bfontSize\s*:/
const borderRadiusPixelRe = /\bborderRadius\s*:\s*['"]\d+px['"]/
const spacingPixelRe = /\b(padding|margin|marginTop|marginBottom|marginLeft|marginRight)\s*:\s*['"][^'"]*\d+px[^'"]*['"]/
const violations = []

function getDiff() {
  try {
    return execSync(`git diff --unified=0 ${DEFAULT_BASE_REF}...HEAD -- src`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (err) {
    console.warn(`[design-system] could not diff against ${DEFAULT_BASE_REF}; no raw design-system check was run.`)
    return ''
  }
}

let currentFile = ''
let newLineNumber = 0

for (const line of getDiff().split(/\r?\n/)) {
  const fileMatch = line.match(/^\+\+\+ b\/(.+)$/)
  if (fileMatch) {
    currentFile = fileMatch[1]
    newLineNumber = 0
    continue
  }

  const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
  if (hunkMatch) {
    newLineNumber = Number(hunkMatch[1])
    continue
  }

  if (!currentFile || !currentFile.match(/\.tsx?$/)) continue
  if (line.startsWith('---') || line.startsWith('+++')) continue

  if (line.startsWith('+')) {
    const content = line.slice(1)

    if (!ALLOWED_HEX.has(currentFile) && hexRe.test(content)) {
      violations.push(`${currentFile}:${newLineNumber || '?'} adds raw hex color. Use palette/CSS vars instead.`)
    }
    hexRe.lastIndex = 0

    if (!ALLOWED_FONT_SIZE.has(currentFile) && fontSizeRe.test(content)) {
      violations.push(`${currentFile}:${newLineNumber || '?'} adds inline fontSize. Use typography tokens or .text-* classes instead.`)
    }

    if (!ALLOWED_BORDER_RADIUS.has(currentFile) && borderRadiusPixelRe.test(content)) {
      violations.push(`${currentFile}:${newLineNumber || '?'} adds raw borderRadius pixel literal. Use radius tokens instead.`)
    }

    if (!ALLOWED_SPACING_PIXEL.has(currentFile) && spacingPixelRe.test(content)) {
      violations.push(`${currentFile}:${newLineNumber || '?'} adds raw spacing pixel literal. Use space() tokens instead.`)
    }

    newLineNumber += 1
    continue
  }

  if (!line.startsWith('-') && newLineNumber > 0) {
    newLineNumber += 1
  }
}

if (violations.length > 0) {
  console.log('\nDesign system check failed')
  console.log('==========================')
  console.log(`Checked added source lines against ${DEFAULT_BASE_REF}.`)
  violations.slice(0, 120).forEach((item) => console.log(`- ${item}`))
  if (violations.length > 120) console.log(`...and ${violations.length - 120} more`)
  console.log('\nMove values to palette / typography / radius / spacing tokens, or add a narrow allowlist exception with a reason.')
  process.exit(1)
}

console.log('Design system check passed for added source lines. 🎨')
