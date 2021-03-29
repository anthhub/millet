import Millet from './node_modules/millet/dist/millet.es5.js'

const millet = new Millet()

const pingUrl = 'http://127.0.0.1:8080/api/ping'

let timer = null

function ping(ctx) {
  if (timer) {
    return
  }

  console.log('ping', ctx.url)

  timer = setInterval(() => {
    millet.do({ url: pingUrl }).then(() => {
      ctx.reserved.resume()
      clearInterval(timer)
      timer = null
    })
  }, 1000)
}

// 重试中间件
millet.use(async (ctx, next) => {
  await next()
  const response = ctx.res

  const status = response.status
  if (status < 300) {
    ctx.data = await response.text()
  }

  if (response.status == 502) {
    if (ctx.url === pingUrl) {
      throw new Error('ping fail')
    }
    ping(ctx)
    const { data } = await ctx.reserved.appendTask(ctx)
    ctx.data = data
  }
})

// let limit = 2
// let concurrent = 0

// 限流中间件
// millet.use(async (ctx, next) => {
//   concurrent++
//   console.log('concurrent', concurrent)
//   if (concurrent >= limit) {
//     ctx.reserved.suspend()
//   }

//   await next()
//   concurrent--
//   if (concurrent < limit) {
//     ctx.reserved.walkTask(task => {
//       task?.[0]?.resolve?.()
//     })
//   }
// })

// 业务中间件
millet.use(async (ctx, next) => {
  await next()
  const response = await fetch(ctx.url)
  ctx.res = response
})

const run = async () => {
  document.getElementById('root').innerHTML = ''
  const count = 10
  const results = await Promise.all(
    new Array(count).fill(1).map(async (_, index) => {
      const url = 'http://127.0.0.1:8080/api/data/' + index
      const { data } = await millet.do({ url })
      return data
    })
  ).catch(error => {
    console.error('error', error)
  })

  var ul = document.createElement('ul')

  results.forEach(result => {
    const li = document.createElement('li')
    li.innerText = result
    ul.appendChild(li)
  })
  document.getElementById('root').appendChild(ul)
}

run()

document.getElementById('Millet').addEventListener('click', run, false)
