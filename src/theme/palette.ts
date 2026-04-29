export const palette = {
  // Brand red from the logo. Use it sparingly: logo, current tab, identity accents.
  brand: '#B85540',
  brandPress: '#A04A38',
  brandDark: '#8F3C2F',
  brandLight: '#C76752',
  brandSoft: '#FBE5E1',
  brandGlow: '#FFF0ED',

  // Action color is a touch brighter than brand, but not old coral-orange.
  action: '#C76752',
  actionPress: '#B85540',
  actionSoft: '#FBE5E1',
  primaryGradient: 'linear-gradient(135deg, #C76752 0%, #B85540 100%)',

  // Sunny secondary accent. Use sparingly for icon bubbles / soft highlights.
  accent2: '#D99A55',
  accent2Soft: '#FFEAD0',
  accent2Glow: '#FFF6E6',

  // Warm paper surfaces.
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
  iconBgAlt: '#FFE6E0',

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
