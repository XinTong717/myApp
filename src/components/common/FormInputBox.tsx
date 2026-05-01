import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { palette } from '../../theme/palette'

type Props = PropsWithChildren<{
  focused?: boolean
  marginBottom?: string
  padding?: string
  dashed?: boolean
}>

export default function FormInputBox({
  children,
  focused = false,
  marginBottom = '16px',
  padding = '10px 12px',
  dashed = false,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: focused ? palette.focusSoft : palette.cardSoft,
        borderRadius: '14px',
        padding,
        marginBottom,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${focused ? palette.focus : palette.line}`,
        boxShadow: focused ? palette.focusRing : 'none',
      }}
    >
      {children}
    </View>
  )
}
