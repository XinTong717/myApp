import { Text, View } from '@tarojs/components'
import { profilePalette as palette } from './palette'

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
      <Text style={{ fontSize: '11px', color: palette.muted }}>{current}/{max}</Text>
    </View>
  )
}
