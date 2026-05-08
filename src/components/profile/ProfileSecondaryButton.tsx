import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'

type Props = {
  text: string
  onClick?: () => void
  disabled?: boolean
  marginBottom?: string
}

export default function ProfileSecondaryButton({
  text,
  onClick,
  disabled = false,
  marginBottom = space(5),
}: Props) {
  const [pressed, setPressed] = useState(false)

  return (
    <View
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      className='app-chip'
      style={{
        '--chip-padding': `${space(3)} ${space(4)}`,
        '--chip-margin-right': '0',
        '--chip-margin-bottom': marginBottom,
        '--chip-bg': disabled ? palette.surfaceSoft : pressed ? palette.activeBg : palette.card,
        '--chip-border': pressed ? palette.focus : palette.line,
        '--chip-shadow': pressed ? elevation.pressed : 'none',
        '--chip-transform': pressed ? 'scale(0.99)' : 'scale(1)',
        width: '100%',
        borderRadius: radius.pill,
        justifyContent: 'center',
        opacity: disabled ? 0.76 : 1,
      }}
    >
      <Text className={disabled ? 'text-body-strong text-color-muted' : 'text-body-strong text-color-brand'}>
        {text}
      </Text>
    </View>
  )
}
