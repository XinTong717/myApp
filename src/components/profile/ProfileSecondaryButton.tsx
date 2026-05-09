import AppPrimaryButton from '../common/AppPrimaryButton'
import { space } from '../../theme/spacing'

type Props = {
  text: string
  onClick?: () => void
  disabled?: boolean
  marginBottom?: string
}

export default function ProfileSecondaryButton({
  text,
  onClick,
  disabled = false,
  marginBottom = space(5),
}: Props) {
  return (
    <AppPrimaryButton
      text={text}
      disabled={disabled}
      variant='secondary'
      size='md'
      marginBottom={marginBottom}
      onClick={onClick}
    />
  )
}
