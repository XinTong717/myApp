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
import ProfilePrimaryButton from '../../components/profile/ProfilePrimaryButton'
import { profilePalette as palette } from '../../components/profile/palette'
import { checkAdminAccess } from '../../services/profile'
import { useConnections } from '../../hooks/useConnections'
import { useSafety } from '../../hooks/useSafety'
import { useProfileForm } from '../../hooks/useProfileForm'

const PROFILE_REFRESH_TTL = 30 * 1000
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
            <Text style={{ fontSize: '12px', fontWeight: active ? 'bold' : 'normal', color: active ? '#FFFFFF' : palette.subtext }}>
              {index + 1}. {step.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function ProfilePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeStep, setActiveStep] = useState<ProfileStep>('basic')
  const lastAutoRefreshAtRef = useRef(0)

  const {
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
  } = useProfileForm()

  const {
    pendingRequests,
    acceptedConnections,
    sentRequests,
    loadRequests,
    handleRespond,
    handleWithdrawRequest,
    handleRemoveConnection,
  } = useConnections()

  const {
    blockedUsers,
    mutedUsers,
    loadSafetyOverview,
    handleSafetyAction,
    handleReportUser,
  } = useSafety()

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
    loadRequests()
    loadSafetyOverview()
    loadAdminAccess()
  }

  const refreshRelations = () => {
    loadRequests()
    loadSafetyOverview()
  }

  useDidShow(() => {
    refreshProfilePage(false)
  })

  const openUserAgreement = () => {
    Taro.navigateTo({ url: '/pages/user-agreement/index' })
  }

  const openPrivacyPolicy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' })
  }

  const openAdminReviewPage = () => {
    Taro.navigateTo({ url: '/pages/admin/event-reviews/index' })
  }

  const goNextStep = () => {
    const currentIndex = PROFILE_STEPS.findIndex((item) => item.key === activeStep)
    const next = PROFILE_STEPS[Math.min(currentIndex + 1, PROFILE_STEPS.length - 1)]
    setActiveStep(next.key)
  }

  if (loading) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '40px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: palette.subtext }}>加载中...</Text>
      </View>
    )
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px 16px 100px', boxSizing: 'border-box' }}>
      <ProfileHeaderCard />

      <ProfileAdminEntry isAdmin={isAdmin} onOpen={openAdminReviewPage} />

      <StepTabs activeStep={activeStep} onChange={setActiveStep} />

      {activeStep === 'basic' && (
        <>
          <ProfileBasicSection
            displayName={displayName}
            setDisplayName={setDisplayName}
            gender={gender}
            setGender={setGender}
            ageRange={ageRange}
            setAgeRange={setAgeRange}
            roles={roles}
            setRoles={setRoles}
            province={province}
            cityOption={cityOption}
            currentCity={currentCity}
            customCity={customCity}
            setCustomCity={setCustomCity}
            wechatId={wechatId}
            setWechatId={setWechatId}
            pickerRange={pickerRange}
            pickerValue={pickerValue}
            handlePickerChange={handlePickerChange}
            handlePickerColumnChange={handlePickerColumnChange}
            genderOptions={GENDER_OPTIONS}
            ageRangeOptions={AGE_RANGE_OPTIONS}
            roleOptions={ROLE_OPTIONS}
          />

          <ProfileBioSection bio={bio} setBio={setBio} />

          <ProfileNoticeBox text='先完成显示名、身份和城市，就可以被地图正确识别。简介会公开展示，请避免填写孩子姓名、具体学校、住址等敏感细节。' />

          <View onClick={goNextStep} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '999px', backgroundColor: '#FFFFFF', border: `1px solid ${palette.line}`, textAlign: 'center' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '14px', fontWeight: 'bold' }}>下一步：身份补充</Text>
          </View>
        </>
      )}

      {activeStep === 'identity' && (
        <>
          {isParent && (
            <ProfileParentSection
              childAgeRange={childAgeRange}
              setChildAgeRange={setChildAgeRange}
              childDropoutStatus={childDropoutStatus}
              setChildDropoutStatus={setChildDropoutStatus}
              childInterests={childInterests}
              setChildInterests={setChildInterests}
              childAgeOptions={CHILD_AGE_OPTIONS}
              childStatusOptions={CHILD_STATUS_OPTIONS}
            />
          )}

          {isEducator && (
            <ProfileEducatorSection eduServices={eduServices} setEduServices={setEduServices} />
          )}

          {isCompanion && (
            <ProfileCompanionSection companionContext={companionContext} setCompanionContext={setCompanionContext} />
          )}

          {!isParent && !isEducator && !isCompanion && (
            <ProfileNoticeBox text='你还没有选择身份。回到“基本资料”选择家长、教育者或同行者后，这里会出现对应的补充信息。' />
          )}

          <ProfileNoticeBox text='身份补充信息默认不会在地图卡片直接展示；仅在你同意联络后，对特定联络人开放更完整信息。' />

          <View onClick={goNextStep} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '999px', backgroundColor: '#FFFFFF', border: `1px solid ${palette.line}`, textAlign: 'center' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '14px', fontWeight: 'bold' }}>下一步：隐私与联络</Text>
          </View>
        </>
      )}

      {activeStep === 'privacy' && (
        <>
          <ProfilePrivacySection
            privacySaving={privacySaving}
            allowIncomingRequests={allowIncomingRequests}
            isVisibleOnMap={isVisibleOnMap}
            blockedUsers={blockedUsers}
            mutedUsers={mutedUsers}
            onUpdatePrivacySetting={handleUpdatePrivacySetting}
            onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshRelations(); loadProfile() })}
          />

          <ProfileNoticeBox text='🔒 你的显示名、身份、城市和简介会在地图上公开展示。联络标识、家庭教育关注信息和教育服务内容仅在你同意联络请求后对特定用户可见。请避免填写可直接识别未成年人的敏感细节。' />
        </>
      )}

      <View style={{ marginBottom: '20px', alignItems: 'center' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Text onClick={openUserAgreement} style={{ fontSize: '12px', color: palette.accentDeep }}>用户协议</Text>
          <Text style={{ fontSize: '12px', color: palette.subtext, marginLeft: '8px', marginRight: '8px' }}>·</Text>
          <Text onClick={openPrivacyPolicy} style={{ fontSize: '12px', color: palette.accentDeep }}>隐私政策</Text>
        </View>
      </View>

      <ProfilePrimaryButton text='保存资料' loadingText='保存中...' loading={saving} onClick={handleSave} />

      <ProfileConnectionsSection
        pendingRequests={pendingRequests}
        acceptedConnections={acceptedConnections}
        sentRequests={sentRequests}
        onRespond={(requestId, action) => handleRespond(requestId, action, refreshRelations)}
        onWithdrawRequest={(connectionId) => handleWithdrawRequest(connectionId, refreshRelations)}
        onRemoveConnection={(connectionId) => handleRemoveConnection(connectionId, refreshRelations)}
        onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshRelations(); loadProfile() })}
        onReportUser={handleReportUser}
      />
    </View>
  )
}
