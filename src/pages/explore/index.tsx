import { useCallback, useEffect, useMemo, useState } from 'react'
import { Map as TaroMap, Text, View, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { REPORT_CODE_MESSAGES, REQUEST_CODE_MESSAGES, SAFETY_CODE_MESSAGES } from '../../constants/cloudMessages'
import { getSchools } from '../../services/school'
import { getMe } from '../../services/profile'
import { clearMapUsersCache, getMapUsers } from '../../services/map'
import { sendRequest } from '../../services/connection'
import { manageSafetyRelation, reportUser } from '../../services/safety'
import { REPORT_REASON_OPTIONS } from '../../constants/safety'
import { CITIES, PROV_FALLBACK } from '../../constants/cities'
import { logCloudFailure, resolveCloudMessage } from '../../utils/cloudFeedback'
import { palette } from '../../theme/palette'

const markerSchoolIcon = '/assets/marker-school.png'
const markerUserIcon = '/assets/marker-user.png'

type School = { id: number | string; name?: string; province?: string; city?: string }
type AppUser = { _id: string; displayName?: string; roles?: string[]; province?: string; city?: string; bio?: string; companionContext?: string; isSelf?: boolean }
type MarkerItem = {
  id: number; latitude: number; longitude: number; name: string
  type: 'school' | 'user' | 'user_cluster'; markerProv: string; city?: string
  originalId: number | string; bio?: string; roles?: string[]; companionContext?: string; isSelf?: boolean
  clusterUsers?: AppUser[]
}

const USER_CLUSTER_THRESHOLD = 5

type Coord = { lat: number; lng: number }

function parseCities(f?: string): string[] {
  if (!f) return []
  return f.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('(') && !s.startsWith('（'))
}
function firstProvince(f?: string): string {
  if (!f) return ''
  return f.split(',')[0].trim().replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '').replace(/\(.*\)/, '').replace(/\(.*\)/, '').trim()
}
function nameHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h + name.charCodeAt(i)) | 0 }
  return Math.abs(h % 10000) / 10000
}
function isValidCoord(coord?: Partial<Coord> | null): coord is Coord {
  return !!coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng)
}
function jitter(baseLat: number, baseLng: number, index: number, total: number, name: string): { lat: number; lng: number } {
  if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) return { lat: NaN, lng: NaN }
  if (total <= 1) return { lat: baseLat, lng: baseLng }
  const cols = Math.ceil(Math.sqrt(total))
  const row = Math.floor(index / cols)
  const col = index % cols
  const spacing = 0.025
  const gridW = (cols - 1) * spacing
  const rows = Math.ceil(total / cols)
  const gridH = (rows - 1) * spacing
  const gridLat = baseLat - gridH / 2 + row * spacing
  const cosLat = Math.cos(baseLat * Math.PI / 180)
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat
  const gridLng = baseLng - gridW / 2 + col * spacing
  const h = nameHash(name); const h2 = nameHash(name + 'x')
  return {
    lat: gridLat + (h - 0.5) * 0.016,
    lng: gridLng + (h2 - 0.5) * 0.016 / safeCosLat,
  }
}
function sanitizeMapLabel(value: string): string {
  const raw = String(value || '')
  let result = ''
  let previousWasSpace = false

  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)

    if (code >= 0xd800 && code <= 0xdbff) {
      i += 1
      continue
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue
    if (code < 32 || code === 127 || code === 0xfffd) continue

    const char = raw.charAt(i)
    if (/\s/.test(char)) {
      if (!previousWasSpace) {
        result += ' '
        previousWasSpace = true
      }
    } else {
      result += char
      previousWasSpace = false
    }
  }

  return result.trim()
}
function shortName(name: string, max = 8): string {
  const clean = sanitizeMapLabel(name) || '学习社区'
  return clean.length > max ? clean.substring(0, max) + '…' : clean
}
function normalizeRoles(roles: string[] = []) {
  return roles.map((role) => role === '其他' ? '同行者' : role)
}
function isPureEducator(user: AppUser) {
  const roles = normalizeRoles(user.roles || [])
  return roles.includes('教育者') && !roles.includes('家长')
}

