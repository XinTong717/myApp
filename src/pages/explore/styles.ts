import { palette } from '../../theme/palette'

export const exploreTheme = {
  pageBg: palette.bg,
  card: palette.card,
  surface: palette.surface,
  border: palette.line,
  borderSoft: palette.lineSoft,
  text: palette.text,
  subtext: palette.subtext,
  muted: palette.muted,
  brand: palette.brand,
  action: palette.action,
  actionSoft: palette.actionSoft,
  tag: palette.tag,
  tagText: palette.tagText,
  schoolSoft: palette.brandSoft,
  userSoft: palette.greenSoft,
  educatorSoft: palette.accent2Soft,
  shadow: palette.shadow,
  overlay: palette.overlay,
  gradient: palette.primaryGradient,
}

export const chip = (active: boolean, tone: 'brand' | 'user' | 'educator' | 'neutral' = 'brand') => {
  const activeBg = tone === 'user'
    ? exploreTheme.userSoft
    : tone === 'educator'
      ? exploreTheme.educatorSoft
      : exploreTheme.schoolSoft

  const activeColor = tone === 'user'
    ? palette.green
    : tone === 'educator'
      ? palette.accent2
      : palette.brand

  return {
    container: {
      padding: '4px 10px',
      borderRadius: '999px',
      marginRight: '8px',
      marginBottom: '6px',
      backgroundColor: active ? activeBg : exploreTheme.tag,
      border: `1px solid ${active ? activeBg : exploreTheme.borderSoft}`,
    },
    text: {
      fontSize: '12px',
      fontWeight: 'bold',
      color: active ? activeColor : exploreTheme.muted,
    },
  } as const
}

export const provinceChip = (active: boolean) => ({
  container: {
    padding: '3px 10px',
    borderRadius: '999px',
    marginRight: '6px',
    backgroundColor: active ? exploreTheme.action : palette.surfaceWarm,
    border: `1px solid ${active ? exploreTheme.action : exploreTheme.borderSoft}`,
  },
  text: {
    fontSize: '11px',
    color: active ? '#FFF' : exploreTheme.tagText,
  },
} as const)

export const cardStyle = {
  backgroundColor: exploreTheme.card,
  borderRadius: '20px',
  padding: '18px 16px',
  border: `1px solid ${exploreTheme.border}`,
  boxShadow: `0 6px 20px ${exploreTheme.shadow}`,
} as const

export const panelStyle = {
  backgroundColor: exploreTheme.surface,
  borderRadius: '18px',
  padding: '14px 12px',
  border: `1px solid ${exploreTheme.border}`,
} as const

export const primaryButtonStyle = {
  background: exploreTheme.gradient,
  borderRadius: '16px',
  padding: '14px',
  textAlign: 'center',
  boxShadow: `0 6px 16px ${exploreTheme.shadow}`,
} as const

export const ghostButtonStyle = {
  backgroundColor: exploreTheme.tag,
  borderRadius: '16px',
  padding: '14px',
  textAlign: 'center',
} as const

export const sheetStyle = {
  width: '100%',
  backgroundColor: exploreTheme.surface,
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  padding: '18px 16px 24px',
  boxSizing: 'border-box',
  borderTop: `1px solid ${exploreTheme.border}`,
  boxShadow: `0 -8px 24px ${exploreTheme.shadow}`,
} as const
