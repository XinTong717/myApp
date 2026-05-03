export const typography = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  serifFamily: '"Songti SC", "Noto Serif SC", STSong, serif',

  hero: {
    fontSize: '30px',
    lineHeight: '38px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    fontFamily: '"Songti SC", "Noto Serif SC", STSong, serif',
  },
  display: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  title: {
    fontSize: '22px',
    lineHeight: '30px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  sectionTitle: {
    fontSize: '18px',
    lineHeight: '26px',
    fontWeight: '700',
    letterSpacing: '-0.005em',
  },
  cardTitle: {
    fontSize: '15px',
    lineHeight: '22px',
    fontWeight: '700',
    letterSpacing: '0px',
  },
  body: {
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: '400',
    letterSpacing: '0.005em',
  },
  bodyStrong: {
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: '600',
    letterSpacing: '0.005em',
  },
  meta: {
    fontSize: '13px',
    lineHeight: '20px',
    fontWeight: '400',
    letterSpacing: '0.006em',
  },
  caption: {
    fontSize: '12px',
    lineHeight: '18px',
    fontWeight: '400',
    letterSpacing: '0.008em',
  },
  micro: {
    fontSize: '11px',
    lineHeight: '16px',
    fontWeight: '400',
    letterSpacing: '0.01em',
  },
  button: {
    fontSize: '15px',
    lineHeight: '20px',
    fontWeight: '600',
    letterSpacing: '0.01em',
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
  },
}

export type AppTypography = typeof typography