export default function ExplorePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSchools, setShowSchools] = useState(true)
  const [showUsers, setShowUsers] = useState(true)
  const [showEducators, setShowEducators] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [hasProfile, setHasProfile] = useState(true)
  const [selectedUser, setSelectedUser] = useState<MarkerItem | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<MarkerItem | null>(null)
  const [mapMountReady, setMapMountReady] = useState(false)
  const [isNavigatingAway, setIsNavigatingAway] = useState(false)

  const loadData = async (options: { forceRefreshMapUsers?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      setIsNavigatingAway(false)
      const [schoolRes, mapUsersRes, myRes] = await Promise.all([
        getSchools(),
        getMapUsers({
          forceRefresh: !!options.forceRefreshMapUsers,
          province: selectedProvince || undefined,
        }),
        getMe(),
      ])

      if (schoolRes?.ok && Array.isArray(schoolRes.schools)) {
        setSchools(schoolRes.schools)
      } else {
        setSchools([])
        logCloudFailure('getSchoolsInExplore', schoolRes)
      }

      if (mapUsersRes?.ok && Array.isArray(mapUsersRes.users)) {
        setAppUsers(mapUsersRes.users)
      } else {
        setAppUsers([])
        logCloudFailure('getMapUsersInExplore', mapUsersRes)
      }

      const myProfile = myRes?.profile
      setHasProfile(!!(myProfile && myProfile.displayName && myProfile.province && myProfile.city))
    } catch (err: any) {
      setError(err?.message || '读取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { loadData() })

  useEffect(() => {
    loadData()
  }, [selectedProvince])

  const goToProfile = () => { Taro.switchTab({ url: '/pages/profile/index' }) }

  const allMarkers = useMemo(() => {
    const items: MarkerItem[] = []
    let nextId = 1
    const cityCount: Record<string, number> = {}
    const cityIndex: Record<string, number> = {}

    if (showSchools) {
      schools.forEach((s) => { parseCities(s.city).forEach((c) => { cityCount[c] = (cityCount[c] || 0) + 1 }) })
      schools.forEach((s) => {
        const cities = parseCities(s.city)
        const schoolName = s.name?.trim() || '未知学习社区'
        if (cities.length > 0) {
          cities.forEach((cityName) => {
            const info = CITIES[cityName]
            if (!isValidCoord(info)) return
            const idx = cityIndex[cityName] || 0
            cityIndex[cityName] = idx + 1
            const jittered = jitter(info.lat, info.lng, idx, cityCount[cityName] || 1, schoolName)
            if (!isValidCoord(jittered)) return
            items.push({ id: nextId++, latitude: jittered.lat, longitude: jittered.lng, name: schoolName, type: 'school', markerProv: info.prov, city: cityName, originalId: s.id })
          })
        } else {
          const prov = firstProvince(s.province)
          const coord = PROV_FALLBACK[prov]
          if (!isValidCoord(coord)) return
          items.push({ id: nextId++, latitude: coord.lat, longitude: coord.lng, name: schoolName, type: 'school', markerProv: prov, city: '', originalId: s.id })
        }
      })
    }

    if (showUsers) {
      const visibleUsers = appUsers.filter((u) => showEducators || u.isSelf || !isPureEducator(u))

      // Bucket users by city so we can grid-jitter small groups and cluster larger ones.
      const usersByCity: Record<string, AppUser[]> = {}
      const usersWithoutCity: AppUser[] = []
      visibleUsers.forEach((u) => {
        if (!u.city || !u.province) return
        const cityInfo = CITIES[u.city]
        if (!isValidCoord(cityInfo) && !isValidCoord(PROV_FALLBACK[u.province])) return
        if (isValidCoord(cityInfo)) {
          const key = u.city
          if (!usersByCity[key]) usersByCity[key] = []
          usersByCity[key].push(u)
        } else {
          usersWithoutCity.push(u)
        }
      })

      Object.keys(usersByCity).forEach((cityName) => {
        const usersInCity = usersByCity[cityName]
        const cityInfo = CITIES[cityName]
        if (!isValidCoord(cityInfo)) return

        if (usersInCity.length >= USER_CLUSTER_THRESHOLD) {
          items.push({
            id: nextId++,
            latitude: cityInfo.lat,
            longitude: cityInfo.lng,
            name: cityName,
            type: 'user_cluster',
            markerProv: cityInfo.prov,
            city: cityName,
            originalId: `cluster-${cityName}`,
            clusterUsers: usersInCity,
          })
          return
        }

        usersInCity.forEach((u, idx) => {
          const name = u.displayName?.trim() || '同路人'
          const jittered = jitter(cityInfo.lat, cityInfo.lng, idx, usersInCity.length, name + u._id)
          if (!isValidCoord(jittered)) return
          items.push({
            id: nextId++,
            latitude: jittered.lat,
            longitude: jittered.lng,
            name,
            type: 'user',
            markerProv: cityInfo.prov,
            city: u.city,
            originalId: u._id,
            bio: u.bio,
            roles: normalizeRoles(u.roles || []),
            companionContext: u.companionContext || '',
            isSelf: !!u.isSelf,
          })
        })
      })

      // Users with only province granularity: scatter near province center with grid jitter.
      const usersByProv: Record<string, AppUser[]> = {}
      usersWithoutCity.forEach((u) => {
        if (!u.province) return
        if (!usersByProv[u.province]) usersByProv[u.province] = []
        usersByProv[u.province].push(u)
      })
      Object.keys(usersByProv).forEach((prov) => {
        const provUsers = usersByProv[prov]
        const coord = PROV_FALLBACK[prov]
        if (!isValidCoord(coord)) return

        if (provUsers.length >= USER_CLUSTER_THRESHOLD) {
          items.push({
            id: nextId++,
            latitude: coord.lat,
            longitude: coord.lng,
            name: prov,
            type: 'user_cluster',
            markerProv: prov,
            city: '',
            originalId: `cluster-prov-${prov}`,
            clusterUsers: provUsers,
          })
          return
        }

        provUsers.forEach((u, idx) => {
          const name = u.displayName?.trim() || '同路人'
          const jittered = jitter(coord.lat, coord.lng, idx, provUsers.length, name + u._id)
          if (!isValidCoord(jittered)) return
          items.push({
            id: nextId++,
            latitude: jittered.lat,
            longitude: jittered.lng,
            name,
            type: 'user',
            markerProv: prov,
            city: u.city,
            originalId: u._id,
            bio: u.bio,
            roles: normalizeRoles(u.roles || []),
            companionContext: u.companionContext || '',
            isSelf: !!u.isSelf,
          })
        })
      })
    }
    return items
  }, [schools, appUsers, showSchools, showUsers, showEducators])

  const filteredMarkers = useMemo(() => {
    if (!selectedProvince) return allMarkers
    return allMarkers.filter((m) => m.markerProv === selectedProvince)
  }, [allMarkers, selectedProvince])

  const validMarkers = useMemo(() => {
    return filteredMarkers.filter(
      (m) =>
        Number.isFinite(m.latitude) &&
        Number.isFinite(m.longitude)
    )
  }, [filteredMarkers])

  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    allMarkers.forEach((m) => { if (m.markerProv) set.add(m.markerProv) })
    const list: string[] = []
    set.forEach((prov) => { list.push(prov) })
    return list.sort()
  }, [allMarkers])

  const mapMarkers: any[] = useMemo(() => validMarkers.map((item) => {
    const isCluster = item.type === 'user_cluster'
    const clusterCount = item.clusterUsers?.length || 0
    const labelContent = isCluster
      ? `${shortName(item.name, 6)} · ${clusterCount}人`
      : item.type === 'school'
        ? shortName(item.name)
        : shortName(item.name + (item.city ? ' · ' + item.city : ''), 10)
    const labelOffsetX = isCluster ? -32 : item.type === 'school' ? -24 : -22
    const iconSize = isCluster ? 26 : item.type === 'school' ? 22 : 18
    return {
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.name,
      iconPath: item.type === 'school' ? markerSchoolIcon : markerUserIcon,
      width: iconSize,
      height: iconSize,
      anchor: { x: 0.5, y: 0.5 },
      label: {
        content: labelContent,
        color: isCluster ? '#FFFFFF' : palette.text,
        fontSize: isCluster ? 12 : 11,
        anchorX: labelOffsetX,
        anchorY: -34,
        borderRadius: 8,
        borderWidth: 0,
        borderColor: '#FFFFFF',
        bgColor: isCluster
          ? 'rgba(216,106,77,0.95)'
          : item.type === 'school' ? 'rgba(255,255,255,0.92)' : 'rgba(238,245,232,0.94)',
        padding: 5,
        textAlign: 'center',
      },
    }
  }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [validMarkers])

  const { center, scale } = useMemo(() => {
    if (validMarkers.length === 0) {
      return { center: { latitude: 33.0, longitude: 108.0 }, scale: 5 }
    }

    const lats = validMarkers.map((m) => m.latitude)
    const lngs = validMarkers.map((m) => m.longitude)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const span = Math.max(maxLat - minLat, maxLng - minLng)

    let s: number
    if (span < 0.2) s = 13
    else if (span < 0.5) s = 11
    else if (span < 1.5) s = 9
    else if (span < 4) s = 7
    else if (span < 10) s = 6
    else s = 5

    const nextCenter = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
    }

    if (!Number.isFinite(nextCenter.latitude) || !Number.isFinite(nextCenter.longitude)) {
      return { center: { latitude: 33.0, longitude: 108.0 }, scale: 5 }
    }

    return {
      center: nextCenter,
      scale: s,
    }
  }, [validMarkers])

  const canRenderMap = mapMarkers.length > 0 && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)

  useEffect(() => {
    setMapMountReady(false)
    if (!canRenderMap || loading || error || isNavigatingAway) {
      return
    }
    const timer = setTimeout(() => {
      setMapMountReady(true)
    }, 80)
    return () => clearTimeout(timer)
  }, [canRenderMap, loading, error, isNavigatingAway, selectedProvince, mapMarkers.length, center.latitude, center.longitude])

  const idToMarker = useMemo(() => {
    const m: Record<number, MarkerItem> = {}
    validMarkers.forEach((item) => { m[item.id] = item })
    return m
  }, [validMarkers])

  const closePopup = () => {
    setSelectedUser(null)
    setSelectedCluster(null)
  }

  const navigateToProfileSafely = useCallback(() => {
    setIsNavigatingAway(true)
    setMapMountReady(false)
    setSelectedUser(null)
    setTimeout(() => {
      goToProfile()
    }, 60)
  }, [])

  const handleReportUser = async (targetUserId: string) => {
    try {
      const reasonRes = await Taro.showActionSheet({ itemList: [...REPORT_REASON_OPTIONS] })
      const reason = REPORT_REASON_OPTIONS[reasonRes.tapIndex] || '其他'
      const result = await reportUser(targetUserId, reason)
      const message = resolveCloudMessage(result, REPORT_CODE_MESSAGES, '举报已提交')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) {
        closePopup()
      } else {
        logCloudFailure('reportUserFromExplore', result)
      }
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '举报失败', icon: 'none' })
    }
  }

  const handleBlockUser = async (targetUserId: string) => {
    const confirm = await Taro.showModal({
      title: '确认拉黑',
      content: '拉黑后，你将不再看到对方，且当前待处理或已建立的联络都会断开。',
      confirmText: '确认拉黑',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      const result = await manageSafetyRelation(targetUserId, 'block')
      const message = resolveCloudMessage(result, SAFETY_CODE_MESSAGES, '已拉黑')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) {
        await clearMapUsersCache()
        closePopup()
        loadData({ forceRefreshMapUsers: true })
      } else {
        logCloudFailure('blockUserFromExplore', result)
      }
    } catch (err) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const sendRequestToUser = async (targetUserId: string) => {
    try {
      Taro.showLoading({ title: '发送中...' })
      const r = await sendRequest(targetUserId)
      Taro.hideLoading()
      const message = resolveCloudMessage(r, REQUEST_CODE_MESSAGES, r?.ok ? '请求已发送' : '发送失败')
      Taro.showToast({ title: message, icon: r?.ok ? 'success' : 'none' })
      if (r?.ok) {
        closePopup()
      } else {
        logCloudFailure('sendRequestFromExplore', r)
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '发送失败，请稍后重试', icon: 'none' })
    }
  }

  const handleTap = useCallback((markerId: number) => {
    const item = idToMarker[markerId]
    if (!item) return

    if (item.type === 'school') {
      Taro.navigateTo({ url: '/pages/school-detail/index?id=' + item.originalId })
      return
    }

    if (item.type === 'user_cluster') {
      setSelectedUser(null)
      setSelectedCluster(item)
      return
    }

    setSelectedCluster(null)
    setSelectedUser(item)
  }, [idToMarker])

  const handlePrimaryAction = async () => {
    if (!selectedUser) return
    if (selectedUser.isSelf) {
      navigateToProfileSafely()
      return
    }
    if (!hasProfile) {
      navigateToProfileSafely()
      return
    }
    await sendRequestToUser(String(selectedUser.originalId))
  }

  function getMarkerIdFromMapEvent(e: any): number {
    const raw =
      e?.detail?.markerId ??
      e?.markerId ??
      e?.detail?.id ??
      e?.target?.id

    return Number(raw)
  }

  const handleMarkerTap = useCallback((e: any) => {
    handleTap(getMarkerIdFromMapEvent(e))
  }, [handleTap])

  const handleCalloutTap = useCallback((e: any) => {
    handleTap(getMarkerIdFromMapEvent(e))
  }, [handleTap])

  const handleLabelTap = useCallback((e: any) => {
    handleTap(getMarkerIdFromMapEvent(e))
  }, [handleTap])

  const schoolCount = filteredMarkers.filter((m) => m.type === 'school').length
  const userCount = filteredMarkers.reduce((acc, m) => {
    if (m.type === 'user') return acc + 1
    if (m.type === 'user_cluster') return acc + (m.clusterUsers?.length || 0)
    return acc
  }, 0)
  const popupRoleText = selectedUser?.roles?.join(' / ') || ''

  const openUserFromCluster = (user: AppUser, prov: string) => {
    setSelectedCluster(null)
    const name = user.displayName?.trim() || '同路人'
    setSelectedUser({
      id: 0,
      latitude: NaN,
      longitude: NaN,
      name,
      type: 'user',
      markerProv: prov,
      city: user.city,
      originalId: user._id,
      bio: user.bio,
      roles: normalizeRoles(user.roles || []),
      companionContext: user.companionContext || '',
      isSelf: !!user.isSelf,
    })
  }

  const mapNode = useMemo(() => {
    if (loading) {
      return <View style={{ padding: '80px 20px', textAlign: 'center' }}><Text style={{ fontSize: '14px', color: palette.subtext }}>加载中...</Text></View>
    }
    if (error) {
      return (
        <View style={{ padding: '40px 20px' }}>
          <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '24px', border: `1px solid ${palette.line}`, textAlign: 'center' }}>
            <Text style={{ fontSize: '14px', color: palette.error }}>{error}</Text>
            <View onClick={() => loadData({ forceRefreshMapUsers: true })} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '999px', backgroundColor: palette.brandSoft, display: 'inline-block' }}><Text style={{ fontSize: '13px', color: palette.brandBright }}>重新加载</Text></View>
          </View>
        </View>
      )
    }
    if (!canRenderMap || !mapMountReady || isNavigatingAway) {
      return <View style={{ padding: '40px 20px' }}><View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '24px', border: `1px solid ${palette.line}`, textAlign: 'center' }}><Text style={{ fontSize: '14px', fontWeight: 'bold', color: palette.text }}>{isNavigatingAway ? '页面跳转中…' : selectedProvince ? selectedProvince + '暂无数据' : canRenderMap ? '地图加载中…' : '暂无点位'}</Text></View></View>
    }
    return (
      <TaroMap
        key={`${selectedProvince || 'all'}-${mapMarkers.length}-${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}`}
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
        {...({ onLabelTap: handleLabelTap } as any)}
        onError={() => {}}
        style={{ width: '100%', height: 'calc(100vh - 120px)' }}
      />
    )
  }, [loading, error, canRenderMap, mapMountReady, isNavigatingAway, selectedProvince, mapMarkers, center.latitude, center.longitude, scale, handleMarkerTap, handleCalloutTap, handleLabelTap])

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, position: 'relative' }}>
      {!loading && !hasProfile && (
        <View onClick={goToProfile} style={{ background: palette.brightGradient, padding: '12px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFF' }}>填写资料，出现在地图上</Text>
            <View style={{ marginTop: '2px' }}><Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.88)' }}>让同城家庭和同路人发现你</Text></View>
          </View>
          <View style={{ padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.95)' }}><Text style={{ fontSize: '12px', color: palette.brandBright, fontWeight: 'bold' }}>去填写</Text></View>
        </View>
      )}

      <View style={{ backgroundColor: palette.card, padding: '10px 14px 6px', borderBottom: `1px solid ${palette.line}` }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
          <View onClick={() => { setShowSchools(!showSchools); closePopup() }} style={{ padding: '4px 10px', borderRadius: '999px', marginRight: '8px', marginBottom: '6px', backgroundColor: showSchools ? palette.brandSoft : palette.surfaceSoft }}><Text style={{ fontSize: '12px', fontWeight: 'bold', color: showSchools ? palette.brandBright : palette.muted }}>学习社区 {showSchools ? schoolCount : '—'}</Text></View>
          <View onClick={() => { setShowUsers(!showUsers); closePopup() }} style={{ padding: '4px 10px', borderRadius: '999px', marginRight: '8px', marginBottom: '6px', backgroundColor: showUsers ? palette.greenSoft : palette.surfaceSoft }}><Text style={{ fontSize: '12px', fontWeight: 'bold', color: showUsers ? palette.green : palette.muted }}>同路人 {showUsers ? userCount : '—'}</Text></View>
          {showUsers && (
            <View onClick={() => { setShowEducators((value) => !value); closePopup() }} style={{ padding: '4px 10px', borderRadius: '999px', marginRight: '8px', marginBottom: '6px', backgroundColor: showEducators ? palette.accent2Soft : palette.surfaceSoft }}><Text style={{ fontSize: '12px', fontWeight: 'bold', color: showEducators ? palette.accent2 : palette.muted }}>教育者</Text></View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: '11px', color: palette.muted, marginBottom: '6px' }}>{validMarkers.length} 个点位</Text>
        </View>

        {availableProvinces.length > 0 && (
          <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', height: '26px' }}>
            <View style={{ display: 'inline-flex', flexDirection: 'row' }}>
              <View onClick={() => { setSelectedProvince(''); closePopup() }} style={{ padding: '3px 10px', borderRadius: '999px', marginRight: '6px', backgroundColor: !selectedProvince ? palette.brandBright : palette.brandSoft }}><Text style={{ fontSize: '11px', color: !selectedProvince ? '#FFF' : palette.brand }}>全国</Text></View>
              {availableProvinces.map((prov) => (
                <View key={prov} onClick={() => { setSelectedProvince(prov === selectedProvince ? '' : prov); closePopup() }} style={{ padding: '3px 10px', borderRadius: '999px', marginRight: '6px', backgroundColor: prov === selectedProvince ? palette.brandBright : palette.brandSoft }}><Text style={{ fontSize: '11px', color: prov === selectedProvince ? '#FFF' : palette.brand }}>{prov}</Text></View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {mapNode}

      <View style={{ backgroundColor: palette.surface, padding: '5px 16px', borderTop: `1px solid ${palette.line}` }}><Text style={{ fontSize: '10px', color: palette.muted }}>近似坐标 · 仅供浏览 · 点击聚合点位展开同城同路人</Text></View>

      {selectedCluster && (
        <View onClick={closePopup} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: palette.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
          <View onClick={(e: any) => e?.stopPropagation?.()} style={{ width: '100%', maxHeight: '70vh', backgroundColor: palette.surface, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '18px 16px 24px', boxSizing: 'border-box', borderTop: `1px solid ${palette.line}`, boxShadow: `0 -8px 24px ${palette.shadowStrong}`, display: 'flex', flexDirection: 'column' }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
              <View style={{ flex: 1, paddingRight: '12px' }}>
                <Text style={{ fontSize: '20px', fontWeight: 'bold', color: palette.text }}>{selectedCluster.name}</Text>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>{selectedCluster.clusterUsers?.length || 0} 位同路人在这个区域</Text>
                </View>
              </View>
              <View onClick={closePopup} style={{ width: '32px', height: '32px', borderRadius: '999px', backgroundColor: palette.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: '16px', color: palette.tagText }}>✕</Text>
              </View>
            </View>
            <ScrollView scrollY style={{ flex: 1, maxHeight: 'calc(70vh - 80px)' }}>
              {(selectedCluster.clusterUsers || []).map((u) => {
                const roles = normalizeRoles(u.roles || [])
                const roleText = roles.join(' / ')
                return (
                  <View key={u._id} onClick={() => openUserFromCluster(u, selectedCluster.markerProv)} style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '12px 14px', marginBottom: '10px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: '12px' }}>
                      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '4px' }}>
                        <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{u.displayName?.trim() || '同路人'}</Text>
                        {u.isSelf ? <View style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', backgroundColor: palette.tag }}><Text style={{ fontSize: '10px', color: palette.tagText }}>你自己</Text></View> : null}
                      </View>
                      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                        {u.city ? <Text style={{ fontSize: '12px', color: palette.subtext, marginRight: '8px' }}>{u.city}</Text> : null}
                        {roleText ? <Text style={{ fontSize: '12px', color: palette.brandBright }}>{roleText}</Text> : null}
                      </View>
                      {u.bio ? <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{u.bio.length > 40 ? u.bio.slice(0, 40) + '…' : u.bio}</Text></View> : null}
                    </View>
                    <Text style={{ fontSize: '14px', color: palette.brandBright }}>›</Text>
                  </View>
                )
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {selectedUser && (
        <View onClick={closePopup} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: palette.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
          <View onClick={(e: any) => e?.stopPropagation?.()} style={{ width: '100%', backgroundColor: palette.surface, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '18px 16px 24px', boxSizing: 'border-box', borderTop: `1px solid ${palette.line}`, boxShadow: `0 -8px 24px ${palette.shadowStrong}` }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: '12px' }}>
              <View style={{ flex: 1, paddingRight: '12px' }}>
                <Text style={{ fontSize: '20px', fontWeight: 'bold', color: palette.text }}>{selectedUser.name}</Text>
                <View style={{ marginTop: '6px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                  {selectedUser.city ? <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.brandSoft, marginRight: '8px', marginBottom: '8px' }}><Text style={{ fontSize: '12px', color: palette.brandBright }}>{selectedUser.city}</Text></View> : null}
                  {popupRoleText ? <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '8px' }}><Text style={{ fontSize: '12px', color: palette.green }}>{popupRoleText}</Text></View> : null}
                  {selectedUser.isSelf ? <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.tag, marginRight: '8px', marginBottom: '8px' }}><Text style={{ fontSize: '12px', color: palette.tagText }}>这是你自己</Text></View> : null}
                </View>
              </View>
              <View onClick={closePopup} style={{ width: '32px', height: '32px', borderRadius: '999px', backgroundColor: palette.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: '16px', color: palette.tagText }}>✕</Text>
              </View>
            </View>

            {(selectedUser.companionContext || selectedUser.bio) ? (
              <View style={{ backgroundColor: palette.card, borderRadius: '18px', padding: '14px 12px', border: `1px solid ${palette.line}`, marginBottom: '14px' }}>
                {selectedUser.companionContext ? (
                  <View style={{ marginBottom: selectedUser.bio ? '10px' : '0' }}>
                    <Text style={{ fontSize: '12px', color: palette.brandBright, fontWeight: 'bold' }}>和这个生态的关系</Text>
                    <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '14px', color: palette.text, lineHeight: '22px' }}>{selectedUser.companionContext}</Text></View>
                  </View>
                ) : null}
                {selectedUser.bio ? (
                  <View>
                    <Text style={{ fontSize: '12px', color: palette.brandBright, fontWeight: 'bold' }}>简介</Text>
                    <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '14px', color: palette.text, lineHeight: '22px' }}>{selectedUser.bio}</Text></View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ backgroundColor: palette.card, borderRadius: '18px', padding: '14px 12px', border: `1px solid ${palette.line}`, marginBottom: '14px' }}>
                <Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '22px' }}>这位同路人还没有填写更多介绍。</Text>
              </View>
            )}

            {!hasProfile && !selectedUser.isSelf ? (
              <View style={{ backgroundColor: palette.cardSoft, borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
                <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>先填写“我的资料”，再发起联络。这样别人也能更好理解你是谁。</Text>
              </View>
            ) : null}

            <View onClick={handlePrimaryAction} style={{ background: selectedUser.isSelf ? palette.tag : palette.brightGradient, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '10px' }}>
              <Text style={{ fontSize: '15px', color: selectedUser.isSelf ? palette.subtext : '#FFF', fontWeight: 'bold' }}>
                {selectedUser.isSelf ? '去看我的资料' : hasProfile ? '发起联络' : '去填写资料'}
              </Text>
            </View>

            {!selectedUser.isSelf && (
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View onClick={() => handleReportUser(String(selectedUser.originalId))} style={{ flex: 1, backgroundColor: palette.card, borderRadius: '14px', padding: '12px', textAlign: 'center', border: `1px solid ${palette.line}`, marginRight: '8px' }}>
                  <Text style={{ fontSize: '13px', color: palette.subtext }}>举报</Text>
                </View>
                <View onClick={() => handleBlockUser(String(selectedUser.originalId))} style={{ flex: 1, backgroundColor: palette.card, borderRadius: '14px', padding: '12px', textAlign: 'center', border: `1px solid ${palette.line}` }}>
                  <Text style={{ fontSize: '13px', color: palette.subtext }}>拉黑</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}
