import type { PropsWithChildren } from 'react'
import AppCard from '../common/AppCard'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'

type Props = PropsWithChildren<{
  marginBottom?: string
  padding?: string
  backgroundColor?: string
  borderStyle?: string
}>

export default function ProfileCard({
  children,
  marginBottom = space(3),
  padding = space(4),
  backgroundColor = palette.card,
  borderStyle,
}: Props) {
  return (
    <AppCard
      padding={padding}
      marginBottom={marginBottom}
      radius={radius.md}
      backgroundColor={backgroundColor}
      borderColor={palette.line}
      border={!!borderStyle}
      elevationLevel='none'
      style={borderStyle ? { border: borderStyle } : undefined}
    >
      {children}
    </AppCard>
  )
}
