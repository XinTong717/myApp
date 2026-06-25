import { View, Text, Switch } from '@tarojs/components'
import type { SafetyItem } from '../../types/domain'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileSectionHeading from './ProfileSectionHeading'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  privacySaving: boolean
  expandedProfileVisible: boolean
  isVisibleOnMap: boolean
  blockedUsers: SafetyItem[]
  mutedUsers: SafetyItem[]
  onUpdatePrivacySetting: (field: 'expandedProfileVisible' | 'isVisibleOnMap', value: boolean) => void
  onSafetyAction: (targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') => void
  onRequestAccountDeletion: () => void
}

export default function ProfilePrivacySection(props: Props) {
  const {
    privacySaving,
    expandedProfileVisible,
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
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>扩展公开资料可见性</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: palette.subtext }}>关闭后，已登录并完成资料的用户也无法看到你的联系方式、添加备注和身份补充信息。</Text>
            </View>
          </View>
          <Switch checked={expandedProfileVisible} disabled={privacySaving} color={palette.brand} onChange={(e) => onUpdatePrivacySetting('expandedProfileVisible', !!e.detail.value)} />
        </View>
      </ProfileInputBox>
      <ProfileInputBox>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>地图可见性</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: palette.subtext }}>关闭后，你的显示名、城市、身份和简介不会再出现在探索地图上。</Text>
            </View>
          </View>
          <Switch checked={isVisibleOnMap} disabled={privacySaving} color={palette.brand} onChange={(e) => onUpdatePrivacySetting('isVisibleOnMap', !!e.detail.value)} />
        </View>
      </ProfileInputBox>
      <ProfileInputBox>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>用户注销</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: palette.subtext }}>提交后，你的资料会从地图和列表中清空。</Text>
            </View>
          </View>
          <Text onClick={onRequestAccountDeletion} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>申请</Text>
        </View>
      </ProfileInputBox>
      {(blockedUsers.length > 0 || mutedUsers.length > 0) && (
        <View>
          {blockedUsers.length > 0 && (
            <View style={{ marginBottom: space(3) }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>已拉黑</Text>
              {blockedUsers.map((item) => (
                <ProfileInputBox key={item._id} marginBottom={space(2)}>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.caption, color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ ...typography.caption, color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => onSafetyAction(item.targetUserId, 'unblock')} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>解除拉黑</Text>
                  </View>
                </ProfileInputBox>
              ))}
            </View>
          )}
          {mutedUsers.length > 0 && (
            <View>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>已静音</Text>
              {mutedUsers.map((item) => (
                <ProfileInputBox key={item._id} marginBottom={space(2)}>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.caption, color: palette.text }}>{item.targetName || '未知用户'}</Text>
                      {item.targetCity ? <Text style={{ ...typography.caption, color: palette.subtext }}> · {item.targetCity}</Text> : null}
                    </View>
                    <Text onClick={() => onSafetyAction(item.targetUserId, 'unmute')} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>取消静音</Text>
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
