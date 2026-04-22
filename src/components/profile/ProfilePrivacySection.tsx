import { View, Text, Switch } from '@tarojs/components'
import type { SafetyItem } from '../../types/domain'
import { profilePalette as palette } from './palette'

type Props = {
  privacySaving: boolean
  allowIncomingRequests: boolean
  isVisibleOnMap: boolean
  blockedUsers: SafetyItem[]
  mutedUsers: SafetyItem[]
  onUpdatePrivacySetting: (field: 'allowIncomingRequests' | 'isVisibleOnMap', value: boolean) => void
  onSafetyAction: (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => void
}

export default function ProfilePrivacySection(props: Props) {
  const {
    privacySaving,
    allowIncomingRequests,
    isVisibleOnMap,
    blockedUsers,
    mutedUsers,
    onUpdatePrivacySetting,
    onSafetyAction,
  } = props

  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <View style={{ marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>隐私与安全</Text>
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: '12px' }}>
          <Text style={{ fontSize: '14px', color: palette.text }}>暂停接收联络</Text>
          <View style={{ marginTop: '4px' }}>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>打开后，其他用户将无法再向你发起新的联络请求。</Text>
          </View>
        </View>
        <Switch checked={!allowIncomingRequests} disabled={privacySaving} color={palette.accentDeep} onChange={(e) => onUpdatePrivacySetting('allowIncomingRequests', !e.detail.value)} />
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: '12px' }}>
          <Text style={{ fontSize: '14px', color: palette.text }}>地图可见性</Text>
          <View style={{ marginTop: '4px' }}>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>关闭后，你的名字和简介不会再出现在探索地图上。</Text>
          </View>
        </View>
        <Switch checked={isVisibleOnMap} disabled={privacySaving} color={palette.accentDeep} onChange={(e) => onUpdatePrivacySetting('isVisibleOnMap', !!e.detail.value)} />
      </View>
      {(blockedUsers.length > 0 || mutedUsers.length > 0) && (
        <View>
          {blockedUsers.length > 0 && (
            <View style={{ marginBottom: '10px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>已拉黑</Text>
              {blockedUsers.map((item) => (
                <View key={item._id} style={{ backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '10px 12px', marginTop: '8px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '13px', color: palette.text }}>{item.targetName || '未知用户'}</Text>
                    {item.targetCity ? <Text style={{ fontSize: '11px', color: palette.subtext }}> · {item.targetCity}</Text> : null}
                  </View>
                  <Text onClick={() => onSafetyAction(item.targetUserId, 'unblock')} style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>解除拉黑</Text>
                </View>
              ))}
            </View>
          )}
          {mutedUsers.length > 0 && (
            <View>
              <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>已静音</Text>
              {mutedUsers.map((item) => (
                <View key={item._id} style={{ backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '10px 12px', marginTop: '8px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '13px', color: palette.text }}>{item.targetName || '未知用户'}</Text>
                    {item.targetCity ? <Text style={{ fontSize: '11px', color: palette.subtext }}> · {item.targetCity}</Text> : null}
                  </View>
                  <Text onClick={() => onSafetyAction(item.targetUserId, 'unmute')} style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>取消静音</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
