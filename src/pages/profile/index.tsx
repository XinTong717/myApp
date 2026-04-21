import { useState, useMemo } from 'react'
import { View, Text, Input, Textarea, Picker, Switch } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../constants/location'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

const GENDER_OPTIONS = ['男', '女', '其他', '不想说']
const AGE_RANGE_OPTIONS = ['18-25', '26-35', '36-45', '46-55', '55以上']
const ROLE_OPTIONS = ['家长', '教育者', '同行者']
const CHILD_AGE_OPTIONS = ['学龄前', '小学阶段', '中学阶段']
const CHILD_STATUS_OPTIONS = ['寻找学习社区', '寻找同伴连接', '寻找项目活动', '寻找家庭支持', '自主探索中', '其他']
const REPORT_REASON_OPTIONS = ['垃圾广告', '骚扰不适', '未成年人敏感信息', '其他']

function normalizeRoles(roles: string[] = []) {
  return roles.map((role) => role === '其他' ? '同行者' : role)
}

function renderRoleText(roles: string[] = []) {
  return normalizeRoles(roles).join('/')
}

function SectionTitle(props: { text: string }) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>{props.text}</Text>
    </View>
  )
}

function PillSelect(props: {
  options: string[]; selected: string | string[]; multi?: boolean
  onChange: (val: string | string[]) => void
}) {
  const { options, selected, multi, onChange } = props
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])
  const handleTap = (opt: string) => {
    if (multi) {
      const arr = Array.isArray(selected) ? [...selected] : []
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
    } else {
      onChange(opt === selected ? '' : opt)
    }
  }
  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((opt) => {
        const active = selectedSet.has(opt)
        return (
          <View key={opt} onClick={() => handleTap(opt)} style={{
            padding: '6px 14px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
            backgroundColor: active ? palette.accentDeep : '#F5F0EB',
            border: `1px solid ${active ? palette.accentDeep : palette.line}`,
          }}>
            <Text style={{ fontSize: '13px', color: active ? '#FFF' : palette.subtext }}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}

type PendingReq = {
  _id: string; fromUserId: string; fromName: string; fromCity: string; fromRoles: string[]; fromBio: string; createdAt: string
}
type AcceptedConn = {
  _id: string; otherUserId: string; otherName: string; otherCity: string; otherRoles: string[]; otherBio: string
  otherWechat: string; otherChildInfo: { ageRange: string; status: string; interests: string } | null
  otherEduServices: string
}
type SentReq = {
  _id: string; toUserId: string; toName: string; toCity: string; status: string; createdAt: string
}
type SafetyItem = {
  _id: string; targetUserId: string; targetName: string; targetCity: string; isBlocked: boolean; isMuted: boolean
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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

  const [childAgeRange, setChildAgeRange] = useState('')
  const [childDropoutStatus, setChildDropoutStatus] = useState('')
  const [childInterests, setChildInterests] = useState('')

  const [eduServices, setEduServices] = useState('')
  const [companionContext, setCompanionContext] = useState('')
  const [bio, setBio] = useState('')

  const [pendingRequests, setPendingRequests] = useState<PendingReq[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<AcceptedConn[]>([])
  const [sentRequests, setSentRequests] = useState<SentReq[]>([])
  const [blockedUsers, setBlockedUsers] = useState<SafetyItem[]>([])
  const [mutedUsers, setMutedUsers] = useState<SafetyItem[]>([])

  const isParent = roles.includes('家长')
  const isEducator = roles.includes('教育者')
  const isCompanion = roles.includes('同行者')
  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption

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
      const res: any = await Taro.cloud.callFunction({ name: 'getMe', data: {} })
      const p = res.result?.profile
      if (p) {
        setDisplayName(p.displayName || '')
        setGender(p.gender || '')
        setAgeRange(p.ageRange === '18岁以下' ? '' : (p.ageRange || ''))
        const sanitizedRoles = normalizeRoles((Array.isArray(p.roles) ? p.roles : (p.role ? [p.role] : [])).filter((role) => role !== '学生'))
        setRoles(sanitizedRoles)
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
        setChildAgeRange(CHILD_AGE_OPTIONS.includes(p.childAgeRange || '') ? (p.childAgeRange || '') : '')
        setChildDropoutStatus(CHILD_STATUS_OPTIONS.includes(p.childDropoutStatus || '') ? (p.childDropoutStatus || '') : '')
        setChildInterests(p.childInterests || '')
        setEduServices(p.eduServices || '')
        setCompanionContext(p.companionContext || '')
        setBio(p.bio || '')
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'getMyRequests', data: {} })
      const r = res.result
      if (r?.ok) {
        setPendingRequests(r.pending || [])
        setAcceptedConnections(r.accepted || [])
        setSentRequests(r.sent || [])
      }
    } catch (err) {
      console.error('loadRequests error:', err)
    }
  }

  const loadSafetyOverview = async () => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'getSafetyOverview', data: {} })
      const r = res.result
      if (r?.ok) {
        setBlockedUsers(r.blocked || [])
        setMutedUsers(r.muted || [])
      }
    } catch (err) {
      console.error('getSafetyOverview error:', err)
    }
  }

  const loadAdminAccess = async () => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'checkAdminAccess', data: {} })
      setIsAdmin(!!res.result?.ok && !!res.result?.isAdmin)
    } catch (err) {
      console.error('checkAdminAccess error:', err)
      setIsAdmin(false)
    }
  }

  const refreshRelations = () => {
    loadRequests()
    loadSafetyOverview()
  }

  useDidShow(() => {
    loadProfile()
    loadRequests()
    loadSafetyOverview()
    loadAdminAccess()
  })

  const handleSave = async () => {
    if (!displayName.trim()) {
      Taro.showToast({ title: '请填写显示名', icon: 'none' })
      return
    }
    if (!province || !currentCity) {
      Taro.showToast({ title: '请选择所在城市', icon: 'none' })
      return
    }
    if (cityOption === '其他' && !customCity.trim()) {
      Taro.showToast({ title: '请输入真实城市名', icon: 'none' })
      return
    }
    try {
      setSaving(true)
      const normalizedRoles = normalizeRoles(roles.filter((role) => role !== '学生'))
      const normalizedAgeRange = ageRange === '18岁以下' ? '' : ageRange
      const normalizedChildStatus = CHILD_STATUS_OPTIONS.includes(childDropoutStatus) ? childDropoutStatus : ''
      const normalizedChildAgeRange = CHILD_AGE_OPTIONS.includes(childAgeRange) ? childAgeRange : ''

      const res: any = await Taro.cloud.callFunction({
        name: 'saveProfile',
        data: {
          displayName: displayName.trim(),
          gender,
          ageRange: normalizedAgeRange,
          roles: normalizedRoles,
          province,
          city: currentCity,
          wechatId: wechatId.trim(),
          allowIncomingRequests,
          isVisibleOnMap,
          childAgeRange: isParent ? normalizedChildAgeRange : '',
          childDropoutStatus: isParent ? normalizedChildStatus : '',
          childInterests: isParent ? childInterests.trim() : '',
          eduServices: isEducator ? eduServices.trim() : '',
          companionContext: isCompanion ? companionContext.trim() : '',
          bio: bio.trim(),
        },
      })
      const r = res.result
      if (r?.ok) {
        Taro.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => { loadProfile() }, 500)
      } else {
        Taro.showToast({ title: r?.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePrivacySetting = async (field: 'allowIncomingRequests' | 'isVisibleOnMap', value: boolean) => {
    try {
      setPrivacySaving(true)
      if (field === 'allowIncomingRequests') setAllowIncomingRequests(value)
      if (field === 'isVisibleOnMap') setIsVisibleOnMap(value)

      const res: any = await Taro.cloud.callFunction({ name: 'updatePrivacySettings', data: { [field]: value } })
      const result = res.result
      if (result?.ok) {
        Taro.showToast({ title: '设置已更新', icon: 'success' })
      } else {
        await loadProfile()
        Taro.showToast({ title: result?.message || '更新失败', icon: 'none' })
      }
    } catch (err) {
      await loadProfile()
      Taro.showToast({ title: '更新失败，请稍后重试', icon: 'none' })
    } finally {
      setPrivacySaving(false)
    }
  }

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      Taro.showLoading({ title: action === 'accept' ? '同意中...' : '处理中...' })
      const res: any = await Taro.cloud.callFunction({ name: 'respondRequest', data: { requestId, action } })
      Taro.hideLoading()
      const r = res.result
      Taro.showToast({ title: r?.message || '已处理', icon: r?.ok ? 'success' : 'none' })
      if (r?.ok) refreshRelations()
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleWithdrawRequest = async (connectionId: string) => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'manageConnection', data: { connectionId, action: 'withdraw' } })
      Taro.showToast({ title: res.result?.message || '已撤回', icon: res.result?.ok ? 'success' : 'none' })
      if (res.result?.ok) refreshRelations()
    } catch (err) {
      Taro.showToast({ title: '撤回失败', icon: 'none' })
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    const confirm = await Taro.showModal({
      title: '删除连接',
      content: '删除后你们将不再是已建立联络状态，需要重新发起请求。',
      confirmText: '确认删除',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      const res: any = await Taro.cloud.callFunction({ name: 'manageConnection', data: { connectionId, action: 'remove_connection' } })
      Taro.showToast({ title: res.result?.message || '已删除', icon: res.result?.ok ? 'success' : 'none' })
      if (res.result?.ok) refreshRelations()
    } catch (err) {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const handleSafetyAction = async (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => {
    if (action === 'block') {
      const confirm = await Taro.showModal({
        title: '确认拉黑',
        content: '拉黑后，你将看不到对方，且当前待处理或已建立的联络都会断开。此操作不会自动恢复旧连接。',
        confirmText: '确认拉黑',
        cancelText: '取消',
      })
      if (!confirm.confirm) return
    }

    try {
      const res: any = await Taro.cloud.callFunction({ name: 'manageSafetyRelation', data: { targetUserId, action } })
      Taro.showToast({ title: res.result?.message || '已更新', icon: res.result?.ok ? 'success' : 'none' })
      if (res.result?.ok) {
        refreshRelations()
        loadProfile()
      }
    } catch (err) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleReportUser = async (targetUserId: string) => {
    try {
      const reasonRes = await Taro.showActionSheet({ itemList: REPORT_REASON_OPTIONS })
      const reason = REPORT_REASON_OPTIONS[reasonRes.tapIndex] || '其他'
      const res: any = await Taro.cloud.callFunction({ name: 'reportUser', data: { targetUserId, reason } })
      Taro.showToast({ title: res.result?.message || '举报已提交', icon: res.result?.ok ? 'success' : 'none' })
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '举报失败', icon: 'none' })
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

  const openPrivacyPolicy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' })
  }

  const openAdminReviewPage = () => {
    Taro.navigateTo({ url: '/pages/admin/event-reviews/index' })
  }

  if (loading) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '40px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: palette.subtext }}>加载中...</Text>
      </View>
    )
  }

  const totalPending = pendingRequests.length

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px 16px 100px', boxSizing: 'border-box' }}>
      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>我的资料</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            填写后你会出现在探索地图上，让同城家庭和同路人发现你。
          </Text>
        </View>
      </View>

      {isAdmin && (
        <View onClick={openAdminReviewPage} style={{ backgroundColor: '#FFF3E6', borderRadius: '18px', padding: '14px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.accentDeep }}>管理员入口</Text>
          <View style={{ marginTop: '6px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>进入活动审核台，查看 event_submissions、复制建议 payload，并在发布后回写审核状态。</Text>
          </View>
          <View style={{ marginTop: '10px' }}>
            <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>打开活动审核台 →</Text>
          </View>
        </View>
      )}

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <View style={{ marginBottom: '10px' }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>隐私与安全</Text>
        </View>
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ fontSize: '14px', color: palette.text }}>暂停接收联络</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>打开后，其他用户将无法再向你发起新的联络请求。</Text>
            </View>
          </View>
          <Switch checked={!allowIncomingRequests} disabled={privacySaving} color={palette.accentDeep} onChange={(e) => handleUpdatePrivacySetting('allowIncomingRequests', !e.detail.value)} />
        </View>
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ fontSize: '14px', color: palette.text }}>地图可见性</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>关闭后，你的名字和简介不会再出现在探索地图上。</Text>
            </View>
          </View>
          <Switch checked={isVisibleOnMap} disabled={privacySaving} color={palette.accentDeep} onChange={(e) => handleUpdatePrivacySetting('isVisibleOnMap', !!e.detail.value)} />
        </View>
        {(blockedUsers.length > 0 || mutedUsers.length > 0) && (
          <View>
            {blockedUsers.length > 0 && (
              <View style={{ marginBottom: '10px' }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>已拉黑</Text>
                {blockedUsers.map((item) => (
                  <View key={item._id} style={{ backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '10px 12px', marginTop: '8px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: '13px', color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ fontSize: '11px', color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => handleSafetyAction(item.targetUserId, 'unblock')} style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>解除拉黑</Text>
                  </View>
                ))}
              </View>
            )}
            {mutedUsers.length > 0 && (
              <View>
                <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>已静音</Text>
                {mutedUsers.map((item) => (
                  <View key={item._id} style={{ backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '10px 12px', marginTop: '8px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: '13px', color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ fontSize: '11px', color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => handleSafetyAction(item.targetUserId, 'unmute')} style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>取消静音</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {totalPending > 0 && (
        <View style={{ backgroundColor: '#FFF3E6', borderRadius: '16px', padding: '12px 14px', marginBottom: '14px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: '14px', color: palette.accentDeep, fontWeight: 'bold', flex: 1 }}>你有 {totalPending} 条新的联络请求</Text>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>下滑查看</Text>
        </View>
      )}

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <SectionTitle text='显示名' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={displayName} placeholder='你希望别人怎么称呼你' onInput={(e) => setDisplayName(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='性别' />
        <PillSelect options={GENDER_OPTIONS} selected={gender} onChange={(v) => setGender(v as string)} />

        <SectionTitle text='年龄段' />
        <PillSelect options={AGE_RANGE_OPTIONS} selected={ageRange} onChange={(v) => setAgeRange(v as string)} />

        <SectionTitle text='身份（可多选）' />
        <PillSelect options={ROLE_OPTIONS} selected={roles} multi onChange={(v) => setRoles(normalizeRoles(v as string[]))} />

        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: cityOption === '其他' ? '8px' : '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>▼</Text>
          </View>
        </Picker>
        {cityOption === '其他' && (
          <View style={{ marginBottom: '12px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表中会显示你填写的城市。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onInput={(e) => setCustomCity(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='微信号（选填）' />
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>仅在你同意对方的联络请求后，对方才能看到你的微信号</Text>
        </View>
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Input value={wechatId} placeholder='你的微信号' onInput={(e) => setWechatId(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>
      </View>

      {isParent && (
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>家庭教育关注</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>仅在你主动同意联络请求后展示，用于帮助对方理解你当前在寻找什么支持</Text>
            </View>
          </View>
          <SectionTitle text='孩子学段（选填）' />
          <PillSelect options={CHILD_AGE_OPTIONS} selected={childAgeRange} onChange={(v) => setChildAgeRange(v as string)} />
          <SectionTitle text='当前关注方向' />
          <PillSelect options={CHILD_STATUS_OPTIONS} selected={childDropoutStatus} onChange={(v) => setChildDropoutStatus(v as string)} />
          <SectionTitle text='希望补充说明的情况' />
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
            <Textarea value={childInterests} placeholder='比如：希望找线下同伴、项目制活动，或更适合当前阶段的学习支持...' maxlength={300} onInput={(e) => setChildInterests(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
          </View>
          <View style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{childInterests.length}/300</Text>
          </View>
        </View>
      )}

      {isEducator && (
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你提供的教育服务</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>帮助家庭了解你能提供什么样的支持</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
            <Textarea value={eduServices} placeholder='比如：一对一升学规划咨询...' maxlength={500} onInput={(e) => setEduServices(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '90px' }} />
          </View>
          <View style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{eduServices.length}/500</Text>
          </View>
        </View>
      )}

      {isCompanion && (
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你和这个生态的关系</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>比如：研究者、gap year、内容创作者、社区组织者、观察者等。这个说明会帮助别人理解你为什么在这里。</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
            <Textarea value={companionContext} placeholder='例如：gap year 中，长期关注多元教育与社区学习' maxlength={150} onInput={(e) => setCompanionContext(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
          </View>
          <View style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{companionContext.length}/150</Text>
          </View>
        </View>
      )}

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <SectionTitle text='一句话简介（选填）' />
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>其他用户在地图上点击你的标记后会看到这句话</Text>
        </View>
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
          <Textarea value={bio} placeholder='简单介绍一下自己...' maxlength={200} onInput={(e) => setBio(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '60px' }} />
        </View>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{bio.length}/200</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '16px', padding: '12px 14px', marginBottom: '12px', border: `1px dashed ${palette.line}` }}>
        <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>🔒 你的显示名、身份、城市和简介会在地图上公开展示。微信号、家庭教育关注信息和教育服务内容仅在你同意联络请求后对特定用户可见。请避免填写可直接识别未成年人的敏感细节。</Text>
      </View>

      <View style={{ marginBottom: '20px', alignItems: 'center' }}>
        <Text onClick={openPrivacyPolicy} style={{ fontSize: '12px', color: palette.accentDeep }}>查看《用户协议与隐私政策》</Text>
      </View>

      <View onClick={saving ? undefined : handleSave} style={{ backgroundColor: saving ? '#DDD' : palette.accentDeep, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '30px' }}>
        <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>{saving ? '保存中...' : '保存资料'}</Text>
      </View>

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text }}>联络动态</Text>
      </View>

      {pendingRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>收到的请求（{pendingRequests.length}）</Text></View>
          {pendingRequests.map((req) => (
            <View key={req._id} style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '14px', marginBottom: '10px', border: `1px solid ${palette.line}` }}>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{req.fromName}</Text>
              <View style={{ marginTop: '4px', marginBottom: '8px' }}>
                {req.fromCity ? <Text style={{ fontSize: '13px', color: palette.subtext }}>{req.fromCity}{req.fromRoles?.length > 0 ? ' · ' + renderRoleText(req.fromRoles) : ''}</Text> : null}
                {req.fromBio ? <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>{req.fromBio}</Text></View> : null}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                <View onClick={() => handleRespond(req._id, 'accept')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: palette.green, marginRight: '10px', marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>同意</Text></View>
                <View onClick={() => handleRespond(req._id, 'reject')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: '#F5F0EB', marginRight: '10px', marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.subtext }}>忽略</Text></View>
                {req.fromUserId ? <Text onClick={() => handleSafetyAction(req.fromUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '8px' }}>拉黑</Text> : null}
                {req.fromUserId ? <Text onClick={() => handleReportUser(req.fromUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '8px' }}>举报</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {acceptedConnections.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.green, fontWeight: 'bold' }}>已建立联络（{acceptedConnections.length}）</Text></View>
          {acceptedConnections.map((conn) => (
            <View key={conn._id} style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '14px', marginBottom: '10px', border: `1px solid ${palette.line}` }}>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{conn.otherName}</Text>
              <View style={{ marginTop: '4px' }}>
                <Text style={{ fontSize: '13px', color: palette.subtext }}>{conn.otherCity}{conn.otherRoles?.length > 0 ? ' · ' + renderRoleText(conn.otherRoles) : ''}</Text>
              </View>
              {conn.otherBio ? <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>{conn.otherBio}</Text></View> : null}
              {conn.otherWechat ? (
                <View onClick={() => { Taro.setClipboardData({ data: conn.otherWechat }) }} style={{ marginTop: '8px', backgroundColor: palette.greenSoft, borderRadius: '12px', padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: '13px', color: palette.green, flex: 1 }}>微信: {conn.otherWechat}</Text>
                  <Text style={{ fontSize: '11px', color: palette.subtext }}>点击复制</Text>
                </View>
              ) : <View style={{ marginTop: '8px' }}><Text style={{ fontSize: '12px', color: '#C5B5A5' }}>对方未填写微信号</Text></View>}
              {conn.otherChildInfo && (conn.otherChildInfo.ageRange || conn.otherChildInfo.status || conn.otherChildInfo.interests) ? (
                <View style={{ marginTop: '8px', backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '8px 12px' }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>家庭教育关注</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{[conn.otherChildInfo.ageRange, conn.otherChildInfo.status].filter(Boolean).join(' · ')}{conn.otherChildInfo.interests ? `\n${conn.otherChildInfo.interests}` : ''}</Text>
                </View>
              ) : null}
              {conn.otherEduServices ? (
                <View style={{ marginTop: '8px', backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '8px 12px' }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>教育服务</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{conn.otherEduServices}</Text>
                </View>
              ) : null}
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => handleRemoveConnection(conn._id)} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>删除连接</Text>
                {conn.otherUserId ? <Text onClick={() => handleSafetyAction(conn.otherUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {conn.otherUserId ? <Text onClick={() => handleSafetyAction(conn.otherUserId, 'mute')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {conn.otherUserId ? <Text onClick={() => handleReportUser(conn.otherUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {sentRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.subtext, fontWeight: 'bold' }}>我发出的请求（{sentRequests.length}）</Text></View>
          {sentRequests.map((req) => (
            <View key={req._id} style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '12px 14px', marginBottom: '8px', border: `1px solid ${palette.line}` }}>
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '14px', color: palette.text }}>{req.toName}</Text>
                  {req.toCity ? <Text style={{ fontSize: '12px', color: palette.subtext }}> · {req.toCity}</Text> : null}
                </View>
                <View style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#FFF3E6' }}><Text style={{ fontSize: '11px', color: palette.accentDeep }}>等待回应</Text></View>
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => handleWithdrawRequest(req._id)} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>撤回请求</Text>
                {req.toUserId ? <Text onClick={() => handleSafetyAction(req.toUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {req.toUserId ? <Text onClick={() => handleSafetyAction(req.toUserId, 'mute')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {req.toUserId ? <Text onClick={() => handleReportUser(req.toUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {pendingRequests.length === 0 && acceptedConnections.length === 0 && sentRequests.length === 0 && (
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '14px' }}>
          <Text style={{ fontSize: '13px', color: '#C5B5A5' }}>暂无联络动态</Text>
          <View style={{ marginTop: '6px' }}><Text style={{ fontSize: '12px', color: '#C5B5A5' }}>在探索页点击同路人，发起你的第一个联络请求</Text></View>
        </View>
      )}
    </View>
  )
}
