import { useMemo, useState } from 'react'
import { Map as TaroMap, Text, View, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchSchools, fetchProfiles } from '../../services/api'

const markerSchoolIcon = '/assets/marker-school.png'
const markerUserIcon = '/assets/marker-user.png'

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
  合肥: { lat: 31.8206, lng: 117.2272, prov: '安徽' },
  大连: { lat: 38.9140, lng: 121.6147, prov: '辽宁' },
  沈阳: { lat: 41.8057, lng: 123.4315, prov: '辽宁' },
  通化: { lat: 41.7280, lng: 125.9400, prov: '吉林' },
  长春: { lat: 43.8171, lng: 125.3235, prov: '吉林' },
  哈尔滨: { lat: 45.8038, lng: 126.5350, prov: '黑龙江' },
  黑河: { lat: 50.2455, lng: 127.5285, prov: '黑龙江' },
  海口: { lat: 20.0174, lng: 110.3493, prov: '海南' },
  三亚: { lat: 18.2528, lng: 109.5120, prov: '海南' },
  澄迈: { lat: 19.7383, lng: 110.0075, prov: '海南' },
  兰州: { lat: 36.0611, lng: 103.8343, prov: '甘肃' },
  银川: { lat: 38.4872, lng: 106.2309, prov: '宁夏' },
  南昌: { lat: 28.6820, lng: 115.8579, prov: '江西' },
  呼和浩特: { lat: 40.8424, lng: 111.7490, prov: '内蒙古' },
  乌鲁木齐: { lat: 43.8256, lng: 87.6168, prov: '新疆' },
  拉萨: { lat: 29.6500, lng: 91.1409, prov: '西藏' },
  西宁: { lat: 36.6171, lng: 101.7782, prov: '青海' },
  香港: { lat: 22.3193, lng: 114.1694, prov: '香港' },
  澳门: { lat: 22.1987, lng: 113.5439, prov: '澳门' },
  台北: { lat: 25.0330, lng: 121.5654, prov: '台湾' },
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
  海南: { lat: 20.0174, lng: 110.3493 }, 内蒙古: { lat: 40.8424, lng: 111.7490 },
  新疆: { lat: 43.8256, lng: 87.6168 }, 西藏: { lat: 29.6500, lng: 91.1409 },
  青海: { lat: 36.6171, lng: 101.7782 },
}

type School = {
  id: number | string; name?: string; province?: string; city?: string; school_type?: string
}
type WebProfile = {
  id: string; username?: string; display_name?: string; province?: string; city?: string
  bio?: string; lat?: number | string | null; lng?: number | string | null
}
type AppUser = {
  _id: string; displayName?: string; roles?: string[]; province?: string; city?: string; bio?: string
}
type MarkerItem = {
  id: number; latitude: number; longitude: number; name: string
  type: 'school' | 'user'; markerProv: string; city?: string
  originalId: number | string; bio?: string; roles?: string[]
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
  return f.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('(') && !s.startsWith('('))
}
function firstProvince(f?: string): string {
  if (!f) return ''
  return f.split(',')[0].trim()
    .replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '')
    .replace(/\(.*\)/, '').replace(/(.*)/, '').trim()
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
  const h = nameHash(name); const h2 = nameHash(name + 'x')
  return {
    lat: gridLat + (h - 0.5) * 0.016,
    lng: gridLng + (h2 - 0.5) * 0.016 / Math.cos(baseLat * Math.PI / 180),
  }
}
function shortName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max) + '...' : name
}

