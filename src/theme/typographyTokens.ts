export const typographyTokens = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  serifFamily: '"Songti SC", "Noto Serif SC", STSong, serif',
  hero: { px: 32, rpx: 64, linePx: 40, lineRpx: 80, weight: '700', letterSpacing: '-0.02em', serif: true },
  display: { px: 26, rpx: 52, linePx: 34, lineRpx: 68, weight: '700', letterSpacing: '-0.01em' },
  title: { px: 24, rpx: 48, linePx: 32, lineRpx: 64, weight: '700', letterSpacing: '-0.01em' },
  sectionTitle: { px: 20, rpx: 40, linePx: 28, lineRpx: 56, weight: '700', letterSpacing: '-0.005em' },
  cardTitle: { px: 17, rpx: 34, linePx: 25, lineRpx: 50, weight: '700', letterSpacing: '0px' },
  body: { px: 16, rpx: 32, linePx: 25, lineRpx: 50, weight: '400', letterSpacing: '0.005em' },
  bodyStrong: { px: 16, rpx: 32, linePx: 25, lineRpx: 50, weight: '600', letterSpacing: '0.005em' },
  meta: { px: 15, rpx: 30, linePx: 23, lineRpx: 46, weight: '400', letterSpacing: '0.006em' },
  caption: { px: 14, rpx: 28, linePx: 21, lineRpx: 42, weight: '400', letterSpacing: '0.008em' },
  micro: { px: 13, rpx: 26, linePx: 19, lineRpx: 38, weight: '400', letterSpacing: '0.01em' },
  button: { px: 16, rpx: 32, linePx: 22, lineRpx: 44, weight: '600', letterSpacing: '0.01em' },
} as const

export type TypographyTokenName = Exclude<keyof typeof typographyTokens, 'fontFamily' | 'serifFamily'>
