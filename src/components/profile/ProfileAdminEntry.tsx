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
          <Text style={{ ...typography.meta, color: palette.subtext }}>查看待审核活动、发布到活动库，并记录处理状态。</Text>
        </View>
        <View style={{ marginTop: space(3) }}>
          <Text style={{ ...typography.meta, color: palette.brand, fontWeight: 'bold' }}>打开活动审核台 →</Text>
        </View>
      </ProfileCard>
    </View>
  )
}
