import AppChip from '../../../components/common/AppChip'
import { space } from '../../../theme/spacing'

type ExploreChipTone = 'brand' | 'user' | 'educator' | 'neutral'

function mapTone(tone: ExploreChipTone | undefined) {
  if (tone === 'user') return 'green'
  if (tone === 'educator') return 'accent'
  if (tone === 'neutral') return 'neutral'
  return 'brand'
}

export function FilterChip(props: { active: boolean; tone?: ExploreChipTone; text: string; onClick: () => void }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} size='lg' selected={props.active} interactive onClick={props.onClick} />
}

export function ProvinceChip(props: { active: boolean; text: string; onClick: () => void }) {
  return <AppChip text={props.text} tone='action' size='md' selected={props.active} interactive marginBottom='0' onClick={props.onClick} />
}

export function Tag(props: { text: string; tone?: 'brand' | 'user' | 'neutral' }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} marginBottom={space(2)} />
}
