import { View, Text } from '@tarojs/components'
import AppCard from './AppCard'

type AppPageHeaderProps = {
  title: string
  description?: string
  action?: any
  className?: string
}

export default function AppPageHeader({ title, description, action, className }: AppPageHeaderProps) {
  return (
    <AppCard className={className} padding='16px'>
      <View className='app-page-header__title-row'>
        <View className='app-page-header__title-wrap'>
          <Text className='text-section-title text-color-main'>{title}</Text>
        </View>
        {action ? <View className='app-page-header__action'>{action}</View> : null}
      </View>
      {description ? (
        <View className='app-page-header__description'>
          <Text className='text-caption text-color-sub'>{description}</Text>
        </View>
      ) : null}
    </AppCard>
  )
}
