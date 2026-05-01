import { MultiPillSelect, SinglePillSelect } from '../common/PillSelect'

type Props = {
  options: readonly string[] | string[]
  selected: string | string[]
  multi?: boolean
  onChange: (val: string | string[]) => void
}

export default function PillSelect(props: Props) {
  if (props.multi) {
    return (
      <MultiPillSelect
        options={props.options}
        selected={Array.isArray(props.selected) ? props.selected : []}
        onChange={props.onChange}
      />
    )
  }

  return (
    <SinglePillSelect
      options={props.options}
      selected={Array.isArray(props.selected) ? '' : props.selected}
      onChange={props.onChange}
    />
  )
}
