import { CITIES, PROV_FALLBACK } from '../../../constants/cities'
import type { MapProvinceStat, SchoolLocationItem } from '../../../types/domain'
import type { AppUser, MarkerItem, School } from '../types'
import { normalizeRolesForDisplay } from '../types'

const USER_CLUSTER_THRESHOLD = 5

type Coord = { lat: number; lng: number }

type LocationCoord = Coord & { prov: string; city: string; source: 'location' | 'city' }

function parseCities(f?: string): string[] {
  if (!f) return []
  return f.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('(') && !s.startsWith('（'))
}

function firstProvince(f?: string): string {
  if (!f) return ''
  return f.split(',')[0].trim()
    .replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '')
    .replace(/\(.*\)/, '')
    .replace(/（.*）/, '')
    .trim()
}

function nameHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h % 10000) / 10000
}

export function isValidCoord(coord?: Partial<Coord> | null): coord is Coord {
  return !!coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng)
}

function jitter(baseLat: number, baseLng: number, index: number, total: number, name: string): { lat: number; lng: number } {
  if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) return { lat: NaN, lng: NaN }
  if (total <= 1) return { lat: baseLat, lng: baseLng }

  const cols = Math.ceil(Math.sqrt(total))
  const row = Math.floor(index / cols)
  const col = index % cols
  const spacing = 0.025
  const rows = Math.ceil(total / cols)
  const gridW = (cols - 1) * spacing
  const gridH = (rows - 1) * spacing
  const gridLat = baseLat - gridH / 2 + row * spacing
  const cosLat = Math.cos(baseLat * Math.PI / 180)
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat
  const gridLng = baseLng - gridW / 2 + col * spacing
  const h = nameHash(name)
  const h2 = nameHash(name + 'x')

  return {
    lat: gridLat + (h - 0.5) * 0.016,
    lng: gridLng + (h2 - 0.5) * 0.016 / safeCosLat,
  }
}

function offsetUserClusterCoord(province: string, coord: Coord): Coord {
  const cosLat = Math.cos(coord.lat * Math.PI / 180)
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat
  const direction = nameHash(`${province}-user-cluster`) > 0.5 ? 1 : -1

  return {
    lat: coord.lat - 0.32,
    lng: coord.lng + direction * (0.48 / safeCosLat),
  }
}

function sanitizeMapLabel(value: string): string {
  const raw = String(value || '')
  let result = ''
  let previousWasSpace = false

  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff) { i += 1; continue }
    if (code >= 0xdc00 && code <= 0xdfff) continue
    if (code < 32 || code === 127 || code === 0xfffd) continue

    const char = raw.charAt(i)
    if (/\s/.test(char)) {
      if (!previousWasSpace) { result += ' '; previousWasSpace = true }
    } else {
      result += char
      previousWasSpace = false
    }
  }

  return result.trim()
}

export function shortName(name: string, max = 8): string {
  const clean = sanitizeMapLabel(name) || '学习社区'
  return clean.length > max ? clean.substring(0, max) + '…' : clean
}

export function uniqueSchoolsById(items: School[]) {
  const map = new Map<string, School>()
  items.forEach((item) => {
    const key = String(item.id)
    if (!map.has(key)) map.set(key, item)
  })
  return Array.from(map.values())
}

function splitLocationLabels(value?: string): string[] {
  return String(value || '')
    .split(/[、,，/|｜]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getSchoolDisplayName(school: School): string {
  return (school.canonical_name || school.name || '').trim() || '未知学习社区'
}

function getSchoolLocations(school: School): SchoolLocationItem[] {
  if (Array.isArray(school.locations) && school.locations.length > 0) {
    return school.locations
      .filter((location) => location.status !== 'deleted')
      .map((location) => ({
        ...location,
        province: String(location.province || '').trim(),
        city: String(location.city || '').trim(),
      }))
      .filter((location) => location.province || location.city)
  }

  const provinces = splitLocationLabels(school.province)
  const cities = parseCities(school.city)

  if (cities.length > 0) {
    return cities.map((city, index) => ({
      school_id: Number(school.id),
      province: CITIES[city]?.prov || provinces[index] || provinces[0] || '',
      city,
      status: 'legacy',
    }))
  }

  return provinces.map((province) => ({
    school_id: Number(school.id),
    province,
    city: '',
    status: 'legacy',
  }))
}

function getLocationCoord(location: SchoolLocationItem): LocationCoord | null {
  const hasLat = location.latitude !== undefined && location.latitude !== null && location.latitude !== ''
  const hasLng = location.longitude !== undefined && location.longitude !== null && location.longitude !== ''
  const lat = hasLat ? Number(location.latitude) : NaN
  const lng = hasLng ? Number(location.longitude) : NaN
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      lat,
      lng,
      prov: String(location.province || '').trim(),
      city: String(location.city || '').trim(),
      source: 'location',
    }
  }

  const cityName = String(location.city || '').trim()
  const cityCoord = cityName ? CITIES[cityName] : null
  if (cityCoord && isValidCoord(cityCoord)) {
    return {
      lat: cityCoord.lat,
      lng: cityCoord.lng,
      prov: cityCoord.prov || String(location.province || '').trim(),
      city: cityName,
      source: 'city',
    }
  }

  return null
}

function locationCoordKey(location: SchoolLocationItem) {
  const coord = getLocationCoord(location)
  if (!coord) return ''
  return coord.source === 'location'
    ? `${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`
    : coord.city
}

