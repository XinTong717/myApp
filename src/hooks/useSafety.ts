import { useState } from 'react'
import Taro from '@tarojs/taro'
import { REPORT_REASON_OPTIONS } from '../constants/safety'
import { getSafetyOverview } from '../services/profile'
import { manageSafetyRelation, reportUser } from '../services/safety'
import type { SafetyItem } from '../types/domain'

export function useSafety() {
  const [blockedUsers, setBlockedUsers] = useState<SafetyItem[]>([])
  const [mutedUsers, setMutedUsers] = useState<SafetyItem[]>([])

  const loadSafetyOverview = async () => {
    try {
      const r = await getSafetyOverview()
      if (r?.ok) {
        setBlockedUsers(r.blocked || [])
        setMutedUsers(r.muted || [])
      }
    } catch (err) {
      console.error('getSafetyOverview error:', err)
    }
  }

  const handleSafetyAction = async (
    targetUserId: string,
    action: 'block' | 'unblock' | 'mute' | 'unmute',
    onUpdated?: () => void,
  ) => {
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
      const result = await manageSafetyRelation(targetUserId, action)
      Taro.showToast({ title: result?.message || '已更新', icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) onUpdated?.()
    } catch (err) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleReportUser = async (targetUserId: string) => {
    try {
      const reasonRes = await Taro.showActionSheet({ itemList: [...REPORT_REASON_OPTIONS] })
      const reason = REPORT_REASON_OPTIONS[reasonRes.tapIndex] || '其他'
      const result = await reportUser(targetUserId, reason)
      Taro.showToast({ title: result?.message || '举报已提交', icon: result?.ok ? 'success' : 'none' })
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '举报失败', icon: 'none' })
    }
  }

  return {
    blockedUsers,
    mutedUsers,
    loadSafetyOverview,
    handleSafetyAction,
    handleReportUser,
  }
}
