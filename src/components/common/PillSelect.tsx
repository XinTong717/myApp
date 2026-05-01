import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type PillTone = 'brand' | 'neutral'

type BaseProps = {
  options: readonly string[] | string[]
  tone?: PillTone
  marginBottom?: string
}

function getPillColors(active: boolean, pressed: boolean, tone: PillTone = 'brand') {
  if (active) {
    return {
      backgroundColor: pressed ? palette.brandPress : palette.brand,
      borderColor: palette.brand,
      color: '#FFFFFF',
      boxShadow: `0 3px 10px ${palette.shadow}`,
    }
  }

  return {
    backgroundColor: pressed ? palette.activeBg : tone === 'brand' ? palette.surfaceSoft : palette.tag,
    borderColor: pressed ? palette.focus : palette.line,
    color: palette.tagText,
    boxShadow: 'none',
  }
}

export function MultiPillSelect(props: BaseProps & { selected: string[]; onChange: (value: string[]) => void }) {
  const { options, selected, onChange, tone = 'brand', marginBottom = '12px' } = props
  const [pressedOption, setPressedOption] = useState('')

  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom }}>
      {options.map((option) => {
        const active = selected.includes(option)
        const pressed = pressedOption === option
        const colors = getPillColors(active, pressed, tone)

        return (
          <View
            key={option}
            onTouchStart={() => setPressedOption(option)}
            onTouchEnd={() => setPressedOption('')}
            onTouchCancel={() => setPressedOption('')}
            onClick={() => onChange(active ? selected.filter((value) => value !== option) : [...selected, option])}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: colors.backgroundColor,
              border: `1px solid ${colors.borderColor}`,
              boxShadow: colors.boxShadow,
              transform: pressed ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            <Text style={{ ...typography.meta, color: colors.color, fontWeight: active ? '700' : '400' }}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function SinglePillSelect(props: BaseProps & { selected: string; onChange: (value: string) => void; allowClear?: boolean }) {
  const { options, selected, onChange, tone = 'brand', allowClear = true, marginBottom = '12px' } = props
  const [pressedOption, setPressedOption] = useState('')

  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom }}>
      {options.map((option) => {
        const active = selected === option
        const pressed = pressedOption === option
        const colors = getPillColors(active, pressed, tone)

        return (
          <View
            key={option}
            onTouchStart={() => setPressedOption(option)}
            onTouchEnd={() => setPressedOption('')}
            onTouchCancel={() => setPressedOption('')}
            onClick={() => onChange(active && allowClear ? '' : option)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: colors.backgroundColor,
              border: `1px solid ${colors.borderColor}`,
              boxShadow: colors.boxShadow,
              transform: pressed ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            <Text style={{ ...typography.meta, color: colors.color, fontWeight: active ? '700' : '400' }}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}
