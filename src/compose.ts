import { Context, Middleware, Next } from './type'

export function composeMiddleware<T extends Context>(middleware: Middleware<T>[]) {
  if (!Array.isArray(middleware)) {
    throw new TypeError('Middleware stack must be an array!')
  }

  // tslint:disable-next-line: only-arrow-functions
  return function(context: T, next: Middleware<T>) {
    // 记录上一次执行中间件的位置 #
    let index = -1

    return dispatch(0)

    function dispatch(i: number, willEnd = false): Promise<any> {
      if (willEnd) {
        return Promise.resolve()
      }

      // 理论上 i 会大于 index，因为每次执行一次都会把 i递增，
      // 如果相等或者小于，则说明next()执行了多次
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i
      // 取到当前的中间件
      let fn = middleware[i]
      if (i === middleware.length) {
        fn = next
      }
      if (!fn) {
        return Promise.resolve()
      }

      function nextFunc() {
        return dispatch(i + 1)
      }

      nextFunc.end = function() {
        return dispatch(0, true)
      }

      try {
        return Promise.resolve(fn(context, nextFunc))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
