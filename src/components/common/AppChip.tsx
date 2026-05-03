import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
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
    if (tone === 'neutral') return { bg: pressed ? palette.brandPress : palette.brand, border: palette.brand, text: '#FFFFFF' }
    return { bg: pressed ? palette.brandPress : palette.brand, border: palette.brand, text: '#FFFFFF' }
  }

  if (pressed) return { bg: palette.activeBg, border: palette.focus, text: palette.tagText }
  if (tone === 'brand' || tone === 'action') return { bg: palette.brandSoft, border: palette.brandSoft, text: palette.brand }
  if (tone === 'green') return { bg: palette.greenSoft, border: palette.greenSoft, text: palette.green }
  if (tone === 'accent') return { bg: palette.accent2Soft, border: palette.accent2Soft, text: palette.accent2 }
  if (tone === 'error') return { bg: palette.errorSoft, border: palette.errorSoft, text: palette.error }
  return { bg: palette.tag, border: palette.lineSoft, text: palette.tagText }
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
  const padding = size === 'md' ? `6px ${space(3)}` : `${space(1)} 10px`
  const textStyle = size === 'md' ? typography.meta : typography.caption

  return (
    <View
      onTouchStart={() => interactive && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={onClick}
      style={{
        padding,
        borderRadius: '999px',
        marginRight,
        marginBottom,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        transform: pressed && interactive ? 'scale(0.98)' : 'scale(1)',
        boxShadow: selected ? `0 3px 10px ${palette.shadow}` : 'none',
      }}
    >
      <Text style={{ ...textStyle, color: colors.text, fontWeight: selected ? '700' : textStyle.fontWeight }}>{text}</Text>
    </View>
  )
}
