import { View } from '@tarojs/components'
import AppCard from './AppCard'
import AppRow from './AppRow'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'

type CardSkeletonProps = {
  rows?: number
}

function SkeletonBar(props: { width?: string; height?: string; marginBottom?: string }) {
  return (
    <View style={{
      width: props.width || '100%',
      height: props.height || space(3),
      marginBottom: props.marginBottom || space(2),
      borderRadius: radius.pill,
      backgroundColor: palette.surfaceSoft,
    }} />
  )
}

export function CardSkeleton(props: CardSkeletonProps) {
  const rows = Math.max(Number(props.rows || 3), 1)

  return (
    <AppCard marginBottom={space(3)} border>
      <AppRow marginBottom={space(3)} gap={space(3)}>
        <View style={{ width: '42px', height: '42px', borderRadius: radius.md, backgroundColor: palette.iconBg }} />
        <View style={{ flex: 1 }}>
          <SkeletonBar width='72%' height={space(4)} />
          <SkeletonBar width='44%' height={space(2)} marginBottom='0' />
        </View>
      </AppRow>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBar key={index} width={index === rows - 1 ? '58%' : '100%'} />
      ))}
    </AppCard>
  )
}

export function ListSkeleton(props: { count?: number; rows?: number }) {
  const count = Math.max(Number(props.count || 3), 1)
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} rows={props.rows || 3} />
      ))}
    </>
  )
}

export function DetailSkeleton() {
  return (
    <>
      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
      <CardSkeleton rows={5} />
    </>
  )
}
