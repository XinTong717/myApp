import { Text } from '@tarojs/components'
import AppCard from '../common/AppCard'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'

type Props = {
  text: string
  dashed?: boolean
  marginBottom?: string
}

export default function ProfileNoticeBox({ text, dashed = true, marginBottom = space(3) }: Props) {
  return (
    <AppCard
      backgroundColor={palette.cardSoft}
      radius={radius.md}
      padding={`${space(3)} ${space(4)}`}
      marginBottom={marginBottom}
      borderColor={palette.line}
      border
      elevationLevel='none'
      style={dashed ? { borderStyle: 'dashed' } : undefined}
    >
      <Text className='text-micro text-color-sub'>{text}</Text>
    </AppCard>
  )
}
