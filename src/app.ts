import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        env: 'cloud1-9g8njw4c79fb1322', // 你在云开发控制台创建环境后拿到的 envId
      })
    }
  })

  // children 是将要会渲染的页面
  return children
}
  


export default App
