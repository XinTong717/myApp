import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { profilePalette as palette } from './palette'

type Props = PropsWithChildren<{
  marginBottom?: string
}>

export default function ProfileInputBox({ children, marginBottom = '12px' }: Props) {
  return (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderRadius: '14px',
        padding: '10px 12px',
        marginBottom,
        border: `1px solid ${palette.line}`,
      }}
    >
      {children}
    </View>
  )
}
