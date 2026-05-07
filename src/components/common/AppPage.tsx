import { View } from '@tarojs/components'

type AppPageProps = {
  children: any
  flush?: boolean
  className?: string
  style?: Record<string, any>
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function AppPage({ children, flush = false, className, style }: AppPageProps) {
  return (
    <View className={joinClassNames('app-page', flush && 'app-page--flush', className)} style={style}>
      {children}
    </View>
  )
}
