import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'

type PillTone = 'brand' | 'neutral'

type BaseProps = {
  options: string[]
  tone?: PillTone
}

function getPillColors(active: boolean, tone: PillTone = 'brand') {
  if (active) {
    return {
      backgroundColor: palette.accentDeep,
      borderColor: palette.accentDeep,
      color: '#FFFFFF',
    }
  }

  return {
    backgroundColor: tone === 'brand' ? palette.surfaceSoft : palette.tag,
    borderColor: palette.line,
    color: palette.subtext,
  }
}

export function MultiPillSelect(props: BaseProps & { selected: string[]; onChange: (value: string[]) => void }) {
  const { options, selected, onChange, tone = 'brand' } = props

  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((option) => {
        const active = selected.includes(option)
        const colors = getPillColors(active, tone)

        return (
          <View
            key={option}
            onClick={() => onChange(active ? selected.filter((value) => value !== option) : [...selected, option])}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: colors.backgroundColor,
              border: `1px solid ${colors.borderColor}`,
            }}
          >
            <Text style={{ fontSize: '13px', color: colors.color }}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function SinglePillSelect(props: BaseProps & { selected: string; onChange: (value: string) => void; allowClear?: boolean }) {
  const { options, selected, onChange, tone = 'brand', allowClear = true } = props

  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((option) => {
        const active = selected === option
        const colors = getPillColors(active, tone)

        return (
          <View
            key={option}
            onClick={() => onChange(active && allowClear ? '' : option)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: colors.backgroundColor,
              border: `1px solid ${colors.borderColor}`,
            }}
          >
            <Text style={{ fontSize: '13px', color: colors.color }}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}
