import Taro from '@tarojs/taro'
import { getMe } from '../services/profile'
import { hasCurrentLocalLegalConsent, syncLegalConsentStatus } from '../services/legalConsent'
import type { UserProfile } from '../types/domain'

export type ProfileAccessGateKind = 'resourceDetail' | 'memberDetail'

export function hasProfileBasics(profile?: UserProfile | null) {
  return !!(
    profile &&
    String(profile.displayName || '').trim() &&
    Array.isArray(profile.roles) &&
    profile.roles.length > 0 &&
    String(profile.province || '').trim() &&
    String(profile.city || '').trim()
  )
}

export async function hasCompletedProfileAccess(options: { forceRefreshProfile?: boolean; syncLegal?: boolean } = {}) {
  let profile: UserProfile | null = null
  let legalOk = hasCurrentLocalLegalConsent()

  try {
    const res = await getMe({ forceRefresh: !!options.forceRefreshProfile, allowStale: !options.forceRefreshProfile })
    profile = res.profile || null
  } catch (err) {
    console.warn('[profile-access] getMe skipped:', err)
  }

  if (!legalOk && options.syncLegal !== false) {
    try {
      const res = await syncLegalConsentStatus()
      legalOk = !!res.ok && !!res.consent && hasCurrentLocalLegalConsent()
    } catch (err) {
      console.warn('[profile-access] sync legal consent skipped:', err)
    }
  }

  const profileOk = hasProfileBasics(profile)
  return {
    ok: profileOk && legalOk,
    profileOk,
    legalOk,
    profile,
  }
}

export async function showProfileAccessGate(kind: ProfileAccessGateKind) {
  const isMemberGate = kind === 'memberDetail'
  const modal = await Taro.showModal({
    title: '请先完善个人资料',
    content: isMemberGate
      ? '完成个人资料后可查看其他成员完整资料。'
      : '完成个人资料后可查看学习社区和活动详情。\n你可在隐私设置中选择不对外显示个人信息。',
    confirmText: '去填写',
    cancelText: '先逛逛',
  })

  if (modal.confirm) {
    Taro.switchTab({ url: '/pages/profile/index' })
  }

  return !!modal.confirm
}

export async function ensureCompletedProfileAccess(kind: ProfileAccessGateKind) {
  const access = await hasCompletedProfileAccess()
  if (access.ok) return true
  await showProfileAccessGate(kind)
  return false
}
