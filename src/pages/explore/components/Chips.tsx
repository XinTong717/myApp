import { View, Text } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { chip, provinceChip } from '../styles'

export function FilterChip(props: { active: boolean; tone?: 'brand' | 'user' | 'educator' | 'neutral'; text: string; onClick: () => void }) {
  const styles = chip(props.active, props.tone || 'brand')
  return (
    <View onClick={props.onClick} style={styles.container}>
      <Text style={styles.text}>{props.text}</Text>
    </View>
  )
}

export function ProvinceChip(props: { active: boolean; text: string; onClick: () => void }) {
  const styles = provinceChip(props.active)
  return (
    <View onClick={props.onClick} style={styles.container}>
      <Text style={styles.text}>{props.text}</Text>
    </View>
  )
}

export function Tag(props: { text: string; tone?: 'brand' | 'user' | 'neutral' }) {
  const bg = props.tone === 'brand' ? palette.brandSoft : props.tone === 'user' ? palette.greenSoft : palette.tag
  const color = props.tone === 'brand' ? palette.brand : props.tone === 'user' ? palette.green : palette.tagText
  return (
    <View style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: bg, marginRight: '8px', marginBottom: '8px' }}>
      <Text style={{ fontSize: '12px', color }}>{props.text}</Text>
    </View>
  )
}
