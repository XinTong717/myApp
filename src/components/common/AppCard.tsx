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
  className?: string
  style?: Record<string, any>
  onClick?: () => void
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
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
  className,
  style,
  onClick,
}: AppCardProps) {
  const cardStyle: Record<string, any> = {
    '--card-bg': backgroundColor,
    '--card-radius': cardRadius,
    '--card-padding': padding,
    '--card-margin-bottom': marginBottom,
    '--card-border-color': borderColor,
    '--card-shadow': elevation[elevationLevel],
    ...style,
  }

  return (
    <View
      onClick={onClick}
      className={joinClassNames('app-card', border && 'app-card--bordered', elevationLevel === 'none' && 'app-card--flat', onClick && 'app-card--interactive', className)}
      style={cardStyle}
    >
      {children}
    </View>
  )
}
