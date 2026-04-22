import { View, Text } from '@tarojs/components'
import { profilePalette as palette } from './palette'

export default function ProfileHeaderCard() {
  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>我的资料</Text>
      <View style={{ marginTop: '6px' }}>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          填写后你会出现在探索地图上，让同城家庭和同路人发现你。
        </Text>
      </View>
    </View>
  )
}
