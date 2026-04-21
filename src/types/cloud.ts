export type CloudResultBase = {
  ok?: boolean
  message?: string
}

export type CloudResult<T extends Record<string, any> = Record<string, any>> = T & CloudResultBase
