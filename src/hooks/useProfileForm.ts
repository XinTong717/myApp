import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../constants/location'
import { getMe, saveProfile, updatePrivacySettings } from '../services/profile'
import { clearMapUsersCache } from '../services/map'
import type { UserProfile } from '../types/domain'

export function useProfileForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [allowIncomingRequests, setAllowIncomingRequests] = useState(true)
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

  const applyProfile = (p: UserProfile | null) => {
    if (!p) return
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

    setWechatId(p.wechatId || '')
    setAllowIncomingRequests(p.allowIncomingRequests !== false)
    setIsVisibleOnMap(p.isVisibleOnMap !== false)
    setChildAgeRange(Array.isArray(p.childAgeRange) ? p.childAgeRange : [])
    setChildDropoutStatus(Array.isArray(p.childDropoutStatus) ? p.childDropoutStatus : [])
    setChildInterests(p.childInterests || '')
    setEduServices(p.eduServices || '')
    setCompanionContext(p.companionContext || '')
    setBio(p.bio || '')
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

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await getMe()
      applyProfile(res.profile)
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

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
        wechatId: wechatId.trim(),
        allowIncomingRequests,
        isVisibleOnMap,
        childAgeRange: isParent ? childAgeRange : [],
        childDropoutStatus: isParent ? childDropoutStatus : [],
        childInterests: isParent ? childInterests.trim() : '',
        eduServices: isEducator ? eduServices.trim() : '',
        companionContext: isCompanion ? companionContext.trim() : '',
        bio: bio.trim(),
      })
      if (r?.ok) {
        await clearMapUsersCache()
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

  const handleUpdatePrivacySetting = async (field: 'allowIncomingRequests' | 'isVisibleOnMap', value: boolean) => {
    try {
      setPrivacySaving(true)
      if (field === 'allowIncomingRequests') setAllowIncomingRequests(value)
      if (field === 'isVisibleOnMap') setIsVisibleOnMap(value)

      const result = await updatePrivacySettings({ [field]: value })
      if (result?.ok) {
        await clearMapUsersCache()
        Taro.showToast({ title: '设置已更新', icon: 'success' })
      } else {
        if (field === 'allowIncomingRequests') setAllowIncomingRequests(!value)
        if (field === 'isVisibleOnMap') setIsVisibleOnMap(!value)
        Taro.showToast({ title: result?.message || '更新失败', icon: 'none' })
      }
    } catch (err) {
      if (field === 'allowIncomingRequests') setAllowIncomingRequests(!value)
      if (field === 'isVisibleOnMap') setIsVisibleOnMap(!value)
      Taro.showToast({ title: '更新失败，请稍后重试', icon: 'none' })
    } finally {
      setPrivacySaving(false)
    }
  }

  const handlePickerChange = (e: any) => {
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

  const handlePickerColumnChange = (e: any) => {
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
    wechatId,
    setWechatId,
    allowIncomingRequests,
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
    handleSave,
    handleUpdatePrivacySetting,
    handlePickerChange,
    handlePickerColumnChange,
  }
}
