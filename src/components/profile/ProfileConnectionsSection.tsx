import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { AcceptedConnection, PendingRequest, RequestPages, SentRequest } from '../../types/domain'
import type { RequestSection } from '../../services/connection'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileNoticeBox from './ProfileNoticeBox'
import { profilePalette as palette } from './palette'
import { typography } from '../../theme/typography'

function normalizeRolesForDisplay(roles: string[] = []) {
  return roles.map((role) => role === '其他' ? '同行者' : role)
}

function renderRoleText(roles: string[] = []) {
  return normalizeRolesForDisplay(roles).join('/')
}

function renderStringArray(value: string[] = []) {
  return value.filter(Boolean).join(' · ')
}

type ConnectionTab = Exclude<RequestSection, 'all'>

type Props = {
  pendingRequests: PendingRequest[]
  acceptedConnections: AcceptedConnection[]
  sentRequests: SentRequest[]
  requestPages: RequestPages
  loadingMoreSection: RequestSection | ''
  onLoadSection: (section: ConnectionTab) => void
  onLoadMore: (section: ConnectionTab) => void
  onRespond: (requestId: string, action: 'accept' | 'reject') => void
  onWithdrawRequest: (connectionId: string) => void
  onRemoveConnection: (connectionId: string) => void
  onSafetyAction: (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => void
  onReportUser: (targetUserId: string) => void
}

const TABS: { key: ConnectionTab; label: string }[] = [
  { key: 'pending', label: '收到的请求' },
  { key: 'accepted', label: '已建立联络' },
  { key: 'sent', label: '我发出的请求' },
]

function LoadMoreButton(props: { visible: boolean; loading: boolean; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  if (!props.visible) return null
  return (
    <View
      onTouchStart={() => !props.loading && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      onClick={props.loading ? undefined : props.onClick}
      style={{
        margin: '4px 0 16px',
        padding: '10px 14px',
        borderRadius: '999px',
        backgroundColor: props.loading ? palette.surfaceSoft : pressed ? palette.activeBg : '#FFFFFF',
        border: `1px solid ${pressed ? palette.focus : palette.line}`,
        textAlign: 'center',
        boxShadow: pressed ? palette.focusRing : 'none',
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
      }}
    >
      <Text style={{ ...typography.meta, color: props.loading ? palette.muted : palette.accentDeep, fontWeight: '700' }}>
        {props.loading ? '加载中...' : '加载更多'}
      </Text>
    </View>
  )
}

export default function ProfileConnectionsSection(props: Props) {
  const {
    pendingRequests,
    acceptedConnections,
    sentRequests,
    requestPages,
    loadingMoreSection,
    onLoadSection,
    onLoadMore,
    onRespond,
    onWithdrawRequest,
    onRemoveConnection,
    onSafetyAction,
    onReportUser,
  } = props

  const [activeTab, setActiveTab] = useState<ConnectionTab>('pending')
  const [pressedTab, setPressedTab] = useState<ConnectionTab | ''>('')
  const totalPending = pendingRequests.length

  const switchTab = (tab: ConnectionTab) => {
    setActiveTab(tab)
    onLoadSection(tab)
  }

  const activePage = requestPages[activeTab]
  const canLoadMore = !!activePage?.hasMore

  return (
    <>
      {totalPending > 0 && (
        <ProfileNoticeBox text={`你有 ${totalPending} 条新的联络请求，请下滑查看。`} dashed={false} marginBottom='14px' />
      )}

      <ProfileCard padding='18px 16px'>
        <Text style={{ ...typography.sectionTitle, color: palette.text }}>联络动态</Text>
        <View style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '12px' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            const pressed = pressedTab === tab.key
            const count = tab.key === 'pending' ? pendingRequests.length : tab.key === 'accepted' ? acceptedConnections.length : sentRequests.length
            return (
              <View
                key={tab.key}
                onTouchStart={() => setPressedTab(tab.key)}
                onTouchEnd={() => setPressedTab('')}
                onTouchCancel={() => setPressedTab('')}
                onClick={() => switchTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: '999px',
                  backgroundColor: active ? (pressed ? palette.brandPress : palette.accentDeep) : pressed ? palette.activeBg : '#FFFFFF',
                  border: `1px solid ${active ? palette.accentDeep : pressed ? palette.focus : palette.line}`,
                  textAlign: 'center',
                  boxShadow: active ? `0 3px 10px ${palette.shadow}` : 'none',
                  transform: pressed ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                <Text style={{ ...typography.micro, color: active ? '#FFFFFF' : palette.subtext, fontWeight: active ? '700' : '400' }}>
                  {tab.label}{count > 0 ? ` ${count}` : ''}
                </Text>
              </View>
            )
          })}
        </View>
      </ProfileCard>

      {activeTab === 'pending' && pendingRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          {pendingRequests.map((req) => (
            <ProfileCard key={req._id} padding='14px'>
              <Text style={{ ...typography.cardTitle, color: palette.text }}>{req.fromName}</Text>
              <View style={{ marginTop: '4px', marginBottom: '8px' }}>
                {req.fromCity ? <Text style={{ ...typography.meta, color: palette.subtext }}>{req.fromCity}{req.fromRoles?.length > 0 ? ' · ' + renderRoleText(req.fromRoles) : ''}</Text> : null}
                {req.fromBio ? <View style={{ marginTop: '4px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>{req.fromBio}</Text></View> : null}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                <View onClick={() => onRespond(req._id, 'accept')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: palette.green, marginRight: '10px', marginBottom: '8px' }}><Text style={{ ...typography.meta, color: '#FFF', fontWeight: '700' }}>同意</Text></View>
                <View onClick={() => onRespond(req._id, 'reject')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: '#F5F0EB', marginRight: '10px', marginBottom: '8px' }}><Text style={{ ...typography.meta, color: palette.subtext }}>忽略</Text></View>
                {req.fromUserId ? <Text onClick={() => onSafetyAction(req.fromUserId, 'block')} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '8px' }}>拉黑</Text> : null}
                {req.fromUserId ? <Text onClick={() => onReportUser(req.fromUserId)} style={{ ...typography.caption, color: palette.accentDeep, marginBottom: '8px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      {activeTab === 'accepted' && acceptedConnections.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          {acceptedConnections.map((conn) => (
            <ProfileCard key={conn._id} padding='14px'>
              <Text style={{ ...typography.cardTitle, color: palette.text }}>{conn.otherName}</Text>
              <View style={{ marginTop: '4px' }}>
                <Text style={{ ...typography.meta, color: palette.subtext }}>{conn.otherCity}{conn.otherRoles?.length > 0 ? ' · ' + renderRoleText(conn.otherRoles) : ''}</Text>
              </View>
              {conn.otherBio ? <View style={{ marginTop: '4px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>{conn.otherBio}</Text></View> : null}
              {conn.otherWechat ? (
                <ProfileInputBox marginBottom='0'>
                  <View onClick={() => { Taro.setClipboardData({ data: conn.otherWechat }) }} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...typography.meta, color: palette.green, flex: 1 }}>微信: {conn.otherWechat}</Text>
                    <Text style={{ ...typography.micro, color: palette.subtext }}>点击复制</Text>
                  </View>
                </ProfileInputBox>
              ) : <View style={{ marginTop: '8px' }}><Text style={{ ...typography.caption, color: '#C5B5A5' }}>对方未填写微信号</Text></View>}
              {conn.otherChildInfo && (conn.otherChildInfo.ageRange.length > 0 || conn.otherChildInfo.status.length > 0 || conn.otherChildInfo.interests) ? (
                <ProfileInputBox marginBottom='8px'>
                  <Text style={{ ...typography.caption, color: palette.accentDeep, fontWeight: '700', marginBottom: '4px' }}>家庭教育关注</Text>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>{[renderStringArray(conn.otherChildInfo.ageRange), renderStringArray(conn.otherChildInfo.status)].filter(Boolean).join(' · ')}{conn.otherChildInfo.interests ? `\n${conn.otherChildInfo.interests}` : ''}</Text>
                </ProfileInputBox>
              ) : null}
              {conn.otherEduServices ? (
                <ProfileInputBox marginBottom='8px'>
                  <Text style={{ ...typography.caption, color: palette.accentDeep, fontWeight: '700', marginBottom: '4px' }}>教育服务</Text>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>{conn.otherEduServices}</Text>
                </ProfileInputBox>
              ) : null}
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => onRemoveConnection(conn._id)} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>删除连接</Text>
                {conn.otherUserId ? <Text onClick={() => onSafetyAction(conn.otherUserId, 'block')} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {conn.otherUserId ? <Text onClick={() => onSafetyAction(conn.otherUserId, 'mute')} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {conn.otherUserId ? <Text onClick={() => onReportUser(conn.otherUserId)} style={{ ...typography.caption, color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      {activeTab === 'sent' && sentRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          {sentRequests.map((req) => (
            <ProfileCard key={req._id} padding='12px 14px'>
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: palette.text }}>{req.toName}</Text>
                  {req.toCity ? <Text style={{ ...typography.caption, color: palette.subtext }}> · {req.toCity}</Text> : null}
                </View>
                <View style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#FFF3E6' }}><Text style={{ ...typography.micro, color: palette.accentDeep }}>等待回应</Text></View>
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => onWithdrawRequest(req._id)} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>撤回请求</Text>
                {req.toUserId ? <Text onClick={() => onSafetyAction(req.toUserId, 'block')} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {req.toUserId ? <Text onClick={() => onSafetyAction(req.toUserId, 'mute')} style={{ ...typography.caption, color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {req.toUserId ? <Text onClick={() => onReportUser(req.toUserId)} style={{ ...typography.caption, color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      <LoadMoreButton
        visible={canLoadMore}
        loading={loadingMoreSection === activeTab}
        onClick={() => onLoadMore(activeTab)}
      />

      {activeTab === 'pending' && pendingRequests.length === 0 && (
        <ProfileNoticeBox text='暂无收到的联络请求。' />
      )}
      {activeTab === 'accepted' && acceptedConnections.length === 0 && (
        <ProfileNoticeBox text='暂无已建立联络。' />
      )}
      {activeTab === 'sent' && sentRequests.length === 0 && (
        <ProfileNoticeBox text='暂无发出的联络请求。在探索页点击同路人，发起你的第一个联络请求。' />
      )}
    </>
  )
}
