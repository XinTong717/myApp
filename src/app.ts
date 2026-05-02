import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { showWeappShareMenu } from './utils/share'

import './app.scss'

type WeappPrivacyResolve = (result: { event: 'agree' | 'disagree' }) => void

type WeappRuntime = {
  onNeedPrivacyAuthorization?: (callback: (resolve: WeappPrivacyResolve) => void) => void
  openPrivacyContract?: (options: { success?: () => void; fail?: () => void }) => void
  onError?: (callback: (error: string) => void) => void
  onUnhandledRejection?: (callback: (result: { reason?: unknown; promise?: Promise<unknown> }) => void) => void
}

function getWeappRuntime(): WeappRuntime | null {
  if (typeof wx === 'undefined') return null
  return wx as WeappRuntime
}

function stringifyUnknownError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}\n${error.stack || ''}`.trim()
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch (stringifyErr) {
    return String(error)
  }
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

function setupWeappGlobalErrorHandlers() {
  const wxapp = getWeappRuntime()
  if (!wxapp) return

  wxapp.onError?.((error) => {
    console.error('[app:onError]', error)
  })

  wxapp.onUnhandledRejection?.((result) => {
    console.error('[app:onUnhandledRejection]', stringifyUnknownError(result?.reason))
  })
}

function App({ children }: PropsWithChildren<Record<string, never>>) {
  useLaunch(() => {
    console.log('App launched.')
    if (process.env.TARO_ENV === 'weapp') {
      console.log(`[cloud] runtime env = ${__WEAPP_CLOUD_ENV_ID__}`)
      console.log(`[cloud] runtime mode = ${__WEAPP_RUNTIME_ENV__}`)

      setupWeappGlobalErrorHandlers()

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

      setupWeappPrivacyAuthorization()
      showWeappShareMenu()
    }
  })

  return children
}

export default App
