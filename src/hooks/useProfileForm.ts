import { useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../constants/location'
import { getMe, saveProfile, updatePrivacySettings } from '../services/profile'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from '../services/cache'
import { CACHE_KEY_PREFIXES } from '../constants/cacheKeys'
import type { UserProfile } from '../types/domain'

const PROFILE_DRAFT_KEY = CACHE_KEY_PREFIXES.profileDraft
const PROFILE_DRAFT_DEBOUNCE_MS = 1500
const PROFILE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

type ResetProfileFormOptions = {
  clearDraft?: boolean
}

export type PickerMultiChangeEvent = {
  detail: { value: number[] }
}

export type PickerColumnChangeEvent = {
  detail: {
    column: number
    value: number
  }
}

type ProfileDraft = {
  updatedAt: number
  displayName: string
  gender: string
  ageRange: string
  roles: string[]
  province: string
  cityOption: string
  customCity: string
  publicChannel: string
  publicChannelNote: string
  childAgeRange: string[]
  childDropoutStatus: string[]
  childInterests: string
  eduServices: string
  companionContext: string
  bio: string
}

function hasDraftContent(draft: Partial<ProfileDraft> | null) {
  if (!draft) return false
  return !!(
    draft.displayName || draft.gender || draft.ageRange || draft.province || draft.cityOption || draft.customCity ||
    draft.publicChannel || draft.publicChannelNote || draft.childInterests || draft.eduServices || draft.companionContext || draft.bio ||
    (Array.isArray(draft.roles) && draft.roles.length > 0) ||
    (Array.isArray(draft.childAgeRange) && draft.childAgeRange.length > 0) ||
    (Array.isArray(draft.childDropoutStatus) && draft.childDropoutStatus.length > 0)
  )
}

export function useProfileForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const draftReadyRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const refreshSeqRef = useRef(0)

  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [publicChannel, setPublicChannel] = useState('')
  const [publicChannelNote, setPublicChannelNote] = useState('')
  const [expandedProfileVisible, setExpandedProfileVisible] = useState(true)
  const [isVisibleOnMap, setIsVisibleOnMap] = useState(true)

  const [childAgeRange, setChildAgeRange] = useState<string[]>([])
  const [childDropoutStatus, setChildDropoutStatus] = useState<string[]>([])
  const [childInterests, setChildInterests] = useState('')

  const [eduServices, setEduServices] = useState('')
  const [companionContext, setCompanionContext] = useState('')
  const [bio, setBio] = useState('')

  const isParent = roles.includes('家长')
  const isEducator = roles.includes('教育者')
  const isCompanion = roles.includes('同行者')
  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption

  const resetProfileForm = (options: ResetProfileFormOptions = {}) => {
    applyingRemoteRef.current = true
    setDisplayName('')
    setGender('')
    setAgeRange('')
    setRoles([])
    setProvince('')
    setCityOption('')
    setCustomCity('')
    setPublicChannel('')
    setPublicChannelNote('')
    setExpandedProfileVisible(true)
    setIsVisibleOnMap(true)
    setChildAgeRange([])
    setChildDropoutStatus([])
    setChildInterests('')
    setEduServices('')
    setCompanionContext('')
    setBio('')
    if (options.clearDraft !== false) {
      clearScopedCachedValue(PROFILE_DRAFT_KEY).catch(() => null)
    }
    setTimeout(() => { applyingRemoteRef.current = false }, 0)
  }

  const applyDraft = (draft: Partial<ProfileDraft>) => {
    setDisplayName(draft.displayName || '')
    setGender(draft.gender || '')
    setAgeRange(draft.ageRange || '')
    setRoles(Array.isArray(draft.roles) ? draft.roles : [])
    setProvince(draft.province || '')
    setCityOption(draft.cityOption || '')
    setCustomCity(draft.customCity || '')
    setPublicChannel(draft.publicChannel || '')
    setPublicChannelNote(draft.publicChannelNote || '')
    setChildAgeRange(Array.isArray(draft.childAgeRange) ? draft.childAgeRange : [])
    setChildDropoutStatus(Array.isArray(draft.childDropoutStatus) ? draft.childDropoutStatus : [])
    setChildInterests(draft.childInterests || '')
    setEduServices(draft.eduServices || '')
    setCompanionContext(draft.companionContext || '')
    setBio(draft.bio || '')
  }

  const applyProfile = (p: UserProfile | null) => {
    if (!p) return
    if (p.deletionStatus === 'pending') {
      resetProfileForm({ clearDraft: true })
      return
    }
    applyingRemoteRef.current = true
    setDisplayName(p.displayName || '')
    setGender(p.gender || '')
    setAgeRange(p.ageRange || '')
    setRoles(Array.isArray(p.roles) ? p.roles : [])
    setProvince(p.province || '')

    const availableCities = LOCATION_DATA[p.province || ''] || []
    if (p.city && availableCities.includes(p.city)) {
      setCityOption(p.city)
      setCustomCity('')
    } else if (p.city) {
      setCityOption('其他')
      setCustomCity(p.city)
    } else {
      setCityOption('')
      setCustomCity('')
    }

    setPublicChannel(p.publicChannel || '')
    setPublicChannelNote(p.publicChannelNote || '')
    setExpandedProfileVisible(p.expandedProfileVisible !== false)
    setIsVisibleOnMap(p.isVisibleOnMap !== false)
    setChildAgeRange(Array.isArray(p.childAgeRange) ? p.childAgeRange : [])
    setChildDropoutStatus(Array.isArray(p.childDropoutStatus) ? p.childDropoutStatus : [])
    setChildInterests(p.childInterests || '')
    setEduServices(p.eduServices || '')
    setCompanionContext(p.companionContext || '')
    setBio(p.bio || '')
    setTimeout(() => { applyingRemoteRef.current = false }, 0)
  }

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])

  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    const normalizedCityOption = cityOption || (cities[0] || '')
    return [provIdx, Math.max(0, cities.indexOf(normalizedCityOption))]
  }, [province, cityOption])

  const loadDraftIfEmpty = async (remoteProfile: UserProfile | null | undefined) => {
    if (remoteProfile?.deletionStatus === 'pending') return
    if (remoteProfile?.displayName || remoteProfile?.province) return
    try {
      const draft = await getScopedCachedValue<Partial<ProfileDraft>>(PROFILE_DRAFT_KEY)
      if (draft && hasDraftContent(draft)) {
        setTimeout(() => applyDraft(draft), 0)
      }
    } catch (draftErr) {
      console.warn('load profile draft skipped:', draftErr)
    }
  }

  const applyRemoteProfile = async (remoteProfile: UserProfile | null | undefined) => {
    applyProfile(remoteProfile || null)
    await loadDraftIfEmpty(remoteProfile || null)
    draftReadyRef.current = true
    setLoading(false)
  }

  const loadProfile = async () => {
    const seq = refreshSeqRef.current + 1
    refreshSeqRef.current = seq

    try {
      const cachedRes = await getMe({ allowStale: true })
      const hasCachedProfile = !!cachedRes.profile

      if (hasCachedProfile) {
        applyProfile(cachedRes.profile || null)
        draftReadyRef.current = true
        setLoading(false)
      } else {
        setLoading(true)
      }

      if (hasCachedProfile && !cachedRes.stale) {
        return
      }

      const freshRes = await getMe({ forceRefresh: true })
      if (seq !== refreshSeqRef.current) return
      const remoteProfile = freshRes.profile || null
      applyProfile(remoteProfile)
      await loadDraftIfEmpty(remoteProfile)
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      if (seq === refreshSeqRef.current) {
        draftReadyRef.current = true
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!draftReadyRef.current || applyingRemoteRef.current || saving) return

    const timer = setTimeout(() => {
      const draft: ProfileDraft = {
        updatedAt: Date.now(),
        displayName,
        gender,
        ageRange,
        roles,
        province,
        cityOption,
        customCity,
        publicChannel,
        publicChannelNote,
        childAgeRange,
        childDropoutStatus,
        childInterests,
        eduServices,
        companionContext,
        bio,
      }

      if (!hasDraftContent(draft)) return
      setScopedCachedValue(PROFILE_DRAFT_KEY, draft, PROFILE_DRAFT_TTL_MS).catch((err: unknown) => {
        console.warn('save profile draft skipped:', err)
      })
    }, PROFILE_DRAFT_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [displayName, gender, ageRange, roles, province, cityOption, customCity, publicChannel, publicChannelNote, childAgeRange, childDropoutStatus, childInterests, eduServices, companionContext, bio, saving])

  const handleSave = async () => {
    if (!displayName.trim()) {
      Taro.showToast({ title: '请填写显示名', icon: 'none' })
      return false
    }
    if (!province || !currentCity) {
      Taro.showToast({ title: '请选择所在城市', icon: 'none' })
      return false
    }
    if (cityOption === '其他' && !customCity.trim()) {
      Taro.showToast({ title: '请输入真实城市名', icon: 'none' })
      return false
    }
    try {
      setSaving(true)
      const r = await saveProfile({
        displayName: displayName.trim(),
        gender,
        ageRange,
        roles,
        province,
        city: currentCity,
        publicChannel: publicChannel.trim(),
        publicChannelNote: publicChannelNote.trim(),
        expandedProfileVisible,
        isVisibleOnMap,
        childAgeRange: isParent ? childAgeRange : [],
        childDropoutStatus: isParent ? childDropoutStatus : [],
        childInterests: isParent ? childInterests.trim() : '',
        eduServices: isEducator ? eduServices.trim() : '',
        companionContext: isCompanion ? companionContext.trim() : '',
        bio: bio.trim(),
      })
      if (r?.ok) {
        clearScopedCachedValue(PROFILE_DRAFT_KEY).catch(() => null)
        if (r.profile) {
          applyProfile(r.profile)
        } else {
          await loadProfile()
        }
        Taro.showToast({ title: '保存成功', icon: 'success' })
        return true
      }
      Taro.showToast({ title: r?.message || '保存失败', icon: 'none' })
      return false
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePrivacySetting = async (field: 'expandedProfileVisible' | 'isVisibleOnMap', value: boolean) => {
    try {
      setPrivacySaving(true)
      if (field === 'expandedProfileVisible') setExpandedProfileVisible(value)
      if (field === 'isVisibleOnMap') setIsVisibleOnMap(value)

      const result = await updatePrivacySettings({ [field]: value })
      if (result?.ok) {
        Taro.showToast({ title: '设置已更新', icon: 'success' })
      } else {
        if (field === 'expandedProfileVisible') setExpandedProfileVisible(!value)
        if (field === 'isVisibleOnMap') setIsVisibleOnMap(!value)
        Taro.showToast({ title: result?.message || '更新失败', icon: 'none' })
      }
    } catch (err) {
      if (field === 'expandedProfileVisible') setExpandedProfileVisible(!value)
      if (field === 'isVisibleOnMap') setIsVisibleOnMap(!value)
      Taro.showToast({ title: '更新失败，请稍后重试', icon: 'none' })
    } finally {
      setPrivacySaving(false)
    }
  }

  const handlePickerChange = (e: PickerMultiChangeEvent) => {
    const [provIdx, cityIdx] = e.detail.value
    const newProv = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[newProv] || []
    const nextCityOption = cities[cityIdx] || ''
    setProvince(newProv)
    setCityOption(nextCityOption)
    if (nextCityOption !== '其他') {
      setCustomCity('')
    }
  }

  const handlePickerColumnChange = (e: PickerColumnChangeEvent) => {
    if (e.detail.column === 0) {
      const newProv = PROVINCES[e.detail.value] || ''
      const firstCity = (LOCATION_DATA[newProv] || [])[0] || ''
      setProvince(newProv)
      setCityOption(firstCity)
      setCustomCity('')
    }
  }

  return {
    loading,
    saving,
    privacySaving,
    displayName,
    setDisplayName,
    gender,
    setGender,
    ageRange,
    setAgeRange,
    roles,
    setRoles,
    province,
    cityOption,
    customCity,
    setCustomCity,
    publicChannel,
    setPublicChannel,
    publicChannelNote,
    setPublicChannelNote,
    expandedProfileVisible,
    isVisibleOnMap,
    childAgeRange,
    setChildAgeRange,
    childDropoutStatus,
    setChildDropoutStatus,
    childInterests,
    setChildInterests,
    eduServices,
    setEduServices,
    companionContext,
    setCompanionContext,
    bio,
    setBio,
    isParent,
    isEducator,
    isCompanion,
    currentCity,
    pickerRange,
    pickerValue,
    loadProfile,
    applyRemoteProfile,
    resetProfileForm,
    handleSave,
    handleUpdatePrivacySetting,
    handlePickerChange,
    handlePickerColumnChange,
  }
}
