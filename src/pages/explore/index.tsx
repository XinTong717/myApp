import { useMemo, useState } from 'react'
import { Map as TaroMap, type MapProps, Text, View, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
// 橙色圆点 20x20
const markerSchoolIcon = '/assets/marker-school.png'
// 绿色圆点 16x16
const markerUserIcon = '/assets/marker-user.png'
import { fetchSchools, fetchProfiles } from '../../services/api'

const CITIES: Record<string, { lat: number; lng: number; prov: string }> = {
  上海: { lat: 31.2304, lng: 121.4737, prov: '上海' },
  北京: { lat: 39.9042, lng: 116.4074, prov: '北京' },
  天津: { lat: 39.3434, lng: 117.3616, prov: '天津' },
  重庆: { lat: 29.5630, lng: 106.5516, prov: '重庆' },
  广州: { lat: 23.1291, lng: 113.2644, prov: '广东' },
  深圳: { lat: 22.5431, lng: 114.0579, prov: '广东' },
  佛山: { lat: 23.0218, lng: 113.1219, prov: '广东' },
  中山: { lat: 22.5176, lng: 113.3926, prov: '广东' },
  杭州: { lat: 30.2741, lng: 120.1551, prov: '浙江' },
  温州: { lat: 28.0006, lng: 120.6722, prov: '浙江' },
  宁波: { lat: 29.8683, lng: 121.5440, prov: '浙江' },
  丽水: { lat: 28.4680, lng: 119.9229, prov: '浙江' },
  湖州: { lat: 30.8927, lng: 120.0931, prov: '浙江' },
  绍兴: { lat: 30.0023, lng: 120.5822, prov: '浙江' },
  衢州: { lat: 28.9353, lng: 118.8597, prov: '浙江' },
  南京: { lat: 32.0603, lng: 118.7969, prov: '江苏' },
  苏州: { lat: 31.2990, lng: 120.5853, prov: '江苏' },
  常州: { lat: 31.8106, lng: 119.9740, prov: '江苏' },
  成都: { lat: 30.5728, lng: 104.0668, prov: '四川' },
  广元: { lat: 32.4354, lng: 105.8440, prov: '四川' },
  福州: { lat: 26.0745, lng: 119.2965, prov: '福建' },
  济南: { lat: 36.6512, lng: 116.9972, prov: '山东' },
  青岛: { lat: 36.0671, lng: 120.3826, prov: '山东' },
  西安: { lat: 34.3416, lng: 108.9398, prov: '陕西' },
  郑州: { lat: 34.7466, lng: 113.6253, prov: '河南' },
  开封: { lat: 34.7971, lng: 114.3416, prov: '河南' },
  保定: { lat: 38.8739, lng: 115.4646, prov: '河北' },
  衡水: { lat: 37.7390, lng: 115.6700, prov: '河北' },
  武汉: { lat: 30.5928, lng: 114.3055, prov: '湖北' },
  长沙: { lat: 28.2282, lng: 112.9388, prov: '湖南' },
  郴州: { lat: 25.7702, lng: 113.0148, prov: '湖南' },
  大理: { lat: 25.6065, lng: 100.2676, prov: '云南' },
  昆明: { lat: 25.0389, lng: 102.7183, prov: '云南' },
  玉溪: { lat: 24.3517, lng: 102.5470, prov: '云南' },
  贵阳: { lat: 26.6470, lng: 106.6302, prov: '贵州' },
  遵义: { lat: 27.7254, lng: 106.9272, prov: '贵州' },
  黔西南: { lat: 25.0880, lng: 104.9060, prov: '贵州' },
  黔南: { lat: 26.2582, lng: 107.5234, prov: '贵州' },
  南宁: { lat: 22.8170, lng: 108.3665, prov: '广西' },
  太原: { lat: 37.8706, lng: 112.5489, prov: '山西' },
  宣城: { lat: 30.9408, lng: 118.7588, prov: '安徽' },
  大连: { lat: 38.9140, lng: 121.6147, prov: '辽宁' },
  沈阳: { lat: 41.8057, lng: 123.4315, prov: '辽宁' },
  通化: { lat: 41.7280, lng: 125.9400, prov: '吉林' },
  黑河: { lat: 50.2455, lng: 127.5285, prov: '黑龙江' },
  海口: { lat: 20.0174, lng: 110.3493, prov: '海南' },
  澄迈: { lat: 19.7383, lng: 110.0075, prov: '海南' },
  兰州: { lat: 36.0611, lng: 103.8343, prov: '甘肃' },
  银川: { lat: 38.4872, lng: 106.2309, prov: '宁夏' },
  南昌: { lat: 28.6820, lng: 115.8579, prov: '江西' },
}

const PROV_FALLBACK: Record<string, { lat: number; lng: number }> = {
  上海: { lat: 31.2304, lng: 121.4737 }, 北京: { lat: 39.9042, lng: 116.4074 },
  天津: { lat: 39.3434, lng: 117.3616 }, 重庆: { lat: 29.5630, lng: 106.5516 },
  广东: { lat: 23.1291, lng: 113.2644 }, 浙江: { lat: 30.2741, lng: 120.1551 },
  江苏: { lat: 32.0603, lng: 118.7969 }, 四川: { lat: 30.5728, lng: 104.0668 },
  福建: { lat: 26.0745, lng: 119.2965 }, 山东: { lat: 36.6512, lng: 116.9972 },
  湖北: { lat: 30.5928, lng: 114.3055 }, 湖南: { lat: 28.2282, lng: 112.9388 },
  河南: { lat: 34.7466, lng: 113.6253 }, 河北: { lat: 38.0428, lng: 114.5149 },
  安徽: { lat: 31.8206, lng: 117.2272 }, 陕西: { lat: 34.3416, lng: 108.9398 },
  江西: { lat: 28.6820, lng: 115.8579 }, 广西: { lat: 22.8170, lng: 108.3665 },
  云南: { lat: 25.0389, lng: 102.7183 }, 贵州: { lat: 26.6470, lng: 106.6302 },
  山西: { lat: 37.8706, lng: 112.5489 }, 辽宁: { lat: 41.8057, lng: 123.4315 },
  吉林: { lat: 43.8171, lng: 125.3235 }, 黑龙江: { lat: 45.8038, lng: 126.5350 },
  甘肃: { lat: 36.0611, lng: 103.8343 }, 宁夏: { lat: 38.4872, lng: 106.2309 },
  海南: { lat: 20.0174, lng: 110.3493 },
}

type School = {
  id: number | string; name?: string; province?: string; city?: string; school_type?: string
}
type Profile = {
  id: string; username?: string; display_name?: string; province?: string; city?: string
  lat?: number | string | null; lng?: number | string | null
}
type MarkerItem = {
  id: number; latitude: number; longitude: number; name: string
  type: 'school' | 'user'; markerProv: string; city?: string; originalId: number | string
}

const toNum = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
const isValidCoord = (lat: number, lng: number) =>
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
function parseCities(f?: string): string[] {
  if (!f) return []
  return f.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('(') && !s.startsWith('（'))
}
function firstProvince(f?: string): string {
  if (!f) return ''
  return f.split(',')[0].trim()
    .replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '')
    .replace(/\(.*\)/, '').replace(/（.*）/, '').trim()
}

function nameHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h + name.charCodeAt(i)) | 0 }
  return Math.abs(h % 10000) / 10000
}

function jitter(baseLat: number, baseLng: number, index: number, total: number, name: string): { lat: number; lng: number } {
  if (total <= 1) return { lat: baseLat, lng: baseLng }
  const cols = Math.ceil(Math.sqrt(total))
  const row = Math.floor(index / cols)
  const col = index % cols
  const spacing = 0.025
  const gridW = (cols - 1) * spacing
  const rows = Math.ceil(total / cols)
  const gridH = (rows - 1) * spacing
  const gridLat = baseLat - gridH / 2 + row * spacing
  const gridLng = baseLng - gridW / 2 + col * spacing
  const h = nameHash(name)
  const h2 = nameHash(name + 'x')
  return {
    lat: gridLat + (h - 0.5) * 0.016,
    lng: gridLng + (h2 - 0.5) * 0.016 / Math.cos(baseLat * Math.PI / 180),
  }
}

function shortName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

export default function ExplorePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSchools, setShowSchools] = useState(true)
  const [showUsers, setShowUsers] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState('')

  const loadData = async () => {
    try {
      setLoading(true); setError('')
      const [sd, pd] = await Promise.all([fetchSchools(), fetchProfiles().catch(() => [])])
      setSchools(Array.isArray(sd) ? sd : [])
      setProfiles(Array.isArray(pd) ? pd : [])
    } catch (err: any) { setError(err?.message || '读取数据失败') }
    finally { setLoading(false) }
  }

  useDidShow(() => { loadData() })

  const allMarkers = useMemo(() => {
    const items: MarkerItem[] = []
    let nextId = 1
    const cityCount: Record<string, number> = {}
    const cityIndex: Record<string, number> = {}

    if (showSchools) {
      schools.forEach((s) => {
        parseCities(s.city).forEach((c) => { cityCount[c] = (cityCount[c] || 0) + 1 })
      })
      schools.forEach((s) => {
        const cities = parseCities(s.city)
        const schoolName = s.name?.trim() || '未知学校'
        if (cities.length > 0) {
          cities.forEach((cityName) => {
            const info = CITIES[cityName]
            if (!info) return
            const idx = cityIndex[cityName] || 0
            cityIndex[cityName] = idx + 1
            const jittered = jitter(info.lat, info.lng, idx, cityCount[cityName] || 1, schoolName)
            items.push({
              id: nextId++, latitude: jittered.lat, longitude: jittered.lng,
              name: schoolName, type: 'school', markerProv: info.prov,
              city: cityName, originalId: s.id,
            })
          })
        } else {
          const prov = firstProvince(s.province)
          const coord = PROV_FALLBACK[prov]
          if (!coord) return
          items.push({
            id: nextId++, latitude: coord.lat, longitude: coord.lng,
            name: schoolName, type: 'school', markerProv: prov, city: '', originalId: s.id,
          })
        }
      })
    }

    if (showUsers) {
      profiles.forEach((p) => {
        const lat = toNum(p.lat); const lng = toNum(p.lng)
        if (lat === null || lng === null || !isValidCoord(lat, lng)) return
        items.push({
          id: nextId++, latitude: lat, longitude: lng,
          name: p.display_name?.trim() || p.username?.trim() || '同路人',
          type: 'user', markerProv: firstProvince(p.province), city: p.city, originalId: p.id,
        })
      })
    }
    return items
  }, [schools, profiles, showSchools, showUsers])

  const filteredMarkers = useMemo(() => {
    if (!selectedProvince) return allMarkers
    return allMarkers.filter((m) => m.markerProv === selectedProvince)
  }, [allMarkers, selectedProvince])

  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    allMarkers.forEach((m) => { if (m.markerProv) set.add(m.markerProv) })
    return Array.from(set).sort()
  }, [allMarkers])

  // ===== 关键改动：用 callout + display ALWAYS 替代 label =====
  // callout 支持 onCalloutTap，label 不支持点击
  const mapMarkers: MapProps.marker[] = useMemo(() => {
    return filteredMarkers.map((item) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.name,
      iconPath: item.type === 'school' ? markerSchoolIcon : markerUserIcon,
      width: item.type === 'school' ? 22 : 16,
      height: item.type === 'school' ? 22 : 16,
      anchor: { x: 0.5, y: 0.5 },
      callout: {
        content: item.type === 'school' ? shortName(item.name) : '',
        color: '#2F241B',
        fontSize: 11,
        anchorX: 0,
        anchorY: -2,
        borderRadius: 6,
        borderWidth: 0,
        bgColor: 'rgba(255,255,255,0.9)',
        padding: 4,
        display: 'ALWAYS',
        textAlign: 'center',
      },
    }))
  }, [filteredMarkers])

  const { center, scale } = useMemo(() => {
    if (filteredMarkers.length === 0) {
      return { center: { latitude: 33.0, longitude: 108.0 }, scale: 5 }
    }
    const lats = filteredMarkers.map((m) => m.latitude)
    const lngs = filteredMarkers.map((m) => m.longitude)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const span = Math.max(maxLat - minLat, maxLng - minLng)
    let s: number
    if (span < 0.2) s = 13
    else if (span < 0.5) s = 11
    else if (span < 1.5) s = 9
    else if (span < 4) s = 7
    else if (span < 10) s = 6
    else s = 5
    return {
      center: { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 },
      scale: s,
    }
  }, [filteredMarkers])

  const idToMarker = useMemo(() => {
    const m: Record<number, MarkerItem> = {}
    filteredMarkers.forEach((item) => { m[item.id] = item })
    return m
  }, [filteredMarkers])

  const goToSchool = (markerId: number) => {
    const item = idToMarker[markerId]
    if (item?.type === 'school') {
      Taro.navigateTo({ url: `/pages/school-detail/index?id=${item.originalId}` })
    }
  }

  // marker 点击和 callout 点击都跳转
  const handleMarkerTap: MapProps['onMarkerTap'] = (e) => goToSchool(Number(e.detail?.markerId))
  const handleCalloutTap: MapProps['onCalloutTap'] = (e) => goToSchool(Number(e.detail?.markerId))

  const schoolCount = filteredMarkers.filter((m) => m.type === 'school').length
  const userCount = filteredMarkers.filter((m) => m.type === 'user').length

  return (
    <View style={{ minHeight: '100vh', backgroundColor: '#FFF9F2' }}>
      <View style={{ backgroundColor: '#FFF', padding: '10px 14px 6px', borderBottom: '1px solid #F1DFCF' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '6px' }}>
          <View
            onClick={() => setShowSchools(!showSchools)}
            style={{
              padding: '4px 10px', borderRadius: '999px', marginRight: '8px',
              backgroundColor: showSchools ? '#FCE6D6' : '#F5F5F5',
            }}
          >
            <Text style={{ fontSize: '12px', fontWeight: 'bold', color: showSchools ? '#E76F51' : '#BBB' }}>
              学校 {showSchools ? schoolCount : '—'}
            </Text>
          </View>
          <View
            onClick={() => setShowUsers(!showUsers)}
            style={{
              padding: '4px 10px', borderRadius: '999px', marginRight: '8px',
              backgroundColor: showUsers ? '#EEF7EE' : '#F5F5F5',
            }}
          >
            <Text style={{ fontSize: '12px', fontWeight: 'bold', color: showUsers ? '#7BAE7F' : '#BBB' }}>
              同路人 {showUsers ? userCount : '—'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: '11px', color: '#B5A08E' }}>{filteredMarkers.length} 个点位</Text>
        </View>

        {availableProvinces.length > 0 && (
          <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', height: '26px' }}>
            <View style={{ display: 'inline-flex', flexDirection: 'row' }}>
              <View
                onClick={() => setSelectedProvince('')}
                style={{
                  padding: '3px 10px', borderRadius: '999px', marginRight: '6px',
                  backgroundColor: !selectedProvince ? '#E76F51' : '#FFF3E6',
                }}
              >
                <Text style={{ fontSize: '11px', color: !selectedProvince ? '#FFF' : '#7A6756' }}>全国</Text>
              </View>
              {availableProvinces.map((prov) => (
                <View
                  key={prov}
                  onClick={() => setSelectedProvince(prov === selectedProvince ? '' : prov)}
                  style={{
                    padding: '3px 10px', borderRadius: '999px', marginRight: '6px',
                    backgroundColor: prov === selectedProvince ? '#E76F51' : '#FFF3E6',
                  }}
                >
                  <Text style={{ fontSize: '11px', color: prov === selectedProvince ? '#FFF' : '#7A6756' }}>{prov}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {loading && (
        <View style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Text style={{ fontSize: '14px', color: '#7A6756' }}>加载中...</Text>
        </View>
      )}
      {!loading && error && (
        <View style={{ padding: '40px 20px' }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #F1DFCF', textAlign: 'center' }}>
            <Text style={{ fontSize: '14px', color: '#CF1322' }}>{error}</Text>
            <View onClick={loadData} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '999px', backgroundColor: '#FCE6D6', display: 'inline-block' }}>
              <Text style={{ fontSize: '13px', color: '#E76F51' }}>重新加载</Text>
            </View>
          </View>
        </View>
      )}
      {!loading && !error && filteredMarkers.length === 0 && (
        <View style={{ padding: '40px 20px' }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #F1DFCF', textAlign: 'center' }}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#2F241B' }}>
              {selectedProvince ? `${selectedProvince}暂无数据` : '暂无点位'}
            </Text>
          </View>
        </View>
      )}
      {!loading && !error && filteredMarkers.length > 0 && (
        <TaroMap
          latitude={center.latitude}
          longitude={center.longitude}
          scale={scale}
          minScale={3}
          maxScale={18}
          markers={mapMarkers}
          showScale={false}
          enableRotate={false}
          enableOverlooking={false}
          onMarkerTap={handleMarkerTap}
          onCalloutTap={handleCalloutTap}
          style={{ width: '100%', height: 'calc(100vh - 120px)' }}
        />
      )}

      <View style={{ backgroundColor: '#FFFDF9', padding: '5px 16px', borderTop: '1px solid #F1DFCF' }}>
        <Text style={{ fontSize: '10px', color: '#C5B5A5' }}>
          近似坐标 · 仅供浏览 · 点击标记或名称查看详情
        </Text>
      </View>
    </View>
  )
}
