import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { getCurrentInstance, useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { registerCurrentPageShare } from '../../utils/share'
import { ensureCompletedProfileAccess, hasCompletedProfileAccess } from '../../utils/profileAccess'
import { EVENT_CODE_MESSAGES } from '../../constants/cloudMessages'
import { clearEventListCache, clearFavoriteEventsCache, getEventContactInfo, getEventDetail, getEventInterestInfo, submitEventCorrection, toggleEventInterest } from '../../services/event'
import { getDetailPreview } from '../../services/detailPreview'
import { logCloudFailure, resolveCloudMessage } from '../../utils/cloudFeedback'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppPage from '../../components/common/AppPage'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import AppInfoRow from '../../components/common/AppInfoRow'
import AppPrimaryButton from '../../components/common/AppPrimaryButton'
import AppPromptBanner from '../../components/common/AppPromptBanner'
import CorrectionCard from '../../components/common/CorrectionCard'
import { DetailSkeleton } from '../../components/common/Skeleton'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
import type { EventItem } from '../events/shared'
import { EVENT_TYPE_LABELS, formatEventAgeRange, formatEventDate, getEventIconBg, getEventStatusInfo } from '../events/shared'

const EVENT_DETAIL_REFRESH_TTL_MS = 45 * 1000

type PublicSignupInfo = { officialUrl?: string; signupNote?: string }

function normalizeLabels(value: unknown) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)))
}

function formatEventTypes(event: EventItem) {
  const labels = normalizeLabels(event.event_types)
  if (labels.length > 0) return labels.join('、')
  return EVENT_TYPE_LABELS[event.event_type] || event.event_type || '未注明'
}

function formatAudience(event: EventItem) {
  const labels = normalizeLabels(event.audience_who)
  return labels.length > 0 ? labels.join('、') : '未注明'
}

function formatRegion(event: EventItem) {
  const parts = [event.province, event.city].map((item) => String(item || '').trim()).filter((item) => item && item !== '线上')
  return Array.from(new Set(parts)).join(' · ') || '未填写'
}

function extractActivityDescription(value?: string) {
  const text = String(value || '').trim()
  if (!text) return '暂无详细介绍'
  const marker = '\n活动简介：\n'
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return text
  const after = text.slice(markerIndex + marker.length)
  const signupMarker = '\n报名方式补充说明：\n'
  const signupIndex = after.indexOf(signupMarker)
  return (signupIndex >= 0 ? after.slice(0, signupIndex) : after).trim() || '暂无详细介绍'
}

function buildEventShare(event?: EventItem | null, eventId?: number) {
  const id = Number(event?.id || eventId || 0)
  const title = event?.title ? `可雀活动｜${event.title}` : '可雀活动｜看看这个教育探索活动'
  return {
    appMessage: { title, path: id ? `/pages/event-detail/index?id=${id}` : '/pages/events/index' },
    timeline: { title, query: id ? `id=${id}` : '' },
  }
}

function PreviewNotice(props: { error?: string; onRetry?: () => void }) {
  return (
    <View style={{ marginBottom: space(3) }}>
      <AppPromptBanner
        title={props.error ? '完整详情加载失败' : '正在加载完整详情'}
        description={props.error ? `当前显示列表缓存信息：${props.error}` : '先显示列表中的基础信息。'}
        actionText={props.error && props.onRetry ? '重新加载' : undefined}
        icon='calendar'
        tone='warning'
        onClick={props.error ? props.onRetry : undefined}
      />
    </View>
  )
}

