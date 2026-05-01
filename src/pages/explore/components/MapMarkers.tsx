import { useEffect, useState } from 'react'
import { Map as TaroMap, Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { cardStyle, exploreTheme } from '../styles'

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

function CenteredText(props: { text: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ padding: '40px 20px' }}>
      <View style={{ ...cardStyle, textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', fontWeight: props.bold ? 'bold' : 'normal', color: props.color || exploreTheme.text }}>
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
      <View style={{ padding: '40px 20px' }}>
        <View style={{ ...cardStyle, textAlign: 'center' }}>
          <Text style={{ fontSize: '14px', color: palette.error }}>{error}</Text>
          <View onClick={onReload} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '999px', backgroundColor: palette.brandSoft }}>
            <Text style={{ fontSize: '13px', color: palette.brand }}>重新加载</Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading || !isProvinceDataSettled) {
    const provinceLabel = selectedProvince || '全国'
    return (
      <View style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: exploreTheme.subtext }}>
          正在加载{provinceLabel}数据...
        </Text>
      </View>
    )
  }

  if (isNavigatingAway) {
    return <CenteredText text='页面跳转中…' bold />
  }

  if (!canRenderMap && !emptyStateReady) {
    const provinceLabel = selectedProvince || '全国'
    return (
      <View style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: exploreTheme.subtext }}>
          正在整理{provinceLabel}点位...
        </Text>
      </View>
    )
  }

  if (!canRenderMap) {
    return (
      <CenteredText
        text={selectedProvince ? `${selectedProvince}暂无数据` : '暂无点位'}
        bold
      />
    )
  }

  if (!mapMountReady) {
    return <CenteredText text='地图加载中…' bold />
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
