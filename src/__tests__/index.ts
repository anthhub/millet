import Millet from '..'
import { rescuer } from '../middlewares/rescuer'

import { Context, Next } from '../type'

describe('millet', () => {
  test(`use middleware`, async () => {
    const predicted = [1, 3, 5, 6, 4, 2]
    const received: number[] = []

    const middleware1 = async (ctx: Context, next: Next) => {
      received.push(1)
      await next()
      received.push(2)
    }

    const middleware2 = async (ctx: Context, next: Next) => {
      received.push(3)
      await next()
      received.push(4)
    }

    const middleware3 = async (ctx: Context, next: Next) => {
      received.push(5)
      await next()
      received.push(6)
    }

    const millet = new Millet(middleware1, middleware2)

    millet.use(middleware3)

    await millet.do()

    expect(received).toStrictEqual(predicted)
  })

  test(`end middleware`, async () => {
    const predicted = [1, 2]
    const received: number[] = []

    const middleware1 = async (ctx: Context, next: Next) => {
      received.push(1)
      await next.end()
      received.push(2)
    }

    const middleware2 = async (ctx: Context, next: Next) => {
      received.push(3)
      await next()
      received.push(4)
    }

    const millet = new Millet(middleware1, middleware2)

    await millet.do()

    expect(received).toStrictEqual(predicted)
  })

  test(`rescue by rescuer`, async () => {
    const predicted = { num: Math.random() * 1000 }
    const token = Math.random() * 1000

    function wait(ms: number) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(ms)
        }, ms)
      })
    }

    // 模拟异步请求
    async function request(ctx: Context) {
      await wait(200 * Math.random())
      if (ctx.token !== token) {
        throw Error('Invalid token')
      }

      return { data: predicted, url: ctx.url }
    }

    const middleware1 = async (ctx: Context, next: Next) => {
      await next()
    }

    const middleware2 = async (ctx: Context, next: Next) => {
      try {
        ctx.data = await request(ctx)
      } catch (error) {
        // console.error(error)

        ctx.needRescue = true
      }

      await next()
    }
    const millet = new Millet(rescuer, middleware1, middleware2)

    const ctx = {
      rescue: async (ctx: Context) => {
        // 模拟异步获取 token
        await wait(100 * Math.random())
        ctx.token = token
      }
    }

    await Promise.all(
      new Array(10).fill(1).map((_, index) => {
        const url = 'http://liuma.top/api/data/' + index
        return millet.do({ ...ctx, url }).then(ctx => {
          // console.log(ctx.data.url, ctx.url, url)

          expect(ctx.url).toStrictEqual(url)
          expect(ctx.data.data).toStrictEqual(predicted)
          expect(ctx.data.url).toStrictEqual(url)
        })
      })
    )
  })
})
