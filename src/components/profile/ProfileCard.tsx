import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type Props = PropsWithChildren<{
  marginBottom?: string
  padding?: string
  backgroundColor?: string
  borderStyle?: string
}>

export default function ProfileCard({
  children,
  marginBottom = '14px',
  padding = space(4),
  backgroundColor = palette.card,
  borderStyle,
}: Props) {
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: '20px',
        padding,
        marginBottom,
        border: borderStyle || `1px solid ${palette.line}`,
      }}
    >
      {children}
    </View>
  )
}
