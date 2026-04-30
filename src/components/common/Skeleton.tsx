import { View } from '@tarojs/components'
import { palette } from '../../theme/palette'

type CardSkeletonProps = {
  rows?: number
}

function SkeletonBar(props: { width?: string; height?: string; marginBottom?: string }) {
  return (
    <View style={{
      width: props.width || '100%',
      height: props.height || '14px',
      marginBottom: props.marginBottom || '10px',
      borderRadius: '999px',
      backgroundColor: palette.surfaceSoft,
    }} />
  )
}

export function CardSkeleton(props: CardSkeletonProps) {
  const rows = Math.max(Number(props.rows || 3), 1)

  return (
    <View style={{
      backgroundColor: palette.card,
      borderRadius: '22px',
      padding: '16px',
      marginBottom: '14px',
      border: `1px solid ${palette.line}`,
    }}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
        <View style={{ width: '42px', height: '42px', borderRadius: '15px', backgroundColor: palette.iconBg, marginRight: '10px' }} />
        <View style={{ flex: 1 }}>
          <SkeletonBar width='72%' height='16px' />
          <SkeletonBar width='44%' height='12px' marginBottom='0' />
        </View>
      </View>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBar key={index} width={index === rows - 1 ? '58%' : '100%'} />
      ))}
    </View>
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
