import Millet from './millet'

export type PlainObject = {
  [propName: string]: any
}

export type Config = PlainObject

export type Reserved = {
  retry: (ctx: Context) => Promise<Context>
  appendTask: (ctx: Context) => Promise<Context>
  walkTask: (control: (taskQueue: Task[]) => any) => void
  suspend: () => void
  resume: (control?: boolean) => void
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

export type Task = {
  resolve: (data?: any) => void
  reject: (err?: any) => void
  ctx: Context
}