function EventContent(props: {
  event: EventItem
  preview?: boolean
  previewError?: string
  interestCount: number
  hasInterested: boolean
  interestLoading: boolean
  hasProfile: boolean
  contactInfo: string
  contactMessage: string
  contactLoading: boolean
  publicSignupInfo: PublicSignupInfo
  correction: {
    showForm: boolean
    value: string
    submitting: boolean
    done: boolean
    onOpen: () => void
    onCancel: () => void
    onChange: (value: string) => void
    onSubmit: () => void
  }
  onToggleInterest: () => void
  onRetryDetail?: () => void
}) {
  const { event, preview, previewError, interestCount, hasInterested, interestLoading, hasProfile, contactInfo, contactMessage, contactLoading, publicSignupInfo, correction, onToggleInterest, onRetryDetail } = props
  const statusInfo = getEventStatusInfo(event)
  const feeCategory = String(event.fee_category || '').trim()
  const feeDetail = String(event.fee || '').trim()
  const showSeparateFeeDetail = !!feeCategory && !!feeDetail && feeDetail !== feeCategory

  return (
    <>
      {preview ? <PreviewNotice error={previewError} onRetry={onRetryDetail} /> : null}

      <AppCard radius={radius.md} padding={`${space(4)} ${space(4)}`}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(3) }}>
          <View style={{ marginRight: space(3) }}>
            <AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(event.event_type)} bordered />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.title, color: palette.text }}>{event.title}</Text>
          </View>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          <AppTag text={EVENT_TYPE_LABELS[event.event_type] || event.event_type} tone='brand' />
          {statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} /> : null}
          <AppTag text={event.is_online ? '线上' : '线下'} tone='green' />
          {interestCount > 0 ? <AppTag text={`${interestCount} 人感兴趣`} backgroundColor={palette.surfaceWarm} textColor={palette.brand} /> : null}
        </View>
      </AppCard>

      <AppPrimaryButton
        text={preview ? '完整详情加载后可标记感兴趣' : hasInterested ? '取消感兴趣' : '我感兴趣'}
        loadingText='处理中...'
        loading={interestLoading}
        disabled={!!preview}
        variant={hasInterested ? 'secondary' : 'primary'}
        size='md'
        marginBottom={space(3)}
        onClick={onToggleInterest}
      />

      <AppInfoRow label='线上活动' value={event.is_online ? '是，主要在线上进行' : '否，主要线下进行'} />
      {!event.is_online ? <AppInfoRow label='所在城市' value={formatRegion(event)} /> : null}
      <AppInfoRow label='活动类型' value={formatEventTypes(event)} />
      <AppInfoRow label='参与对象' value={formatAudience(event)} />
      <AppInfoRow label='年龄区间' value={formatEventAgeRange(event)} />
      <AppInfoRow label='开始日期' value={formatEventDate(event.start_time) || '待定'} />
      {event.end_time ? <AppInfoRow label='结束日期' value={formatEventDate(event.end_time)} /> : null}
      {event.signup_deadline ? <AppInfoRow label='报名截止日期' value={formatEventDate(event.signup_deadline)} /> : null}
      <AppInfoRow label='是否周期性进行' value={event.is_recurring ? '是' : '否'} />
      {event.is_recurring ? <AppInfoRow label='周期时间' value={event.recurrence_pattern || '未填写'} /> : null}
      <AppInfoRow label={event.is_online ? '平台 / 线上说明' : '地点说明'} value={event.location || '未填写'} />
      <AppInfoRow label='费用' value={feeCategory || feeDetail || '费用待确认'} />
      {showSeparateFeeDetail ? <AppInfoRow label='常规费用说明' value={feeDetail} /> : null}
      {event.early_bird_price ? <AppInfoRow label='早鸟价格' value={event.early_bird_price} /> : null}
      {event.early_bird_deadline ? <AppInfoRow label='早鸟截止日期' value={formatEventDate(event.early_bird_deadline)} /> : null}
      <AppInfoRow label='组织者' value={event.organizer || '未填写'} />
      {!preview && publicSignupInfo.officialUrl ? <AppInfoRow label='公开链接' value={publicSignupInfo.officialUrl} copyable /> : null}
      {!preview && publicSignupInfo.signupNote ? <AppInfoRow label='报名方式补充说明' value={publicSignupInfo.signupNote} /> : null}

      {!preview && (contactLoading ? (
        <AppCard backgroundColor={palette.cardSoft} radius={radius.md} padding={space(3)} marginBottom={space(3)} borderColor={palette.line}>
          <Text style={{ ...typography.meta, color: palette.subtext }}>正在读取组织者微信号...</Text>
        </AppCard>
      ) : contactInfo ? (
        <AppInfoRow label='组织者微信号' value={contactInfo} copyable />
      ) : (
        <AppCard backgroundColor={palette.cardSoft} radius={radius.md} padding={space(3)} marginBottom={space(3)} borderColor={palette.line}>
          <Text style={{ ...typography.caption, color: palette.brand, marginBottom: space(1) }}>组织者微信号</Text>
          <Text style={{ ...typography.meta, color: palette.subtext }}>{contactMessage || (hasProfile ? '该活动暂无额外微信号。' : '完成个人资料后，可查看组织者微信号。')}</Text>
        </AppCard>
      ))}

      <AppCard radius={radius.md}>
        <View style={{ marginBottom: space(2) }}>
          <Text style={{ ...typography.cardTitle, color: palette.text }}>活动简介</Text>
        </View>
        <Text style={{ ...typography.body, color: palette.text, whiteSpace: 'pre-wrap' }}>{extractActivityDescription(event.description)}</Text>
      </AppCard>

      {!preview ? (
        <CorrectionCard
          showForm={correction.showForm}
          value={correction.value}
          submitting={correction.submitting}
          done={correction.done}
          entryTitle='活动信息有误？帮我们完善'
          entryDescription='补充、修正或更新这个活动的信息'
          formTitle='补充或修正活动信息'
          formDescription='请描述需要修正或补充的内容，例如：时间变化、地点变更、费用调整、报名链接失效等。提交后我们会核实更新。'
          openText='反馈'
          onOpen={correction.onOpen}
          onCancel={correction.onCancel}
          onChange={correction.onChange}
          onSubmit={correction.onSubmit}
        />
      ) : null}
    </>
  )
}