export default function ExplorePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [webProfiles, setWebProfiles] = useState<WebProfile[]>([])
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSchools, setShowSchools] = useState(true)
  const [showUsers, setShowUsers] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [hasProfile, setHasProfile] = useState(true) // assume true until checked

  const loadData = async () => {
    try {
      setLoading(true); setError('')

      // 并行加载：学校 + 网站用户 + 小程序用户 + 当前用户资料检查
      const [schoolData, profileData, mapUsersRes, myRes] = await Promise.all([
        fetchSchools(),
        fetchProfiles().catch(() => []),
        Taro.cloud.callFunction({ name: 'getMapUsers', data: {} }).catch(() => ({ result: { users: [] } })),
        Taro.cloud.callFunction({ name: 'getMe', data: {} }).catch(() => ({ result: { profile: null } })),
      ])

      setSchools(Array.isArray(schoolData) ? schoolData : [])
      setWebProfiles(Array.isArray(profileData) ? profileData : [])

      const mapResult = (mapUsersRes as any)?.result
      setAppUsers(Array.isArray(mapResult?.users) ? mapResult.users : [])

      // 检查当前用户是否已填资料
      const myProfile = (myRes as any)?.result?.profile
      setHasProfile(!!(myProfile && myProfile.displayName && myProfile.province && myProfile.city))
    } catch (err: any) {
      setError(err?.message || '读取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { loadData() })

  const goToProfile = () => {
    Taro.switchTab({ url: '/pages/profile/index' })
  }

  // ===== 构建 markers =====
  const allMarkers = useMemo(() => {
    const items: MarkerItem[] = []
    let nextId = 1
    const cityCount: Record<string, number> = {}
    const cityIndex: Record<string, number> = {}

    // === 学校 ===
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

    // === 用户（网站 profiles + 小程序 users 合并）===
    if (showUsers) {
      // 网站 profiles：用数据库 lat/lng
      webProfiles.forEach((p) => {
        const lat = toNum(p.lat); const lng = toNum(p.lng)
        if (lat === null || lng === null || !isValidCoord(lat, lng)) return
        const name = p.display_name?.trim() || p.username?.trim() || '同路人'
        items.push({
          id: nextId++, latitude: lat, longitude: lng,
          name, type: 'user', markerProv: firstProvince(p.province),
          city: p.city, originalId: p.id, bio: p.bio,
        })
      })

      // 小程序 users：用 CITIES 映射
      appUsers.forEach((u) => {
        if (!u.city || !u.province) return
        const cityInfo = CITIES[u.city]
        const coord = cityInfo || PROV_FALLBACK[u.province]
        if (!coord) return
        const prov = cityInfo ? cityInfo.prov : u.province
        const name = u.displayName?.trim() || '同路人'
        // 加微小偏移避免和网站用户完全重叠
        const h = nameHash(name + u._id)
        const offsetLat = (h - 0.5) * 0.02
        const offsetLng = (nameHash(u._id) - 0.5) * 0.02
        items.push({
          id: nextId++,
          latitude: (cityInfo ? cityInfo.lat : (coord as any).lat) + offsetLat,
          longitude: (cityInfo ? cityInfo.lng : (coord as any).lng) + offsetLng,
          name, type: 'user', markerProv: prov,
          city: u.city, originalId: u._id,
          bio: u.bio, roles: u.roles,
        })
      })
    }
    return items
  }, [schools, webProfiles, appUsers, showSchools, showUsers])

  const filteredMarkers = useMemo(() => {
    if (!selectedProvince) return allMarkers
    return allMarkers.filter((m) => m.markerProv === selectedProvince)
  }, [allMarkers, selectedProvince])

  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    allMarkers.forEach((m) => { if (m.markerProv) set.add(m.markerProv) })
    return Array.from(set).sort()
  }, [allMarkers])

  // ===== 地图 markers =====
  const mapMarkers: any[] = useMemo(() => {
    return filteredMarkers.map((item) => {
      // 学校：始终显示名字
      // 用户：始终显示名字 + 城市
      const calloutContent = item.type === 'school'
        ? shortName(item.name)
        : (item.name + (item.city ? ' · ' + item.city : ''))

      return {
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        title: item.name,
        iconPath: item.type === 'school' ? markerSchoolIcon : markerUserIcon,
        width: item.type === 'school' ? 22 : 18,
        height: item.type === 'school' ? 22 : 18,
        anchor: { x: 0.5, y: 0.5 },
        callout: {
          content: calloutContent,
          color: '#2F241B',
          fontSize: 11,
          anchorX: 0,
          anchorY: -2,
          borderRadius: 6,
          borderWidth: 0,
          bgColor: item.type === 'school' ? 'rgba(255,255,255,0.9)' : 'rgba(238,247,238,0.92)',
          padding: 4,
          display: 'ALWAYS',
          textAlign: 'center',
        },
      }
    })
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

  const handleTap = (markerId: number) => {
    const item = idToMarker[markerId]
    if (!item) return

    if (item.type === 'school') {
      Taro.navigateTo({ url: '/pages/school-detail/index?id=' + item.originalId })
    } else {
      // 用户：显示简介弹窗
      const roleStr = item.roles && item.roles.length > 0 ? item.roles.join(' / ') : ''
      const lines = [item.name]
      if (item.city) lines.push('📍 ' + item.city)
      if (roleStr) lines.push('身份: ' + roleStr)
      if (item.bio) lines.push(item.bio)

      Taro.showModal({
        title: item.name,
        content: lines.slice(1).join('\n') || '这位同路人还没有填写简介',
        showCancel: false,
        confirmText: '关闭',
      })
    }
  }

  const handleMarkerTap = (e: any) => handleTap(Number(e.detail?.markerId))
  const handleCalloutTap = (e: any) => handleTap(Number(e.detail?.markerId))

  const schoolCount = filteredMarkers.filter((m) => m.type === 'school').length
  const userCount = filteredMarkers.filter((m) => m.type === 'user').length

  return (
    <View style={{ minHeight: '100vh', backgroundColor: '#FFF9F2' }}>
      {/* 未填资料引导 */}
      {!loading && !hasProfile && (
        <View
          onClick={goToProfile}
          style={{
            backgroundColor: '#FFF', padding: '12px 14px',
            borderBottom: '1px solid #F1DFCF',
            display: 'flex', flexDirection: 'row', alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#2F241B' }}>
              填写资料，出现在地图上
            </Text>
            <View style={{ marginTop: '2px' }}>
              <Text style={{ fontSize: '12px', color: '#7A6756' }}>
                让同城的家庭和教育者发现你
              </Text>
            </View>
          </View>
          <View style={{
            padding: '6px 14px', borderRadius: '999px', backgroundColor: '#E76F51',
          }}>
            <Text style={{ fontSize: '12px', color: '#FFF', fontWeight: 'bold' }}>去填写</Text>
          </View>
        </View>
      )}

      {/* 筛选栏 */}
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

      {/* 地图 */}
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
              {selectedProvince ? selectedProvince + '暂无数据' : '暂无点位'}
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
          onError={() => {}}
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
