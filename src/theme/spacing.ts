export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
} as const

export type SpacingScale = keyof typeof spacing

export function space(scale: SpacingScale) {
  return `${spacing[scale]}px`
}

export const radius = {
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '14px',
  xl: '20px',
  pill: '999px',
} as const

export type RadiusScale = keyof typeof radius

export const elevation = {
  none: 'none',
  card: '0 1px 2px rgba(80, 43, 30, 0.04), 0 8px 24px rgba(80, 43, 30, 0.06)',
  raised: '0 4px 12px rgba(80, 43, 30, 0.08), 0 16px 40px rgba(80, 43, 30, 0.08)',
  pressed: '0 1px 2px rgba(80, 43, 30, 0.05)',
} as const

export type ElevationScale = keyof typeof elevation
