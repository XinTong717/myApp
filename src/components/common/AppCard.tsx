import { View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space, type ElevationScale } from '../../theme/spacing'

type AppCardProps = {
  children: any
  padding?: string
  marginBottom?: string
  radius?: string
  backgroundColor?: string
  borderColor?: string
  border?: boolean
  elevationLevel?: ElevationScale
  onClick?: () => void
}

export default function AppCard({
  children,
  padding = space(4),
  marginBottom = space(4),
  radius: cardRadius = radius.md,
  backgroundColor = palette.card,
  borderColor = palette.lineSoft,
  border = false,
  elevationLevel = 'card',
  onClick,
}: AppCardProps) {
  return (
    <View
      onClick={onClick}
      style={{
        backgroundColor,
        borderRadius: cardRadius,
        padding,
        marginBottom,
        boxSizing: 'border-box',
        border: border ? `1px solid ${borderColor}` : 'none',
        boxShadow: elevation[elevationLevel],
      }}
    >
      {children}
    </View>
  )
}
