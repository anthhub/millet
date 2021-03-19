import { composeMiddleware } from './compose'
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
    const ctx = ({ ...config, millet: this, needRescue: false } as unknown) as T & U
    return this.callback(ctx).catch(error => {
      console.error(`millet error: `, error)
      return error
    })
  }

  private callback(ctx: T) {
    const fn = composeMiddleware(this.middleware)
    return fn(ctx, null as any)
  }
}
