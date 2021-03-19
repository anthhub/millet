import Millet from './millet'

export type PlainObject = {
  [propName: string]: any
}

export type Config = PlainObject & {
  rescue?: (ctx: Context) => any
}

export type Context = PlainObject &
  Config & {
    millet: Millet<Context>
    needRescue: boolean
  }

export interface Next {
  (): Promise<any>
  end(): Promise<any>
}

export type Middleware<T extends Context> = (ctx: T, next: Next) => Promise<any>
