import { useState } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  GENDER_OPTIONS,
  AGE_RANGE_OPTIONS,
  ROLE_OPTIONS,
  CHILD_AGE_OPTIONS,
  CHILD_STATUS_OPTIONS,
} from '../../constants/profile'
import SectionTitle from '../../components/profile/SectionTitle'
import PillSelect from '../../components/profile/PillSelect'
import ProfileHeaderCard from '../../components/profile/ProfileHeaderCard'
import ProfileAdminEntry from '../../components/profile/ProfileAdminEntry'
import ProfilePrivacySection from '../../components/profile/ProfilePrivacySection'
import ProfileConnectionsSection from '../../components/profile/ProfileConnectionsSection'
import { profilePalette as palette } from '../../components/profile/palette'
import { checkAdminAccess } from '../../services/profile'
import { useConnections } from '../../hooks/useConnections'
import { useSafety } from '../../hooks/useSafety'
import { useProfileForm } from '../../hooks/useProfileForm'

export default function ProfilePage() {
  const [isAdmin, setIsAdmin] = useState(false)

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

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px 16px 100px', boxSizing: 'border-box' }}>
      <ProfileHeaderCard />

      <ProfileAdminEntry isAdmin={isAdmin} onOpen={openAdminReviewPage} />

      <ProfilePrivacySection
        privacySaving={privacySaving}
        allowIncomingRequests={allowIncomingRequests}
        isVisibleOnMap={isVisibleOnMap}
        blockedUsers={blockedUsers}
        mutedUsers={mutedUsers}
        onUpdatePrivacySetting={handleUpdatePrivacySetting}
        onSafetyAction={(targetUserId, action) => handleSafetyAction(targetUserId, action, () => { refreshRelations(); loadProfile() })}
      />

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
        <PillSelect options={ROLE_OPTIONS} selected={roles} multi onChange={(v) => setRoles(v as string[])} />

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
          <SectionTitle text='孩子学段（可多选）' />
          <PillSelect options={CHILD_AGE_OPTIONS} selected={childAgeRange} multi onChange={(v) => setChildAgeRange(v as string[])} />
          <SectionTitle text='当前关注方向（可多选）' />
          <PillSelect options={CHILD_STATUS_OPTIONS} selected={childDropoutStatus} multi onChange={(v) => setChildDropoutStatus(v as string[])} />
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
