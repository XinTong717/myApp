import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'

type AppPrimaryButtonProps = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
}

export default function AppPrimaryButton(props: AppPrimaryButtonProps) {
  const disabled = !!props.disabled || !!props.loading

  return (
    <View
      onClick={disabled ? undefined : props.onClick}
      style={{
        backgroundColor: disabled ? '#DDD' : palette.accentDeep,
        borderRadius: '16px',
        padding: '14px',
        textAlign: 'center',
        marginBottom: '30px',
        boxShadow: disabled ? 'none' : '0 8px 20px rgba(184,85,64,0.16)',
      }}
    >
      <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>
        {props.loading ? (props.loadingText || '处理中...') : props.text}
      </Text>
    </View>
  )
}
