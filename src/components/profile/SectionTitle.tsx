import { View, Text } from '@tarojs/components'

type Props = {
  text: string
  color?: string
}

export default function SectionTitle({ text, color = '#E76F51' }: Props) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color, fontWeight: 'bold' }}>{text}</Text>
    </View>
  )
}
