import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { profilePalette as palette } from './palette'
import { typography } from '../../theme/typography'

type Props = {
  text: string
  loadingText?: string
  loading?: boolean
  onClick?: () => void
  marginBottom?: string
}

export default function ProfilePrimaryButton({
  text,
  loadingText = '处理中...',
  loading = false,
  onClick,
  marginBottom = '30px',
}: Props) {
  const [pressed, setPressed] = useState(false)
  const disabled = loading

  return (
    <View
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        background: disabled ? palette.disabledBg : pressed ? palette.brandPress : palette.primaryGradient,
        borderRadius: '16px',
        padding: '14px',
        textAlign: 'center',
        marginBottom,
        boxShadow: disabled ? 'none' : pressed ? `0 3px 10px ${palette.shadow}` : `0 6px 16px ${palette.shadow}`,
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        opacity: disabled ? 0.9 : 1,
      }}
    >
      <Text style={{ ...typography.button, color: disabled ? palette.disabledText : '#FFF' }}>{loading ? loadingText : text}</Text>
    </View>
  )
}
