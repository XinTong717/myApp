import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { showWeappShareMenu } from './utils/share'

import './app.scss'

type WeappPrivacyResolve = (result: { event: 'agree' | 'disagree' }) => void

type WeappRuntime = {
  onNeedPrivacyAuthorization?: (callback: (resolve: WeappPrivacyResolve) => void) => void
  openPrivacyContract?: (options: { success: () => void; fail: () => void }) => void
  onError?: (callback: (error: string) => void) => void
  onUnhandledRejection?: (callback: (result: { reason?: unknown; promise?: Promise<unknown> }) => void) => void
}

function getWeappRuntime(): WeappRuntime | null {
  return typeof wx !== 'undefined' ? wx as WeappRuntime : null
}

function stringifyErrorReason(reason: unknown) {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}\n${reason.stack || ''}`.trim()
  if (typeof reason === 'string') return reason
  try {
    return JSON.stringify(reason)
  } catch (err) {
    return String(reason)
  }
}

function logGlobalClientError(scene: string, error: unknown) {
  const message = stringifyErrorReason(error)
  console.error(`[client:${scene}]`, {
    message,
    cloudEnv: __WEAPP_CLOUD_ENV_ID__,
    runtimeEnv: __WEAPP_RUNTIME_ENV__,
  })
}

function setupWeappPrivacyAuthorization() {
  const wxapp = getWeappRuntime()
  if (!wxapp?.onNeedPrivacyAuthorization) return

  wxapp.onNeedPrivacyAuthorization((resolve) => {
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

function setupGlobalErrorHandlers() {
  const wxapp = getWeappRuntime()
  if (!wxapp) return

  wxapp.onError?.((error) => {
    logGlobalClientError('onError', error)
  })

  wxapp.onUnhandledRejection?.((result) => {
    logGlobalClientError('onUnhandledRejection', result.reason)
  })
}

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('App launched.')
    if (process.env.TARO_ENV === 'weapp') {
      console.log(`[cloud] runtime env = ${__WEAPP_CLOUD_ENV_ID__}`)
      console.log(`[cloud] runtime mode = ${__WEAPP_RUNTIME_ENV__}`)

      try {
        Taro.cloud.init({
          env: __WEAPP_CLOUD_ENV_ID__,
        })
      } catch (err) {
        console.error('[cloud] init failed:', err)
        Taro.showToast({ title: '云服务初始化失败，请稍后重试', icon: 'none' })
      }

      if (__WEAPP_IS_FALLBACK_CLOUD_ENV__) {
        console.warn(`[cloud] ${__WEAPP_RUNTIME_ENV} build is using the fallback cloud env. Set TARO_APP_CLOUD_ENV in .env.development and .env.production to isolate test and production data.`)
      }

      setupGlobalErrorHandlers()
      setupWeappPrivacyAuthorization()
      showWeappShareMenu()
    }
  })

  return children
}

export default App
