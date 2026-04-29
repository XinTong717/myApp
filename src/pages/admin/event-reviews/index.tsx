import { useMemo, useState } from 'react'
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { checkAdminAccess } from '../../../services/profile'
import { listEventSubmissions, getEventPublishPayload, reviewEventSubmission } from '../../../services/admin'
import { palette } from '../../../theme/palette'

const STATUS_OPTIONS = ['pending', 'merged', 'rejected'] as const

type StatusValue = typeof STATUS_OPTIONS[number]

type SubmissionItem = {
  _id: string
  status: string
  title: string
  province: string
  city: string
  eventType: string
  organizer: string
  startTime: string
  endTime: string
  isOnline: boolean
  fee: string
  officialUrl: string
  submitterDisplayName: string
  submitterCity: string
  createdAt: string | null
  publishedEventId: number | null
  adminNote: string
}

type PayloadResponse = {
  suggestedEventPayload?: Record<string, any>
  warnings?: string[]
}

function Pill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <View onClick={props.onClick} style={{
      padding: '6px 14px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
      backgroundColor: props.active ? palette.accentDeep : palette.tag,
      border: `1px solid ${props.active ? palette.accentDeep : palette.line}`,
    }}>
      <Text style={{ fontSize: '13px', color: props.active ? '#FFF' : palette.subtext }}>{props.label}</Text>
    </View>
  )
}

