import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { palette } from '../../theme/palette'

export default function UserAgreementRedirectPage() {
  useDidShow(() => {
    Taro.redirectTo({ url: '/pkg/legal/user-agreement/index' })
  })

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '32px 16px', boxSizing: 'border-box', textAlign: 'center' }}>
      <Text style={{ fontSize: '14px', color: palette.subtext }}>正在打开用户协议...</Text>
    </View>
  )
}
