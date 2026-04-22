import { Text, View } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  text: string
  marginBottom?: string
}

export default function ProfileHelperText({ text, marginBottom = '8px' }: Props) {
  return (
    <View style={{ marginBottom }}>
      <Text style={{ fontSize: '12px', color: palette.subtext }}>{text}</Text>
    </View>
  )
}
