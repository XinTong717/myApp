export const palette = {
  // Brand red from the logo. Use it sparingly: logo, primary CTA, current tab, selected state.
  brand: '#B85540',
  brandPress: '#A04A38',
  brandDark: '#8F3C2F',
  brandLight: '#D9826A',
  brandSoft: '#F8E6DD',

  // Warm paper surfaces.
  bg: '#FAF8F4',
  card: '#FFFFFF',
  cardSoft: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceSoft: '#F0EFEB',
  surfaceWarm: '#FAF8F4',

  // Neutral information tags. Most metadata should live here, not in brand red.
  tag: '#F0EFEB',
  tagText: '#5F5E5A',

  // Text and structure.
  text: '#1A1A1A',
  subtext: '#5F5E5A',
  muted: '#888780',
  link: '#5F5E5A',
  line: '#E8E6DE',
  lineSoft: '#F0EFEB',

  // Backward-compatible aliases used by older pages/components.
  accent: '#B85540',
  accentDeep: '#B85540',
  accentDark: '#A04A38',
  accentLight: '#D9826A',
  accentSoft: '#F8E6DD',

  // Functional colors, kept earthy instead of default app-blue.
  green: '#5F7A5C',
  greenSoft: '#EEF3EA',
  info: '#5F7A8C',
  infoSoft: '#E8F1F2',
  warning: '#C29347',
  warningSoft: '#FFF1D8',
  error: '#B2433A',
  errorSoft: '#FFF1EF',

  // Atmosphere.
  shadow: 'rgba(80, 43, 30, 0.06)',
  shadowStrong: 'rgba(80, 43, 30, 0.10)',
  overlay: 'rgba(43, 29, 25, 0.24)',
}

export type AppPalette = typeof palette
