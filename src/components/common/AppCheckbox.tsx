import { View } from '@tarojs/components'
import AppIcon from './AppIcon'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'

type AppCheckboxProps = {
  checked: boolean
  onClick?: () => void
  marginRight?: string
  marginTop?: string
  size?: string
}

export default function AppCheckbox({
  checked,
  onClick,
  marginRight = space(3),
  marginTop = '0',
  size = space(5),
}: AppCheckboxProps) {
  return (
    <View
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        marginRight,
        marginTop,
        backgroundColor: checked ? palette.accentDeep : palette.card,
        border: `1px solid ${checked ? palette.accentDeep : palette.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {checked ? <AppIcon name='check' size={18} backgroundColor='transparent' color={palette.card} /> : null}
    </View>
  )
}
