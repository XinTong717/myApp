import Taro from '@tarojs/taro'

export async function getMe() {
  const res = await Taro.cloud.callFunction({
    name: 'getMe',
    data: {},
  })

  return res.result as {
    openid: string
    profile: null | {
      displayName?: string
      role?: string
      city?: string
      bio?: string
      contact?: string
    }
  }
}

export async function saveProfile(data: {
  displayName: string
  role: string
  city: string
  bio: string
  contact: string
}) {
  const res = await Taro.cloud.callFunction({
    name: 'saveProfile',
    data,
  })

  return res.result as {
    ok: boolean
    mode?: 'create' | 'update'
    message?: string
    openid?: string
  }
}