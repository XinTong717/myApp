import { View } from '@tarojs/components'
import { space } from '../../theme/spacing'

type AppRowProps = {
  children: any
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between'
  wrap?: boolean
  gap?: string
  marginBottom?: string
  className?: string
  style?: Record<string, string | number | undefined>
  onClick?: () => void
}

export default function AppRow({
  children,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  gap = space(2),
  marginBottom = '0',
  className,
  style,
  onClick,
}: AppRowProps) {
  return (
    <View
      className={className}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap,
        marginBottom,
        ...(style || {}),
      }}
    >
      {children}
    </View>
  )
}
