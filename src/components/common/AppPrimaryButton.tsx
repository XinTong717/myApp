import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type AppButtonSize = 'lg' | 'md' | 'sm'
type AppButtonAppearance = 'full' | 'inline'

type AppPrimaryButtonProps = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  variant?: AppButtonVariant
  size?: AppButtonSize
  appearance?: AppButtonAppearance
  onClick?: () => void
  marginBottom?: string
  marginRight?: string
  className?: string
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

function getVariantStyle(variant: AppButtonVariant, pressed: boolean, disabled: boolean) {
  if (disabled) {
    return {
      bg: palette.disabledBg,
      text: palette.disabledText,
      border: 'transparent',
      shadow: 'none',
    }
  }

  if (variant === 'secondary') {
    return {
      bg: pressed ? palette.activeBg : palette.brandSoft,
      text: palette.brand,
      border: palette.brandSoft,
      shadow: pressed ? elevation.pressed : 'none',
    }
  }

  if (variant === 'ghost') {
    return {
      bg: pressed ? palette.surfaceWarm : 'transparent',
      text: palette.brand,
      border: palette.lineSoft,
      shadow: 'none',
    }
  }

  if (variant === 'danger') {
    return {
      bg: pressed ? '#9E3B33' : palette.error,
      text: '#FFF',
      border: palette.error,
      shadow: pressed ? elevation.pressed : elevation.card,
    }
  }

  if (variant === 'success') {
    return {
      bg: pressed ? '#606E55' : palette.green,
      text: '#FFF',
      border: palette.green,
      shadow: pressed ? elevation.pressed : elevation.card,
    }
  }

  return {
    bg: pressed ? palette.brandPress : palette.brand,
    text: '#FFF',
    border: palette.brand,
    shadow: pressed ? elevation.pressed : elevation.card,
  }
}

function getSizePadding(size: AppButtonSize) {
  if (size === 'sm') return `${space(2)} ${space(3)}`
  if (size === 'md') return `${space(3)} ${space(4)}`
  return space(4)
}

function getTextClass(size: AppButtonSize) {
  if (size === 'sm') return 'text-caption'
  return 'text-button'
}

export default function AppPrimaryButton({
  text,
  loadingText = '处理中...',
  loading = false,
  disabled: disabledProp = false,
  variant = 'primary',
  size = 'lg',
  appearance = 'full',
  onClick,
  marginBottom = space(7),
  marginRight = '0',
  className,
}: AppPrimaryButtonProps) {
  const [pressed, setPressed] = useState(false)
  const disabled = !!disabledProp || !!loading
  const colors = getVariantStyle(variant, pressed && !disabled, disabled)
  const isInline = appearance === 'inline'
  const buttonStyle = {
    '--button-bg': colors.bg,
    '--button-margin-bottom': marginBottom,
    '--button-shadow': colors.shadow,
    '--button-transform': pressed && !disabled ? 'scale(0.98)' : 'scale(1)',
    '--button-opacity': disabled ? 0.9 : 1,
    '--button-padding': getSizePadding(size),
    display: isInline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isInline ? 'auto' : '100%',
    marginRight,
    border: `1px solid ${colors.border}`,
    borderRadius: size === 'sm' ? radius.sm : radius.md,
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
      <Text className={getTextClass(size)} style={{ color: colors.text }}>
        {loading ? loadingText : text}
      </Text>
    </View>
  )
}
