import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { palette } from './palette'
import { typography } from '../../theme/typography'

type Props = {
  options: readonly string[] | string[]
  selected: string | string[]
  multi?: boolean
  onChange: (val: string | string[]) => void
}

export default function PillSelect(props: Props) {
  const { options, selected, multi, onChange } = props
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])
  const [pressedOption, setPressedOption] = useState('')

  const handleTap = (opt: string) => {
    if (multi) {
      const arr = Array.isArray(selected) ? [...selected] : []
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
      return
    }
    onChange(opt === selected ? '' : opt)
  }

  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((opt) => {
        const active = selectedSet.has(opt)
        const pressed = pressedOption === opt
        return (
          <View
            key={opt}
            onTouchStart={() => setPressedOption(opt)}
            onTouchEnd={() => setPressedOption('')}
            onTouchCancel={() => setPressedOption('')}
            onClick={() => handleTap(opt)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: active ? (pressed ? palette.brandPress : palette.brand) : (pressed ? palette.activeBg : palette.tag),
              border: `1px solid ${active ? palette.brand : pressed ? palette.focus : palette.line}`,
              boxShadow: active ? `0 3px 10px ${palette.shadow}` : 'none',
              transform: pressed ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            <Text style={{ ...typography.meta, color: active ? '#FFF' : palette.tagText, fontWeight: active ? '700' : '400' }}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}
