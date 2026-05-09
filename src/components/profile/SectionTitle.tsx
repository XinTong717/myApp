import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  text: string
  color?: string
}

export default function SectionTitle({ text, color = palette.brand }: Props) {
  return (
    <View style={{ marginBottom: space(1) }}>
      <Text style={{ ...typography.caption, color, fontWeight: 'bold' }}>{text}</Text>
    </View>
  )
}
