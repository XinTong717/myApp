import { Text, View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'

type AppSegmentedTabOption<T extends string> = {
  key: T
  label: string
}

type AppSegmentedTabsProps<const TOptions extends readonly AppSegmentedTabOption<string>[]> = {
  options: TOptions
  value: TOptions[number]['key']
  onChange: (value: TOptions[number]['key']) => void
  marginBottom?: string
}

export default function AppSegmentedTabs<const TOptions extends readonly AppSegmentedTabOption<string>[]>({
  options,
  value,
  onChange,
  marginBottom = space(4),
}: AppSegmentedTabsProps<TOptions>) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: radius.md,
        padding: space(1),
        marginBottom,
        border: `1px solid ${palette.line}`,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {options.map((option, index) => {
        const active = value === option.key
        return (
          <View
            key={option.key}
            onClick={() => onChange(option.key)}
            style={{
              flex: 1,
              padding: `${space(3)} ${space(2)}`,
              borderRadius: radius.sm,
              backgroundColor: active ? palette.accentDeep : 'transparent',
              textAlign: 'center',
              boxShadow: active ? elevation.card : 'none',
            }}
          >
            <Text className='text-button' style={{ color: active ? palette.card : palette.subtext }}>
              {index + 1}. {option.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
