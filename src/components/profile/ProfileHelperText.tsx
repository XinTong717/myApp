import { Text, View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  text: string
  marginBottom?: string
}

export default function ProfileHelperText({ text, marginBottom = space(2) }: Props) {
  return (
    <View style={{ marginBottom }}>
      <Text style={{ ...typography.caption, color: palette.subtext }}>{text}</Text>
    </View>
  )
}
