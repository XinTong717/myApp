import { typographyTokens } from './typographyTokens'

type TypographyTokenName = Exclude<keyof typeof typographyTokens, 'fontFamily' | 'serifFamily'>

function toStyle(token: TypographyTokenName) {
  const item = typographyTokens[token]
  const usesSerif = 'serif' in item && item.serif === true
  return {
    fontSize: `${item.px}px`,
    lineHeight: `${item.linePx}px`,
    fontWeight: item.weight,
    letterSpacing: item.letterSpacing,
    ...(usesSerif ? { fontFamily: typographyTokens.serifFamily } : {}),
  }
}

export const typography = {
  fontFamily: typographyTokens.fontFamily,
  serifFamily: typographyTokens.serifFamily,
  hero: toStyle('hero'),
  display: toStyle('display'),
  title: toStyle('title'),
  sectionTitle: toStyle('sectionTitle'),
  cardTitle: toStyle('cardTitle'),
  body: toStyle('body'),
  bodyStrong: toStyle('bodyStrong'),
  meta: toStyle('meta'),
  caption: toStyle('caption'),
  micro: toStyle('micro'),
  button: toStyle('button'),
  number: {
    fontVariantNumeric: 'tabular-nums',
  },
}

export type AppTypography = typeof typography
