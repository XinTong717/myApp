import { useMemo, useState } from 'react'
import { Map, type MapProps, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import schoolMarkerIcon from '../../assets/school-marker.png'
import { fetchSchools } from '../../services/api'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accent: '#F4A261',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

type School = {
  id: number | string
  name?: string
  province?: string
  city?: string
  school_type?: string
  age_range?: string
  fee?: string
  lat?: number | string | null
  lng?: number | string | null
}

type MapPoint = {
  latitude: number
  longitude: number
}

const DEFAULT_CENTER: MapPoint = {
  latitude: 34.3416,
  longitude: 108.9398,
}

const DEFAULT_SCALE = 4

const toCoordinateNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const toMarkerId = (value: unknown): number | null => {
  const numeric = toCoordinateNumber(value)
  if (numeric === null || !Number.isInteger(numeric) || numeric < 0) {
    return null
  }

  return numeric
}

const hasValidCoordinates = (latitude: number, longitude: number) =>
  latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180

export default function SchoolMapPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSchools = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await fetchSchools()
      setSchools(Array.isArray(data) ? (data as School[]) : [])
    } catch (err: any) {
      console.error('loadSchoolMap error:', err)
      setError(err?.message || '读取学校地图数据失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadSchools()
  })

  const mapData = useMemo(() => {
    const markerSchools: Array<MapPoint & { id: number; name: string }> = []

    schools.forEach((school) => {
      const latitude = toCoordinateNumber(school.lat)
      const longitude = toCoordinateNumber(school.lng)
      const id = toMarkerId(school.id)

      if (
        latitude === null ||
        longitude === null ||
        id === null ||
        !hasValidCoordinates(latitude, longitude)
      ) {
        return
      }

      markerSchools.push({
        id,
        name: school.name?.trim() || `学校 ${id}`,
        latitude,
        longitude,
      })
    })

    const markers: MapProps.marker[] = markerSchools.map((item) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.name,
      iconPath: schoolMarkerIcon,
      width: 26,
      height: 34,
      anchor: { x: 0.5, y: 1 },
      callout: {
        content: item.name,
        color: palette.text,
        fontSize: 11,
        anchorX: 0,
        anchorY: -36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.line,
        bgColor: palette.card,
        padding: 6,
        display: 'ALWAYS',
        textAlign: 'center',
      },
    }))

    const includePoints = markerSchools.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    }))

    const center =
      markerSchools.length > 0
        ? {
            latitude:
              markerSchools.reduce((sum, item) => sum + item.latitude, 0) / markerSchools.length,
            longitude:
              markerSchools.reduce((sum, item) => sum + item.longitude, 0) / markerSchools.length,
          }
        : DEFAULT_CENTER

    return {
      center,
      markers,
      includePoints,
      withCoordinatesCount: markerSchools.length,
      withoutCoordinatesCount: Math.max(schools.length - markerSchools.length, 0),
      scale: markerSchools.length <= 1 ? 10 : DEFAULT_SCALE,
    }
  }, [schools])

  const handleMarkerTap: MapProps['onMarkerTap'] = (event) => {
    const markerId = Number(event.detail?.markerId)

    if (!Number.isFinite(markerId)) {
      Taro.showToast({
        title: '学校信息异常',
        icon: 'none',
      })
      return
    }

    Taro.navigateTo({
      url: `/pages/school-detail/index?id=${markerId}`,
    })
  }

  const handleMapError: MapProps['onError'] = (event) => {
    console.error('school map render error:', event.detail)
    Taro.showToast({
      title: '地图加载失败',
      icon: 'none',
    })
  }

  return (
    <View
      style={{
        minHeight: '100vh',
        backgroundColor: palette.bg,
        padding: '16px 16px 24px',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          border: `1px solid ${palette.line}`,
        }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: palette.cardSoft,
            borderRadius: '999px',
            padding: '5px 10px',
            marginBottom: '10px',
          }}
        >
          <Text style={{ fontSize: '12px', color: palette.accentDeep }}>学校位置总览</Text>
        </View>

        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>
            学校地图
          </Text>
        </View>

        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          在地图上浏览已补全坐标的学校，点击标记即可进入学校详情。
        </Text>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: '14px',
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: palette.accentSoft,
              borderRadius: '16px',
              padding: '12px',
              marginRight: '10px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.accentDeep }}>有坐标</Text>
            <View style={{ marginTop: '6px' }}>
              <Text style={{ fontSize: '20px', fontWeight: 'bold', color: palette.text }}>
                {loading ? '--' : mapData.withCoordinatesCount}
              </Text>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: palette.greenSoft,
              borderRadius: '16px',
              padding: '12px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.green }}>缺坐标</Text>
            <View style={{ marginTop: '6px' }}>
              <Text style={{ fontSize: '20px', fontWeight: 'bold', color: palette.text }}>
                {loading ? '--' : mapData.withoutCoordinatesCount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: '20px',
            padding: '18px 16px',
            border: `1px solid ${palette.line}`,
          }}
        >
          <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>
            地图加载中
          </Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext }}>
              正在读取学校坐标并生成标记点...
            </Text>
          </View>
        </View>
      ) : null}

      {!loading && error ? (
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid #FFD8D2',
          }}
        >
          <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#CF1322' }}>
            地图读取失败
          </Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '13px', color: '#8F1D2C' }}>{error}</Text>
          </View>

          <View
            onClick={loadSchools}
            style={{
              alignSelf: 'flex-start',
              marginTop: '14px',
              padding: '8px 14px',
              borderRadius: '999px',
              backgroundColor: palette.accentSoft,
            }}
          >
            <Text style={{ fontSize: '13px', color: palette.accentDeep }}>重新加载</Text>
          </View>
        </View>
      ) : null}

      {!loading && !error && mapData.markers.length === 0 ? (
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: '20px',
            padding: '18px 16px',
            border: `1px solid ${palette.line}`,
          }}
        >
          <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>
            暂无可显示的学校坐标
          </Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
              当前学校数据里还没有可用的经纬度，后续补全坐标后就会显示在这里。
            </Text>
          </View>
        </View>
      ) : null}

      {!loading && !error && mapData.markers.length > 0 ? (
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: '22px',
            border: `1px solid ${palette.line}`,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: '16px',
              backgroundColor: '#FFFDF9',
              borderBottom: `1px solid ${palette.line}`,
            }}
          >
            <Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text }}>
              地图视图
            </Text>
            <View style={{ marginTop: '6px' }}>
              <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
                当前展示 {mapData.markers.length} 所学校，点击标记即可跳转到详情页。
              </Text>
            </View>
          </View>

          <TaroMap
            latitude={mapData.center.latitude}
            longitude={mapData.center.longitude}
            scale={mapData.scale}
            minScale={3}
            maxScale={18}
            markers={mapData.markers}
            includePoints={mapData.includePoints}
            showScale
            enableRotate={false}
            enableOverlooking={false}
            onMarkerTap={handleMarkerTap}
            onError={handleMapError}
            style={{
              width: '100%',
              height: '460px',
            }}
          />
        </View>
      ) : null}
    </View>
  )
}
