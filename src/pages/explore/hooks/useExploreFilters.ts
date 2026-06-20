import { useMemo, useState } from 'react'
import type { AppUser, ProfileCompletenessFilter, UserRoleFilter } from '../types'
import { normalizeRolesForDisplay } from '../types'

function hasAnyValue<T extends string>(values: T[], target: T) {
  return values.includes(target)
}

function intersects(values: string[] = [], selected: string[] = []) {
  if (selected.length === 0) return true
  return selected.some((item) => values.includes(item))
}

function splitEncodedFilters(value: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter((item) => item && item !== '全部')
}

export function useExploreFilters(appUsers: AppUser[], selectedProvince: string) {
  const [showUserFilterSheet, setShowUserFilterSheet] = useState(false)
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRoleFilter[]>([])
  const [selectedProfileCompleteness, setSelectedProfileCompleteness] = useState<ProfileCompletenessFilter>('全部')
  const [selectedUserCity, setSelectedUserCity] = useState('全部')
  const [selectedChildAgeRanges, setSelectedChildAgeRanges] = useState<string[]>([])

  const selectedUserRole = (selectedUserRoles.length > 0 ? selectedUserRoles.join(',') : '全部') as UserRoleFilter
  const selectedChildAgeRange = selectedChildAgeRanges.length > 0 ? selectedChildAgeRanges.join(',') : '全部'

  const setSelectedUserRole = (value: UserRoleFilter | string) => {
    const next = splitEncodedFilters(value).filter((item) => ['家长', '教育者', '同行者'].includes(item)) as UserRoleFilter[]
    setSelectedUserRoles(Array.from(new Set(next)))
  }

  const setSelectedChildAgeRange = (value: string) => {
    setSelectedChildAgeRanges(Array.from(new Set(splitEncodedFilters(value))))
  }

  const userCityOptions = useMemo(() => {
    const citySet = new Set<string>()
    appUsers.forEach((user) => {
      if (selectedProvince && user.province !== selectedProvince) return
      if (user.city) citySet.add(user.city)
    })
    return ['全部', ...Array.from(citySet).sort()]
  }, [appUsers, selectedProvince])

  const activeUserFilterCount =
    selectedUserRoles.length +
    (selectedProfileCompleteness !== '全部' ? 1 : 0) +
    (selectedUserCity !== '全部' ? 1 : 0) +
    (hasAnyValue(selectedUserRoles, '家长') ? selectedChildAgeRanges.length : 0)

  const resetUserFilters = () => {
    setSelectedUserRoles([])
    setSelectedProfileCompleteness('全部')
    setSelectedUserCity('全部')
    setSelectedChildAgeRanges([])
  }

  const filteredAppUsersForMap = useMemo(() => {
    return appUsers.filter((user) => {
      const roles = normalizeRolesForDisplay(user.roles || [])
      if (selectedUserRoles.length > 0 && !intersects(roles, selectedUserRoles)) return false
      if (selectedProfileCompleteness === '有简介' && !String(user.bio || '').trim()) return false
      if (selectedProfileCompleteness === '有生态关系' && !String(user.companionContext || '').trim()) return false
      if (selectedUserCity !== '全部' && user.city !== selectedUserCity) return false
      if (selectedChildAgeRanges.length > 0) {
        const childAgeRange = Array.isArray(user.childAgeRange) ? user.childAgeRange : []
        if (!roles.includes('家长') || !intersects(childAgeRange, selectedChildAgeRanges)) return false
      }
      return true
    })
  }, [appUsers, selectedUserRoles, selectedProfileCompleteness, selectedUserCity, selectedChildAgeRanges])

  return {
    showUserFilterSheet,
    setShowUserFilterSheet,
    selectedUserRoles,
    setSelectedUserRoles,
    selectedUserRole,
    setSelectedUserRole,
    selectedProfileCompleteness,
    setSelectedProfileCompleteness,
    selectedUserCity,
    setSelectedUserCity,
    selectedChildAgeRanges,
    setSelectedChildAgeRanges,
    selectedChildAgeRange,
    setSelectedChildAgeRange,
    userCityOptions,
    activeUserFilterCount,
    resetUserFilters,
    filteredAppUsersForMap,
  }
}
