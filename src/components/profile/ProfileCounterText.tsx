import { Text, View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  current: number
  max: number
  marginTop?: string
  marginBottom?: string
}

export default function ProfileCounterText({
  current,
  max,
  marginTop = space(1),
  marginBottom = space(2),
}: Props) {
  return (
    <View style={{ marginTop, marginBottom }}>
      <Text style={{ ...typography.micro, ...typography.number, color: palette.muted }}>{current}/{max}</Text>
    </View>
  )
}
