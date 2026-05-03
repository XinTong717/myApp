import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

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
  marginBottom = '20px',
}: Props) {
  const [pressed, setPressed] = useState(false)

  return (
    <View
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        marginBottom,
        padding: '12px 16px',
        borderRadius: '999px',
        backgroundColor: disabled ? palette.surfaceSoft : pressed ? palette.activeBg : '#FFFFFF',
        border: `1px solid ${pressed ? palette.focus : palette.line}`,
        textAlign: 'center',
        boxShadow: pressed ? palette.focusRing : 'none',
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        opacity: disabled ? 0.76 : 1,
      }}
    >
      <Text style={{ ...typography.bodyStrong, color: disabled ? palette.muted : palette.brand }}>
        {text}
      </Text>
    </View>
  )
}
