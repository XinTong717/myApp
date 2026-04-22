import { View, Text } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  text: string
  loadingText?: string
  loading?: boolean
  onClick?: () => void
  marginBottom?: string
}

export default function ProfilePrimaryButton({
  text,
  loadingText = '处理中...',
  loading = false,
  onClick,
  marginBottom = '30px',
}: Props) {
  return (
    <View
      onClick={loading ? undefined : onClick}
      style={{
        backgroundColor: loading ? '#DDD' : palette.accentDeep,
        borderRadius: '16px',
        padding: '14px',
        textAlign: 'center',
        marginBottom,
      }}
    >
      <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>{loading ? loadingText : text}</Text>
    </View>
  )
}
