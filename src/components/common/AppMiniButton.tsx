import { View, Text } from '@tarojs/components'

type AppMiniButtonProps = {
  text: string
  onClick?: () => void
  className?: string
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function AppMiniButton({ text, onClick, className }: AppMiniButtonProps) {
  return (
    <View onClick={onClick} className={joinClassNames('app-mini-button', className)}>
      <Text className='text-button text-color-white'>{text}</Text>
    </View>
  )
}