type BuildExploreMarkersOptions = {
  schools: School[]
  appUsers: AppUser[]
  provinceStats: MapProvinceStat[]
  showSchools: boolean
  showUsers: boolean
  selectedProvince: string
}

function buildUserMarker(user: AppUser, props: Pick<MarkerItem, 'id' | 'latitude' | 'longitude' | 'markerProv' | 'city'>): MarkerItem {
  const name = user.displayName?.trim() || '同路人'
  return {
    ...props,
    name,
    type: 'user',
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
  }
}

export function buildExploreMarkers(options: BuildExploreMarkersOptions): MarkerItem[] {
  const {
    schools,
    appUsers,
    provinceStats,
    showSchools,
    showUsers,
    selectedProvince,
  } = options

  const items: MarkerItem[] = []
  let nextId = 1
  const locationCount: Record<string, number> = {}
  const locationIndex: Record<string, number> = {}

  if (showSchools) {
    const schoolMarkerItems: MarkerItem[] = []

    schools.forEach((s) => {
      getSchoolLocations(s).forEach((location) => {
        const key = locationCoordKey(location)
        if (!key) return
        locationCount[key] = (locationCount[key] || 0) + 1
      })
    })

    schools.forEach((s) => {
      const locations = getSchoolLocations(s)
      const schoolName = getSchoolDisplayName(s)
      const mappedLocations = locations
        .map((location) => ({ location, coord: getLocationCoord(location), key: locationCoordKey(location) }))
        .filter((item): item is { location: SchoolLocationItem; coord: LocationCoord; key: string } => !!item.coord && !!item.key)

      if (mappedLocations.length > 0) {
        mappedLocations.forEach(({ location, coord, key }) => {
          const idx = locationIndex[key] || 0
          locationIndex[key] = idx + 1
          const point = coord.source === 'location'
            ? { lat: coord.lat, lng: coord.lng }
            : jitter(coord.lat, coord.lng, idx, locationCount[key] || 1, `${schoolName}-${coord.city || key}`)
          if (!isValidCoord(point)) return

          schoolMarkerItems.push({
            id: nextId++,
            latitude: point.lat,
            longitude: point.lng,
            name: schoolName,
            type: 'school',
            markerProv: coord.prov || String(location.province || '').trim(),
            city: coord.city || String(location.city || '').trim(),
            originalId: s.id,
          })
        })
        return
      }

      const fallbackProvince = locations.find((location) => location.province)?.province || firstProvince(s.province)
      const coord = PROV_FALLBACK[fallbackProvince]
      if (!isValidCoord(coord)) return

      schoolMarkerItems.push({
        id: nextId++,
        latitude: coord.lat,
        longitude: coord.lng,
        name: schoolName,
        type: 'school',
        markerProv: fallbackProvince,
        city: '',
        originalId: s.id,
      })
    })

    if (!selectedProvince) {
      const schoolsByProvince: Record<string, MarkerItem[]> = {}

      schoolMarkerItems.forEach((item) => {
        if (!item.markerProv) return
        if (!schoolsByProvince[item.markerProv]) schoolsByProvince[item.markerProv] = []
        schoolsByProvince[item.markerProv].push(item)
      })

      Object.entries(schoolsByProvince).forEach(([province, provinceSchools]) => {
        const coord = PROV_FALLBACK[province]
        if (!coord || !isValidCoord(coord)) {
          items.push(...provinceSchools)
          return
        }

        if (provinceSchools.length > 2) {
          items.push({
            id: nextId++,
            latitude: coord.lat,
            longitude: coord.lng,
            name: `${province} ${provinceSchools.length}`,
            type: 'school_cluster',
            markerProv: province,
            city: '',
            originalId: `school_cluster_${province}`,
            clusterSchools: uniqueSchoolsById(provinceSchools.map((item) => schools.find((school) => String(school.id) === String(item.originalId))).filter(Boolean) as School[]),
            schoolPointCount: provinceSchools.length,
            provinceStat: provinceStats.find((stat) => stat.province === province),
          })
        } else {
          items.push(...provinceSchools)
        }
      })
    } else {
      items.push(...schoolMarkerItems.filter((item) => item.markerProv === selectedProvince))
    }
  }

  if (showUsers) {
    const usersByProvince: Record<string, AppUser[]> = {}

    appUsers.forEach((user) => {
      const province = user.province || ''
      if (!province) return
      if (!usersByProvince[province]) usersByProvince[province] = []
      usersByProvince[province].push(user)
    })

    Object.entries(usersByProvince).forEach(([province, users]) => {
      const coord = PROV_FALLBACK[province]
      if (!coord || !isValidCoord(coord)) return

      if (!selectedProvince && users.length >= USER_CLUSTER_THRESHOLD) {
        const clusterCoord = offsetUserClusterCoord(province, coord)
        items.push({
          id: nextId++,
          latitude: clusterCoord.lat,
          longitude: clusterCoord.lng,
          name: `${province} ${users.length}`,
          type: 'user_cluster',
          markerProv: province,
          city: '',
          originalId: `user_cluster_${province}`,
          clusterUsers: users,
          provinceStat: provinceStats.find((stat) => stat.province === province),
        })
        return
      }

      users.forEach((user, index) => {
        const point = jitter(coord.lat, coord.lng, index, users.length, user.displayName || String(index))
        if (!isValidCoord(point)) return
        items.push(buildUserMarker(user, {
          id: nextId++,
          latitude: point.lat,
          longitude: point.lng,
          markerProv: province,
          city: user.city || '',
        }))
      })
    })
  }

  return items
}
