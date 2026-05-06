import { View } from '@tarojs/components'
import type { PropsWithChildren } from 'react'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'

type Props = PropsWithChildren<{
  focused?: boolean
  marginBottom?: string
  padding?: string
  dashed?: boolean
}>

export default function FormInputBox({
  children,
  focused = false,
  marginBottom = space(4),
  padding = `${space(2)} ${space(3)}`,
  dashed = false,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: focused ? palette.focusSoft : palette.cardSoft,
        borderRadius: radius.md,
        padding,
        marginBottom,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${focused ? palette.focus : palette.line}`,
        boxShadow: focused ? elevation.pressed : 'none',
      }}
    >
      {children}
    </View>
  )
}
