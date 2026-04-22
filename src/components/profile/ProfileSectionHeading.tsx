import { View, Text } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  title: string
  description?: string
  marginBottom?: string
}

export default function ProfileSectionHeading({
  title,
  description,
  marginBottom = '10px',
}: Props) {
  return (
    <View style={{ marginBottom }}>
      <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>{title}</Text>
      {description ? (
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>{description}</Text>
        </View>
      ) : null}
    </View>
  )
}
