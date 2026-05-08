import { useMemo, useState } from 'react'
import type { AppUser, ProfileCompletenessFilter, UserRoleFilter } from '../types'
import { normalizeRolesForDisplay } from '../types'

export function useExploreFilters(appUsers: AppUser[], selectedProvince: string) {
  const [showUserFilterSheet, setShowUserFilterSheet] = useState(false)
  const [selectedUserRole, setSelectedUserRole] = useState<UserRoleFilter>('全部')
  const [selectedProfileCompleteness, setSelectedProfileCompleteness] = useState<ProfileCompletenessFilter>('全部')
  const [selectedUserCity, setSelectedUserCity] = useState('全部')
  const [selectedChildAgeRange, setSelectedChildAgeRange] = useState('全部')

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

  const filteredAppUsersForMap = useMemo(() => {
    return appUsers.filter((user) => {
      const roles = normalizeRolesForDisplay(user.roles || [])
      if (selectedUserRole !== '全部' && !roles.includes(selectedUserRole)) return false
      if (selectedProfileCompleteness === '有简介' && !String(user.bio || '').trim()) return false
      if (selectedProfileCompleteness === '有生态关系' && !String(user.companionContext || '').trim()) return false
      if (selectedUserCity !== '全部' && user.city !== selectedUserCity) return false
      return true
    })
  }, [appUsers, selectedUserRole, selectedProfileCompleteness, selectedUserCity])

  return {
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
  }
}
