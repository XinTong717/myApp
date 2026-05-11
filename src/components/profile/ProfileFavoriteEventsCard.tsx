import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ProfileCard from './ProfileCard'
import { getMyFavoriteEvents } from '../../services/event'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import type { EventItem } from '../../types/domain'

type Props = {
  enabled: boolean
}

function formatEventLine(event: EventItem) {
  const city = event.is_online ? '线上' : (event.city || event.location || '线下')
  const fee = event.fee ? ` · ${event.fee}` : ''
  return `${city}${fee}`
}

export default function ProfileFavoriteEventsCard({ enabled }: Props) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadFavorites = async () => {
    if (!enabled) return
    try {
      setLoading(true)
      const result = await getMyFavoriteEvents({ limit: 5 })
      if (result.ok) setEvents(Array.isArray(result.events) ? result.events : [])
    } catch (err) {
      console.warn('load interested events skipped:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [enabled])

  if (!enabled) return null

  const openEvent = (event: EventItem) => {
    setDetailPreview('event', event.id, event)
    Taro.navigateTo({ url: `/pages/event-detail/index?id=${event.id}` })
  }

  return (
    <ProfileCard>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(2) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.bodyStrong, color: palette.text }}>我感兴趣的活动</Text>
        </View>
        <Text onClick={loadFavorites} style={{ ...typography.caption, color: palette.accentDeep }}>{loading ? '刷新中' : '刷新'}</Text>
      </View>

      {loading && events.length === 0 ? (
        <Text style={{ ...typography.meta, color: palette.subtext }}>正在读取感兴趣活动...</Text>
      ) : events.length === 0 ? (
        <Text style={{ ...typography.meta, color: palette.subtext }}>你还没有标记感兴趣的活动。看到想关注的活动，可以点进详情页选择“我感兴趣”。</Text>
      ) : (
        events.map((event) => (
          <View key={event.id} onClick={() => openEvent(event)} style={{ padding: `${space(2)} 0`, borderTop: `1px solid ${palette.lineSoft}` }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>{event.title}</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.meta, color: palette.subtext }}>{formatEventLine(event)}</Text>
            </View>
          </View>
        ))
      )}
    </ProfileCard>
  )
}
