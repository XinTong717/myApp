import { View, Text, Input } from '@tarojs/components'
import { palette } from '../../theme/palette'

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
          placeholderStyle={`color:${palette.muted}`}
          onInput={(e) => onInput(e.detail.value)}
        />
      </View>
      {helperText ? (
        <View className='app-helper-text'>
          <Text className='text-micro text-color-muted'>{helperText}</Text>
        </View>
      ) : null}
    </>
  )
}
