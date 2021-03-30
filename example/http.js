const http = require('http')
const Millet = require('millet')

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(ms)
    }, ms)
  })
}

class App extends Millet {
  listen(port) {
    http
      .createServer((req, res) => {
        this.do({ req, res })
      })
      .listen(port)
    console.info(`Millet listening: http://localhost:${port}`)
  }
}

const app = new App()

let count = 0
let concurrent = 0
let limit = 200

// 统计中间件
app.use(async (ctx, next) => {
  count++
  concurrent++
  const start = Date.now()

  console.log('concurrent', concurrent)
  await next()
  const ms = Date.now() - start
  console.log(`spend ${ms}ms`)
  concurrent--
})

// 流控中间件
app.use(async (ctx, next) => {
  ctx.res.setHeader('Access-Control-Allow-Origin', '*')
  if (count % 3 === 0) {
    ctx.res.statusCode = 502
    ctx.res.end()
    await next.end()
    console.error(502)
    return
  }

  if (concurrent > limit) {
    ctx.res.statusCode = 500
    ctx.res.end()
    await next.end()
    console.error(500)
    return
  }

  await next()
})

// 业务中间件
app.use(async (ctx, next) => {
  console.log('application')
  await next()
  await wait(1000 * Math.random())
  const msg = 'url: ' + ctx.req.url
  ctx.res.write('Hello Millet! ' + msg)
  ctx.res.end()
})

app.listen(8080)
