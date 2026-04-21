import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { fetchEventById } from '../../services/api'
import {
  type EventItem,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  formatEventTime,
  getEventStatusInfo,
} from '../events/shared'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

function InfoRow(props: { label: string; value?: string; copyable?: boolean }) {
  const handleCopy = () => {
    if (props.value && props.copyable) {
      Taro.setClipboardData({ data: props.value })
    }
  }

  return (
    <View onClick={props.copyable ? handleCopy : undefined} style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '10px' }}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '4px' }}>
        <Text style={{ fontSize: '12px', color: palette.accentDeep, flex: 1 }}>{props.label}</Text>
        {props.copyable && props.value && <Text style={{ fontSize: '11px', color: palette.subtext }}>点击复制</Text>}
      </View>
      <Text style={{ fontSize: '14px', color: palette.text, lineHeight: '21px' }}>{props.value || '未填写'}</Text>
    </View>
  )
}

export default function EventDetailPage() {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interestCount, setInterestCount] = useState(0)
  const [hasInterested, setHasInterested] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  const loadInterestInfo = async (eventId: number) => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'getEventInterestInfo', data: { eventId } })
      if (res.result?.ok) {
        setInterestCount(res.result.count || 0)
        setHasInterested(!!res.result.hasInterested)
      }
    } catch (err) {
      console.error('loadInterestInfo error:', err)
    }
  }

  const loadProfileStatus = async () => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'getMe', data: {} })
      const profile = res.result?.profile
      setHasProfile(!!(profile && profile.displayName && profile.province && profile.city))
    } catch (err) {
      console.error('loadProfileStatus error:', err)
      setHasProfile(false)
    }
  }

  const handleToggleInterest = async () => {
    if (!event || interestLoading) return

    try {
      setInterestLoading(true)
      const res: any = await Taro.cloud.callFunction({ name: 'toggleEventInterest', data: { eventId: event.id } })
      const result = res.result
      if (result?.ok) {
        const nextHasInterested = !!result.hasInterested
        setHasInterested(nextHasInterested)
        setInterestCount((count) => nextHasInterested ? count + 1 : Math.max(0, count - 1))
        Taro.showToast({ title: result.message || '已更新', icon: 'success' })
      } else {
        Taro.showToast({ title: result?.message || '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('toggleEventInterest error:', err)
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    } finally {
      setInterestLoading(false)
    }
  }

  const loadDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const id = Number(getCurrentInstance().router?.params?.id || 0)
      const found = await fetchEventById(id)
      setEvent(found)
      if (found?.id) {
        loadInterestInfo(found.id)
      }
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取活动详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
    loadProfileStatus()
  })

  return (
    <View style={{ padding: '16px', backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      {loading && <Text style={{ color: palette.subtext }}>加载中...</Text>}

      {error && (
        <View style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#FFF1F0', borderRadius: '14px', border: '1px solid #FFD8D2' }}>
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      )}

      {!loading && !error && !event && <Text style={{ color: palette.subtext }}>未找到该活动</Text>}

      {!loading && event && (
        <>
          <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
              <View style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: '#FFEFD8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }}>
                <Text style={{ fontSize: '20px' }}>{EVENT_TYPE_ICONS[event.event_type] || '📌'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text, lineHeight: '30px' }}>{event.title}</Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ padding: '5px 10px', borderRadius: '999px', backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</Text>
              </View>

              {(() => {
                const statusInfo = getEventStatusInfo(event)
                return statusInfo ? (
                  <View style={{ padding: '5px 10px', borderRadius: '999px', backgroundColor: statusInfo.bg, marginRight: '8px', marginBottom: '8px' }}>
                    <Text style={{ fontSize: '12px', color: statusInfo.color }}>{statusInfo.text}</Text>
                  </View>
                ) : null
              })()}

              <View style={{ padding: '5px 10px', borderRadius: '999px', backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '12px', color: palette.green }}>{event.is_online ? '线上' : '线下'}</Text>
              </View>

              {interestCount > 0 ? (
                <View style={{ padding: '5px 10px', borderRadius: '999px', backgroundColor: '#FFF3E6', marginRight: '8px', marginBottom: '8px' }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{interestCount} 人感兴趣</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View onClick={handleToggleInterest} style={{ backgroundColor: hasInterested ? '#F5F0EB' : palette.accentDeep, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '14px' }}>
            <Text style={{ fontSize: '15px', color: hasInterested ? palette.subtext : '#FFF', fontWeight: 'bold' }}>{interestLoading ? '处理中...' : hasInterested ? '已感兴趣，再点一次取消' : '我感兴趣'}</Text>
          </View>

          <InfoRow label='时间' value={formatEventTime(event)} />
          <InfoRow label='地点' value={event.is_online ? (event.location || '线上') : (event.location || '待定')} />
          <InfoRow label='费用' value={event.fee || '免费'} />
          <InfoRow label='组织者' value={event.organizer} />
          {hasProfile ? (
            <InfoRow label='咨询报名 / 组织者联系方式' value={event.contact_info} copyable />
          ) : (
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '10px', border: `1px dashed ${palette.line}` }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '4px' }}>咨询报名 / 组织者联系方式</Text>
              <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '21px' }}>完成“我的资料”填写后，可查看公开报名方式或组织者联系方式。</Text>
            </View>
          )}

          <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
            <View style={{ marginBottom: '10px' }}>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>详细介绍</Text>
            </View>
            <Text style={{ fontSize: '14px', color: palette.text, lineHeight: '24px', whiteSpace: 'pre-wrap' }}>{event.description || '暂无详细介绍'}</Text>
          </View>
        </>
      )}
    </View>
  )
}
