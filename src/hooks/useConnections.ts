import { useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { getMyRequests, manageConnection, respondRequest, type RequestSection } from '../services/connection'
import type { AcceptedConnection, GetMyRequestsResult, PendingRequest, RequestPages, SentRequest } from '../types/domain'
import { CONNECTION_CODE_MESSAGES } from '../constants/cloudMessages'
import { logCloudFailure, resolveCloudMessage } from '../utils/cloudFeedback'

const SECTION_KEYS: Exclude<RequestSection, 'all'>[] = ['pending', 'accepted', 'sent']
const PAGE_LIMIT = 50

function mergeById<T extends { _id: string }>(oldItems: T[], newItems: T[]) {
  const seen = new Set<string>()
  return [...oldItems, ...newItems].filter((item) => {
    if (!item?._id || seen.has(item._id)) return false
    seen.add(item._id)
    return true
  })
}

export function useConnections() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<AcceptedConnection[]>([])
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([])
  const [requestPages, setRequestPages] = useState<RequestPages>({})
  const [loadingMoreSection, setLoadingMoreSection] = useState<RequestSection | ''>('')
  const loadedSectionsRef = useRef<Record<string, boolean>>({})

  const applyRequestResult = (section: RequestSection, r: GetMyRequestsResult, mode: 'replace' | 'append' = 'replace') => {
    const append = mode === 'append'

    if (section === 'pending' || section === 'all') {
      setPendingRequests((prev) => append ? mergeById(prev, r.pending || []) : (r.pending || []))
    }
    if (section === 'accepted' || section === 'all') {
      setAcceptedConnections((prev) => append ? mergeById(prev, r.accepted || []) : (r.accepted || []))
    }
    if (section === 'sent' || section === 'all') {
      setSentRequests((prev) => append ? mergeById(prev, r.sent || []) : (r.sent || []))
    }

    if (r.pages) {
      setRequestPages((prev) => ({ ...prev, ...r.pages }))
    }
  }

  const markLoaded = (section: RequestSection) => {
    if (section === 'all') {
      SECTION_KEYS.forEach((key) => { loadedSectionsRef.current[key] = true })
      return
    }
    loadedSectionsRef.current[section] = true
  }

  const hydrateRequests = (section: RequestSection, r: GetMyRequestsResult) => {
    applyRequestResult(section, r, 'replace')
    markLoaded(section)
  }

  const loadRequests = async (section: RequestSection = 'pending', options: { force?: boolean; offset?: number; append?: boolean } = {}) => {
    if (!options.force && !options.append && section !== 'all' && loadedSectionsRef.current[section]) return

    try {
      const r = await getMyRequests(section, { offset: options.offset || 0, limit: PAGE_LIMIT })
      if (r?.ok) {
        applyRequestResult(section, r, options.append ? 'append' : 'replace')
        markLoaded(section)
      } else {
        logCloudFailure('getMyRequests', r)
      }
    } catch (err) {
      console.error('loadRequests error:', err)
    }
  }

  const loadRequestSection = (section: RequestSection) => loadRequests(section)

  const loadMoreRequests = async (section: Exclude<RequestSection, 'all'>) => {
    const page = requestPages[section]
    if (!page?.hasMore || page.nextOffset === null || loadingMoreSection) return

    setLoadingMoreSection(section)
    try {
      await loadRequests(section, { offset: page.nextOffset || 0, append: true, force: true })
    } finally {
      setLoadingMoreSection('')
    }
  }

  const refreshLoadedRequests = async () => {
    const loaded = SECTION_KEYS.filter((key) => loadedSectionsRef.current[key])
    if (loaded.length === 0) {
      await loadRequests('pending', { force: true })
      return
    }

    await Promise.all(loaded.map((section) => loadRequests(section, { force: true })))
  }

  const refreshAllRequests = async () => {
    await loadRequests('all', { force: true })
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
    requestPages,
    loadingMoreSection,
    hydrateRequests,
    loadRequests,
    loadRequestSection,
    loadMoreRequests,
    refreshLoadedRequests,
    refreshAllRequests,
    handleRespond,
    handleWithdrawRequest,
    handleRemoveConnection,
  }
}
