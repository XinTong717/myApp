import { View, Text } from '@tarojs/components'
import { palette } from './palette'

type Props = {
  text: string
  color?: string
}

export default function SectionTitle({ text, color = palette.brand }: Props) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color, fontWeight: 'bold' }}>{text}</Text>
    </View>
  )
}