function formatDateText(value?: string | null) {
  if (!value) return '未填写'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

export default function AdminEventReviewsPage() {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminName, setAdminName] = useState('admin')
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusValue>('pending')
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [payloadResponse, setPayloadResponse] = useState<PayloadResponse>({})
  const [publishedEventId, setPublishedEventId] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item._id === selectedId) || null,
    [submissions, selectedId]
  )

  const payloadText = useMemo(
    () => JSON.stringify(payloadResponse.suggestedEventPayload || {}, null, 2),
    [payloadResponse]
  )

  const loadSubmissions = async (status = statusFilter) => {
    try {
      setError('')
      const result = await listEventSubmissions(status, 50)
      if (result?.ok) {
        const nextList = result.submissions || []
        setSubmissions(nextList)
        if (!nextList.find((item: SubmissionItem) => item._id === selectedId)) {
          const first = nextList[0]
          setSelectedId(first?._id || '')
          setPayloadResponse({})
          setPublishedEventId(first?.publishedEventId ? String(first.publishedEventId) : '')
          setAdminNote(first?.adminNote || '')
          if (first?._id) {
            await loadPublishPayload(first._id)
          }
        }
      } else {
        setError(result?.message || '读取审核列表失败')
      }
    } catch (err) {
      console.error('listEventSubmissions error:', err)
      setError('读取审核列表失败')
    }
  }

  const checkAdminAndInit = async () => {
    try {
      setChecking(true)
      setError('')
      const result = await checkAdminAccess()
      if (result?.ok && result?.isAdmin) {
        setIsAdmin(true)
        setAdminName(result.admin?.name || 'admin')
        await loadSubmissions(statusFilter)
      } else {
        setIsAdmin(false)
        setError(result?.message || '你当前不是管理员，无法访问此页面')
      }
    } catch (err) {
      console.error('checkAdminAccess error:', err)
      setIsAdmin(false)
      setError('管理员权限检查失败，请确认 admin_users 集合已创建')
    } finally {
      setChecking(false)
    }
  }

  const loadPublishPayload = async (submissionId: string) => {
    if (!submissionId) return
    try {
      setDetailLoading(true)
      setError('')
      const result = await getEventPublishPayload(submissionId)
      if (result?.ok) {
        setPayloadResponse({
          suggestedEventPayload: result.suggestedEventPayload || {},
          warnings: result.warnings || [],
        })
      } else {
        setError(result?.message || '生成发布 payload 失败')
      }
    } catch (err) {
      console.error('getEventPublishPayload error:', err)
      setError('生成发布 payload 失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const openItem = async (item: SubmissionItem) => {
    setSelectedId(item._id)
    setPublishedEventId(item.publishedEventId ? String(item.publishedEventId) : '')
    setAdminNote(item.adminNote || '')
    await loadPublishPayload(item._id)
  }

  const handleReview = async (action: 'mark_published' | 'reject' | 'reset_pending') => {
    if (!selectedSubmission || reviewLoading) return
    if (action === 'mark_published' && !publishedEventId.trim()) {
      Taro.showToast({ title: '请先填写 publishedEventId', icon: 'none' })
      return
    }

    try {
      setReviewLoading(true)
      const result = await reviewEventSubmission({
        submissionId: selectedSubmission._id,
        action,
        publishedEventId: publishedEventId.trim(),
        reviewedBy: adminName,
        adminNote: adminNote.trim(),
      })
      if (result?.ok) {
        Taro.showToast({ title: result.message || '已更新', icon: 'success' })
        await loadSubmissions(statusFilter)
      } else {
        Taro.showToast({ title: result?.message || '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('reviewEventSubmission error:', err)
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    } finally {
      setReviewLoading(false)
    }
  }

  const handleCopyPayload = () => {
    if (!payloadText || payloadText === '{}') {
      Taro.showToast({ title: '暂无 payload 可复制', icon: 'none' })
      return
    }
    Taro.setClipboardData({ data: payloadText })
  }

  useDidShow(() => {
    checkAdminAndInit()
  })

  if (checking) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '40px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: palette.subtext }}>检查管理员权限中...</Text>
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', border: `1px solid ${palette.line}` }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动审核台</Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
              {error || '你当前没有管理员权限。请先在 CloudBase 创建 admin_users 集合，并把你的 openid 加进去。'}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScrollView scrollY style={{ minHeight: '100vh', backgroundColor: palette.bg }}>
      <View style={{ padding: '16px', boxSizing: 'border-box' }}>
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动审核台</Text>
          <View style={{ marginTop: '6px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
              这里是管理员专用页面。你可以查看 event_submissions，生成建议版 events payload，并在手动发布到 MemFire 后回写审核状态。
            </Text>
          </View>
          <View style={{ marginTop: '10px', backgroundColor: palette.surface, borderRadius: '12px', padding: '10px 12px' }}>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>当前管理员：{adminName}</Text>
          </View>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '8px' }}>
          {STATUS_OPTIONS.map((option) => (
            <Pill
              key={option}
              label={option}
              active={statusFilter === option}
              onClick={async () => {
                setStatusFilter(option)
                setSelectedId('')
                setPayloadResponse({})
                await loadSubmissions(option)
              }}
            />
          ))}
        </View>

        <View onClick={() => loadSubmissions(statusFilter)} style={{ marginBottom: '14px', alignSelf: 'flex-start', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px' }}>
          <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>刷新列表</Text>
        </View>

        {error ? (
          <View style={{ padding: '12px', marginBottom: '14px', backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.brandSoft}` }}>
            <Text style={{ color: palette.error, fontSize: '13px' }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: '14px' }}>
          {submissions.map((item) => {
            const active = item._id === selectedId
            return (
              <View key={item._id} onClick={() => openItem(item)} style={{
                backgroundColor: palette.card,
                borderRadius: '16px',
                padding: '14px',
                marginBottom: '10px',
                border: `1px solid ${active ? palette.accentDeep : palette.line}`,
              }}>
                <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{item.title}</Text>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>
                    {item.province}{item.city ? ` · ${item.city}` : ''}{item.eventType ? ` · ${item.eventType}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>
                    主办方：{item.organizer || '未填写'}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>
                    提交人：{item.submitterDisplayName || '未知'}{item.submitterCity ? ` · ${item.submitterCity}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>
                    开始时间：{formatDateText(item.startTime)}
                  </Text>
                </View>
                <View style={{ marginTop: '8px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '6px' }}>
                    <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{item.status}</Text>
                  </View>
                  <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '6px' }}>
                    <Text style={{ fontSize: '12px', color: palette.green }}>{item.isOnline ? '线上' : '线下'}</Text>
                  </View>
                  {item.publishedEventId ? (
                    <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: palette.accent2Soft, marginBottom: '6px' }}>
                      <Text style={{ fontSize: '12px', color: palette.accent2 }}>event #{item.publishedEventId}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })}

          {submissions.length === 0 ? (
            <View style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '18px 16px', border: `1px solid ${palette.line}` }}>
              <Text style={{ fontSize: '13px', color: palette.subtext }}>当前筛选下没有活动提交记录。</Text>
            </View>
          ) : null}
        </View>

        {selectedSubmission ? (
          <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '20px', border: `1px solid ${palette.line}` }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text, marginBottom: '10px' }}>审核详情</Text>

            <View style={{ marginBottom: '10px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>submissionId</Text>
              <Text style={{ fontSize: '13px', color: palette.text, lineHeight: '20px' }}>{selectedSubmission._id}</Text>
            </View>

            <View style={{ marginBottom: '10px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>发布时间建议 payload</Text>
              <View style={{ marginTop: '8px', backgroundColor: palette.surface, borderRadius: '14px', padding: '12px', border: `1px solid ${palette.line}` }}>
                <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px', whiteSpace: 'pre-wrap' }}>
                  {detailLoading ? '生成中...' : payloadText}
                </Text>
              </View>
              <View onClick={handleCopyPayload} style={{ marginTop: '8px', alignSelf: 'flex-start', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px' }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>复制 payload JSON</Text>
              </View>
            </View>

            {(payloadResponse.warnings || []).length > 0 ? (
              <View style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>Warnings</Text>
                <View style={{ marginTop: '8px', backgroundColor: palette.warningSoft, borderRadius: '14px', padding: '12px', border: `1px solid ${palette.line}` }}>
                  {(payloadResponse.warnings || []).map((warning, idx) => (
                    <View key={`${idx}-${warning}`} style={{ marginBottom: idx === (payloadResponse.warnings || []).length - 1 ? '0' : '6px' }}>
                      <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>• {warning}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginBottom: '12px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>publishedEventId（发布到 MemFire 后填写）</Text>
              <View style={{ marginTop: '8px', backgroundColor: palette.surface, borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
                <Input value={publishedEventId} placeholder='例如：123' onInput={(e) => setPublishedEventId(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
              </View>
            </View>

            <View style={{ marginBottom: '12px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>adminNote</Text>
              <View style={{ marginTop: '8px', backgroundColor: palette.surface, borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
                <Textarea value={adminNote} placeholder='补充审核备注，比如已发布、重复、拒绝原因等' maxlength={300} onInput={(e) => setAdminNote(e.detail.value)} style={{ width: '100%', minHeight: '80px', fontSize: '14px', color: palette.text }} />
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <View onClick={() => handleReview('mark_published')} style={{ backgroundColor: reviewLoading ? palette.muted : palette.green, borderRadius: '14px', padding: '10px 14px', marginRight: '8px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>{reviewLoading ? '处理中...' : '发布完成'}</Text>
              </View>
              <View onClick={() => handleReview('reject')} style={{ backgroundColor: reviewLoading ? palette.muted : palette.brandSoft, borderRadius: '14px', padding: '10px 14px', marginRight: '8px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '13px', color: palette.brandDark, fontWeight: 'bold' }}>拒绝</Text>
              </View>
              <View onClick={() => handleReview('reset_pending')} style={{ backgroundColor: palette.tag, borderRadius: '14px', padding: '10px 14px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '13px', color: palette.subtext, fontWeight: 'bold' }}>重置待审核</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}
