import { View } from '@tarojs/components'
import { palette } from '../../theme/palette'

type IconName = 'lock' | 'mapPin' | 'calendar' | 'user' | 'school' | 'spark'

type Props = {
  name: IconName
  size?: number
  color?: string
  backgroundColor?: string
  bordered?: boolean
}

function getGlyph(name: IconName) {
  switch (name) {
    case 'lock':
      return '🔒'
    case 'mapPin':
      return '⌖'
    case 'calendar':
      return '□'
    case 'user':
      return '◦'
    case 'school':
      return '◇'
    case 'spark':
      return '✦'
    default:
      return '•'
  }
}

export default function AppIcon({
  name,
  size = 22,
  color = palette.accentDeep,
  backgroundColor = palette.iconBg,
  bordered = false,
}: Props) {
  return (
    <View
      aria-label={name}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '999px',
        backgroundColor,
        border: bordered ? `1px solid ${palette.line}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: `${Math.max(11, Math.round(size * 0.52))}px`,
        fontWeight: 'bold',
        lineHeight: `${size}px`,
      }}
    >
      {getGlyph(name)}
    </View>
  )
}
