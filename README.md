# [Millet](https://www.npmjs.com/package/millet)


[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE)
[![Build Status](https://api.travis-ci.com/anthhub/millet.svg?branch=main)](https://api.travis-ci.com/anthhub/millet.svg?branch=main)
[![Coverage Status](https://coveralls.io/repos/github/anthhub/millet/badge.svg?branch=master)](https://coveralls.io/github/anthhub/millet?branch=master)


受 `Koa` 启发, 想把 `Koa` 中间件机制通用化, 使用在任何地方.

`Millet` 是一个更通用, 更灵活的中间件框架; 结合 http 请求可实现 `Koa` 功能; 结合其他业务实现更多可能.


## 特性

- 支持 `Koa` 中间件 
- **支持中间件提前终止**
- **支持任务重试**
- 完美的 `TypeScript` 支持


## 在线体验

[![Edit](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/bold-benz-odd1g?file=/src/index.js)

### 组装 `Koa`
```ts
var http = require('http')
var Millet = require('millet').default

class App extends Millet {
  listen(port = 8080) {
    http
      .createServer((req, res) => {
        this.do({ req, res })
      })
      .listen(port)
    console.info(`listening: http://localhost:${port}`)
  }
}

const app = new App()

app.use(async (ctx, next) => {
  await next()
  const msg = 'url: ' + ctx.req.url
  ctx.res.write('Hello Millet! ' + msg)
  ctx.res.end()
})

app.listen()
```

## 安装

```bash
yarn add millet
npm install --save millet
```

## 快速上手

### 使用中间件

```ts
import Millet from 'Millet';
const millet = new Millet(/** middleware **/);

millet.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`spend ${ms}ms`);
});

millet.do()
```

> 支持 `Millet` 构造函数和 `use()` 方法传入中间件;  中间件执行顺序类似 `Koa`

### 自定义 Context

```ts
millet.use(async (ctx, next) => {
    ctx.res.data = await fetch(ctx.req)
    await next();
});

millet.do({req : { url:'http://liuma.top/api/data', method:'GET' }, res:{}})
```

>  `millet.do()` 触发中间件执行, 可传入自定义的 `Context`

### **提前终止中间件**

```ts
millet.use(async (ctx, next) => {
    const data = localStorage.getItem(ctx.req.url)
    if(data){
        ctx.res.data = data
        // 下游中间件将不会执行, 直接返回上游中间件
        return next.end();
    }
    await next();
});

millet.use(async (ctx, next) => {
    const { data } = await request(ctx.req)
    ctx.res.data = data
    await next();
});

millet.do( {req : { url:'http://liuma.top/api/data', method: 'GET' }, res:{} })
```
> 使用 `next.end()` 可以提前终止下游中间件的执行, 快速返回. 可类比 `golang` `gin` 框架中间件的 `c.Abort()` 方法.

> 可查看项目示例 `http.js` 中的 `流控中间件`


### **任务重试**

在一些业务中, 有时遇到接口 token 过期时, 会直接导致接口失败, 而且有可能本次的多个接口都因为 token 过期而失败.

此时在业务上一般是跳转登录页去获取新 token, 然后返回本页面触发接口发送; 或者是需要调用刷新 token 的接口后再刷新此页面. 

这两种方法都会导致页面不能正常工作而导致不好的用户体验.

而 `Millet` 可以在发现接口过期后, 立即挂起本次和后续请求, 此时调用接口的业务层都将会得到 `PENDING` 状态的 `Promise`.

等到 token 获取完毕后, 重试因为 token 而挂起的所有请求(包括 token 过期后导致失败的那次请求). 请求成功后, 业务层会得到 `FULFILLED` 状态的 `Promise`, 得到最终的结果.

使用 `Millet`, 业务代码无需改动, 可以正常获取数据, 而且对业务层是无感知的! 为此 `Millet` 内置了 `guard` 中间件实现这种需求.

```ts
    import Millet from 'Millet';

    const middleware1 = async (ctx: Context, next: Next) => {
      const token = localStorage.getItem('token')
      ctx.token = token
      await next()
    }

    const middleware2 = async (ctx: Context, next: Next) => {
       await next()

        ctx.req.token = localStorage.getItem('token')
        const { data, code } = await request(ctx.req)
        // 发现 token 过期
        if(code == 401){
            // 挂起后续请求
            ctx.reserved.suspend()
            theToke = await getToken()
            localStorage.setItem('token', theToke)
            // 释放挂起的请求 
            ctx.reserved.resume()
            // 重试之前失败的请求
            const { res: { data } } = await ctx.millet.retry({ ...ctx })
            ctx.res.data = data
        }else{
            ctx.res.data = data
        }
    }


    const millet = new Millet(middleware1, middleware2)

    // 这次请求因为 token 过期而失败, 然后被挂起. token 获取成功后, 会重试本次请求
   const data1 = await millet.do({req : { url:'http://liuma.top/api/data/1', method: 'GET' }, res:{}, ...ctx })

    // 被挂起, token 获取后会自动重试
    const data2 = await millet.do({req : { url:'http://liuma.top/api/data/2', method: 'GET' }, res:{}, ...ctx })

    // 被挂起, token 获取后会自动重试
    const data3 = await millet.do({req : { url:'http://liuma.top/api/data/3', method: 'GET' }, res:{}, ...ctx })

