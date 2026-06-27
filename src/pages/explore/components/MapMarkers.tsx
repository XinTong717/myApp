import { useEffect, useMemo, useState } from 'react'
import { Map as TaroMap, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
  isInteractionPaused: boolean
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
const DEFAULT_CENTER = { latitude: 33.0, longitude: 108.0 }
const MAP_VIEW_HEIGHT = 'calc(100vh - 176px)'
const MIN_MAP_SCALE = 4
const MAX_OVERVIEW_SCALE = 10

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

function isFiniteCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

function isDevtoolsRuntime() {
  try {
    const info = Taro.getSystemInfoSync?.()
    return info?.brand === 'devtools'
  } catch (err) {
    return false
  }
}

function normalizeMapMarker(marker: any, index: number) {
  const latitude = Number(marker?.latitude)
  const longitude = Number(marker?.longitude)
  if (!isFiniteCoordinate(latitude, longitude)) return null

  const id = Number(marker?.id)
  return {
    ...marker,
    id: Number.isFinite(id) ? id : index + 1,
    latitude,
    longitude,
  }
}

function buildMarkerSignature(markers: any[]) {
  return markers
    .map((marker) => `${marker.id}:${Number(marker.latitude).toFixed(5)},${Number(marker.longitude).toFixed(5)}`)
    .join('|')
}

function getSafeCenter(center: { latitude: number; longitude: number }, markers: any[]) {
  const latitude = Number(center?.latitude)
  const longitude = Number(center?.longitude)
  if (isFiniteCoordinate(latitude, longitude)) return { latitude, longitude }

  if (markers.length === 0) return DEFAULT_CENTER
  const lat = markers.reduce((sum, marker) => sum + Number(marker.latitude), 0) / markers.length
  const lng = markers.reduce((sum, marker) => sum + Number(marker.longitude), 0) / markers.length
  return isFiniteCoordinate(lat, lng) ? { latitude: lat, longitude: lng } : DEFAULT_CENTER
}

function clampMapScale(scale: number) {
  const nextScale = Number(scale)
  if (!Number.isFinite(nextScale)) return MIN_MAP_SCALE
  return Math.max(MIN_MAP_SCALE, Math.min(MAX_OVERVIEW_SCALE, nextScale))
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
    isInteractionPaused,
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
  const disableMapZoom = useMemo(() => isDevtoolsRuntime(), [])
  const safeMapMarkers = useMemo(() => {
    return (Array.isArray(mapMarkers) ? mapMarkers : [])
      .map((marker, index) => normalizeMapMarker(marker, index))
      .filter(Boolean)
  }, [mapMarkers])
  const safeCenter = useMemo(() => getSafeCenter(center, safeMapMarkers), [center, safeMapMarkers])
  const markerSignature = useMemo(() => buildMarkerSignature(safeMapMarkers), [safeMapMarkers])
  const safeScale = useMemo(() => clampMapScale(scale), [scale])
  const safeCanRenderMap = canRenderMap && safeMapMarkers.length > 0 && isFiniteCoordinate(safeCenter.latitude, safeCenter.longitude)

  useEffect(() => {
    setEmptyStateReady(false)

    const shouldArmEmptyState =
      !loading &&
      !error &&
      isProvinceDataSettled &&
      !isNavigatingAway &&
      !isInteractionPaused &&
      !safeCanRenderMap

    if (!shouldArmEmptyState) return undefined

    const timer = setTimeout(() => setEmptyStateReady(true), EMPTY_STATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [loading, error, isProvinceDataSettled, isNavigatingAway, isInteractionPaused, safeCanRenderMap, selectedProvince, markerSignature])

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

  if (isInteractionPaused) {
    return <View style={{ width: '100%', height: MAP_VIEW_HEIGHT }} />
  }

  if (!safeCanRenderMap && !emptyStateReady) {
    const provinceLabel = selectedProvince || '全国'
    return (
      <View style={{ padding: `${space(8)} ${space(5)}`, textAlign: 'center' }}>
        <Text style={{ ...typography.body, color: exploreTheme.subtext }}>
          正在整理{provinceLabel}点位...
        </Text>
      </View>
    )
  }

  if (!safeCanRenderMap) {
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
      key={`${selectedProvince || 'all'}-${markerSignature}-${safeCenter.latitude.toFixed(3)}-${safeCenter.longitude.toFixed(3)}-${safeScale}-${shouldShowUserLabels ? 'user-label' : 'user-dot'}-${shouldShowSchoolLabels ? 'school-label' : 'school-dot'}-${hasUserClusters ? 'user-cluster' : 'user-plain'}-${hasSchoolClusters ? 'school-cluster' : 'school-plain'}-${disableMapZoom ? 'devtools-no-zoom' : 'zoom'}`}
      latitude={safeCenter.latitude}
      longitude={safeCenter.longitude}
      scale={safeScale}
      minScale={MIN_MAP_SCALE}
      maxScale={MAX_OVERVIEW_SCALE}
      markers={safeMapMarkers}
      showScale={false}
      enableZoom={!disableMapZoom}
      enableRotate={false}
      enableOverlooking={false}
      onMarkerTap={onMarkerTap}
      onCalloutTap={onCalloutTap}
      {...({ onLabelTap } as any)}
      onError={() => {}}
      style={{ width: '100%', height: MAP_VIEW_HEIGHT }}
    />
  )
}
