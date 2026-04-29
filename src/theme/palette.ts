export const palette = {
  // Core brand: logo red, aligned with the stamp mark.
  brand: '#B85540',
  brandDark: '#8F3C2F',
  brandLight: '#D9826A',
  brandSoft: '#F2C7B7',

  // Warm paper surfaces.
  bg: '#FFF8F2',
  card: '#FFFCF8',
  cardSoft: '#F7E8DD',
  surface: '#FFFCF8',
  surfaceSoft: '#F7E8DD',
  surfaceWarm: '#FFF2E8',

  // Text and structure.
  text: '#2B1D19',
  subtext: '#5B4A3E',
  muted: '#8C776A',
  line: '#E7D3C5',

  // Backward-compatible aliases used by older pages/components.
  accent: '#B85540',
  accentDeep: '#B85540',
  accentDark: '#8F3C2F',
  accentLight: '#D9826A',
  accentSoft: '#F2C7B7',

  // Functional colors, kept earthy instead of default app-blue.
  green: '#6F7D62',
  greenSoft: '#EEF3EA',
  info: '#5F7F86',
  infoSoft: '#E8F1F2',
  warning: '#B8792D',
  warningSoft: '#FFF1D8',
  error: '#A83A32',
  errorSoft: '#FFF1EF',

  // Atmosphere.
  shadow: 'rgba(80, 43, 30, 0.08)',
  shadowStrong: 'rgba(80, 43, 30, 0.12)',
  overlay: 'rgba(43, 29, 25, 0.24)',
}

export type AppPalette = typeof palette
