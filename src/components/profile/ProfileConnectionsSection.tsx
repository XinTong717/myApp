import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { AcceptedConnection, PendingRequest, SentRequest } from '../../types/domain'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileNoticeBox from './ProfileNoticeBox'
import { profilePalette as palette } from './palette'

function normalizeRolesForDisplay(roles: string[] = []) {
  return roles.map((role) => role === '其他' ? '同行者' : role)
}

function renderRoleText(roles: string[] = []) {
  return normalizeRolesForDisplay(roles).join('/')
}

function renderStringArray(value: string[] = []) {
  return value.filter(Boolean).join(' · ')
}

type Props = {
  pendingRequests: PendingRequest[]
  acceptedConnections: AcceptedConnection[]
  sentRequests: SentRequest[]
  onRespond: (requestId: string, action: 'accept' | 'reject') => void
  onWithdrawRequest: (connectionId: string) => void
  onRemoveConnection: (connectionId: string) => void
  onSafetyAction: (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => void
  onReportUser: (targetUserId: string) => void
}

export default function ProfileConnectionsSection(props: Props) {
  const {
    pendingRequests,
    acceptedConnections,
    sentRequests,
    onRespond,
    onWithdrawRequest,
    onRemoveConnection,
    onSafetyAction,
    onReportUser,
  } = props

  const totalPending = pendingRequests.length

  return (
    <>
      {totalPending > 0 && (
        <ProfileNoticeBox text={`你有 ${totalPending} 条新的联络请求，请下滑查看。`} dashed={false} marginBottom='14px' />
      )}

      <ProfileCard padding='18px 16px'>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text }}>联络动态</Text>
      </ProfileCard>

      {pendingRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>收到的请求（{pendingRequests.length}）</Text></View>
          {pendingRequests.map((req) => (
            <ProfileCard key={req._id} padding='14px'>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{req.fromName}</Text>
              <View style={{ marginTop: '4px', marginBottom: '8px' }}>
                {req.fromCity ? <Text style={{ fontSize: '13px', color: palette.subtext }}>{req.fromCity}{req.fromRoles?.length > 0 ? ' · ' + renderRoleText(req.fromRoles) : ''}</Text> : null}
                {req.fromBio ? <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>{req.fromBio}</Text></View> : null}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                <View onClick={() => onRespond(req._id, 'accept')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: palette.green, marginRight: '10px', marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>同意</Text></View>
                <View onClick={() => onRespond(req._id, 'reject')} style={{ padding: '6px 18px', borderRadius: '999px', backgroundColor: '#F5F0EB', marginRight: '10px', marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.subtext }}>忽略</Text></View>
                {req.fromUserId ? <Text onClick={() => onSafetyAction(req.fromUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '8px' }}>拉黑</Text> : null}
                {req.fromUserId ? <Text onClick={() => onReportUser(req.fromUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '8px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      {acceptedConnections.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.green, fontWeight: 'bold' }}>已建立联络（{acceptedConnections.length}）</Text></View>
          {acceptedConnections.map((conn) => (
            <ProfileCard key={conn._id} padding='14px'>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{conn.otherName}</Text>
              <View style={{ marginTop: '4px' }}>
                <Text style={{ fontSize: '13px', color: palette.subtext }}>{conn.otherCity}{conn.otherRoles?.length > 0 ? ' · ' + renderRoleText(conn.otherRoles) : ''}</Text>
              </View>
              {conn.otherBio ? <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>{conn.otherBio}</Text></View> : null}
              {conn.otherWechat ? (
                <ProfileInputBox marginBottom='0'>
                  <View onClick={() => { Taro.setClipboardData({ data: conn.otherWechat }) }} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: '13px', color: palette.green, flex: 1 }}>微信: {conn.otherWechat}</Text>
                    <Text style={{ fontSize: '11px', color: palette.subtext }}>点击复制</Text>
                  </View>
                </ProfileInputBox>
              ) : <View style={{ marginTop: '8px' }}><Text style={{ fontSize: '12px', color: '#C5B5A5' }}>对方未填写微信号</Text></View>}
              {conn.otherChildInfo && (conn.otherChildInfo.ageRange.length > 0 || conn.otherChildInfo.status.length > 0 || conn.otherChildInfo.interests) ? (
                <ProfileInputBox marginBottom='8px'>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>家庭教育关注</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{[renderStringArray(conn.otherChildInfo.ageRange), renderStringArray(conn.otherChildInfo.status)].filter(Boolean).join(' · ')}{conn.otherChildInfo.interests ? `\n${conn.otherChildInfo.interests}` : ''}</Text>
                </ProfileInputBox>
              ) : null}
              {conn.otherEduServices ? (
                <ProfileInputBox marginBottom='8px'>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>教育服务</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{conn.otherEduServices}</Text>
                </ProfileInputBox>
              ) : null}
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => onRemoveConnection(conn._id)} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>删除连接</Text>
                {conn.otherUserId ? <Text onClick={() => onSafetyAction(conn.otherUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {conn.otherUserId ? <Text onClick={() => onSafetyAction(conn.otherUserId, 'mute')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {conn.otherUserId ? <Text onClick={() => onReportUser(conn.otherUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      {sentRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}><Text style={{ fontSize: '13px', color: palette.subtext, fontWeight: 'bold' }}>我发出的请求（{sentRequests.length}）</Text></View>
          {sentRequests.map((req) => (
            <ProfileCard key={req._id} padding='12px 14px'>
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '14px', color: palette.text }}>{req.toName}</Text>
                  {req.toCity ? <Text style={{ fontSize: '12px', color: palette.subtext }}> · {req.toCity}</Text> : null}
                </View>
                <View style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#FFF3E6' }}><Text style={{ fontSize: '11px', color: palette.accentDeep }}>等待回应</Text></View>
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '10px' }}>
                <Text onClick={() => onWithdrawRequest(req._id)} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>撤回请求</Text>
                {req.toUserId ? <Text onClick={() => onSafetyAction(req.toUserId, 'block')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>拉黑</Text> : null}
                {req.toUserId ? <Text onClick={() => onSafetyAction(req.toUserId, 'mute')} style={{ fontSize: '12px', color: palette.accentDeep, marginRight: '12px', marginBottom: '6px' }}>静音</Text> : null}
                {req.toUserId ? <Text onClick={() => onReportUser(req.toUserId)} style={{ fontSize: '12px', color: palette.accentDeep, marginBottom: '6px' }}>举报</Text> : null}
              </View>
            </ProfileCard>
          ))}
        </View>
      )}

      {pendingRequests.length === 0 && acceptedConnections.length === 0 && sentRequests.length === 0 && (
        <ProfileNoticeBox text='暂无联络动态。在探索页点击同路人，发起你的第一个联络请求。' />
      )}
    </>
  )
}
