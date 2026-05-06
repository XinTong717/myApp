import { useEffect, useState } from 'react'
import { Map as TaroMap, Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { exploreTheme } from '../styles'

type MapMarkersProps = {
  loading: boolean
  error: string
  isProvinceDataSettled: boolean
  selectedProvince: string
  canRenderMap: boolean
  mapMountReady: boolean
  isNavigatingAway: boolean
  center: { latitude: number; longitude: number }
  scale: number
  mapMarkers: any[]
  shouldShowUserLabels: boolean
  shouldShowSchoolLabels: boolean
  hasUserClusters: boolean
  hasSchoolClusters: boolean
  onReload: () => void
  onMarkerTap: (e: any) => void
  onCalloutTap: (e: any) => void
  onLabelTap: (e: any) => void
}

const EMPTY_STATE_DELAY_MS = 360

const cardStyle = {
  backgroundColor: exploreTheme.card,
  borderRadius: radius.md,
  padding: `${space(4)} ${space(4)}`,
  border: `1px solid ${exploreTheme.border}`,
} as const

function CenteredText(props: { text: string; strong?: boolean; color?: string }) {
  return (
    <View style={{ padding: `${space(8)} ${space(5)}` }}>
      <View style={{ ...cardStyle, textAlign: 'center' }}>
        <Text style={{ ...(props.strong ? typography.bodyStrong : typography.body), color: props.color || exploreTheme.text }}>
          {props.text}
        </Text>
      </View>
    </View>
  )
}

export default function MapMarkers(props: MapMarkersProps) {
  const {
    loading,
    error,
    isProvinceDataSettled,
    selectedProvince,
    canRenderMap,
    mapMountReady,
    isNavigatingAway,
    center,
    scale,
    mapMarkers,
    shouldShowUserLabels,
    shouldShowSchoolLabels,
    hasUserClusters,
    hasSchoolClusters,
    onReload,
    onMarkerTap,
    onCalloutTap,
    onLabelTap,
  } = props

  const [emptyStateReady, setEmptyStateReady] = useState(false)

  useEffect(() => {
    setEmptyStateReady(false)

    const shouldArmEmptyState =
      !loading &&
      !error &&
      isProvinceDataSettled &&
      !isNavigatingAway &&
      !canRenderMap

    if (!shouldArmEmptyState) return undefined

    const timer = setTimeout(() => setEmptyStateReady(true), EMPTY_STATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [loading, error, isProvinceDataSettled, isNavigatingAway, canRenderMap, selectedProvince, mapMarkers.length])

  if (error) {
    return (
      <View style={{ padding: `${space(8)} ${space(5)}` }}>
        <View style={{ ...cardStyle, textAlign: 'center' }}>
          <Text style={{ ...typography.body, color: palette.error }}>{error}</Text>
          <View onClick={onReload} style={{ marginTop: space(4), padding: `${space(2)} ${space(4)}`, borderRadius: radius.pill, backgroundColor: palette.brandSoft }}>
            <Text style={{ ...typography.meta, color: palette.brand }}>重新加载</Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading || !isProvinceDataSettled) {
    const provinceLabel = selectedProvince || '全国'
    return (
      <View style={{ padding: `${space(8)} ${space(5)}`, textAlign: 'center' }}>
        <Text style={{ ...typography.body, color: exploreTheme.subtext }}>
          正在加载{provinceLabel}数据...
        </Text>
      </View>
    )
  }

  if (isNavigatingAway) {
    return <CenteredText text='页面跳转中…' strong />
  }

  if (!canRenderMap && !emptyStateReady) {
    const provinceLabel = selectedProvince || '全国'
    return (
      <View style={{ padding: `${space(8)} ${space(5)}`, textAlign: 'center' }}>
        <Text style={{ ...typography.body, color: exploreTheme.subtext }}>
          正在整理{provinceLabel}点位...
        </Text>
      </View>
    )
  }

  if (!canRenderMap) {
    return (
      <CenteredText
        text={selectedProvince ? `${selectedProvince}暂无数据` : '暂无点位'}
        strong
      />
    )
  }

  if (!mapMountReady) {
    return <CenteredText text='地图加载中…' strong />
  }

  return (
    <TaroMap
      key={`${selectedProvince || 'all'}-${mapMarkers.length}-${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}-${shouldShowUserLabels ? 'user-label' : 'user-dot'}-${shouldShowSchoolLabels ? 'school-label' : 'school-dot'}-${hasUserClusters ? 'user-cluster' : 'user-plain'}-${hasSchoolClusters ? 'school-cluster' : 'school-plain'}`}
      latitude={center.latitude}
      longitude={center.longitude}
      scale={scale}
      minScale={3}
      maxScale={18}
      markers={mapMarkers}
      showScale={false}
      enableRotate={false}
      enableOverlooking={false}
      onMarkerTap={onMarkerTap}
      onCalloutTap={onCalloutTap}
      {...({ onLabelTap } as any)}
      onError={() => {}}
      style={{ width: '100%', height: 'calc(100vh - 120px)' }}
    />
  )
}
