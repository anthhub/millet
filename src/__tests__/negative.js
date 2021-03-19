import Millet from '..'
import { composeMiddleware } from '../compose'

describe('millet error assert', () => {
  test(`composeMiddleware params error`, async () => {
    expect(() => composeMiddleware(1)).toThrow()
  })

  test(`middleware pre next error`, async () => {
    const middleware1 = async (ctx, next) => {
      throw new Error('pre next error')
      await next()
    }
    const millet = new Millet(middleware1)

    await millet.do().catch(e => {
      expect(e).toBeDefined()
    })
  })

  test(`middleware post next error`, async () => {
    const middleware1 = async (ctx, next) => {
      await next()
      throw new Error('post next error')
    }
    const millet = new Millet(middleware1)

    await millet.do().catch(e => {
      expect(e).toBeDefined()
    })
  })

  test(`middleware next called multiple times error`, async () => {
    const middleware1 = async (ctx, next) => {
      await next()
      await next()
    }
    const millet = new Millet(middleware1)

    await millet.do().catch(e => {
      expect(e).toBeDefined()
    })
  })
})
