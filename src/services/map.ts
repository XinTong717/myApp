import { callCloud } from './cloud'

export type MapUser = {
  _id: string
  displayName?: string
  roles?: string[]
  province?: string
  city?: string
  bio?: string
  companionContext?: string
  isSelf?: boolean
}

export async function getMapUsers() {
  return callCloud<{ users?: MapUser[] }>('getMapUsers')
}
