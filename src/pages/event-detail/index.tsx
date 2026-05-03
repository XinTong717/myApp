import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, getCurrentInstance, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { registerCurrentPageShare } from '../../utils/share'
import { EVENT_CODE_MESSAGES } from '../../constants/cloudMessages'
import { clearEventListCache, getEventDetail, getEventInterestInfo, getEventContactInfo, toggleEventInterest } from '../../services/event'
import { getMe } from '../../services/profile'
import { getDetailPreview } from '../../services/detailPreview'
import { logCloudFailure, resolveCloudMessage } from '../../utils/cloudFeedback'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import { DetailSkeleton } from '../../components/common/Skeleton'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
import type { EventItem } from '../events/shared'
import { EVENT_TYPE_LABELS, formatEventTime, getEventIconBg, getEventStatusInfo } from '../events/shared'

const EVENT_DETAIL_REFRESH_TTL_MS = 45 * 1000

function buildEventShare(event?: EventItem | null, eventId?: number) {
  const id = Number(event?.id || eventId || 0)
  const title = event?.title ? `可雀活动｜${event.title}` : '可雀活动｜看看这个教育探索活动'
  return {
    appMessage: { title, path: id ? `/pages/event-detail/index?id=${id}` : '/pages/events/index' },
    timeline: { title, query: id ? `id=${id}` : '' },
  }
}

function InfoRow(props: { label: string; value?: string; copyable?: boolean }) {
  const handleCopy = () => {
    if (props.value && props.copyable) Taro.setClipboardData({ data: props.value })
  }
  return (
    <AppCard onClick={props.copyable ? handleCopy : undefined} backgroundColor={palette.cardSoft} radius='14px' padding={space(3)} marginBottom='10px' borderColor={palette.cardSoft}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(1) }}>
        <Text style={{ ...typography.caption, color: palette.brand, flex: 1 }}>{props.label}</Text>
        {props.copyable && props.value ? <Text style={{ ...typography.micro, color: palette.subtext }}>点击复制</Text> : null}
      </View>
      <Text style={{ ...typography.body, color: palette.text }}>{props.value || '未填写'}</Text>
    </AppCard>
  )
}

