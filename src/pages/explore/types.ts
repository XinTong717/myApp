import type { MapProvinceStat, SchoolLocationItem } from '../../types/domain'

export type School = {
  id: number | string
  name?: string
  canonical_name?: string
  province?: string
  city?: string
  locations?: SchoolLocationItem[]
  location_count?: number
}

export type AppUser = {
  _id: string
  displayName?: string
  roles?: string[]
  province?: string
  city?: string
  bio?: string
  companionContext?: string
  isSelf?: boolean
  requestCooldownDays?: number
  requestCooldownUntil?: string
}

export type MarkerItem = {
  id: number
  latitude: number
  longitude: number
  name: string
  type: 'school' | 'school_cluster' | 'user' | 'user_cluster'
  markerProv: string
  city?: string
  originalId: number | string
  bio?: string
  roles?: string[]
  companionContext?: string
  isSelf?: boolean
  requestCooldownDays?: number
  requestCooldownUntil?: string
  clusterUsers?: AppUser[]
  clusterSchools?: School[]
  schoolPointCount?: number
  provinceStat?: MapProvinceStat
}

export type UserRoleFilter = '全部' | '家长' | '教育者' | '同行者'
export type ProfileCompletenessFilter = '全部' | '有简介' | '有联络说明'

export function normalizeRolesForDisplay(roles: string[] = []): string[] {
  return roles.map((role) => (role === '其他' ? '同行者' : role))
}
