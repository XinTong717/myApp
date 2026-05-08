import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import AppCard from './AppCard'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppInfoRowProps = {
  label: string
  value?: string
  emptyText?: string
  copyable?: boolean
  emphasis?: boolean
  marginBottom?: string
}

export default function AppInfoRow({
  label,
  value,
  emptyText = '未填写',
  copyable = false,
  emphasis = false,
  marginBottom = space(3),
}: AppInfoRowProps) {
  const text = value || emptyText
  const handleCopy = () => {
    if (!copyable || !value) return
    Taro.setClipboardData({ data: value })
  }

  return (
    <AppCard
      onClick={copyable && value ? handleCopy : undefined}
      backgroundColor={palette.cardSoft}
      radius={radius.md}
      padding={space(3)}
      marginBottom={marginBottom}
      borderColor={palette.lineSoft}
      elevationLevel='none'
      border
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(1) }}>
        <Text style={{ ...typography.caption, color: palette.brand, flex: 1 }}>{label}</Text>
        {copyable && value ? <Text style={{ ...typography.micro, color: palette.subtext }}>点击复制</Text> : null}
      </View>
      <Text style={{ ...(emphasis ? typography.cardTitle : typography.body), color: palette.text }}>{text}</Text>
    </AppCard>
  )
}
