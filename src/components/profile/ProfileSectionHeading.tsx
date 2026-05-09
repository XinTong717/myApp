import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  title: string
  description?: string
  marginBottom?: string
}

export default function ProfileSectionHeading({
  title,
  description,
  marginBottom = space(3),
}: Props) {
  return (
    <View style={{ marginBottom }}>
      <Text style={{ ...typography.bodyStrong, color: palette.text }}>{title}</Text>
      {description ? (
        <View style={{ marginTop: space(1) }}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>{description}</Text>
        </View>
      ) : null}
    </View>
  )
}
