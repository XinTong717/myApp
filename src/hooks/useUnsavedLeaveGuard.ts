import { useEffect } from 'react'
import Taro from '@tarojs/taro'

export function useUnsavedLeaveGuard(enabled: boolean, message = '当前页面有未保存内容，确定要离开吗？') {
  useEffect(() => {
    const taroAny = Taro as any
    if (!enabled) {
      taroAny.disableAlertBeforeUnload?.()
      return
    }

    taroAny.enableAlertBeforeUnload?.({ message })

    return () => {
      taroAny.disableAlertBeforeUnload?.()
    }
  }, [enabled, message])
}
