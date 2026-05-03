export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const

export type SpacingScale = keyof typeof spacing

export function space(scale: SpacingScale) {
  return `${spacing[scale]}px`
}
