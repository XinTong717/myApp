import { View, Text, Input } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type AppSearchBoxProps = {
  value: string
  placeholder: string
  helperText?: string
  onInput: (value: string) => void
}

export default function AppSearchBox({ value, placeholder, helperText, onInput }: AppSearchBoxProps) {
  return (
    <>
      <View className='app-search-box'>
        <Input
          type='text'
          value={value}
          placeholder={placeholder}
          placeholderStyle={`color:${palette.muted};font-size:${typography.body.fontSize};line-height:${typography.body.lineHeight}`}
          onInput={(e) => onInput(e.detail.value)}
          style={{ ...typography.body, color: palette.text }}
        />
      </View>
      {helperText ? (
        <View className='app-helper-text'>
          <Text className='text-caption text-color-muted'>{helperText}</Text>
        </View>
      ) : null}
    </>
  )
}
