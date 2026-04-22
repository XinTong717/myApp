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
        env: __WEAPP_CLOUD_ENV_ID__,
      })

      if (__WEAPP_IS_SHARED_CLOUD_ENV__) {
        console.warn(`[cloud] ${__WEAPP_RUNTIME_ENV} build is using a shared cloud env. Set TARO_APP_CLOUD_ENV_DEV and TARO_APP_CLOUD_ENV_PROD to isolate test and production data.`)
      }

      setupWeappPrivacyAuthorization()
    }
  })

  return children
}

export default App
