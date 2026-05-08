import { typographyTokens } from './typographyTokens'

function toStyle(token: Exclude<keyof typeof typographyTokens, 'fontFamily' | 'serifFamily'>) {
  const item = typographyTokens[token]
  return {
    fontSize: `${item.px}px`,
    lineHeight: `${item.linePx}px`,
    fontWeight: item.weight,
    letterSpacing: item.letterSpacing,
    ...(item.serif ? { fontFamily: typographyTokens.serifFamily } : {}),
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
