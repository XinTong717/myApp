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
import ProfileHeaderCard from '../../components/profile/ProfileHeaderCard'
import ProfileAdminEntry from '../../components/profile/ProfileAdminEntry'
import ProfilePrivacySection from '../../components/profile/ProfilePrivacySection'
import ProfileConnectionsSection from '../../components/profile/ProfileConnectionsSection'
import ProfileBasicSection from '../../components/profile/ProfileBasicSection'
import ProfileParentSection from '../../components/profile/ProfileParentSection'
import ProfileEducatorSection from '../../components/profile/ProfileEducatorSection'
import ProfileCompanionSection from '../../components/profile/ProfileCompanionSection'
import ProfileBioSection from '../../components/profile/ProfileBioSection'
import ProfileNoticeBox from '../../components/profile/ProfileNoticeBox'
import ProfileSecondaryButton from '../../components/profile/ProfileSecondaryButton'
import AppPrimaryButton from '../../components/common/AppPrimaryButton'
import AppIcon from '../../components/common/AppIcon'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'
import { checkAdminAccess, requestAccountDeletion } from '../../services/profile'
import { recordLegalConsent } from '../../services/legalConsent'
import { useConnections } from '../../hooks/useConnections'
import { useSafety } from '../../hooks/useSafety'
import { useProfileForm } from '../../hooks/useProfileForm'

const PROFILE_REFRESH_TTL = 30 * 1000
const USER_AGREEMENT_URL = '/pkg/legal/user-agreement/index'
const PRIVACY_POLICY_URL = '/pkg/legal/privacy-policy/index'
const PROFILE_STEPS = [
  { key: 'basic', label: '基本资料' },
  { key: 'identity', label: '身份补充' },
  { key: 'privacy', label: '隐私联络' },
] as const

type ProfileStep = typeof PROFILE_STEPS[number]['key']