```
> `ctx.reserved.suspend()` 可以用来挂起后续请求; `ctx.reserved.resume()` 则可以用来释放被挂起的请求, 进行重试; `ctx.reserved.retry()` 可以使用传入的 `ctx` 立即重试.

> 可查看测试用例 `index.js` 中的 `rescue by guard` 测试用例

### 消息队列

有经验的人可能知道, 实际上 `Millet` 的 `guard` 中间件可以看成维护了一个 `消息队列`, 当消息的消费速度和消息的生产速度不匹配时, 或者为了解耦生产者和消费者, 就需要引入中间人 --  `消息队列` , 暂存生产的消息. 当然 `消息队列` 通常需要提供以下机制:

  - 消息保序性
  - 消息可靠性
  - 避免重复消费消息

对于第一点, `guard` 消费顺序按照队列先进先出执行(也提供自定义顺序), 所以这里消息的 `强保序性` 需要由业务保证. 比如多个请求有依赖关系, 必须逐个串行等待发送.

显而易见地, `guard` 提供了重试机制, 包括 `resume`, `retry` 等方法, 确保消息不被丢失.

至于第三点, `guard` 内部机制保证了, 一旦被消息被消费成功就会被移出 `消息队列`; 否则会被再次加入到队尾, 等待下次进行消费. 所以消息的严格顺序就无法保证了.

> 这里的 `消息队列` 在源码中称为 `taskQueue`, 即 `任务队列`. 在此上下文中, 可以认为它们是等价的.

## 进阶用法

`ctx.reserved` 上的 `suspend`, `resume`, `retry` 等方法是比较常用的方法. 针对一些特定场景 `Millet` 提供了其他 `API`

### 任务追加

在一些场景下, 由于一些原因, 消息现在不能被立即消费, 只能推入 `消息队列` 中去, 等待下次时机消费. 这时我们可以借助 `ctx.reserved.appendTask()` 方法, 把 `ctx` 传入, 将其加入到 `消息队列` 中去.

举一个典型而且常见的场景: 当网络抖动, 或者服务端进行发布的时候, 客户端(广义) 进行请求常常会得到 `502 Bad Gateway` 的错误. 此时业务层通常直接 `Fail`; 对于前端来说, 需要获取完整数据就需要不停地刷新页面, 直到返回正常. 实在是十分的 `dull`. 

实际上, 这种情况下我们可以对 `502` 的错误做特殊处理, 把消息推入队列中去, 使用一个 `ping()` 函数以一定时间间隔试探服务端. 当服务端服务正常后, 逐个取出消息进行重试. 这样一来, `502` 的错误将不再影响业务层.

> 可查看项目示例 `index.js` 中的 `重试中间件`


### 任务消费

上面有说道,  `消息队列` 中的消息是先进先出, 逐一取出消费的. 而且 `ctx.reserved.resume()` 这个方法, 是一次性消费队列中的所有消息. 那么如果开发者想按照自己定义的顺序消费, 或者自己挑选消息消费应该怎么办呢? `guard` 中间件并没有暴露出 `消息队列` (`taskQueue`) 给开发者, 原因是为了避免开发者直接修改 `taskQueue` 以保证消息的可靠性. 

对于这个需求, 可以使用 `ctx.reserved.walkTask()` 来解决, `walkTask()` 方法参数将会传入 `taskQueue` 副本, 也就是开发者直接增删改 `消息队列` 是无效的. 

每个消息都保存了 `Promise` 的 `resolve()`, `reject()` 方法 和 `ctx`, 开发者可以按照 `ctx` 属性筛选自己需要的消息, 按照自定义的顺序进行消费. 而当你使用 `resolve()`, `reject()` 方法消费时, 消息队列会自动将其移出队列. 开发者只需关注自己的业务, 而无需自行移除.

举一个实际的例子: 当服务端不能承受太大的并发压力时, 客户端进行大批量的请求(比如查询图片链接是否有效), 需要进行限流. 比如客户端始终维持 10 个请求, 当一个请求成功时再发生另一个请求. 可类比 `golang` 中 `goroutine` 使用带有缓冲区的 `chanel`. 如此可以减小服务端压力, 并且所用的时间最少.

对于 `guard` 中间件来说, 可以使用 `ctx.reserved.suspend()` 方法进行消息拦截, 只放行限制数量的请求. 当请求返回一个后, 使用 `ctx.reserved.walkTask()` 取出 `task[0]`, 调用其 `resolve()` 方法, 再补充一个请求. 

> 可查看项目示例 `index.js` 中的 `限流中间件`


## 其他

> 更多使用请查看示例, 测试用例和源码