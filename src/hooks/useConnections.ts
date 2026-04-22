import { useState } from 'react'
import Taro from '@tarojs/taro'
import { getMyRequests, manageConnection, respondRequest } from '../services/connection'
import type { AcceptedConnection, PendingRequest, SentRequest } from '../types/domain'

export function useConnections() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<AcceptedConnection[]>([])
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([])

  const loadRequests = async () => {
    try {
      const r = await getMyRequests()
      if (r?.ok) {
        setPendingRequests(r.pending || [])
        setAcceptedConnections(r.accepted || [])
        setSentRequests(r.sent || [])
      }
    } catch (err) {
      console.error('loadRequests error:', err)
    }
  }

  const handleRespond = async (requestId: string, action: 'accept' | 'reject', onUpdated?: () => void) => {
    try {
      Taro.showLoading({ title: action === 'accept' ? '同意中...' : '处理中...' })
      const r = await respondRequest(requestId, action)
      Taro.hideLoading()
      Taro.showToast({ title: r?.message || '已处理', icon: r?.ok ? 'success' : 'none' })
      if (r?.ok) onUpdated?.()
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleWithdrawRequest = async (connectionId: string, onUpdated?: () => void) => {
    try {
      const result = await manageConnection(connectionId, 'withdraw')
      Taro.showToast({ title: result?.message || '已撤回', icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) onUpdated?.()
    } catch (err) {
      Taro.showToast({ title: '撤回失败', icon: 'none' })
    }
  }

  const handleRemoveConnection = async (connectionId: string, onUpdated?: () => void) => {
    const confirm = await Taro.showModal({
      title: '删除连接',
      content: '删除后你们将不再是已建立联络状态，需要重新发起请求。',
      confirmText: '确认删除',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      const result = await manageConnection(connectionId, 'remove_connection')
      Taro.showToast({ title: result?.message || '已删除', icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) onUpdated?.()
    } catch (err) {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  return {
    pendingRequests,
    acceptedConnections,
    sentRequests,
    loadRequests,
    handleRespond,
    handleWithdrawRequest,
    handleRemoveConnection,
  }
}