function EventContent(props: { event: EventItem; preview?: boolean; interestCount: number; hasInterested: boolean; interestLoading: boolean; hasProfile: boolean; contactInfo: string; contactMessage: string; contactLoading: boolean; publicSignupText: string; onToggleInterest: () => void }) {
  const { event, preview, interestCount, hasInterested, interestLoading, hasProfile, contactInfo, contactMessage, contactLoading, publicSignupText, onToggleInterest } = props
  return (
    <>
      {preview ? <View style={{ backgroundColor: palette.warningSoft, borderRadius: '14px', padding: `10px ${space(3)}`, marginBottom: space(3), border: `1px solid ${palette.line}` }}><Text style={{ ...typography.caption, color: palette.subtext }}>正在加载完整详情，先显示列表中的基础信息。</Text></View> : null}
      <AppCard radius='20px' padding={`18px ${space(4)}`}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(3) }}>
          <View style={{ marginRight: '10px' }}><AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(event.event_type)} bordered /></View>
          <View style={{ flex: 1 }}><Text style={{ ...typography.title, color: palette.text }}>{event.title}</Text></View>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          <AppTag text={EVENT_TYPE_LABELS[event.event_type] || event.event_type} tone='brand' />
          {(() => { const statusInfo = getEventStatusInfo(event); return statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} /> : null })()}
          <AppTag text={event.is_online ? '线上' : '线下'} tone='green' />
          {interestCount > 0 ? <AppTag text={`${interestCount} 人感兴趣`} backgroundColor={palette.surfaceWarm} textColor={palette.brand} /> : null}
        </View>
      </AppCard>
      <View onClick={preview || interestLoading ? undefined : onToggleInterest} style={{ backgroundColor: hasInterested ? palette.surfaceSoft : preview ? palette.disabledBg : palette.brand, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '14px' }}>
        <Text style={{ ...typography.button, color: hasInterested || preview ? palette.subtext : '#FFF' }}>{preview ? '完整详情加载后可标记感兴趣' : interestLoading ? '处理中...' : hasInterested ? '已感兴趣，再点一次取消' : '我感兴趣'}</Text>
      </View>
      <InfoRow label='时间' value={formatEventTime(event)} />
      <InfoRow label='地点' value={event.is_online ? (event.location || '线上') : (event.location || '待定')} />
      <InfoRow label='费用' value={event.fee || '免费'} />
      <InfoRow label='组织者' value={event.organizer} />
      {!preview && publicSignupText ? <InfoRow label='公开报名信息' value={publicSignupText} copyable /> : null}
      {!preview && (contactLoading ? <AppCard backgroundColor={palette.cardSoft} radius='14px' padding={space(3)} marginBottom='10px' borderColor={palette.line}><Text style={{ ...typography.meta, color: palette.subtext }}>正在读取组织者联系方式...</Text></AppCard> : contactInfo ? <InfoRow label='组织者联系方式' value={contactInfo} copyable /> : <AppCard backgroundColor={palette.cardSoft} radius='14px' padding={space(3)} marginBottom='10px' borderColor={palette.line}><Text style={{ ...typography.caption, color: palette.brand, marginBottom: space(1) }}>组织者私人联系方式</Text><Text style={{ ...typography.meta, color: palette.subtext }}>{contactMessage || (hasProfile ? '该活动暂无额外联系方式。' : '完成“我的资料”填写后，可查看组织者私人联系方式。')}</Text></AppCard>)}
      <AppCard radius='20px'><View style={{ marginBottom: '10px' }}><Text style={{ ...typography.cardTitle, color: palette.text }}>详细介绍</Text></View><Text style={{ ...typography.body, color: palette.text, whiteSpace: 'pre-wrap' }}>{event.description || '暂无详细介绍'}</Text></AppCard>
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
  const [publicSignupText, setPublicSignupText] = useState('')
  const toggleLockRef = useRef(false)
  const lastLoadRef = useRef<{ eventId: number; loadedAt: number }>({ eventId: 0, loadedAt: 0 })
  const currentEventId = Number(getCurrentInstance().router?.params?.id || event?.id || previewEvent?.id || 0)
  useShareAppMessage(() => buildEventShare(event || previewEvent, currentEventId).appMessage)
  useShareTimeline(() => buildEventShare(event || previewEvent, currentEventId).timeline)
  const loadInterestInfo = async (eventId: number, options: { forceRefresh?: boolean } = {}) => { try { const result = await getEventInterestInfo(eventId, options); if (result?.ok) { setInterestCount(result.count || 0); setHasInterested(!!result.hasInterested) } else logCloudFailure('getEventInterestInfo', result) } catch (err) { console.error('loadInterestInfo error:', err) } }
  const loadProfileStatus = async () => { try { const res = await getMe(); const profile = res.profile; setHasProfile(!!(profile && profile.displayName && profile.province && profile.city)) } catch (err) { console.error('loadProfileStatus error:', err); setHasProfile(false) } }
  const loadContactInfo = async (eventId: number, options: { forceRefresh?: boolean } = {}) => { try { setContactLoading(true); setContactInfo(''); setContactMessage(''); setPublicSignupText(''); const result = await getEventContactInfo(eventId, options); if (result?.ok) { setContactInfo(result.contactInfo || ''); setContactMessage(result.message || ''); const publicParts = [result?.publicSignupInfo?.officialUrl ? `公开主页或报名链接：${result.publicSignupInfo.officialUrl}` : '', result?.publicSignupInfo?.signupNote ? `报名方式补充说明：${result.publicSignupInfo.signupNote}` : ''].filter(Boolean); setPublicSignupText(publicParts.join('\n')) } else { setContactMessage(result?.message || ''); logCloudFailure('getEventContactInfo', result) } } catch (err) { console.error('loadContactInfo error:', err); setContactMessage('读取联系方式失败，请稍后重试') } finally { setContactLoading(false) } }
  const handleToggleInterest = async () => { if (!event || interestLoading || toggleLockRef.current) return; toggleLockRef.current = true; try { setInterestLoading(true); const result = await toggleEventInterest(event.id); if (result?.ok) { const nextHasInterested = !!result.hasInterested; setHasInterested(nextHasInterested); if (typeof result.count === 'number') setInterestCount(result.count); else setInterestCount((count) => nextHasInterested ? count + 1 : Math.max(0, count - 1)); lastLoadRef.current = { eventId: event.id, loadedAt: 0 }; await Promise.all([clearEventListCache(), loadInterestInfo(event.id, { forceRefresh: true }), loadContactInfo(event.id, { forceRefresh: true })]); Taro.showToast({ title: result.message || '已更新', icon: 'success' }) } else { const message = resolveCloudMessage(result, EVENT_CODE_MESSAGES, '操作失败'); Taro.showToast({ title: message, icon: 'none' }); logCloudFailure('toggleEventInterest', result) } } catch (err) { console.error('toggleEventInterest error:', err); Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' }) } finally { toggleLockRef.current = false; setInterestLoading(false) } }
  const loadDetail = async (options: { forceRefresh?: boolean } = {}) => { const id = Number(getCurrentInstance().router?.params?.id || 0); const now = Date.now(); const canSkip = !options.forceRefresh && id > 0 && lastLoadRef.current.eventId === id && now - lastLoadRef.current.loadedAt < EVENT_DETAIL_REFRESH_TTL_MS && !!event && !error; if (canSkip) return; const preview = getDetailPreview<EventItem>('event', id); if (preview) { setPreviewEvent(preview); registerCurrentPageShare(buildEventShare(preview, id)) } else registerCurrentPageShare(buildEventShare(null, id)); try { setLoading(true); setError(''); const [found] = await Promise.all([getEventDetail(id), loadProfileStatus()]); const detail = found?.event || null; setEvent(detail); if (detail) registerCurrentPageShare(buildEventShare(detail, id)); if (detail?.id) { await Promise.all([loadInterestInfo(detail.id), loadContactInfo(detail.id)]); lastLoadRef.current = { eventId: detail.id, loadedAt: Date.now() } } if (!detail) setError(found?.message || '未找到该活动') } catch (err: any) { console.error('loadDetail error:', err); setError(err?.message || '读取活动详情失败') } finally { setLoading(false) } }
  useDidShow(() => { registerCurrentPageShare(buildEventShare(event || previewEvent, currentEventId)); loadDetail() })
  const displayEvent = event || previewEvent
  const isPreview = !event && !!previewEvent
  return (
    <View style={{ padding: space(4), backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      {loading && !displayEvent ? <DetailSkeleton /> : null}
      {loading && displayEvent ? <EventContent event={displayEvent} preview={isPreview} interestCount={interestCount} hasInterested={hasInterested} interestLoading={interestLoading} hasProfile={hasProfile} contactInfo={contactInfo} contactMessage={contactMessage} contactLoading={contactLoading} publicSignupText={publicSignupText} onToggleInterest={handleToggleInterest} /> : null}
      {!loading && error ? <ErrorRetryCard error={error} onRetry={() => loadDetail({ forceRefresh: true })} secondaryText='返回活动列表' onSecondary={() => Taro.switchTab({ url: '/pages/events/index' })} /> : null}
      {!loading && !error && !displayEvent ? <EmptyCard text='未找到该活动。' actionText='返回活动列表' onAction={() => Taro.switchTab({ url: '/pages/events/index' })} /> : null}
      {!loading && !error && displayEvent ? <EventContent event={displayEvent} preview={isPreview} interestCount={interestCount} hasInterested={hasInterested} interestLoading={interestLoading} hasProfile={hasProfile} contactInfo={contactInfo} contactMessage={contactMessage} contactLoading={contactLoading} publicSignupText={publicSignupText} onToggleInterest={handleToggleInterest} /> : null}
    </View>
  )
}
