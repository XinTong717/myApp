import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppPrimaryButtonProps = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  marginBottom?: string
}

export default function AppPrimaryButton({
  text,
  loadingText = '处理中...',
  loading = false,
  disabled: disabledProp = false,
  onClick,
  marginBottom = '30px',
}: AppPrimaryButtonProps) {
  const [pressed, setPressed] = useState(false)
  const disabled = !!disabledProp || !!loading

  return (
    <View
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        backgroundColor: disabled ? palette.disabledBg : pressed ? palette.brandPress : palette.brand,
        borderRadius: radius.sm,
        padding: '14px',
        textAlign: 'center',
        marginBottom,
        boxShadow: disabled ? 'none' : pressed ? elevation.pressed : elevation.card,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        opacity: disabled ? 0.9 : 1,
      }}
    >
      <Text style={{ ...typography.button, color: disabled ? palette.disabledText : '#FFF' }}>
        {loading ? loadingText : text}
      </Text>
    </View>
  )
}
