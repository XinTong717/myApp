import Taro from '@tarojs/taro'

export type UserProfile = {
  displayName?: string
  gender?: string
  ageRange?: string
  roles?: string[]
  province?: string
  city?: string
  childGender?: string
  childAgeRange?: string
  childDropoutStatus?: string
  childInterests?: string
  eduServices?: string
  bio?: string
  createdAt?: string
  updatedAt?: string
}

export async function getMe() {
  const res = await Taro.cloud.callFunction({
    name: 'getMe',
    data: {},
  })

  return res.result as {
    openid: string
    profile: UserProfile | null
  }
}

export async function saveProfile(data: {
  displayName: string
  gender: string
  ageRange: string
  roles: string[]
  province: string
  city: string
  childGender?: string
  childAgeRange?: string
  childDropoutStatus?: string
  childInterests?: string
  eduServices?: string
  bio?: string
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
