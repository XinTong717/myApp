import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ProfileCard from './ProfileCard'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

const SUPPORT_WECHAT = '504302201'

export default function ProfileFeedbackCard() {
  const copySupportWechat = async () => {
    try {
      await Taro.setClipboardData({ data: SUPPORT_WECHAT })
      Taro.showToast({ title: '客服微信已复制', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: '复制失败，请手动复制', icon: 'none' })
    }
  }

  return (
    <View onClick={copySupportWechat}>
      <ProfileCard padding={`${space(3)} ${space(4)}`} backgroundColor={palette.cardSoft}>
        <Text style={{ ...typography.bodyStrong, color: palette.text }}>反馈与建议</Text>
        <View style={{ marginTop: space(2) }}>
          <Text style={{ ...typography.meta, color: palette.subtext }}>遇到问题，可以联系我们。</Text>
        </View>
        <View style={{ marginTop: space(2) }}>
          <Text style={{ ...typography.meta, color: palette.brand, fontWeight: 'bold' }}>点击复制客服微信：{SUPPORT_WECHAT}</Text>
        </View>
      </ProfileCard>
    </View>
  )
}
