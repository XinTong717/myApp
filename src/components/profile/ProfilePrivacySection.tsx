import { View, Text, Switch } from '@tarojs/components'
import type { SafetyItem } from '../../types/domain'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileSectionHeading from './ProfileSectionHeading'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type Props = {
  privacySaving: boolean
  allowIncomingRequests: boolean
  isVisibleOnMap: boolean
  blockedUsers: SafetyItem[]
  mutedUsers: SafetyItem[]
  onUpdatePrivacySetting: (field: 'allowIncomingRequests' | 'isVisibleOnMap', value: boolean) => void
  onSafetyAction: (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => void
  onRequestAccountDeletion: () => void
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
    onRequestAccountDeletion,
  } = props

  return (
    <ProfileCard>
      <ProfileSectionHeading title='成员目录与安全' />
      <ProfileInputBox>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ ...typography.caption, color: palette.text }}>扩展公开资料可见性</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ ...typography.micro, color: palette.subtext }}>关闭后，已登录并完成资料的用户也无法看到你的公开渠道、添加备注和身份补充信息。</Text>
            </View>
          </View>
          <Switch checked={allowIncomingRequests} disabled={privacySaving} color={palette.brand} onChange={(e) => onUpdatePrivacySetting('allowIncomingRequests', !!e.detail.value)} />
        </View>
      </ProfileInputBox>
      <ProfileInputBox>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ ...typography.caption, color: palette.text }}>地图可见性</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ ...typography.micro, color: palette.subtext }}>关闭后，你的显示名、城市、身份和简介不会再出现在探索地图上。</Text>
            </View>
          </View>
          <Switch checked={isVisibleOnMap} disabled={privacySaving} color={palette.brand} onChange={(e) => onUpdatePrivacySetting('isVisibleOnMap', !!e.detail.value)} />
        </View>
      </ProfileInputBox>
      <ProfileInputBox>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ ...typography.caption, color: palette.text }}>账号注销 / 数据删除</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ ...typography.micro, color: palette.subtext }}>提交后会先隐藏你的地图资料、清空公开渠道，后续由管理员处理删除申请。</Text>
            </View>
          </View>
          <Text onClick={onRequestAccountDeletion} style={{ ...typography.micro, color: palette.brand, fontWeight: 'bold' }}>申请</Text>
        </View>
      </ProfileInputBox>
      {(blockedUsers.length > 0 || mutedUsers.length > 0) && (
        <View>
          {blockedUsers.length > 0 && (
            <View style={{ marginBottom: '10px' }}>
              <Text style={{ ...typography.micro, color: palette.brand, fontWeight: 'bold' }}>已拉黑</Text>
              {blockedUsers.map((item) => (
                <ProfileInputBox key={item._id} marginBottom='8px'>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.micro, color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ ...typography.micro, color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => onSafetyAction(item.targetUserId, 'unblock')} style={{ ...typography.micro, color: palette.brand, fontWeight: 'bold' }}>解除拉黑</Text>
                  </View>
                </ProfileInputBox>
              ))}
            </View>
          )}
          {mutedUsers.length > 0 && (
            <View>
              <Text style={{ ...typography.micro, color: palette.brand, fontWeight: 'bold' }}>已静音</Text>
              {mutedUsers.map((item) => (
                <ProfileInputBox key={item._id} marginBottom='8px'>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.micro, color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ ...typography.micro, color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => onSafetyAction(item.targetUserId, 'unmute')} style={{ ...typography.micro, color: palette.brand, fontWeight: 'bold' }}>取消静音</Text>
                  </View>
                </ProfileInputBox>
              ))}
            </View>
          )}
        </View>
      )}
    </ProfileCard>
  )
}
