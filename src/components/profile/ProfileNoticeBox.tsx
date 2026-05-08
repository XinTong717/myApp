import { Text } from '@tarojs/components'
import AppCard from '../common/AppCard'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type Props = {
  text: string
  dashed?: boolean
  marginBottom?: string
}

export default function ProfileNoticeBox({ text, dashed = true, marginBottom = space(3) }: Props) {
  return (
    <AppCard
      backgroundColor={palette.cardSoft}
      radius='16px'
      padding={`${space(3)} 14px`}
      marginBottom={marginBottom}
      borderColor={palette.line}
      dashed={dashed}
      flat
    >
      <Text className='text-micro text-color-sub'>{text}</Text>
    </AppCard>
  )
}
