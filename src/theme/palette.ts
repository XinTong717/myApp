// Design system anchored to the logo's warm terracotta + dove. Two roles for the brand red:
//   `brand` (deep) carries identity — tab bar, links, navigation accents.
//   `brandBright` / `accentDeep` carries energy — primary CTAs, selected pills, "感兴趣".
// A second sunny accent (`accent2`) breaks the monotony of an all-red palette.

export const palette = {
  // Brand red from the logo. Deep version, used for identity moments (current tab, link, deep accents).
  brand: '#B85540',
  brandPress: '#A04A38',
  brandDark: '#8F3C2F',

  // Brighter coral for CTAs and energetic moments. Reads warmer and more inviting than the deep brand.
  brandBright: '#D86A4D',
  brandBrightPress: '#C25C42',

  brandLight: '#E48064',
  brandSoft: '#FFE3DA',
  brandGlow: '#FFF1EB',
  primaryGradient: 'linear-gradient(135deg, #E48064 0%, #B85540 100%)',
  brightGradient: 'linear-gradient(135deg, #ED8B6E 0%, #D86A4D 100%)',

  // Sunny secondary accent — golden honey. Use sparingly for variety (icon backgrounds, soft highlights).
  accent2: '#E8A35C',
  accent2Soft: '#FFEAD0',
  accent2Glow: '#FFF6E6',

  // Warm paper surfaces. Brighter/peachier than the prior pass.
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  surface: '#FFFCF5',
  surfaceSoft: '#F6EFE6',
  surfaceWarm: '#FFF3E6',

  // Neutral information tags. Warm-cream instead of dead gray.
  tag: '#F5EDE3',
  tagText: '#6E5F52',
  iconBg: '#FFEFD9',
  iconBgAlt: '#FFE6E0',

  // Text and structure.
  text: '#2B1D19',
  subtext: '#6E5F52',
  muted: '#A39080',
  link: '#B85540',
  line: '#F1DFCF',
  lineSoft: '#F8EDE0',

  // Backward-compatible aliases used by older pages/components.
  // accentDeep is mapped to brandBright so existing CTAs get warmer/livelier without rename churn.
  accent: '#B85540',
  accentDeep: '#D86A4D',
  accentDark: '#A04A38',
  accentLight: '#E48064',
  accentSoft: '#FFE3DA',

  // Functional colors, kept earthy instead of default app-blue.
  green: '#7E9C6F',
  greenSoft: '#EEF5E8',
  info: '#5F7A8C',
  infoSoft: '#E8F1F2',
  warning: '#D89952',
  warningSoft: '#FFF1D8',
  error: '#C24B3F',
  errorSoft: '#FFEEEB',

  // Atmosphere — warmer shadow tone instead of cold gray.
  shadow: 'rgba(132, 64, 38, 0.08)',
  shadowStrong: 'rgba(132, 64, 38, 0.13)',
  overlay: 'rgba(43, 29, 25, 0.28)',
}

export type AppPalette = typeof palette
