import { View, Text } from '@tarojs/components'

const schools = [
  { id: 1, name: '测试学校 A' },
  { id: 2, name: '测试学校 B' },
]

export default function SchoolsPage() {
  console.log('SCHOOLS PAGE BARE RENDER')

  return (
    <View style={{ padding: '24px', backgroundColor: '#ffffff' }}>
      <Text>学校页 bare</Text>

      <View style={{ marginTop: '12px' }}>
        <Text>数量：{schools.length}</Text>
      </View>

      {schools.map((item) => (
        <View key={item.id} style={{ marginTop: '8px' }}>
          <Text>{item.name}</Text>
        </View>
      ))}
    </View>
  )
}