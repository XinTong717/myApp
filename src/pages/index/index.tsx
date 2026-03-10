import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function Index() {
  return (
    <View style={{ padding: '20px', backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '16px',
        }}
      >
        <View style={{ marginBottom: '10px' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#111111' }}>
            自由学社
          </Text>
        </View>

        <Text style={{ color: '#444444' }}>
          帮助休学 / 自学 / alternative education 家庭更快找到学校、活动与连接。
        </Text>
      </View>

      <View
        onClick={() => Taro.switchTab({ url: '/pages/schools/index' })}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '12px',
        }}
      >
        <View style={{ marginBottom: '6px' }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>进入学校库</Text>
        </View>
        <Text style={{ color: '#666666' }}>查看全国学校信息，支持搜索与详情浏览</Text>
      </View>

      <View
        onClick={() => Taro.switchTab({ url: '/pages/events/index' })}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <View style={{ marginBottom: '6px' }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>进入活动页</Text>
        </View>
        <Text style={{ color: '#666666' }}>查看夜聊与其他活动安排</Text>
      </View>
    </View>
  )
}