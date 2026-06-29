import Taro from '@tarojs/taro'
import AppChip from '../../../components/common/AppChip'
import { space } from '../../../theme/spacing'

const ONLINE_PROVINCE = '线上'

type ExploreChipTone = 'brand' | 'user' | 'educator' | 'neutral'

function mapTone(tone: ExploreChipTone | undefined) {
  if (tone === 'user') return 'green'
  if (tone === 'educator') return 'accent'
  if (tone === 'neutral') return 'neutral'
  return 'brand'
}

export function FilterChip(props: { active: boolean; tone?: ExploreChipTone; text: string; onClick: () => void }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} size='md' selected={props.active} interactive onClick={props.onClick} />
}

export function ProvinceChip(props: { active: boolean; text: string; onClick: () => void }) {
  const handleClick = () => {
    if (props.text === ONLINE_PROVINCE) {
      Taro.reLaunch({ url: `/pages/schools/index?province=${encodeURIComponent(ONLINE_PROVINCE)}` })
      return
    }
    props.onClick()
  }

  return <AppChip text={props.text} tone='brand' size='md' selected={props.active} interactive marginBottom='0' onClick={handleClick} />
}

export function Tag(props: { text: string; tone?: 'brand' | 'user' | 'neutral' }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} marginBottom={space(2)} />
}