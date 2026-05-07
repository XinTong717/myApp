import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { REPORT_CODE_MESSAGES, REQUEST_CODE_MESSAGES, SAFETY_CODE_MESSAGES } from '../../constants/cloudMessages'
import { getSchoolMarkers } from '../../services/school'
import { getMe } from '../../services/profile'
import { clearMapUsersCache, getMapUsers } from '../../services/map'
import { setDetailPreview } from '../../services/detailPreview'
import { STORAGE_FLAGS } from '../../constants/storageFlags'
import type { MapProvinceStat } from '../../types/domain'
import { sendRequest } from '../../services/connection'
import { manageSafetyRelation, reportUser } from '../../services/safety'
import { REPORT_REASON_OPTIONS } from '../../constants/safety'
import { logCloudFailure, resolveCloudMessage } from '../../utils/cloudFeedback'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import { exploreTheme } from './styles'
import type {
  AppUser,
  MarkerItem,
  ProfileCompletenessFilter,
  School,
  UserRoleFilter,
} from './types'
import { normalizeRolesForDisplay } from './types'
import { FilterChip, ProvinceChip } from './components/Chips'
import MapMarkers from './components/MapMarkers'
import FilterSheet from './components/FilterSheet'
import UserPopup from './components/UserPopup'
import ClusterPopup from './components/ClusterPopup'
import { buildExploreMarkers, shortName, uniqueSchoolsById } from './utils/markerBuilders'

const markerSchoolIcon = '/assets/marker-school.png'
const markerUserIcon = '/assets/marker-user.png'
const EXPLORE_REFRESH_TTL = 30 * 1000


type ExploreLoadKeyInput = {
  province: string
  role: UserRoleFilter
  childAgeRange: string
}

function createExploreLoadKey(input: ExploreLoadKeyInput): string {
  const province = input.province || '全国'
  const childAgeRange = input.role === '家长' ? input.childAgeRange : '全部'
  return `${province}|${input.role}|${childAgeRange}`
}

async function consumeExploreForceRefreshFlag() {
  try {
    const value = Taro.getStorageSync(STORAGE_FLAGS.exploreForceRefresh)
    if (!value) return false
    Taro.removeStorageSync(STORAGE_FLAGS.exploreForceRefresh)
    return true
  } catch (err) {
    console.warn('consumeExploreForceRefreshFlag skipped:', err)
    return false
  }
}

