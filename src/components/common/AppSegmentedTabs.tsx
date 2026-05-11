import { Text, View } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { elevation, radius, space } from '../../theme/spacing'

export type AppSegmentedTabOption<Key extends string = string> = {
  key: Key
  label: string
}

type AppSegmentedTabsProps<Key extends string> = {
  options: readonly AppSegmentedTabOption<Key>[]
  value: Key
  onChange: (value: Key) => void
  marginBottom?: string
}

export default function AppSegmentedTabs<Key extends string>({
  options,
  value,
  onChange,
  marginBottom = space(4),
}: AppSegmentedTabsProps<Key>) {
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
