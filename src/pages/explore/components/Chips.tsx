import AppChip from '../../../components/common/AppChip'

type ExploreChipTone = 'brand' | 'user' | 'educator' | 'neutral'

function mapTone(tone: ExploreChipTone | undefined) {
  if (tone === 'user') return 'green'
  if (tone === 'educator') return 'accent'
  if (tone === 'neutral') return 'neutral'
  return 'brand'
}

export function FilterChip(props: { active: boolean; tone?: ExploreChipTone; text: string; onClick: () => void }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} selected={props.active} interactive onClick={props.onClick} />
}

export function ProvinceChip(props: { active: boolean; text: string; onClick: () => void }) {
  return <AppChip text={props.text} tone='action' selected={props.active} interactive onClick={props.onClick} />
}

export function Tag(props: { text: string; tone?: 'brand' | 'user' | 'neutral' }) {
  return <AppChip text={props.text} tone={mapTone(props.tone)} />
}
