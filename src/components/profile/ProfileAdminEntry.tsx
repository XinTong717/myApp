import { View, Text } from '@tarojs/components'
import ProfileCard from './ProfileCard'
import { profilePalette as palette } from './palette'

type Props = {
  isAdmin: boolean
  onOpen: () => void
}

export default function ProfileAdminEntry({ isAdmin, onOpen }: Props) {
  if (!isAdmin) return null

  return (
    <View onClick={onOpen}>
      <ProfileCard padding='14px 16px' backgroundColor={palette.cardSoft}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.accentDeep }}>管理员入口</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>进入活动审核台，查看 event_submissions、复制建议 payload，并在发布后回写审核状态。</Text>
        </View>
        <View style={{ marginTop: '10px' }}>
          <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>打开活动审核台 →</Text>
        </View>
      </ProfileCard>
    </View>
  )
}
