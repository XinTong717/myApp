import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, space } from '../../theme/spacing'

type AppPrimaryButtonProps = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  marginBottom?: string
  className?: string
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function AppPrimaryButton({
  text,
  loadingText = '处理中...',
  loading = false,
  disabled: disabledProp = false,
  onClick,
  marginBottom = space(7),
  className,
}: AppPrimaryButtonProps) {
  const [pressed, setPressed] = useState(false)
  const disabled = !!disabledProp || !!loading
  const buttonStyle = {
    '--button-bg': disabled ? palette.disabledBg : pressed ? palette.brandPress : palette.brand,
    '--button-margin-bottom': marginBottom,
    '--button-shadow': disabled ? 'none' : pressed ? elevation.pressed : elevation.card,
    '--button-transform': pressed ? 'scale(0.98)' : 'scale(1)',
    '--button-opacity': disabled ? 0.9 : 1,
  } as Record<string, string | number>

  return (
    <View
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      className={joinClassNames('app-button', className)}
      style={buttonStyle}
    >
      <Text className='text-button' style={{ color: disabled ? palette.disabledText : '#FFF' }}>
        {loading ? loadingText : text}
      </Text>
    </View>
  )
}
