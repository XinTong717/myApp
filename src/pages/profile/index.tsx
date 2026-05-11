import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  GENDER_OPTIONS,
  AGE_RANGE_OPTIONS,
  ROLE_OPTIONS,
  CHILD_AGE_OPTIONS,
  CHILD_STATUS_OPTIONS,
} from '../../constants/profile'
import ProfileAdminEntry from '../../components/profile/ProfileAdminEntry'
import ProfilePrivacySection from '../../components/profile/ProfilePrivacySection'
import ProfileBasicSection from '../../components/profile/ProfileBasicSection'
import ProfileParentSection from '../../components/profile/ProfileParentSection'
import ProfileEducatorSection from '../../components/profile/ProfileEducatorSection'
import ProfileCompanionSection from '../../components/profile/ProfileCompanionSection'
import ProfileBioSection from '../../components/profile/ProfileBioSection'
import ProfileNoticeBox from '../../components/profile/ProfileNoticeBox'
import ProfileSecondaryButton from '../../components/profile/ProfileSecondaryButton'
import ProfileFavoriteEventsCard from '../../components/profile/ProfileFavoriteEventsCard'
import ProfileFeedbackCard from '../../components/profile/ProfileFeedbackCard'
import AppPage from '../../components/common/AppPage'
import AppPageHeader from '../../components/common/AppPageHeader'
import AppPrimaryButton from '../../components/common/AppPrimaryButton'
import AppIcon from '../../components/common/AppIcon'
import AppRow from '../../components/common/AppRow'
import AppSegmentedTabs from '../../components/common/AppSegmentedTabs'
import AppCheckbox from '../../components/common/AppCheckbox'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import { checkAdminAccess, getProfileBootstrap, requestAccountDeletion } from '../../services/profile'
import { hasCurrentLocalLegalConsent, isCurrentLegalConsent, recordLegalConsent, setLocalLegalConsent } from '../../services/legalConsent'
import type { LegalConsentCache } from '../../constants/legal'
import { useSafety } from '../../hooks/useSafety'
import { useProfileForm } from '../../hooks/useProfileForm'

const PROFILE_REFRESH_TTL = 30 * 1000
const USER_AGREEMENT_URL = '/pkg/legal/user-agreement/index'
const PRIVACY_POLICY_URL = '/pkg/legal/privacy-policy/index'
const PROFILE_STEPS = [
  { key: 'basic', label: '基本资料' },
  { key: 'identity', label: '身份补充' },
  { key: 'privacy', label: '目录设置' },
] as const

type ProfileStep = typeof PROFILE_STEPS[number]['key']

function PrivacyDisclosureNotice() {
  return (
    <AppRow align='flex-start' gap={space(3)} marginBottom={space(3)} style={{ backgroundColor: palette.card, borderRadius: radius.md, border: `1px solid ${palette.line}`, padding: space(3) }}>
      <AppIcon name='lock' size={24} bordered />
      <Text style={{ ...typography.caption, color: palette.subtext, flex: 1 }}>
        如果你选择出现在地图上，显示名、身份、城市、简介，以及“和这个生态的关系”会作为公开资料展示。公开渠道、添加备注、家庭教育关注信息和教育服务内容仅对已登录并完成个人资料的用户可见。平台不提供私信、好友申请或双边联络请求。
      </Text>
    </AppRow>
  )
}