function StepTabs(props: { activeStep: ProfileStep; onChange: (step: ProfileStep) => void }) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '14px' }}>
      {PROFILE_STEPS.map((step, index) => {
        const active = props.activeStep === step.key
        return (
          <View
            key={step.key}
            onClick={() => props.onChange(step.key)}
            style={{
              flex: 1,
              padding: '9px 8px',
              borderRadius: '999px',
              backgroundColor: active ? palette.accentDeep : '#FFFFFF',
              border: `1px solid ${active ? palette.accentDeep : palette.line}`,
              textAlign: 'center',
              boxShadow: active ? '0 4px 12px rgba(184,85,64,0.16)' : 'none',
            }}
          >
            <Text style={{ ...typography.caption, fontWeight: active ? 'bold' : 'normal', color: active ? '#FFFFFF' : palette.subtext }}>
              {index + 1}. {step.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function PrivacyDisclosureNotice() {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'flex-start', backgroundColor: palette.card, borderRadius: '16px', border: `1px solid ${palette.line}`, padding: '12px', marginBottom: '12px' }}>
      <AppIcon name='lock' size={24} bordered />
      <Text style={{ ...typography.caption, color: palette.subtext, flex: 1 }}>
        你的显示名、身份、城市和简介会在地图上公开展示。联络标识、家庭教育关注信息和教育服务内容仅在你同意联络请求后对特定用户可见。请避免填写可直接识别未成年人的敏感细节。
      </Text>
    </View>
  )
}

function LegalAgreementConsent(props: { checked: boolean; onToggle: () => void; onOpenUserAgreement: () => void; onOpenPrivacyPolicy: () => void }) {
  return (
    <View onClick={props.onToggle} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', backgroundColor: props.checked ? '#FFF7F3' : palette.card, borderRadius: '16px', border: `1px solid ${props.checked ? palette.accentDeep : palette.line}`, padding: '12px', marginBottom: '12px' }}>
      <View style={{ width: '20px', height: '20px', borderRadius: '6px', marginRight: '10px', marginTop: '1px', backgroundColor: props.checked ? palette.accentDeep : '#FFFFFF', border: `1px solid ${props.checked ? palette.accentDeep : palette.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 'bold' }}>{props.checked ? '✓' : ''}</Text>
      </View>
      <View style={{ flex: 1, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
        <Text onClick={props.onOpenUserAgreement} style={{ ...typography.caption, color: palette.accentDeep }}>《用户协议》</Text>
        <Text style={{ ...typography.caption, color: palette.subtext }}>和</Text>
        <Text onClick={props.onOpenPrivacyPolicy} style={{ ...typography.caption, color: palette.accentDeep }}>《隐私政策》</Text>
      </View>
    </View>
  )
}

export default function ProfilePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeStep, setActiveStep] = useState<ProfileStep>('basic')
  const [legalAgreed, setLegalAgreed] = useState(false)
  const lastAutoRefreshAtRef = useRef(0)

  const form = useProfileForm()
  const {
    loading, saving, privacySaving, displayName, setDisplayName, gender, setGender, ageRange, setAgeRange, roles, setRoles, province, cityOption, customCity, setCustomCity, contactId, setContactId, allowIncomingRequests, isVisibleOnMap, childAgeRange, setChildAgeRange, childDropoutStatus, setChildDropoutStatus, childInterests, setChildInterests, eduServices, setEduServices, companionContext, setCompanionContext, bio, setBio, isParent, isEducator, isCompanion, currentCity, pickerRange, pickerValue, loadProfile, handleSave, handleUpdatePrivacySetting, handlePickerChange, handlePickerColumnChange,
  } = form

  const { pendingRequests, acceptedConnections, sentRequests, requestPages, loadingMoreSection, loadRequests, loadRequestSection, loadMoreRequests, refreshLoadedRequests, handleRespond, handleWithdrawRequest, handleRemoveConnection } = useConnections()
  const { blockedUsers, mutedUsers, loadSafetyOverview, handleSafetyAction, handleReportUser } = useSafety()

  const loadAdminAccess = async () => {
    try {
      const res = await checkAdminAccess()
      setIsAdmin(!!res?.ok && !!res?.isAdmin)
    } catch (err) {
      console.error('checkAdminAccess error:', err)
      setIsAdmin(false)
    }
  }

  const refreshProfilePage = (force = false) => {
    const now = Date.now()
    if (!force && now - lastAutoRefreshAtRef.current < PROFILE_REFRESH_TTL) return
    lastAutoRefreshAtRef.current = now
    loadProfile()
    loadRequests('pending')
    loadSafetyOverview()
    loadAdminAccess()
  }

  const refreshRelations = () => {
    refreshLoadedRequests()
    loadSafetyOverview()
  }

  useDidShow(() => {
    refreshProfilePage(false)
  })

  const openUserAgreement = () => Taro.navigateTo({ url: USER_AGREEMENT_URL })
  const openPrivacyPolicy = () => Taro.navigateTo({ url: PRIVACY_POLICY_URL })
  const openAdminReviewPage = () => Taro.navigateTo({ url: '/pages/admin/event-reviews/index' })

  const handleRequestAccountDeletion = async () => {
    const firstConfirm = await Taro.showModal({
      title: '申请账号注销',
      content: '提交后，你的公开资料会立即先从地图隐藏，联络标识会被清空，并暂停新的联络请求。管理员随后处理剩余历史记录；如需确认进度，可通过官方联系方式联系我们。',
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

  const handleConfirmedSave = async () => {
    if (!legalAgreed) { Taro.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' }); return }
    const consentResult = await recordLegalConsent()
    if (!consentResult.ok) { Taro.showToast({ title: consentResult.message || '协议确认失败，请稍后重试', icon: 'none' }); return }
    await handleSave()
  }

  if (loading) {
    return <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '40px 20px', textAlign: 'center' }}><Text style={{ ...typography.body, color: palette.subtext }}>加载中...</Text></View>
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px 16px 100px', boxSizing: 'border-box' }}>
      <ProfileHeaderCard />
      <ProfileAdminEntry isAdmin={isAdmin} onOpen={openAdminReviewPage} />
      <StepTabs activeStep={activeStep} onChange={setActiveStep} />

      {activeStep === 'basic' && <>
        <ProfileBasicSection displayName={displayName} setDisplayName={setDisplayName} gender={gender} setGender={setGender} ageRange={ageRange} setAgeRange={setAgeRange} roles={roles} setRoles={setRoles} province={province} cityOption={cityOption} currentCity={currentCity} customCity={customCity} setCustomCity={setCustomCity} contactId={contactId} setContactId={setContactId} pickerRange={pickerRange} pickerValue={pickerValue} handlePickerChange={handlePickerChange} handlePickerColumnChange={handlePickerColumnChange} genderOptions={GENDER_OPTIONS} ageRangeOptions={AGE_RANGE_OPTIONS} roleOptions={ROLE_OPTIONS} />
        <ProfileBioSection bio={bio} setBio={setBio} />
        <ProfileNoticeBox text='先完成显示名、身份和城市，就可以被地图正确识别。简介会公开展示，请避免填写孩子姓名、具体学校、住址等敏感细节。' />
        <ProfileSecondaryButton text='下一步：身份补充' onClick={goNextStep} />
      </>}

      {activeStep === 'identity' && <>
        {isParent && <ProfileParentSection childAgeRange={childAgeRange} setChildAgeRange={setChildAgeRange} childDropoutStatus={childDropoutStatus} setChildDropoutStatus={setChildDropoutStatus} childInterests={childInterests} setChildInterests={setChildInterests} childAgeOptions={CHILD_AGE_OPTIONS} childStatusOptions={CHILD_STATUS_OPTIONS} />}
        {isEducator && <ProfileEducatorSection eduServices={eduServices} setEduServices={setEduServices} />}
        {isCompanion && <ProfileCompanionSection companionContext={companionContext} setCompanionContext={setCompanionContext} />}
        {!isParent && !isEducator && !isCompanion && <ProfileNoticeBox text='你还没有选择身份。回到“基本资料”选择家长、教育者或同行者后，这里会出现对应的补充信息。' />}
        <ProfileNoticeBox text='身份补充信息默认不会在地图卡片直接展示；仅在你同意联络后，对特定联络人开放更完整信息。' />
        <ProfileSecondaryButton text='下一步：隐私与联络' onClick={goNextStep} />
      </>}

      {activeStep === 'privacy' && <>
        <ProfilePrivacySection privacySaving={privacySaving} allowIncomingRequests={allowIncomingRequests} isVisibleOnMap={isVisibleOnMap} blockedUsers={blockedUsers} mutedUsers={mutedUsers} onUpdatePrivacySetting={handleUpdatePrivacySetting} onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshRelations(); loadProfile() })} onRequestAccountDeletion={handleRequestAccountDeletion} />
        <PrivacyDisclosureNotice />
        <LegalAgreementConsent checked={legalAgreed} onToggle={() => setLegalAgreed((value) => !value)} onOpenUserAgreement={openUserAgreement} onOpenPrivacyPolicy={openPrivacyPolicy} />
        <AppPrimaryButton text='保存资料' loadingText='保存中...' loading={saving} onClick={handleConfirmedSave} />
      </>}

      <View style={{ marginBottom: '20px', alignItems: 'center' }}><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}><Text onClick={openUserAgreement} style={{ ...typography.caption, color: palette.accentDeep }}>用户协议</Text><Text style={{ ...typography.caption, color: palette.subtext, marginLeft: '8px', marginRight: '8px' }}>·</Text><Text onClick={openPrivacyPolicy} style={{ ...typography.caption, color: palette.accentDeep }}>隐私政策</Text></View></View>

      <ProfileConnectionsSection pendingRequests={pendingRequests} acceptedConnections={acceptedConnections} sentRequests={sentRequests} requestPages={requestPages} loadingMoreSection={loadingMoreSection} onLoadSection={loadRequestSection} onLoadMore={loadMoreRequests} onRespond={(requestId, action) => handleRespond(requestId, action, refreshRelations)} onWithdrawRequest={(connectionId) => handleWithdrawRequest(connectionId, refreshRelations)} onRemoveConnection={(connectionId) => handleRemoveConnection(connectionId, refreshRelations)} onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshRelations(); loadProfile() })} onReportUser={handleReportUser} />
    </View>
  )
}
