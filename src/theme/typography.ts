export const typography = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  serifFamily: '"Songti SC", "Noto Serif SC", STSong, serif',

  hero: {
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    fontFamily: '"Songti SC", "Noto Serif SC", STSong, serif',
  },
  display: {
    fontSize: '26px',
    lineHeight: '34px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  title: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  sectionTitle: {
    fontSize: '20px',
    lineHeight: '28px',
    fontWeight: '700',
    letterSpacing: '-0.005em',
  },
  cardTitle: {
    fontSize: '17px',
    lineHeight: '25px',
    fontWeight: '700',
    letterSpacing: '0px',
  },
  body: {
    fontSize: '16px',
    lineHeight: '25px',
    fontWeight: '400',
    letterSpacing: '0.005em',
  },
  bodyStrong: {
    fontSize: '16px',
    lineHeight: '25px',
    fontWeight: '600',
    letterSpacing: '0.005em',
  },
  meta: {
    fontSize: '15px',
    lineHeight: '23px',
    fontWeight: '400',
    letterSpacing: '0.006em',
  },
  caption: {
    fontSize: '14px',
    lineHeight: '21px',
    fontWeight: '400',
    letterSpacing: '0.008em',
  },
  micro: {
    fontSize: '13px',
    lineHeight: '19px',
    fontWeight: '400',
    letterSpacing: '0.01em',
  },
  button: {
    fontSize: '16px',
    lineHeight: '22px',
    fontWeight: '600',
    letterSpacing: '0.01em',
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
  },
}

export type AppTypography = typeof typography
