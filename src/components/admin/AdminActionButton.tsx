import { space } from '../../theme/spacing'
import AppPrimaryButton from '../common/AppPrimaryButton'

type Variant = 'primary' | 'success' | 'secondary' | 'danger' | 'neutral'

type Props = {
  text: string
  loadingText?: string
  loading?: boolean
  disabled?: boolean
  variant?: Variant
  onClick?: () => void
  marginRight?: string
  marginBottom?: string
}

function mapVariant(variant: Variant) {
  if (variant === 'danger') return 'dangerSoft'
  if (variant === 'neutral') return 'neutral'
  return variant
}

export default function AdminActionButton({
  text,
  loadingText = '处理中...',
  loading = false,
  disabled = false,
  variant = 'secondary',
  onClick,
  marginRight = space(2),
  marginBottom = space(2),
}: Props) {
  return (
    <AppPrimaryButton
      text={text}
      loadingText={loadingText}
      loading={loading}
      disabled={disabled}
      variant={mapVariant(variant)}
      size='sm'
      appearance='inline'
      marginRight={marginRight}
      marginBottom={marginBottom}
      onClick={onClick}
    />
  )
}
