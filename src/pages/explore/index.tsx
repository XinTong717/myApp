import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { REPORT_CODE_MESSAGES, SAFETY_CODE_MESSAGES } from '../../constants/cloudMessages'
import { getSchoolMarkers } from '../../services/school'
import { getMe } from '../../services/profile'
import { clearMapUsersCache, getMapUsers } from '../../services/map'
import { setDetailPreview } from '../../services/detailPreview'
import { STORAGE_FLAGS } from '../../constants/storageFlags'
import type { MapProvinceStat } from '../../types/domain'
import { manageSafetyRelation, reportUser } from '../../services/safety'
import { REPORT_REASON_OPTIONS } from '../../constants/safety'
import { logCloudFailure, resolveCloudMessage } from '../../utils/cloudFeedback'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import AppPage from '../../components/common/AppPage'
import AppPromptBanner from '../../components/common/AppPromptBanner'
import AppChip from '../../components/common/AppChip'
import { exploreTheme } from './styles'
import type {
  AppUser,
  MarkerItem,
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
import { useExploreFilters } from './hooks/useExploreFilters'

const markerSchoolIcon = '/assets/marker-school.png'
const markerUserIcon = '/assets/marker-user.png'
const EXPLORE_REFRESH_TTL = 30 * 1000
const EXPLORE_ONBOARDING_KEY = 'explore-onboarding:v1'

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

function showExploreOnboardingOnce(onCompleteProfile?: () => void) {
  try {
    if (Taro.getStorageSync(EXPLORE_ONBOARDING_KEY)) return
    Taro.setStorageSync(EXPLORE_ONBOARDING_KEY, 'seen')
    Taro.showModal({
      title: '欢迎来到可雀',
      content: '这里可以查找学习社区、活动及教育探索路上的同路人。完善个人信息后即可查看其他成员资料。',
      confirmText: '去填写',
      cancelText: '先逛逛',
    }).then((res) => {
      if (res.confirm) onCompleteProfile?.()
    }).catch((err) => console.warn('explore onboarding skipped:', err))
  } catch (err) {
    console.warn('explore onboarding storage skipped:', err)
  }
}

function splitProvinceTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getSchoolProvinceLabels(school: School) {
  const fromLocations = Array.isArray(school.locations)
    ? school.locations.map((location) => String(location.province || '').trim()).filter(Boolean)
    : []
  const labels = fromLocations.length > 0 ? fromLocations : splitProvinceTokens(school.province)
  return Array.from(new Set(labels))
}

function countSchoolsByProvince(schools: School[]) {
  const provinceSchoolIds = new Map<string, Set<string>>()
  schools.forEach((school, index) => {
    const schoolId = String(school.id || school.canonical_name || school.name || index)
    getSchoolProvinceLabels(school).forEach((province) => {
      if (!provinceSchoolIds.has(province)) provinceSchoolIds.set(province, new Set())
      provinceSchoolIds.get(province)?.add(schoolId)
    })
  })
  const counts = new Map<string, number>()
  provinceSchoolIds.forEach((schoolIds, province) => counts.set(province, schoolIds.size))
  return counts
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
  const [schoolsLoaded, setSchoolsLoaded] = useState(false)
  const [mapUsersLoadedKey, setMapUsersLoadedKey] = useState('')
  const loadSeqRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  const isFirstRunRef = useRef(true)
  const lastAutoRefreshAtRef = useRef(0)
  const reportLockRef = useRef(false)
  const blockLockRef = useRef(false)

  const {
    showUserFilterSheet,
    setShowUserFilterSheet,
    selectedUserRole,
    setSelectedUserRole,
    selectedProfileCompleteness,
    setSelectedProfileCompleteness,
    selectedUserCity,
    setSelectedUserCity,
    selectedChildAgeRange,
    setSelectedChildAgeRange,
    userCityOptions,
    activeUserFilterCount,
    resetUserFilters,
    filteredAppUsersForMap,
  } = useExploreFilters(appUsers, selectedProvince)

  const goToProfile = () => { Taro.switchTab({ url: '/pages/profile/index' }) }

  const loadData = async (options: { forceRefreshMapUsers?: boolean; refreshSchools?: boolean } = {}) => {
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
    const shouldLoadSchools = options.refreshSchools || !schoolsLoaded

    try {
      setLoading(true)
      setError('')
      setIsNavigatingAway(false)

      const [schoolRes, mapUsersRes, myRes] = await Promise.all([
        shouldLoadSchools ? getSchoolMarkers({ limit: 200, forceRefresh: !!options.refreshSchools }) : Promise.resolve(null),
        getMapUsers({
          forceRefresh: !!options.forceRefreshMapUsers,
          province: provinceSnapshot || undefined,
          role: roleSnapshot !== '全部' ? roleSnapshot : undefined,
          childAgeRange: roleSnapshot === '家长' && childAgeRangeSnapshot !== '全部' ? childAgeRangeSnapshot : undefined,
        }),
        getMe({ allowStale: true }),
      ])

      if (requestSeq !== loadSeqRef.current) return

      if (schoolRes) {
        if (schoolRes?.ok && Array.isArray(schoolRes.schools)) {
          setSchools(schoolRes.schools)
        } else {
          setSchools([])
          logCloudFailure('getSchoolMarkersInExplore', schoolRes)
        }
        setSchoolsLoaded(true)
      }

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

  const refreshData = (options: { force?: boolean; forceRefreshMapUsers?: boolean; refreshSchools?: boolean } = {}) => {
    const now = Date.now()
    const requestKey = createExploreLoadKey({
      province: selectedProvince,
      role: selectedUserRole,
      childAgeRange: selectedChildAgeRange,
    })
    const isSameMapUsersKey = mapUsersLoadedKey === requestKey
    const shouldSkip =
      !options.force &&
      hasLoadedOnceRef.current &&
      schoolsLoaded &&
      isSameMapUsersKey &&
      now - lastAutoRefreshAtRef.current < EXPLORE_REFRESH_TTL

    if (shouldSkip) return

    hasLoadedOnceRef.current = true
    lastAutoRefreshAtRef.current = now
    loadData({ forceRefreshMapUsers: !!options.forceRefreshMapUsers, refreshSchools: !!options.refreshSchools })
  }

  useDidShow(async () => {
    const shouldForceRefresh = await consumeExploreForceRefreshFlag()
    refreshData({ force: shouldForceRefresh, forceRefreshMapUsers: shouldForceRefresh, refreshSchools: shouldForceRefresh })
  })

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }
    refreshData()
  }, [selectedProvince, selectedUserRole, selectedChildAgeRange])

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

  useEffect(() => {
    if (loading || error || validMarkers.length === 0) return
    showExploreOnboardingOnce(goToProfile)
  }, [loading, error, validMarkers.length])

  const provinceSchoolCounts = useMemo(() => countSchoolsByProvince(schools), [schools])
  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    allMarkers.forEach((m) => { if (m.markerProv) set.add(m.markerProv) })
    return Array.from(set).sort((a, b) => {
      const countDiff = (provinceSchoolCounts.get(b) || 0) - (provinceSchoolCounts.get(a) || 0)
      if (countDiff !== 0) return countDiff
      return a.localeCompare(b, 'zh-CN')
    })
  }, [allMarkers, provinceSchoolCounts])

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
              : palette.card,
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
      content: '拉黑后，你将不再看到这位用户。',
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
      if (schoolData) setDetailPreview('school', item.originalId, schoolData)
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
    if (selectedUser.isSelf || !hasProfile) navigateToProfileSafely()
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
      publicChannel: user.publicChannel || '',
      publicChannelNote: user.publicChannelNote || '',
      childAgeRange: user.childAgeRange || [],
      childDropoutStatus: user.childDropoutStatus || [],
      childInterests: user.childInterests || '',
      eduServices: user.eduServices || '',
      hasExpandedProfile: !!user.hasExpandedProfile,
      isSelf: !!user.isSelf,
    })
  }

  return (
    <AppPage flush style={{ minHeight: '100vh', backgroundColor: exploreTheme.pageBg, position: 'relative' }}>
      {!loading && !hasProfile && (
        <AppPromptBanner
          title='完善个人信息后可查看其他成员资料。'
          actionText='去填写'
          icon='user'
          tone='brand'
          flush
          onClick={goToProfile}
        />
      )}

      <View style={{ backgroundColor: exploreTheme.card, padding: `${space(3)} ${space(4)} ${space(3)}`, borderBottom: `1px solid ${exploreTheme.border}` }}>
        <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', height: space(8), marginBottom: space(3) }}>
          <View style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', paddingBottom: space(1) }}>
            <FilterChip active={showSchools} tone='brand' text={schoolFilterText} onClick={() => { setShowSchools(!showSchools); closePopup() }} />
            <FilterChip active={showUsers} tone='user' text={`同路人 ${showUsers ? userCount : '—'}`} onClick={() => { setShowUsers(!showUsers); closePopup() }} />
            {showUsers && (
              <AppChip
                text={`筛选${activeUserFilterCount > 0 ? ` ${activeUserFilterCount}` : ''}`}
                tone='neutral'
                size='md'
                selected={activeUserFilterCount > 0}
                interactive
                onClick={() => setShowUserFilterSheet(true)}
              />
            )}
          </View>
        </ScrollView>

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
        canRenderMap={canRenderMap}
        mapMountReady={mapMountReady}
        center={center}
        scale={scale}
        markers={mapMarkers}
        onMarkerTap={handleMarkerTap}
        onCalloutTap={handleCalloutTap}
        onLabelTap={handleLabelTap}
      />

      {!loading && !error && selectedProvince && !isProvinceDataSettled && (
        <View style={{ position: 'absolute', left: space(4), right: space(4), bottom: space(8), backgroundColor: palette.card, borderRadius: space(3), padding: space(3), boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>正在加载 {selectedProvince} 的同路人与地点信息…</Text>
        </View>
      )}

      <UserPopup
        user={selectedUser}
        roleText={popupRoleText}
        hasProfile={hasProfile}
        onClose={closePopup}
        onPrimaryAction={handlePrimaryAction}
        onReport={handleReportUser}
        onBlock={handleBlockUser}
      />

      <ClusterPopup
        cluster={selectedCluster}
        onClose={closePopup}
        onOpenUser={openUserFromCluster}
      />

      <FilterSheet
        visible={showUserFilterSheet}
        selectedRole={selectedUserRole}
        selectedProfileCompleteness={selectedProfileCompleteness}
        selectedCity={selectedUserCity}
        selectedChildAgeRange={selectedChildAgeRange}
        cityOptions={userCityOptions}
        onClose={() => setShowUserFilterSheet(false)}
        onRoleChange={setSelectedUserRole}
        onProfileCompletenessChange={setSelectedProfileCompleteness}
        onCityChange={setSelectedUserCity}
        onChildAgeRangeChange={setSelectedChildAgeRange}
        onReset={resetUserFilters}
      />
    </AppPage>
  )
}
