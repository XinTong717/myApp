import { CITIES, PROV_FALLBACK } from '../../../constants/cities'
import type { MapProvinceStat, SchoolLocationItem } from '../../../types/domain'
import type { AppUser, MarkerItem, School } from '../types'
import { normalizeRolesForDisplay } from '../types'

const USER_CLUSTER_THRESHOLD = 5

type Coord = { lat: number; lng: number }

function parseCities(f?: string): string[] {
  if (!f) return []
  return f.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('(') && !s.startsWith('（'))
}

function firstProvince(f?: string): string {
  if (!f) return ''
  return f.split(',')[0].trim()
    .replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '')
    .replace(/\(.*\)/, '')
    .replace(/\(.*\)/, '')
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
      province: provinces[index] || provinces[0] || CITIES[city]?.prov || '',
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

type BuildExploreMarkersOptions = {
  schools: School[]
  appUsers: AppUser[]
  provinceStats: MapProvinceStat[]
  showSchools: boolean
  showUsers: boolean
  selectedProvince: string
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
  const cityCount: Record<string, number> = {}
  const cityIndex: Record<string, number> = {}

  if (showSchools) {
    const schoolMarkerItems: MarkerItem[] = []

    schools.forEach((s) => {
      getSchoolLocations(s).forEach((location) => {
        const cityName = String(location.city || '').trim()
        if (!cityName || !CITIES[cityName]) return
        cityCount[cityName] = (cityCount[cityName] || 0) + 1
      })
    })

    schools.forEach((s) => {
      const locations = getSchoolLocations(s)
      const schoolName = getSchoolDisplayName(s)
      const cityLocations = locations.filter((location) => {
        const cityName = String(location.city || '').trim()
        return !!cityName && isValidCoord(CITIES[cityName])
      })

      if (cityLocations.length > 0) {
        cityLocations.forEach((location) => {
          const cityName = String(location.city || '').trim()
          const info = CITIES[cityName]
          if (!isValidCoord(info)) return
          const idx = cityIndex[cityName] || 0
          cityIndex[cityName] = idx + 1
          const jittered = jitter(info.lat, info.lng, idx, cityCount[cityName] || 1, `${schoolName}-${cityName}`)
          if (!isValidCoord(jittered)) return

          schoolMarkerItems.push({
            id: nextId++,
            latitude: jittered.lat,
            longitude: jittered.lng,
            name: schoolName,
            type: 'school',
            markerProv: String(location.province || '').trim() || info.prov,
            city: cityName,
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

      Object.keys(schoolsByProvince).forEach((province) => {
        const group = schoolsByProvince[province]
        const fallback = PROV_FALLBACK[province]
        const lat = isValidCoord(fallback)
          ? fallback.lat
          : group.reduce((sum, item) => sum + item.latitude, 0) / group.length
        const lng = isValidCoord(fallback)
          ? fallback.lng
          : group.reduce((sum, item) => sum + item.longitude, 0) / group.length

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

        items.push({
          id: nextId++,
          latitude: lat,
          longitude: lng,
          name: province,
          type: 'school_cluster',
          markerProv: province,
          city: '',
          originalId: `school-cluster-${province}`,
          clusterSchools: uniqueSchoolsById(group.map((item) => ({
            id: item.originalId,
            name: item.name,
            province,
            city: item.city,
          }))),
          schoolPointCount: group.length,
        })
      })
    } else {
      items.push(...schoolMarkerItems)
    }
  }

  if (showUsers && !selectedProvince) {
    provinceStats.forEach((stat) => {
      const province = String(stat.province || '').trim()
      const coord = PROV_FALLBACK[province]
      if (!province || !isValidCoord(coord) || !stat.count) return

      const userClusterCoord = offsetUserClusterCoord(province, coord)

      items.push({
        id: nextId++,
        latitude: userClusterCoord.lat,
        longitude: userClusterCoord.lng,
        name: province,
        type: 'user_cluster',
        markerProv: province,
        city: '',
        originalId: `province-summary-${province}`,
        clusterUsers: [],
        provinceStat: stat,
      })
    })
  }

  if (showUsers && selectedProvince) {
    const usersByCity: Record<string, AppUser[]> = {}
    const usersByProvince: Record<string, AppUser[]> = {}

    appUsers.forEach((u) => {
      if (!u.province) return
      const cityInfo = u.city ? CITIES[u.city] : null
      if (u.city && isValidCoord(cityInfo)) {
        if (!usersByCity[u.city]) usersByCity[u.city] = []
        usersByCity[u.city].push(u)
        return
      }

      const fallbackCoord = PROV_FALLBACK[u.province]
      if (!isValidCoord(fallbackCoord)) return
      if (!usersByProvince[u.province]) usersByProvince[u.province] = []
      usersByProvince[u.province].push(u)
    })

    Object.keys(usersByCity).forEach((cityName) => {
      const usersInCity = usersByCity[cityName]
      const info = CITIES[cityName]
      if (!isValidCoord(info)) return

      if (usersInCity.length >= USER_CLUSTER_THRESHOLD) {
        items.push({
          id: nextId++,
          latitude: info.lat,
          longitude: info.lng,
          name: cityName,
          type: 'user_cluster',
          markerProv: info.prov,
          city: cityName,
          originalId: `cluster-${cityName}`,
          clusterUsers: usersInCity,
        })
        return
      }

      usersInCity.forEach((u, idx) => {
        const name = u.displayName?.trim() || '同路人'
        const jittered = jitter(info.lat, info.lng, idx, usersInCity.length, name + u._id)
        if (!isValidCoord(jittered)) return
        items.push({
          id: nextId++,
          latitude: jittered.lat,
          longitude: jittered.lng,
          name,
          type: 'user',
          markerProv: info.prov,
          city: u.city,
          originalId: u._id,
          bio: u.bio,
          roles: normalizeRolesForDisplay(u.roles || []),
          companionContext: u.companionContext || '',
          isSelf: !!u.isSelf,
        })
      })
    })

    Object.keys(usersByProvince).forEach((province) => {
      const usersInProvince = usersByProvince[province]
      const coord = PROV_FALLBACK[province]
      if (!isValidCoord(coord)) return

      if (usersInProvince.length >= USER_CLUSTER_THRESHOLD) {
        items.push({
          id: nextId++,
          latitude: coord.lat,
          longitude: coord.lng,
          name: province,
          type: 'user_cluster',
          markerProv: province,
          city: '',
          originalId: `cluster-province-${province}`,
          clusterUsers: usersInProvince,
        })
        return
      }

      usersInProvince.forEach((u, idx) => {
        const name = u.displayName?.trim() || '同路人'
        const jittered = jitter(coord.lat, coord.lng, idx, usersInProvince.length, name + u._id)
        if (!isValidCoord(jittered)) return
        items.push({
          id: nextId++,
          latitude: jittered.lat,
          longitude: jittered.lng,
          name,
          type: 'user',
          markerProv: province,
          city: u.city,
          originalId: u._id,
          bio: u.bio,
          roles: normalizeRolesForDisplay(u.roles || []),
          companionContext: u.companionContext || '',
          isSelf: !!u.isSelf,
        })
      })
    })
  }

  return items
}