export default function EventDetailPage() {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [previewEvent, setPreviewEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interestCount, setInterestCount] = useState(0)
  const [hasInterested, setHasInterested] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [contactInfo, setContactInfo] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [publicSignupInfo, setPublicSignupInfo] = useState<PublicSignupInfo>({})
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [correctionDone, setCorrectionDone] = useState(false)
  const toggleLockRef = useRef(false)
  const correctionLockRef = useRef(false)
  const lastLoadRef = useRef<{ eventId: number; loadedAt: number }>({ eventId: 0, loadedAt: 0 })
  const currentEventId = Number(getCurrentInstance().router?.params?.id || event?.id || previewEvent?.id || 0)

  useShareAppMessage(() => buildEventShare(event || previewEvent, currentEventId).appMessage)
  useShareTimeline(() => buildEventShare(event || previewEvent, currentEventId).timeline)

  const loadInterestInfo = async (eventId: number, options: { forceRefresh?: boolean } = {}) => {
    try {
      const result = await getEventInterestInfo(eventId, options)
      if (result?.ok) {
        setInterestCount(result.count || 0)
        setHasInterested(!!result.hasInterested)
      } else logCloudFailure('getEventInterestInfo', result)
    } catch (err) {
      console.error('loadInterestInfo error:', err)
    }
  }

  const loadProfileStatus = async () => {
    try {
      const access = await hasCompletedProfileAccess()
      setHasProfile(access.ok)
    } catch (err) {
      console.error('loadProfileStatus error:', err)
      setHasProfile(false)
    }
  }

  const loadContactInfo = async (eventId: number, options: { forceRefresh?: boolean } = {}) => {
    try {
      setContactLoading(true)
      setContactInfo('')
      setContactMessage('')
      setPublicSignupInfo({})
      const result = await getEventContactInfo(eventId, options)
      if (result?.ok) {
        setContactInfo(result.contactInfo || '')
        setContactMessage(result.message || '')
        setPublicSignupInfo({
          officialUrl: result?.publicSignupInfo?.officialUrl || '',
          signupNote: result?.publicSignupInfo?.signupNote || '',
        })
      } else {
        setContactMessage(result?.message || '')
        logCloudFailure('getEventContactInfo', result)
      }
    } catch (err) {
      console.error('loadContactInfo error:', err)
      setContactMessage('读取联系方式失败，请稍后重试')
    } finally {
      setContactLoading(false)
    }
  }

  const handleToggleInterest = async () => {
    if (!event || interestLoading || toggleLockRef.current) return
    toggleLockRef.current = true
    try {
      setInterestLoading(true)
      const result = await toggleEventInterest(event.id)
      if (result?.ok) {
        const nextHasInterested = !!result.hasInterested
        setHasInterested(nextHasInterested)
        if (typeof result.count === 'number') setInterestCount(result.count)
        else setInterestCount((count) => nextHasInterested ? count + 1 : Math.max(0, count - 1))
        lastLoadRef.current = { eventId: event.id, loadedAt: 0 }
        await Promise.all([clearEventListCache(), clearFavoriteEventsCache(), loadInterestInfo(event.id, { forceRefresh: true }), loadContactInfo(event.id, { forceRefresh: true })])
        Taro.showToast({ title: result.message || '已更新', icon: 'success' })
      } else {
        const message = resolveCloudMessage(result, EVENT_CODE_MESSAGES, '操作失败')
        Taro.showToast({ title: message, icon: 'none' })
        logCloudFailure('toggleEventInterest', result)
      }
    } catch (err) {
      console.error('toggleEventInterest error:', err)
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    } finally {
      toggleLockRef.current = false
      setInterestLoading(false)
    }
  }

  const loadDetail = async (options: { forceRefresh?: boolean } = {}) => {
    const id = Number(getCurrentInstance().router?.params?.id || 0)
    const now = Date.now()
    const canSkip = !options.forceRefresh && id > 0 && lastLoadRef.current.eventId === id && now - lastLoadRef.current.loadedAt < EVENT_DETAIL_REFRESH_TTL_MS && !!event && !error
    if (canSkip) return

    const preview = getDetailPreview<EventItem>('event', id)
    if (preview) {
      setPreviewEvent(preview)
      registerCurrentPageShare(buildEventShare(preview, id))
    } else registerCurrentPageShare(buildEventShare(null, id))

    const canView = await ensureCompletedProfileAccess('resourceDetail')
    if (!canView) {
      setLoading(false)
      setError('')
      setEvent(null)
      setTimeout(() => Taro.switchTab({ url: '/pages/events/index' }), 120)
      return
    }

    try {
      setLoading(true)
      setError('')
      const [found] = await Promise.all([getEventDetail(id), loadProfileStatus()])
      const detail = found?.event || null
      setEvent(detail)
      if (detail) registerCurrentPageShare(buildEventShare(detail, id))
      if (detail?.id) {
        await Promise.all([loadInterestInfo(detail.id), loadContactInfo(detail.id)])
        lastLoadRef.current = { eventId: detail.id, loadedAt: Date.now() }
      }
      if (!detail) setError(found?.message || '未找到该活动')
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取活动详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    registerCurrentPageShare(buildEventShare(event || previewEvent, currentEventId))
    loadDetail()
    setShowCorrectionForm(false)
    setCorrectionText('')
    setCorrectionDone(false)
    correctionLockRef.current = false
  })

  const handleSubmitCorrection = async () => {
    if (correctionLockRef.current || correctionSubmitting) return
    const text = correctionText.trim()
    const targetEvent = event || previewEvent
    if (!text) {
      Taro.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (!targetEvent) return

    correctionLockRef.current = true
    try {
      setCorrectionSubmitting(true)
      const result = await submitEventCorrection(targetEvent.id, targetEvent.title, text)
      if (result?.ok) {
        setCorrectionDone(true)
        setCorrectionText('')
        Taro.showToast({ title: '提交成功，感谢反馈', icon: 'success' })
      } else {
        Taro.showToast({ title: result?.message || '提交失败，请稍后重试', icon: 'none' })
      }
    } catch (err) {
      console.error('submitEventCorrection error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      correctionLockRef.current = false
      setCorrectionSubmitting(false)
    }
  }

  const displayEvent = event || previewEvent
  const isPreview = !event && !!previewEvent
  const correction = {
    showForm: showCorrectionForm,
    value: correctionText,
    submitting: correctionSubmitting,
    done: correctionDone,
    onOpen: () => setShowCorrectionForm(true),
    onCancel: () => { setShowCorrectionForm(false); setCorrectionText('') },
    onChange: setCorrectionText,
    onSubmit: handleSubmitCorrection,
  }
  const renderEventContent = (item: EventItem, forcePreview = isPreview, previewError?: string) => (
    <EventContent
      event={item}
      preview={forcePreview}
      previewError={previewError}
      interestCount={interestCount}
      hasInterested={hasInterested}
      interestLoading={interestLoading}
      hasProfile={hasProfile}
      contactInfo={contactInfo}
      contactMessage={contactMessage}
      contactLoading={contactLoading}
      publicSignupInfo={publicSignupInfo}
      correction={correction}
      onToggleInterest={handleToggleInterest}
      onRetryDetail={() => loadDetail({ forceRefresh: true })}
    />
  )

  const renderBody = () => {
    if (loading && !displayEvent) return <DetailSkeleton />
    if (loading && displayEvent) return renderEventContent(displayEvent)
    if (error && displayEvent) return renderEventContent(displayEvent, true, error)
    if (error && !displayEvent) return <ErrorRetryCard error={error} onRetry={() => loadDetail({ forceRefresh: true })} secondaryText='返回活动列表' onSecondary={() => Taro.switchTab({ url: '/pages/events/index' })} />
    if (!displayEvent) return <EmptyCard text='未找到该活动。' actionText='返回活动列表' onAction={() => Taro.switchTab({ url: '/pages/events/index' })} />
    return renderEventContent(displayEvent)
  }

  return <AppPage>{renderBody()}</AppPage>
}
