import { Text, View } from '@tarojs/components'

type Props = {
  current: number
  max: number
  marginTop?: string
  marginBottom?: string
}

export default function ProfileCounterText({
  current,
  max,
  marginTop = '4px',
  marginBottom = '8px',
}: Props) {
  return (
    <View style={{ marginTop, marginBottom }}>
      <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{current}/{max}</Text>
    </View>
  )
}
