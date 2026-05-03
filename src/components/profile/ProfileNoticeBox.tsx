import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type Props = {
  text: string
  dashed?: boolean
  marginBottom?: string
}

export default function ProfileNoticeBox({ text, dashed = true, marginBottom = space(3) }: Props) {
  return (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderRadius: '16px',
        padding: `${space(3)} 14px`,
        marginBottom,
        border: dashed ? `1px dashed ${palette.line}` : `1px solid ${palette.line}`,
      }}
    >
      <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{text}</Text>
    </View>
  )
}
