import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppChipTone = 'neutral' | 'brand' | 'action' | 'green' | 'accent' | 'error'
type AppChipSize = 'sm' | 'md'

type AppChipProps = {
  text: string
  tone?: AppChipTone
  size?: AppChipSize
  selected?: boolean
  interactive?: boolean
  marginRight?: string
  marginBottom?: string
  onClick?: () => void
}

function getTone(tone: AppChipTone, selected: boolean, pressed: boolean) {
  if (selected) {
    if (tone === 'green') return { bg: pressed ? '#606E55' : palette.green, border: palette.green, text: '#FFFFFF' }
    if (tone === 'accent') return { bg: pressed ? '#C88C4E' : palette.accent2, border: palette.accent2, text: '#FFFFFF' }
    if (tone === 'error') return { bg: pressed ? '#9E3B33' : palette.error, border: palette.error, text: '#FFFFFF' }
    return { bg: pressed ? palette.brandPress : palette.brand, border: palette.brand, text: '#FFFFFF' }
  }

  if (pressed) return { bg: palette.surfaceWarm, border: palette.focus, text: palette.text }
  if (tone === 'error') return { bg: palette.errorSoft, border: palette.errorSoft, text: palette.error }
  if (tone === 'green') return { bg: 'transparent', border: palette.lineSoft, text: palette.green }
  if (tone === 'accent') return { bg: 'transparent', border: palette.lineSoft, text: palette.accent2 }
  if (tone === 'brand' || tone === 'action') return { bg: 'transparent', border: palette.lineSoft, text: palette.brand }
  return { bg: 'transparent', border: palette.lineSoft, text: palette.tagText }
}

export default function AppChip({
  text,
  tone = 'neutral',
  size = 'sm',
  selected = false,
  interactive = false,
  marginRight = space(2),
  marginBottom = space(2),
  onClick,
}: AppChipProps) {
  const [pressed, setPressed] = useState(false)
  const colors = getTone(tone, selected, pressed && interactive)
  const padding = size === 'md' ? `${space(2)} ${space(3)}` : `${space(1)} ${space(2)}`
  const textStyle = size === 'md' ? typography.meta : typography.caption

  return (
    <View
      onTouchStart={() => interactive && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={onClick}
      style={{
        padding,
        borderRadius: radius.sm,
        marginRight,
        marginBottom,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        transform: pressed && interactive ? 'scale(0.97)' : 'scale(1)',
        boxShadow: selected ? elevation.pressed : 'none',
      }}
    >
      <Text style={{ ...textStyle, color: colors.text }}>{text}</Text>
    </View>
  )
}
