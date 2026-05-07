import { View, Text, ScrollView } from '@tarojs/components'

type AppFilterRowProps = {
  title: string
  children: any
  className?: string
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function AppFilterRow({ title, children, className }: AppFilterRowProps) {
  return (
    <View className={joinClassNames('app-filter-row', className)}>
      <Text className='text-body-strong text-color-sub'>{title}</Text>
      <ScrollView scrollX enhanced showScrollbar={false} className='app-filter-row__scroll'>
        <View className='app-filter-row__content'>{children}</View>
      </ScrollView>
    </View>
  )
}
