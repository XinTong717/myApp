import { useMemo, useState } from 'react'
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { checkAdminAccess } from '../../../services/profile'
import { listEventSubmissions, getEventPublishPayload, reviewEventSubmission } from '../../../services/admin'
import { clearEventListCache } from '../../../services/event'
import { callCloud } from '../../../services/cloud'
import AdminActionButton from '../../../components/admin/AdminActionButton'
import AppChip from '../../../components/common/AppChip'
import FormInputBox from '../../../components/common/FormInputBox'
import { palette } from '../../../theme/palette'
import { typography } from '../../../theme/typography'

const STATUS_OPTIONS = ['pending', 'merged', 'rejected'] as const

type StatusValue = typeof STATUS_OPTIONS[number]
type FocusField = 'publishedEventId' | 'adminNote' | ''

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
  return <AppChip text={props.label} tone='brand' size='md' selected={props.active} interactive onClick={props.onClick} />
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
  const [focusedField, setFocusedField] = useState<FocusField>('')

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

  const handlePublishDirect = async () => {
    if (!selectedSubmission || reviewLoading) return

    const confirm = await Taro.showModal({
      title: '一键发布到活动库',
      content: '将直接写入 CloudBase events 集合，并把该提交标记为已发布。确认继续吗？',
      confirmText: '确认发布',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      setReviewLoading(true)
      const result = await callCloud<any>('publishEventDirect', {
        submissionId: selectedSubmission._id,
        adminNote: adminNote.trim(),
      })
      if (result?.ok) {
        const eventId = result.publishedEventId ? String(result.publishedEventId) : ''
        setPublishedEventId(eventId)
        await clearEventListCache()
        Taro.showToast({ title: result.message || '已发布', icon: 'success' })
        await loadSubmissions(statusFilter)
      } else if (result?.code === 'PUBLISH_BLOCKED') {
        Taro.showModal({
          title: '暂不能发布',
          content: result.message || '该提交缺少必要信息，请修正后再发布。',
          showCancel: false,
        })
      } else {
        Taro.showToast({ title: result?.message || '发布失败', icon: 'none' })
      }
    } catch (err) {
      console.error('publishEventDirect error:', err)
      Taro.showToast({ title: '发布失败，请稍后重试', icon: 'none' })
    } finally {
      setReviewLoading(false)
    }
  }

  const handleReview = async (reviewAction: 'mark_published' | 'reject' | 'reset_pending') => {
    if (!selectedSubmission || reviewLoading) return
    if (reviewAction === 'mark_published' && !publishedEventId.trim()) {
      Taro.showToast({ title: '请先填写 publishedEventId', icon: 'none' })
      return
    }

    try {
      setReviewLoading(true)
      const result = await reviewEventSubmission({
        submissionId: selectedSubmission._id,
        reviewAction,
        publishedEventId: publishedEventId.trim(),
        adminNote: adminNote.trim(),
      })
      if (result?.ok) {
        Taro.showToast({ title: result.message || '已更新', icon: 'success' })
        if (reviewAction === 'mark_published' || reviewAction === 'reset_pending') {
          await clearEventListCache()
        }
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
        <Text style={{ ...typography.body, color: palette.subtext }}>检查管理员权限中...</Text>
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
        <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', border: `1px solid ${palette.line}` }}>
          <Text style={{ ...typography.title, color: palette.text }}>活动审核台</Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ ...typography.meta, color: palette.subtext }}>
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
          <Text style={{ ...typography.title, color: palette.text }}>活动审核台</Text>
          <View style={{ marginTop: '6px' }}>
            <Text style={{ ...typography.meta, color: palette.subtext }}>
              这里是管理员专用页面。你可以查看 event_submissions，生成建议版 events payload，并一键发布到 CloudBase events 集合；也保留手动回填作为备用路径。
            </Text>
          </View>
          <View style={{ marginTop: '10px', backgroundColor: palette.cardSoft, borderRadius: '12px', padding: '10px 12px' }}>
            <Text style={{ ...typography.caption, color: palette.subtext }}>当前管理员：{adminName}</Text>
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

        <AdminActionButton text='刷新列表' variant='secondary' onClick={() => loadSubmissions(statusFilter)} marginBottom='14px' />

        {error ? (
          <View style={{ padding: '12px', marginBottom: '14px', backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.brandSoft}` }}>
            <Text style={{ ...typography.meta, color: palette.error }}>{error}</Text>
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
                border: `1px solid ${active ? palette.brand : palette.line}`,
              }}>
                <Text style={{ ...typography.cardTitle, color: palette.text }}>{item.title}</Text>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    {item.province}{item.city ? ` · ${item.city}` : ''}{item.eventType ? ` · ${item.eventType}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    主办方：{item.organizer || '未填写'}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    提交人：{item.submitterDisplayName || '未知'}{item.submitterCity ? ` · ${item.submitterCity}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    开始时间：{formatDateText(item.startTime)}
                  </Text>
                </View>
                <View style={{ marginTop: '8px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                  <AppChip text={item.status} tone='brand' />
                  <AppChip text={item.isOnline ? '线上' : '线下'} tone='green' />
                  {item.publishedEventId ? <AppChip text={`event #${item.publishedEventId}`} tone='accent' /> : null}
                </View>
              </View>
            )
          })}

          {submissions.length === 0 ? (
            <View style={{ backgroundColor: palette.card, borderRadius: '16px', padding: '18px 16px', border: `1px solid ${palette.line}` }}>
              <Text style={{ ...typography.meta, color: palette.subtext }}>当前筛选下没有活动提交记录。</Text>
            </View>
          ) : null}
        </View>

        {selectedSubmission ? (
          <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '20px', border: `1px solid ${palette.line}` }}>
            <Text style={{ ...typography.sectionTitle, color: palette.text, marginBottom: '10px' }}>审核详情</Text>

            <View style={{ marginBottom: '10px' }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>submissionId</Text>
              <Text style={{ ...typography.meta, color: palette.text }}>{selectedSubmission._id}</Text>
            </View>

            <View style={{ marginBottom: '10px' }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>发布时间建议 payload</Text>
              <View style={{ marginTop: '8px', backgroundColor: palette.cardSoft, borderRadius: '14px', padding: '12px', border: `1px solid ${palette.line}` }}>
                <Text style={{ ...typography.caption, color: palette.subtext, whiteSpace: 'pre-wrap' }}>
                  {detailLoading ? '生成中...' : payloadText}
                </Text>
              </View>
              <View style={{ marginTop: '8px' }}>
                <AdminActionButton text='复制 payload JSON' variant='secondary' onClick={handleCopyPayload} />
              </View>
            </View>

            {(payloadResponse.warnings || []).length > 0 ? (
              <View style={{ marginBottom: '12px' }}>
                <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>Warnings</Text>
                <View style={{ marginTop: '8px', backgroundColor: palette.warningSoft, borderRadius: '14px', padding: '12px', border: `1px solid ${palette.line}` }}>
                  {(payloadResponse.warnings || []).map((warning, idx) => (
                    <View key={`${idx}-${warning}`} style={{ marginBottom: idx === (payloadResponse.warnings || []).length - 1 ? '0' : '6px' }}>
                      <Text style={{ ...typography.caption, color: palette.subtext }}>• {warning}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginBottom: '12px' }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>publishedEventId（手动备用路径）</Text>
              <View style={{ marginTop: '8px' }}>
                <FormInputBox focused={focusedField === 'publishedEventId'} marginBottom='0'>
                  <Input
                    value={publishedEventId}
                    placeholder='一键发布后会自动回填；也可手动填写，例如：123'
                    onFocus={() => setFocusedField('publishedEventId')}
                    onBlur={() => setFocusedField('')}
                    onInput={(e) => setPublishedEventId(e.detail.value)}
                    style={{ ...typography.body, color: palette.text }}
                  />
                </FormInputBox>
              </View>
            </View>

            <View style={{ marginBottom: '12px' }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>adminNote</Text>
              <View style={{ marginTop: '8px' }}>
                <FormInputBox focused={focusedField === 'adminNote'} marginBottom='0'>
                  <Textarea
                    value={adminNote}
                    placeholder='补充审核备注，比如已发布、重复、拒绝原因等'
                    maxlength={300}
                    onFocus={() => setFocusedField('adminNote')}
                    onBlur={() => setFocusedField('')}
                    onInput={(e) => setAdminNote(e.detail.value)}
                    style={{ width: '100%', minHeight: '80px', ...typography.body, color: palette.text }}
                  />
                </FormInputBox>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <AdminActionButton text='一键发布到活动库' loading={reviewLoading} variant='success' onClick={handlePublishDirect} />
              <AdminActionButton text='仅回写已发布' disabled={reviewLoading} variant='secondary' onClick={() => handleReview('mark_published')} />
              <AdminActionButton text='拒绝' disabled={reviewLoading} variant='danger' onClick={() => handleReview('reject')} />
              <AdminActionButton text='重置待审核' disabled={reviewLoading} variant='neutral' onClick={() => handleReview('reset_pending')} marginRight='0' />
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}
