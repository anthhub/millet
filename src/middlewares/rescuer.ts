import { Context, Next } from '../type'

let isRescuing = false
let taskQueue: any[] = []

// 守卫中间件 可以无感阻截
export const rescuer = async (ctx: Context, next: Next) => {
  if (ctx.needRescue) {
    return holdTask(next, taskQueue)
  }

  await next()

  if (!ctx?.rescue) {
    return ctx
  }

  if (ctx.needRescue) {
    if (!isRescuing) {
      isRescuing = true

      const task = async () => {
        try {
          await ctx?.rescue?.(ctx)

          taskQueue.forEach(item => item.resolve())
        } catch (error) {
          taskQueue.forEach(item => item.reject(error))
          throw error
        } finally {
          ctx.needRescue = false
          isRescuing = false
          taskQueue = []
        }
      }

      // no wait
      task()
    }

    return holdTask((() => ctx.millet.do(ctx)) as Next, taskQueue)
  }

  return ctx
}

function holdTask(next: Next, taskQueue: any[]) {
  return new Promise((resolve, reject) => taskQueue.push({ resolve, reject })).then(() => next())
}
