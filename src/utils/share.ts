import Taro from '@tarojs/taro'

type ShareAppMessageOptions = {
  title: string
  path: string
  imageUrl?: string
}

type ShareTimelineOptions = {
  title: string
  query?: string
  imageUrl?: string
}

export function showWeappShareMenu() {
  const wxapp = typeof wx !== 'undefined' ? (wx as any) : null
  if (!wxapp?.showShareMenu) return

  wxapp.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })
}

export function registerCurrentPageShare(options: {
  appMessage: ShareAppMessageOptions
  timeline: ShareTimelineOptions
}) {
  showWeappShareMenu()

  const page = Taro.getCurrentInstance()?.page as any
  if (!page) return

  page.onShareAppMessage = () => options.appMessage
  page.onShareTimeline = () => options.timeline
}
