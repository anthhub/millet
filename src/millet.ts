import { composeMiddleware } from './compose'
import { guard } from './middlewares/guard'
import { Config, Context, Middleware } from './type'

export default class Millet<T extends Context> {
  private middleware: Middleware<T>[] = []

  constructor(...middleware: Middleware<T>[]) {
    this.middleware = middleware
  }

  use(...middleware: Middleware<T>[]) {
    this.middleware = this.middleware.concat(middleware)
    return this
  }

  async do<U extends Config>(config: U = {} as U): Promise<T & U> {
    return this.handle(config, [guard, ...this.middleware])
  }

  private createContext<U extends Config>(config: U) {
    return { ...config, millet: this, reserved: { ...config.reserved } }
  }

  private handle<U extends Config>(config: U, middleware: Middleware<T>[]): Promise<T & U> {
    const ctx = (this.createContext(config) as unknown) as T & U

    return this.callback(ctx, middleware).catch(error => {
      console.error(`millet error: `, error)
      return error
    })
  }

  private callback(ctx: T, middleware: Middleware<T>[]) {
    const fn = composeMiddleware(middleware)
    return fn(ctx, null as any)
  }
}
