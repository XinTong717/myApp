import { View, Text } from '@tarojs/components'
import { palette } from './palette'

type Props = {
  options: readonly string[] | string[]
  selected: string | string[]
  multi?: boolean
  onChange: (val: string | string[]) => void
}

export default function PillSelect(props: Props) {
  const { options, selected, multi, onChange } = props
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])

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
        return (
          <View
            key={opt}
            onClick={() => handleTap(opt)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              marginRight: '8px',
              marginBottom: '8px',
              backgroundColor: active ? palette.brand : palette.tag,
              border: `1px solid ${active ? palette.brand : palette.line}`,
            }}
          >
            <Text style={{ fontSize: '13px', color: active ? '#FFF' : palette.tagText }}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}
