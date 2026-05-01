import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { profilePalette as palette } from './palette'

type Props = PropsWithChildren<{
  marginBottom?: string
  focused?: boolean
}>

export default function ProfileInputBox({ children, marginBottom = '12px', focused = false }: Props) {
  return (
    <View
      style={{
        backgroundColor: focused ? palette.focusSoft : '#FFFDF9',
        borderRadius: '14px',
        padding: '10px 12px',
        marginBottom,
        border: `1px solid ${focused ? palette.focus : palette.line}`,
        boxShadow: focused ? palette.focusRing : 'none',
      }}
    >
      {children}
    </View>
  )
}
