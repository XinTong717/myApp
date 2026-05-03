import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type Props = PropsWithChildren<{
  marginBottom?: string
  focused?: boolean
}>

export default function ProfileInputBox({ children, marginBottom = space(3), focused = false }: Props) {
  return (
    <View
      style={{
        backgroundColor: focused ? palette.focusSoft : '#FFFDF9',
        borderRadius: '14px',
        padding: `10px ${space(3)}`,
        marginBottom,
        border: `1px solid ${focused ? palette.focus : palette.line}`,
        boxShadow: focused ? palette.focusRing : 'none',
      }}
    >
      {children}
    </View>
  )
}