export default function ExplorePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [provinceStats, setProvinceStats] = useState<MapProvinceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSchools, setShowSchools] = useState(true)
  const [showUsers, setShowUsers] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [hasProfile, setHasProfile] = useState(true)
  const [selectedUser, setSelectedUser] = useState<MarkerItem | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<MarkerItem | null>(null)
  const [mapMountReady, setMapMountReady] = useState(false)
  const [isNavigatingAway, setIsNavigatingAway] = useState(false)
  const [showUserFilterSheet, setShowUserFilterSheet] = useState(false)
  const [selectedUserRole, setSelectedUserRole] = useState<UserRoleFilter>('全部')
  const [selectedProfileCompleteness, setSelectedProfileCompleteness] = useState<ProfileCompletenessFilter>('全部')
  const [selectedUserCity, setSelectedUserCity] = useState('全部')
  const [selectedChildAgeRange, setSelectedChildAgeRange] = useState('全部')
  const [schoolsLoaded, setSchoolsLoaded] = useState(false)
  const [mapUsersLoadedKey, setMapUsersLoadedKey] = useState('')
  const loadSeqRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  const isFirstRunRef = useRef(true)
  const lastAutoRefreshAtRef = useRef(0)
  const sendRequestLockRef = useRef(false)
  const reportLockRef = useRef(false)
  const blockLockRef = useRef(false)

  const loadData = async (options: { forceRefreshMapUsers?: boolean } = {}) => {
    const requestSeq = loadSeqRef.current + 1
    loadSeqRef.current = requestSeq

    const provinceSnapshot = selectedProvince
    const roleSnapshot = selectedUserRole
    const childAgeRangeSnapshot = selectedChildAgeRange
    const requestKey = createExploreLoadKey({
      province: provinceSnapshot,
      role: roleSnapshot,
      childAgeRange: childAgeRangeSnapshot,
    })

    try {
      setLoading(true)
      setError('')
      setIsNavigatingAway(false)

      const [schoolRes, mapUsersRes, myRes] = await Promise.all([
        getSchoolMarkers({ limit: 200 }),
        getMapUsers({
          forceRefresh: !!options.forceRefreshMapUsers,
          province: provinceSnapshot || undefined,
          role: roleSnapshot !== '全部' ? roleSnapshot : undefined,
          childAgeRange: roleSnapshot === '家长' && childAgeRangeSnapshot !== '全部' ? childAgeRangeSnapshot : undefined,
        }),
        getMe(),
      ])

      if (requestSeq !== loadSeqRef.current) return

      if (schoolRes?.ok && Array.isArray(schoolRes.schools)) {
        setSchools(schoolRes.schools)
      } else {
        setSchools([])
        logCloudFailure('getSchoolMarkersInExplore', schoolRes)
      }
      setSchoolsLoaded(true)

      if (mapUsersRes?.ok) {
        setAppUsers(Array.isArray(mapUsersRes.users) ? mapUsersRes.users : [])
        setProvinceStats(Array.isArray(mapUsersRes.provinceStats) ? mapUsersRes.provinceStats : [])
        setMapUsersLoadedKey(requestKey)
      } else {
        setAppUsers([])
        setProvinceStats([])
        setMapUsersLoadedKey(requestKey)
        logCloudFailure('getMapUsersInExplore', mapUsersRes)
      }

      const myProfile = myRes?.profile
      setHasProfile(!!(myProfile && myProfile.displayName && myProfile.province && myProfile.city))
    } catch (err: any) {
      if (requestSeq !== loadSeqRef.current) return
      setError(err?.message || '读取数据失败')
    } finally {
      if (requestSeq === loadSeqRef.current) {
        setLoading(false)
      }
    }
  }

  const refreshData = (options: { force?: boolean; forceRefreshMapUsers?: boolean } = {}) => {
    const now = Date.now()
    const shouldSkip =
      !options.force &&
      hasLoadedOnceRef.current &&
      now - lastAutoRefreshAtRef.current < EXPLORE_REFRESH_TTL
  
    if (shouldSkip) return
  
    hasLoadedOnceRef.current = true
    lastAutoRefreshAtRef.current = now
    loadData({ forceRefreshMapUsers: !!options.forceRefreshMapUsers })
  }
  
  useDidShow(async () => {
    const shouldForceRefresh = await consumeExploreForceRefreshFlag()
    refreshData({ force: shouldForceRefresh, forceRefreshMapUsers: shouldForceRefresh })
  })
  
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }
    refreshData({ force: true })
  }, [selectedProvince, selectedUserRole, selectedChildAgeRange])

  const goToProfile = () => { Taro.switchTab({ url: '/pages/profile/index' }) }

  const userCityOptions = useMemo(() => {
    const citySet = new Set<string>()
    appUsers.forEach((user) => {
      if (selectedProvince && user.province !== selectedProvince) return
      if (user.city) citySet.add(user.city)
    })
    return ['全部', ...Array.from(citySet).sort()]
  }, [appUsers, selectedProvince])

  const activeUserFilterCount = [
    selectedUserRole !== '全部',
    selectedProfileCompleteness !== '全部',
    selectedUserCity !== '全部',
    selectedUserRole === '家长' && selectedChildAgeRange !== '全部',
  ].filter(Boolean).length

  const resetUserFilters = () => {
    setSelectedUserRole('全部')
    setSelectedProfileCompleteness('全部')
    setSelectedUserCity('全部')
    setSelectedChildAgeRange('全部')
  }

  const applyClientUserFilters = (user: AppUser) => {
    const roles = normalizeRolesForDisplay(user.roles || [])

    if (selectedUserRole !== '全部' && !roles.includes(selectedUserRole)) return false
    if (selectedProfileCompleteness === '有简介' && !String(user.bio || '').trim()) return false
    if (selectedProfileCompleteness === '有联络说明' && !String(user.companionContext || '').trim()) return false
    if (selectedUserCity !== '全部' && user.city !== selectedUserCity) return false

    return true
  }

  const filteredAppUsersForMap = useMemo(
    () => appUsers.filter((user) => applyClientUserFilters(user)),
    [appUsers, selectedUserRole, selectedProfileCompleteness, selectedUserCity]
  )

  const allMarkers = useMemo(() => buildExploreMarkers({
    schools,
    appUsers: filteredAppUsersForMap,
    provinceStats,
    showSchools,
    showUsers,
    selectedProvince,
  }), [schools, filteredAppUsersForMap, provinceStats, showSchools, showUsers, selectedProvince])

  const filteredMarkers = useMemo(() => {
    if (!selectedProvince) return allMarkers
    return allMarkers.filter((m) => m.markerProv === selectedProvince)
  }, [allMarkers, selectedProvince])

  const validMarkers = useMemo(() => filteredMarkers.filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)), [filteredMarkers])

  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    allMarkers.forEach((m) => { if (m.markerProv) set.add(m.markerProv) })
    return Array.from(set).sort()
  }, [allMarkers])

  const userCount = useMemo(() => filteredMarkers.reduce((sum, m) => {
    if (m.type === 'user') return sum + 1
    if (m.type === 'user_cluster') return sum + (m.provinceStat?.count || m.clusterUsers?.length || 0)
    return sum
  }, 0), [filteredMarkers])
  const schoolCount = useMemo(() => {
    if (!selectedProvince) return uniqueSchoolsById(schools).length

    const ids = new Set<string>()
    filteredMarkers.forEach((m) => {
      if (m.type === 'school') ids.add(String(m.originalId))
      if (m.type === 'school_cluster') {
        ;(m.clusterSchools || []).forEach((school) => ids.add(String(school.id)))
      }
    })
    return ids.size
  }, [schools, filteredMarkers, selectedProvince])

  const schoolLocationCount = useMemo(() => {
    return filteredMarkers.reduce((sum, marker) => {
      if (marker.type === 'school') return sum + 1
      if (marker.type === 'school_cluster') return sum + (marker.schoolPointCount || marker.clusterSchools?.length || 0)
      return sum
    }, 0)
  }, [filteredMarkers])

  const schoolFilterText = schoolLocationCount === schoolCount
    ? `学习社区 ${schoolCount}`
    : `学习社区 ${schoolCount}｜地点 ${schoolLocationCount}`

  const userVisualMarkerCount = validMarkers.filter((m) => m.type === 'user' || m.type === 'user_cluster').length
  const schoolMarkerCount = validMarkers.filter((m) => m.type === 'school' || m.type === 'school_cluster').length
  const hasUserClusters = validMarkers.some((m) => m.type === 'user_cluster')
  const hasSchoolClusters = validMarkers.some((m) => m.type === 'school_cluster')
  const isDenseMap = validMarkers.length > 120 || hasUserClusters || (!selectedProvince && userVisualMarkerCount > 12)
  const shouldShowUserLabels = selectedProvince ? userVisualMarkerCount <= 60 : userVisualMarkerCount <= 8
  const shouldShowSchoolLabels = !!selectedProvince || schoolMarkerCount <= 60

  const mapMarkers: any[] = useMemo(() => validMarkers.map((item) => {
    const latitude = Number(item.latitude)
    const longitude = Number(item.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null

    const isUserCluster = item.type === 'user_cluster'
    const isSchoolCluster = item.type === 'school_cluster'
    const clusterCount = item.provinceStat?.count || item.clusterUsers?.length || 0
    const schoolClusterCount = item.clusterSchools?.length || 0
    const shouldShowClusterLabel = isUserCluster
      ? clusterCount >= 2
      : isSchoolCluster
        ? schoolClusterCount >= 3
        : false
    const shouldShowLabel = isUserCluster || isSchoolCluster
      ? shouldShowClusterLabel
      : item.type === 'school'
        ? shouldShowSchoolLabels
        : shouldShowUserLabels
    const labelContent = isUserCluster
      ? `${shortName(item.name, 4)} ${clusterCount}`
      : isSchoolCluster
        ? `${shortName(item.name, 4)} ${schoolClusterCount}`
        : item.type === 'school'
          ? shortName(item.name)
          : shortName(item.name + (item.city ? ' · ' + item.city : ''), 10)
    const markerSize = isUserCluster || isSchoolCluster
      ? 30
      : item.type === 'school'
        ? (isDenseMap ? 22 : 26)
        : (isDenseMap ? 16 : 22)

    return {
      id: item.id,
      latitude,
      longitude,
      title: item.name,
      iconPath: item.type === 'school' || item.type === 'school_cluster' ? markerSchoolIcon : markerUserIcon,
      width: markerSize,
      height: markerSize,
      anchor: { x: 0.5, y: 0.5 },
      zIndex: isSchoolCluster ? 40 : isUserCluster ? 30 : item.type === 'school' ? 20 : 10,
      ...(shouldShowLabel ? {
        label: {
          content: labelContent,
          color: isUserCluster
            ? palette.green
            : isSchoolCluster
              ? palette.brand
              : palette.text,
          fontSize: isUserCluster || isSchoolCluster ? 14 : 13,
          anchorX: isUserCluster || isSchoolCluster ? -36 : item.type === 'school' ? -30 : -28,
          anchorY: isUserCluster || isSchoolCluster ? -36 : -34,
          borderRadius: 10,
          borderWidth: isUserCluster || isSchoolCluster ? 1 : 0,
          borderColor: isUserCluster
            ? 'rgba(111,125,98,0.32)'
            : isSchoolCluster
              ? 'rgba(184,85,64,0.32)'
              : '#FFFFFF',
          bgColor: isUserCluster
            ? 'rgba(246,250,244,0.96)'
            : isSchoolCluster
              ? 'rgba(255,249,243,0.96)'
              : item.type === 'school'
                ? 'rgba(255,255,255,0.92)'
                : 'rgba(246,250,244,0.92)',
          padding: 6,
          textAlign: 'center',
        },
      } : {}),
    }
  }).filter((item) => item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [validMarkers, isDenseMap, shouldShowSchoolLabels, shouldShowUserLabels])

  const { center, scale } = useMemo(() => {
    if (validMarkers.length === 0) return { center: { latitude: 33.0, longitude: 108.0 }, scale: 5 }

    const lats = validMarkers.map((m) => m.latitude)
    const lngs = validMarkers.map((m) => m.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const span = Math.max(maxLat - minLat, maxLng - minLng)
    const scaleValue = span < 0.2 ? 13 : span < 0.5 ? 11 : span < 1.5 ? 9 : span < 4 ? 7 : span < 10 ? 6 : 5
    const nextCenter = { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 }

    if (!Number.isFinite(nextCenter.latitude) || !Number.isFinite(nextCenter.longitude)) {
      return { center: { latitude: 33.0, longitude: 108.0 }, scale: 5 }
    }

    return { center: nextCenter, scale: scaleValue }
  }, [validMarkers])

  const canRenderMap = mapMarkers.length > 0 && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)

  const currentLoadKey = createExploreLoadKey({
    province: selectedProvince,
    role: selectedUserRole,
    childAgeRange: selectedChildAgeRange,
  })
  const isProvinceDataSettled = schoolsLoaded && mapUsersLoadedKey === currentLoadKey

  useEffect(() => {
    setMapMountReady(false)
    if (!canRenderMap || loading || error || isNavigatingAway) return
    const timer = setTimeout(() => setMapMountReady(true), 80)
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
    setSelectedCluster(null)
    setTimeout(() => goToProfile(), 60)
  }, [])

  const handleReportUser = async (targetUserId: string) => {
    if (reportLockRef.current) return

    try {
      reportLockRef.current = true
      const reasonRes = await Taro.showActionSheet({ itemList: [...REPORT_REASON_OPTIONS] })
      const reason = REPORT_REASON_OPTIONS[reasonRes.tapIndex] || '其他'
      const result = await reportUser(targetUserId, reason)
      const message = resolveCloudMessage(result, REPORT_CODE_MESSAGES, '举报已提交')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) closePopup()
      else logCloudFailure('reportUserFromExplore', result)
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '举报失败', icon: 'none' })
    } finally {
      reportLockRef.current = false
    }
  }

  const handleBlockUser = async (targetUserId: string) => {
    if (blockLockRef.current) return

    const confirm = await Taro.showModal({
      title: '确认拉黑',
      content: '拉黑后，你将不再看到对方，且当前待处理或已建立的联络都会断开。',
      confirmText: '确认拉黑',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      blockLockRef.current = true
      const result = await manageSafetyRelation(targetUserId, 'block')
      const message = resolveCloudMessage(result, SAFETY_CODE_MESSAGES, '已拉黑')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) {
        await clearMapUsersCache()
        closePopup()
        refreshData({ force: true, forceRefreshMapUsers: true })
      } else {
        logCloudFailure('blockUserFromExplore', result)
      }
    } catch (err) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      blockLockRef.current = false
    }
  }

  const sendRequestToUser = async (targetUserId: string) => {
    if (sendRequestLockRef.current) return

    try {
      sendRequestLockRef.current = true
      Taro.showLoading({ title: '发送中...' })
      const result = await sendRequest(targetUserId)
      Taro.hideLoading()
      const message = resolveCloudMessage(result, REQUEST_CODE_MESSAGES, result?.ok ? '请求已发送' : '发送失败')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) closePopup()
      else logCloudFailure('sendRequestFromExplore', result)
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '发送失败，请稍后重试', icon: 'none' })
    } finally {
      sendRequestLockRef.current = false
    }
  }

  const handleTap = useCallback((markerId: number) => {
    const item = idToMarker[markerId]
    if (!item) return

    if (item.type === 'school_cluster') {
      setSelectedUser(null)
      setSelectedCluster(null)
      setSelectedProvince(item.markerProv)
      return
    }

    if (item.type === 'school') {
      const schoolData = schools.find((school) => Number(school.id) === Number(item.originalId))
      if (schoolData) {
        setDetailPreview('school', item.originalId, schoolData)
      }
      Taro.navigateTo({ url: '/pages/school-detail/index?id=' + item.originalId })
      return
    }

    if (item.type === 'user_cluster' && item.provinceStat) {
        setSelectedUser(null)
        setSelectedCluster(null)
        setSelectedProvince(item.markerProv)
        return
      }
      
      if (item.type === 'user_cluster') {
        setSelectedUser(null)
        setSelectedCluster(item)
        return
      }

    setSelectedCluster(null)
    setSelectedUser(item)
  }, [idToMarker, schools])

  const handlePrimaryAction = async () => {
    if (!selectedUser) return
    if (selectedUser.isSelf || !hasProfile) {
      navigateToProfileSafely()
      return
    }
    await sendRequestToUser(String(selectedUser.originalId))
  }

  function getMarkerIdFromMapEvent(e: any): number {
    return Number(e?.detail?.markerId ?? e?.markerId ?? e?.detail?.id ?? e?.target?.id)
  }

  const handleMarkerTap = useCallback((e: any) => handleTap(getMarkerIdFromMapEvent(e)), [handleTap])
  const handleCalloutTap = useCallback((e: any) => handleTap(getMarkerIdFromMapEvent(e)), [handleTap])
  const handleLabelTap = useCallback((e: any) => handleTap(getMarkerIdFromMapEvent(e)), [handleTap])

  const popupRoleText = selectedUser?.roles?.join(' / ') || ''

  const openUserFromCluster = (user: AppUser, cluster: MarkerItem) => {
    const name = user.displayName?.trim() || '同路人'
    setSelectedCluster(null)
    setSelectedUser({
      id: 0,
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      name,
      type: 'user',
      markerProv: cluster.markerProv,
      city: user.city || cluster.city,
      originalId: user._id,
      bio: user.bio,
      roles: normalizeRolesForDisplay(user.roles || []),
      companionContext: user.companionContext || '',
      isSelf: !!user.isSelf,
    })
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: exploreTheme.pageBg, position: 'relative' }}>
      {!loading && !hasProfile && (
        <View onClick={goToProfile} style={{ backgroundColor: exploreTheme.card, padding: `${space(3)} ${space(4)}`, borderBottom: `1px solid ${exploreTheme.border}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyStrong, color: exploreTheme.text }}>填写资料，出现在地图上</Text>
            <View style={{ marginTop: space(1) }}><Text style={{ ...typography.caption, color: exploreTheme.subtext }}>让同城家庭和同路人发现你</Text></View>
          </View>
          <View style={{ padding: `${space(2)} ${space(3)}`, borderRadius: radius.pill, backgroundColor: palette.brand }}>
            <Text style={{ ...typography.caption, color: '#FFF' }}>去填写</Text>
          </View>
        </View>
      )}

      <View style={{ backgroundColor: exploreTheme.card, padding: `${space(3)} ${space(4)} ${space(3)}`, borderBottom: `1px solid ${exploreTheme.border}` }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(3), flexWrap: 'wrap' }}>
          <FilterChip active={showSchools} tone='brand' text={schoolFilterText} onClick={() => { setShowSchools(!showSchools); closePopup() }} />
          <FilterChip active={showUsers} tone='user' text={`同路人 ${showUsers ? userCount : '—'}`} onClick={() => { setShowUsers(!showUsers); closePopup() }} />
          {showUsers && (
            <View
              onClick={() => setShowUserFilterSheet(true)}
              style={{
                padding: `${space(3)} ${space(4)}`,
                borderRadius: radius.md,
                marginRight: space(2),
                marginBottom: space(2),
                backgroundColor: activeUserFilterCount > 0 ? palette.brandSoft : palette.tag,
                border: `1px solid ${activeUserFilterCount > 0 ? palette.brandSoft : palette.lineSoft}`,
              }}
            >
              <Text style={{ ...typography.bodyStrong, color: activeUserFilterCount > 0 ? palette.brand : palette.muted }}>
                筛选{activeUserFilterCount > 0 ? ` ${activeUserFilterCount}` : ''}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
        </View>

        {availableProvinces.length > 0 && (
          <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', height: space(8) }}>
            <View style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', paddingBottom: space(1) }}>
              <ProvinceChip active={!selectedProvince} text='全国' onClick={() => { setSelectedProvince(''); closePopup() }} />
              {availableProvinces.map((prov) => (
                <ProvinceChip key={prov} active={prov === selectedProvince} text={prov} onClick={() => { setSelectedProvince(prov === selectedProvince ? '' : prov); closePopup() }} />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <MapMarkers
        loading={loading}
        error={error}
        isProvinceDataSettled={isProvinceDataSettled}
        selectedProvince={selectedProvince}
        canRenderMap={canRenderMap}
        mapMountReady={mapMountReady}
        isNavigatingAway={isNavigatingAway}
        center={center}
        scale={scale}
        mapMarkers={mapMarkers}
        shouldShowUserLabels={shouldShowUserLabels}
        shouldShowSchoolLabels={shouldShowSchoolLabels}
        hasUserClusters={hasUserClusters}
        hasSchoolClusters={hasSchoolClusters}
        onReload={() => loadData({ forceRefreshMapUsers: true })}
        onMarkerTap={handleMarkerTap}
        onCalloutTap={handleCalloutTap}
        onLabelTap={handleLabelTap}
      />

      <View style={{ backgroundColor: exploreTheme.surface, padding: `${space(2)} ${space(4)}`, borderTop: `1px solid ${exploreTheme.border}` }}>
        <Text style={{ fontSize: '13px', lineHeight: '18px', color: exploreTheme.muted }}>
          {hasUserClusters
            ? '近似坐标 · 点击聚合点位展开同城同路人 · 点击学校聚合点进入省份视图'
            : isDenseMap ? '近似坐标 · 全国视图会自动隐藏部分名称 · 点击标记查看详情' : '近似坐标 · 仅供浏览 · 点击标记或名称查看详情'}
        </Text>
      </View>

      <FilterSheet
        visible={showUserFilterSheet}
        selectedUserRole={selectedUserRole}
        setSelectedUserRole={setSelectedUserRole}
        selectedChildAgeRange={selectedChildAgeRange}
        setSelectedChildAgeRange={setSelectedChildAgeRange}
        selectedProfileCompleteness={selectedProfileCompleteness}
        setSelectedProfileCompleteness={setSelectedProfileCompleteness}
        selectedUserCity={selectedUserCity}
        setSelectedUserCity={setSelectedUserCity}
        userCityOptions={userCityOptions}
        onReset={resetUserFilters}
        onClose={() => setShowUserFilterSheet(false)}
      />

      <ClusterPopup
        cluster={selectedCluster}
        onClose={closePopup}
        onOpenUser={openUserFromCluster}
      />

      <UserPopup
        user={selectedUser}
        popupRoleText={popupRoleText}
        hasProfile={hasProfile}
        onClose={closePopup}
        onPrimaryAction={handlePrimaryAction}
        onReport={handleReportUser}
        onBlock={handleBlockUser}
      />
    </View>
  )
}
