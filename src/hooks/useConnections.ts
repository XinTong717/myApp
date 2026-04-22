import { useState } from 'react'
import Taro from '@tarojs/taro'
import { getMyRequests, manageConnection, respondRequest } from '../services/connection'
import type { AcceptedConnection, PendingRequest, SentRequest } from '../types/domain'
import { logCloudFailure, resolveCloudMessage } from '../utils/cloudFeedback'

const CONNECTION_CODE_MESSAGES = {
  BAD_REQUEST: '参数有误，请稍后重试',
  CONNECTION_NOT_FOUND: '这条联络记录不存在或已失效',
  FORBIDDEN: '你没有权限执行这个操作',
  INVALID_ACTION: '操作类型不合法',
  INVALID_STATUS: '当前状态下无法执行这个操作',
  REQUEST_ALREADY_PROCESSED: '该请求已处理过了',
  GET_MY_REQUESTS_FAILED: '读取联络动态失败',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
}

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
      } else {
        logCloudFailure('getMyRequests', r)
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
      const message = resolveCloudMessage(r, CONNECTION_CODE_MESSAGES, '已处理')
      Taro.showToast({ title: message, icon: r?.ok ? 'success' : 'none' })
      if (r?.ok) {
        onUpdated?.()
      } else {
        logCloudFailure('respondRequest', r)
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleWithdrawRequest = async (connectionId: string, onUpdated?: () => void) => {
    try {
      const result = await manageConnection(connectionId, 'withdraw')
      const message = resolveCloudMessage(result, CONNECTION_CODE_MESSAGES, '已撤回')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) {
        onUpdated?.()
      } else {
        logCloudFailure('withdrawConnection', result)
      }
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
      const message = resolveCloudMessage(result, CONNECTION_CODE_MESSAGES, '已删除')
      Taro.showToast({ title: message, icon: result?.ok ? 'success' : 'none' })
      if (result?.ok) {
        onUpdated?.()
      } else {
        logCloudFailure('removeConnection', result)
      }
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
