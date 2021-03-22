import { Context, Next } from '../type'

let releasing = false
let suspended = false
const taskQueue: any[] = []

function holdTask(ctx: Context) {
  return new Promise((resolve, reject) => taskQueue.push({ resolve, reject })).then(async () =>
    ctx.millet.do(ctx)
  )
}

function suspend() {
  suspended = true
}

function resume(state = true) {
  suspended = false
  releasing = true
  while (taskQueue.length) {
    const task = taskQueue.shift()
    if (state) {
      task.resolve()
    } else {
      task.reject('reject')
    }
  }
  releasing = false
}

export const guard = async (ctx: Context, next: Next) => {
  ctx.reserved.suspend = suspend
  ctx.reserved.resume = resume

  if (suspended && !ctx.reserved.skipGuard) {
    return holdTask(ctx)
  }

  await next()

  return ctx
}
