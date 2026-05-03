import { View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type AppCardProps = {
  children: any
  padding?: string
  marginBottom?: string
  radius?: string
  backgroundColor?: string
  borderColor?: string
  onClick?: () => void
}

export default function AppCard({
  children,
  padding = space(4),
  marginBottom = '14px',
  radius = '22px',
  backgroundColor = palette.card,
  borderColor = palette.line,
  onClick,
}: AppCardProps) {
  return (
    <View
      onClick={onClick}
      style={{
        backgroundColor,
        borderRadius: radius,
        padding,
        marginBottom,
        boxSizing: 'border-box',
        border: `1px solid ${borderColor}`,
      }}
    >
      {children}
    </View>
  )
}
