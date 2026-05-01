import AppPrimaryButton from '../common/AppPrimaryButton'

type Props = {
  text: string
  loadingText?: string
  loading?: boolean
  onClick?: () => void
  marginBottom?: string
}

export default function ProfilePrimaryButton(props: Props) {
  return <AppPrimaryButton {...props} />
}
