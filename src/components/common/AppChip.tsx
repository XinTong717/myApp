import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, space } from '../../theme/spacing'

type AppChipTone = 'neutral' | 'brand' | 'action' | 'green' | 'accent' | 'error'
type AppChipSize = 'sm' | 'md' | 'lg'

type AppChipProps = {
  text: string
  tone?: AppChipTone
  size?: AppChipSize
  selected?: boolean
  interactive?: boolean
  marginRight?: string
  marginBottom?: string
  className?: string
  onClick?: () => void
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
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

function getSize(size: AppChipSize) {
  if (size === 'lg') return { padding: `${space(3)} ${space(4)}`, textClass: 'text-body-strong' }
  if (size === 'md') return { padding: `${space(2)} ${space(3)}`, textClass: 'text-caption' }
  return { padding: `${space(1)} ${space(2)}`, textClass: 'text-micro' }
}

export default function AppChip({
  text,
  tone = 'neutral',
  size = 'sm',
  selected = false,
  interactive = false,
  marginRight = space(2),
  marginBottom = space(2),
  className,
  onClick,
}: AppChipProps) {
  const [pressed, setPressed] = useState(false)
  const colors = getTone(tone, selected, pressed && interactive)
  const sizeStyle = getSize(size)

  return (
    <View
      onTouchStart={() => interactive && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={onClick}
      className={joinClassNames('app-chip', className)}
      style={{
        '--chip-padding': sizeStyle.padding,
        '--chip-bg': colors.bg,
        '--chip-border': colors.border,
        '--chip-margin-right': marginRight,
        '--chip-margin-bottom': marginBottom,
        '--chip-transform': pressed && interactive ? 'scale(0.97)' : 'scale(1)',
        '--chip-shadow': selected ? elevation.pressed : 'none',
      }}
    >
      <Text className={sizeStyle.textClass} style={{ color: colors.text }}>{text}</Text>
    </View>
  )
}
