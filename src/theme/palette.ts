export const palette = {
  // Brand red from the logo. Use it sparingly: logo, primary CTA, current tab, selected state.
  brand: '#B85540',
  brandPress: '#A04A38',
  brandDark: '#8F3C2F',
  brandLight: '#C76752',
  brandSoft: '#FBE5E1',
  brandGlow: '#FFF0ED',
  primaryGradient: 'linear-gradient(135deg, #C76752 0%, #B85540 100%)',

  // Warm paper surfaces. Slightly more luminous than the previous grayish pass.
  bg: '#FFF9F3',
  card: '#FFFFFF',
  cardSoft: '#FFFCF8',
  surface: '#FFFCF8',
  surfaceSoft: '#F6F0EA',
  surfaceWarm: '#FFF3EC',

  // Neutral information tags. Warm-gray instead of dead gray.
  tag: '#F3EFEA',
  tagText: '#645B54',
  iconBg: '#FFF3EC',

  // Text and structure.
  text: '#1F1A17',
  subtext: '#5F5A55',
  muted: '#928880',
  link: '#5F5A55',
  line: '#E9DED5',
  lineSoft: '#F1E8E0',

  // Backward-compatible aliases used by older pages/components.
  accent: '#B85540',
  accentDeep: '#B85540',
  accentDark: '#A04A38',
  accentLight: '#C76752',
  accentSoft: '#FBE5E1',

  // Functional colors, kept earthy instead of default app-blue.
  green: '#6F7D62',
  greenSoft: '#EEF3EA',
  info: '#5F7A8C',
  infoSoft: '#E8F1F2',
  warning: '#C29347',
  warningSoft: '#FFF1D8',
  error: '#B2433A',
  errorSoft: '#FFF1EF',

  // Atmosphere.
  shadow: 'rgba(80, 43, 30, 0.07)',
  shadowStrong: 'rgba(80, 43, 30, 0.11)',
  overlay: 'rgba(43, 29, 25, 0.24)',
}

export type AppPalette = typeof palette
