import Millet from './millet'

export type PlainObject = {
  [propName: string]: any
}

export type Config = PlainObject

export type Reserved = {
  suspend: () => void
  resume: (state?: boolean) => void
  skipGuard?: boolean
}

export type Context = PlainObject &
  Config & {
    millet: Millet<Context>
    reserved: Reserved
  }

export interface Next {
  (): Promise<any>
  end(): Promise<any>
}

export type Middleware<T extends Context> = (ctx: T, next: Next) => Promise<any>