function LegalAgreementConsent(props: { checked: boolean; onToggle: () => void; onOpenUserAgreement: () => void; onOpenPrivacyPolicy: () => void }) {
  const openUserAgreement = (e: any) => {
    e?.stopPropagation?.()
    props.onOpenUserAgreement()
  }
  const openPrivacyPolicy = (e: any) => {
    e?.stopPropagation?.()
    props.onOpenPrivacyPolicy()
  }

  return (
    <AppRow onClick={props.onToggle} align='flex-start' marginBottom={space(3)} style={{ backgroundColor: props.checked ? palette.surfaceWarm : palette.card, borderRadius: radius.md, border: `1px solid ${props.checked ? palette.accentDeep : palette.line}`, padding: space(3) }}>
      <AppCheckbox checked={props.checked} marginTop={space(1)} />
      <View style={{ flex: 1, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
        <Text onClick={openUserAgreement} style={{ ...typography.caption, color: palette.accentDeep }}>《用户协议》</Text>
        <Text style={{ ...typography.caption, color: palette.subtext }}>和</Text>
        <Text onClick={openPrivacyPolicy} style={{ ...typography.caption, color: palette.accentDeep }}>《隐私政策》</Text>
      </View>
    </AppRow>
  )
}

export default function ProfilePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeStep, setActiveStep] = useState<ProfileStep>('basic')
  const [legalAgreed, setLegalAgreed] = useState(() => hasCurrentLocalLegalConsent())
  const lastAutoRefreshAtRef = useRef(0)

  const form = useProfileForm()
  const {
    loading, saving, privacySaving, displayName, setDisplayName, gender, setGender, ageRange, setAgeRange, roles, setRoles, province, cityOption, customCity, setCustomCity, publicChannel, setPublicChannel, publicChannelNote, setPublicChannelNote, expandedProfileVisible, isVisibleOnMap, childAgeRange, setChildAgeRange, childDropoutStatus, setChildDropoutStatus, childInterests, setChildInterests, eduServices, setEduServices, companionContext, setCompanionContext, bio, setBio, isParent, isEducator, isCompanion, currentCity, pickerRange, pickerValue, loadProfile, applyRemoteProfile, handleSave, handleUpdatePrivacySetting, handlePickerChange, handlePickerColumnChange,
  } = form
  const hasCompletedProfile = !!(displayName.trim() && province && currentCity)

  const { blockedUsers, mutedUsers, hydrateSafetyOverview, loadSafetyOverview, handleSafetyAction } = useSafety()

  const loadAdminAccess = async () => {
    try {
      const res = await checkAdminAccess()
      setIsAdmin(!!res?.ok && !!res?.isAdmin)
    } catch (err) {
      console.error('checkAdminAccess error:', err)
      setIsAdmin(false)
    }
  }

  const loadProfileBootstrap = async () => {
    const result = await getProfileBootstrap()
    const profileData = result.profile?.ok ? result.profile.data : null
    const safetyData = result.safetyOverview?.ok ? result.safetyOverview.data : null
    const adminData = result.adminAccess?.ok ? result.adminAccess.data : null
    const legalData = result.legalConsent?.ok ? result.legalConsent.data : null
    const legalConsent = (legalData?.consent || null) as Partial<LegalConsentCache> | null

    const fallbackTasks: Promise<unknown>[] = []

    if (profileData?.ok) await applyRemoteProfile(profileData.profile || null)
    else fallbackTasks.push(loadProfile())

    if (safetyData?.ok) hydrateSafetyOverview(safetyData)
    else fallbackTasks.push(loadSafetyOverview())

    if (adminData?.ok) setIsAdmin(!!adminData.isAdmin)
    else fallbackTasks.push(loadAdminAccess())

    if (legalData?.ok && isCurrentLegalConsent(legalConsent)) {
      setLegalAgreed(true)
      setLocalLegalConsent(legalConsent as LegalConsentCache)
    }

    await Promise.all(fallbackTasks)
  }

  const refreshProfilePage = (force = false) => {
    const now = Date.now()
    if (!force && now - lastAutoRefreshAtRef.current < PROFILE_REFRESH_TTL) return
    lastAutoRefreshAtRef.current = now
    loadProfileBootstrap().catch((err) => {
      console.error('loadProfileBootstrap error:', err)
      loadProfile()
      loadSafetyOverview()
      loadAdminAccess()
    })
  }

  const refreshSafety = () => {
    loadSafetyOverview()
  }

  useDidShow(() => {
    refreshProfilePage(false)
  })

  const openUserAgreement = () => Taro.navigateTo({ url: USER_AGREEMENT_URL })
  const openPrivacyPolicy = () => Taro.navigateTo({ url: PRIVACY_POLICY_URL })
  const openAdminReviewPage = () => Taro.navigateTo({ url: '/pages/admin/index' })

  const handleRequestAccountDeletion = async () => {
    const firstConfirm = await Taro.showModal({
      title: '申请账号注销',
      content: '提交后，你的公开资料会立即先从地图隐藏，公开渠道会被清空。管理员随后处理剩余历史记录；如需确认进度，可通过官方联系方式联系我们。',
      confirmText: '继续',
      cancelText: '取消',
    })
    if (!firstConfirm.confirm) return

    const secondConfirm = await Taro.showModal({
      title: '再次确认',
      content: '这是账号注销 / 数据删除申请。提交后不会立即物理删除全部历史记录，但公开资料会先匿名化并隐藏。确认提交吗？',
      confirmText: '确认提交',
      cancelText: '取消',
    })
    if (!secondConfirm.confirm) return

    try {
      Taro.showLoading({ title: '提交中...' })
      const result = await requestAccountDeletion()
      Taro.hideLoading()
      Taro.showToast({ title: result.message || (result.ok ? '已提交申请' : '提交失败'), icon: result.ok ? 'success' : 'none' })
      if (result.ok) refreshProfilePage(true)
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    }
  }

  const validateBasicStep = () => {
    if (!displayName.trim()) { Taro.showToast({ title: '请先填写显示名', icon: 'none' }); return false }
    if (!roles.length) { Taro.showToast({ title: '请至少选择一个身份', icon: 'none' }); return false }
    if (!province || !currentCity) { Taro.showToast({ title: '请先选择所在城市', icon: 'none' }); return false }
    if (cityOption === '其他' && !customCity.trim()) { Taro.showToast({ title: '请输入真实城市名', icon: 'none' }); return false }
    return true
  }

  const goNextStep = () => {
    if (activeStep === 'basic' && !validateBasicStep()) return
    const currentIndex = PROFILE_STEPS.findIndex((item) => item.key === activeStep)
    const next = PROFILE_STEPS[Math.min(currentIndex + 1, PROFILE_STEPS.length - 1)]
    setActiveStep(next.key)
  }

  const handleStepChange = (value: string) => {
    if (PROFILE_STEPS.some((item) => item.key === value)) {
      setActiveStep(value as ProfileStep)
    }
  }

  const confirmMapDisclosureIfNeeded = async () => {
    if (!isVisibleOnMap) return true
    const confirm = await Taro.showModal({
      title: '确认加入成员目录',
      content: '保存后，你的显示名、身份、城市、简介，以及“和这个生态的关系”会出现在同路人地图上。公开渠道和身份补充信息仅对已登录并完成资料的用户可见。确认保存吗？',
      confirmText: '保存',
      cancelText: '先不保存',
    })
    return !!confirm.confirm
  }

  const showSavedNextStep = async () => {
    const result = await Taro.showModal({
      title: '已保存资料',
      content: isVisibleOnMap ? '你已加入成员目录。现在可以去地图看看附近的同路人，也可以继续完善资料。' : '资料已保存。你可以去地图浏览学习社区和活动，也可以稍后再决定是否出现在成员目录。',
      confirmText: '去看同路人',
      cancelText: '留在这里',
    })
    if (result.confirm) Taro.switchTab({ url: '/pages/explore/index' })
  }

  const handleConfirmedSave = async () => {
    if (!legalAgreed) { Taro.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' }); return }
    const mapDisclosureOk = await confirmMapDisclosureIfNeeded()
    if (!mapDisclosureOk) return
    const consentResult = await recordLegalConsent()
    if (!consentResult.ok) { Taro.showToast({ title: consentResult.message || '协议确认失败，请稍后重试', icon: 'none' }); return }
    const saved = await handleSave()
    if (saved) await showSavedNextStep()
  }

  if (loading) {
    return <AppPage style={{ paddingTop: space(8), textAlign: 'center' }}><Text style={{ ...typography.body, color: palette.subtext }}>加载中...</Text></AppPage>
  }

  return (
    <AppPage style={{ paddingBottom: space(8) }}>
      <AppPageHeader title='我的' description='填写资料、设置成员目录可见性，并管理安全与隐私。' />
      <ProfileAdminEntry isAdmin={isAdmin} onOpen={openAdminReviewPage} />
      <ProfileFavoriteEventsCard enabled={hasCompletedProfile} />
      <AppSegmentedTabs options={PROFILE_STEPS} value={activeStep} onChange={handleStepChange} />

      {activeStep === 'basic' && <>
        <ProfileBasicSection displayName={displayName} setDisplayName={setDisplayName} gender={gender} setGender={setGender} ageRange={ageRange} setAgeRange={setAgeRange} roles={roles} setRoles={setRoles} province={province} cityOption={cityOption} currentCity={currentCity} customCity={customCity} setCustomCity={setCustomCity} publicChannel={publicChannel} setPublicChannel={setPublicChannel} publicChannelNote={publicChannelNote} setPublicChannelNote={setPublicChannelNote} pickerRange={pickerRange} pickerValue={pickerValue} handlePickerChange={handlePickerChange} handlePickerColumnChange={handlePickerColumnChange} genderOptions={GENDER_OPTIONS} ageRangeOptions={AGE_RANGE_OPTIONS} roleOptions={ROLE_OPTIONS} />
        <ProfileBioSection bio={bio} setBio={setBio} />
        <ProfileNoticeBox text='先完成显示名、身份和城市，就可以被地图正确识别。简介会公开展示，请避免填写孩子姓名、具体学校、住址等敏感细节。' />
        <ProfileSecondaryButton text='下一步：身份补充（最后一步保存）' onClick={goNextStep} />
      </>}

      {activeStep === 'identity' && <>
        {isParent && <ProfileParentSection childAgeRange={childAgeRange} setChildAgeRange={setChildAgeRange} childDropoutStatus={childDropoutStatus} setChildDropoutStatus={setChildDropoutStatus} childInterests={childInterests} setChildInterests={setChildInterests} childAgeOptions={CHILD_AGE_OPTIONS} childStatusOptions={CHILD_STATUS_OPTIONS} />}
        {isEducator && <ProfileEducatorSection eduServices={eduServices} setEduServices={setEduServices} />}
        {isCompanion && <ProfileCompanionSection companionContext={companionContext} setCompanionContext={setCompanionContext} />}
        {!isParent && !isEducator && !isCompanion && <ProfileNoticeBox text='你还没有选择身份。回到“基本资料”选择家长、教育者或同行者后，这里会出现对应的补充信息。' />}
        <ProfileNoticeBox text='家长与教育者补充信息不会在地图卡片直接公开；同行者填写的“和这个生态的关系”会随地图卡片公开展示。请不要写入敏感身份、未成年人姓名或具体住址。' />
        <ProfileSecondaryButton text='下一步：目录设置（最后一步保存）' onClick={goNextStep} />
      </>}

      {activeStep === 'privacy' && <>
        <ProfilePrivacySection privacySaving={privacySaving} expandedProfileVisible={expandedProfileVisible} isVisibleOnMap={isVisibleOnMap} blockedUsers={blockedUsers} mutedUsers={mutedUsers} onUpdatePrivacySetting={handleUpdatePrivacySetting} onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshSafety(); loadProfile() })} onRequestAccountDeletion={handleRequestAccountDeletion} />
        <PrivacyDisclosureNotice />
        <LegalAgreementConsent checked={legalAgreed} onToggle={() => setLegalAgreed((value) => !value)} onOpenUserAgreement={openUserAgreement} onOpenPrivacyPolicy={openPrivacyPolicy} />
        <AppPrimaryButton text='保存资料' loadingText='保存中...' loading={saving} onClick={handleConfirmedSave} />
      </>}

      <ProfileFeedbackCard />

      <AppRow justify='center' wrap marginBottom={space(5)}>
        <Text onClick={openUserAgreement} style={{ ...typography.caption, color: palette.accentDeep }}>用户协议</Text>
        <Text style={{ ...typography.caption, color: palette.subtext }}>·</Text>
        <Text onClick={openPrivacyPolicy} style={{ ...typography.caption, color: palette.accentDeep }}>隐私政策</Text>
      </AppRow>
    </AppPage>
  )
}
