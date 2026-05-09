import Taro from '@tarojs/taro'
import { Text } from '@tarojs/components'
import AppCard from './AppCard'
import AppRow from './AppRow'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppInfoRowVariant = 'compact' | 'prominent'

type AppInfoRowProps = {
  label: string
  value?: string
  copyable?: boolean
  emptyText?: string
  variant?: AppInfoRowVariant
  marginBottom?: string
}

export default function AppInfoRow({
  label,
  value,
  copyable = false,
  emptyText = '未填写',
  variant = 'compact',
  marginBottom,
}: AppInfoRowProps) {
  const displayValue = value || emptyText
  const isProminent = variant === 'prominent'
  const handleCopy = () => {
    if (copyable && value) Taro.setClipboardData({ data: value })
  }

  return (
    <AppCard
      onClick={copyable ? handleCopy : undefined}
      backgroundColor={isProminent ? palette.card : palette.cardSoft}
      radius={radius.md}
      padding={isProminent ? `${space(3)} ${space(4)}` : space(3)}
      marginBottom={marginBottom || (isProminent ? space(3) : space(2))}
      borderColor={isProminent ? palette.lineSoft : palette.cardSoft}
    >
      <AppRow marginBottom={isProminent ? space(2) : space(1)}>
        <Text style={{ ...(isProminent ? typography.bodyStrong : typography.caption), color: palette.brand, flex: 1 }}>{label}</Text>
        {copyable && value ? <Text style={{ ...typography.micro, color: palette.subtext }}>点击复制</Text> : null}
      </AppRow>
      <Text style={{ ...(isProminent ? typography.cardTitle : typography.body), color: palette.text }}>{displayValue}</Text>
    </AppCard>
  )
}
