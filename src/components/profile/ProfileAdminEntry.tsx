import { View, Text } from '@tarojs/components'
import ProfileCard from './ProfileCard'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  isAdmin: boolean
  onOpen: () => void
}

export default function ProfileAdminEntry({ isAdmin, onOpen }: Props) {
  if (!isAdmin) return null

  return (
    <View onClick={onOpen}>
      <ProfileCard padding={`${space(3)} ${space(4)}`} backgroundColor={palette.surfaceWarm}>
        <Text style={{ ...typography.bodyStrong, color: palette.brand }}>管理员入口</Text>
        <View style={{ marginTop: space(2) }}>
          <Text style={{ ...typography.meta, color: palette.subtext }}>查看待审核活动和学习社区推荐，发布活动，并记录人工处理状态。</Text>
        </View>
        <View style={{ marginTop: space(3) }}>
          <Text style={{ ...typography.meta, color: palette.brand, fontWeight: 'bold' }}>打开审核台 →</Text>
        </View>
      </ProfileCard>
    </View>
  )
}
