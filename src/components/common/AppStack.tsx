import { View } from '@tarojs/components'
import { space } from '../../theme/spacing'

type AppStackProps = {
  children: any
  gap?: string
  marginBottom?: string
  className?: string
  style?: Record<string, string | number | undefined>
}

export default function AppStack({
  children,
  gap = space(2),
  marginBottom = '0',
  className,
  style,
}: AppStackProps) {
  return (
    <View
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        marginBottom,
        ...(style || {}),
      }}
    >
      {children}
    </View>
  )
}
