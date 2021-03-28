import Millet from '..'

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

  test(`rescue by guard`, async () => {
    class LocalStorageMock {
      store: any = {}

      getItem(key: string) {
        return this.store[key] || null
      }

      setItem(key: string, value: any) {
        this.store[key] = String(value)
      }
    }

    const localStorage = new LocalStorageMock()

    const predicted: any = {}
    const token = String(Math.random() * 1000)

    function wait(ms: number) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(ms)
        }, ms)
      })
    }

    // 模拟异步获取 token
    async function getToken() {
      await wait(100 * Math.random())
      console.log('getToken', token)
      return token
    }

    // 模拟异步请求
    async function request(ctx: Context) {
      await wait(500 * Math.random())

      if (ctx.token !== token) {
        throw Error('Invalid token')
      }

      predicted[ctx.url] = Math.random() * 1000
      return { data: { [ctx.url]: predicted[ctx.url] }, url: ctx.url }
    }

    const middleware1 = async (ctx: Context, next: Next) => {
      const token = localStorage.getItem('token')
      ctx.token = token
      await next()
    }

    let processing = false

    const middleware2 = async (ctx: Context, next: Next) => {
      await next()

      ctx.data = await request(ctx).catch(async error => {
        if (error.message === 'Invalid token') {
          try {
            if (!processing) {
              processing = true
              ctx.reserved.suspend()

              const theToke = await getToken()
              localStorage.setItem('token', theToke)

              ctx.reserved.resume()
              processing = false
              const { data } = await ctx.reserved.retry({ ...ctx })
              return data
            } else {
              const { data } = await ctx.reserved.appendTask(ctx)
              return data
            }
          } catch (error) {
            return error
          }
        } else {
          return error
        }
      })
    }

    const millet = new Millet(middleware1, middleware2)

    const arr: string[] = []

    const count = 100

    await Promise.all(
      new Array(count).fill(1).map(async (_, index) => {
        const url = 'http://liuma.top/api/data/' + index
        await wait(500 * Math.random())
        return millet
          .do({ url })
          .then(ctx => {
            if (ctx?.url) {
              arr.push(ctx.url)
            } else {
              console.error(url)
            }

            expect(ctx.url).toStrictEqual(url)
            expect(ctx.data.url).toStrictEqual(url)
            expect(ctx.data.data[url]).toStrictEqual(predicted[url])
          })
          .catch(error => {
            console.error('result', error)
          })
      })
    )

    expect(arr.length).toStrictEqual(count)

    console.log(arr.sort((a, b) => a.localeCompare(b)))
  })
})
