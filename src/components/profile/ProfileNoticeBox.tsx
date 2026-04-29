import { View, Text } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  text: string
  dashed?: boolean
  marginBottom?: string
}

export default function ProfileNoticeBox({ text, dashed = true, marginBottom = '12px' }: Props) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: '16px',
        padding: '12px 14px',
        marginBottom,
        border: dashed ? `1px dashed ${palette.line}` : `1px solid ${palette.line}`,
      }}
    >
      <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{text}</Text>
    </View>
  )
}
