import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'

import './app.scss'

function setupWeappPrivacyAuthorization() {
  const wxapp = typeof wx !== 'undefined' ? (wx as any) : null
  if (!wxapp?.onNeedPrivacyAuthorization) return

  wxapp.onNeedPrivacyAuthorization((resolve: (result: { event: 'agree' | 'disagree' }) => void) => {
    if (!wxapp?.openPrivacyContract) {
      resolve({ event: 'disagree' })
      return
    }

    wxapp.openPrivacyContract({
      success: () => resolve({ event: 'agree' }),
      fail: () => resolve({ event: 'disagree' }),
    })
  })
}

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        env: 'cloud1-9g8njw4c79fb1322', // 你在云开发控制台创建环境后拿到的 envId
      })
      setupWeappPrivacyAuthorization()
    }
  })

  return children
}

export default App
