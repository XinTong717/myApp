import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type Variant = 'primary' | 'success' | 'secondary' | 'danger' | 'neutral'

type Props = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  variant?: Variant
  onClick?: () => void
  marginRight?: string
  marginBottom?: string
}

function getVariantStyle(variant: Variant, pressed: boolean, disabled: boolean) {
  if (disabled) {
    return {
      backgroundColor: palette.disabledBg,
      borderColor: palette.disabledBg,
      color: palette.disabledText,
      shadow: 'none',
    }
  }

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: pressed ? palette.brandPress : palette.accentDeep,
        borderColor: pressed ? palette.brandPress : palette.accentDeep,
        color: '#FFFFFF',
        shadow: `0 4px 12px ${palette.shadow}`,
      }
    case 'success':
      return {
        backgroundColor: pressed ? '#606E55' : palette.green,
        borderColor: pressed ? '#606E55' : palette.green,
        color: '#FFFFFF',
        shadow: `0 4px 12px ${palette.shadow}`,
      }
    case 'danger':
      return {
        backgroundColor: pressed ? '#F7DED9' : palette.errorSoft,
        borderColor: pressed ? palette.error : '#F5D1CC',
        color: palette.error,
        shadow: pressed ? palette.focusRing : 'none',
      }
    case 'neutral':
      return {
        backgroundColor: pressed ? palette.activeBg : palette.tag,
        borderColor: pressed ? palette.focus : palette.line,
        color: palette.subtext,
        shadow: pressed ? palette.focusRing : 'none',
      }
    case 'secondary':
    default:
      return {
        backgroundColor: pressed ? palette.activeBg : palette.accentSoft,
        borderColor: pressed ? palette.focus : palette.accentSoft,
        color: palette.accentDeep,
        shadow: pressed ? palette.focusRing : 'none',
      }
  }
}

export default function AdminActionButton({
  text,
  loadingText = '处理中...',
  loading = false,
  disabled = false,
  variant = 'secondary',
  onClick,
  marginRight = '8px',
  marginBottom = '8px',
}: Props) {
  const [pressed, setPressed] = useState(false)
  const inactive = disabled || loading
  const style = getVariantStyle(variant, pressed, inactive)

  return (
    <View
      onTouchStart={() => !inactive && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={inactive ? undefined : onClick}
      style={{
        backgroundColor: style.backgroundColor,
        border: `1px solid ${style.borderColor}`,
        borderRadius: '14px',
        padding: '10px 14px',
        marginRight,
        marginBottom,
        boxShadow: style.shadow,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        opacity: inactive ? 0.86 : 1,
      }}
    >
      <Text style={{ ...typography.meta, color: style.color, fontWeight: '700' }}>
        {loading ? loadingText : text}
      </Text>
    </View>
  )
}
