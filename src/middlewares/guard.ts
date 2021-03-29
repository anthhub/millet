import { Context, Next, Task } from '../type'

let releasing = false
let suspended = false
const taskQueue: Task[] = []

function holdTask(ctx: Context) {
  return new Promise((res, rej) => {
    const resolve = (arg: any) => {
      const index = taskQueue.findIndex(t => t.resolve === resolve)
      if (index !== -1) {
        taskQueue.splice(index, 1)
      }
      return res(arg)
    }
    const reject = (arg: any) => {
      const index = taskQueue.findIndex(t => t.reject === reject)
      if (index !== -1) {
        taskQueue.splice(index, 1)
      }
      return rej(arg)
    }

    return taskQueue.push({ resolve, reject, ctx })
  }).then((arg: any) => arg ?? ctx.reserved.retry(ctx))
}

function appendTask(ctx: Context) {
  return holdTask(ctx)
}

function walkTask(control: (taskQueue: Task[]) => any) {
  releasing = true
  control([...taskQueue])
  releasing = false
}

function suspend() {
  suspended = true
}

function resume(control = true) {
  suspended = false
  releasing = true
  ;[...taskQueue].forEach(task => {
    if (control) {
      task?.resolve()
    } else {
      task?.reject()
    }
  })
  releasing = false
}

function retry(ctx: Context) {
  ctx.reserved.skipGuard = true
  return ctx.millet.do(ctx)
}

const reserved = {
  suspend,
  resume,
  appendTask,
  walkTask,
  retry
}

export const guard = async (ctx: Context, next: Next) => {
  ctx.reserved = { ...ctx.reserved, ...reserved }

  if (suspended && !ctx.reserved.skipGuard) {
    return holdTask(ctx)
  }

  await next()

  return ctx
}
