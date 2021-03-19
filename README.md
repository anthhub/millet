# [Millet](https://www.npmjs.com/package/millet)


[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/anthhub/millet.svg?branch=master&status=passed)](https://travis-ci.com/anthhub/millet.svg?branch=main)
[![Coverage Status](https://coveralls.io/repos/github/anthhub/millet/badge.svg?branch=master)](https://coveralls.io/github/anthhub/millet?branch=master)


受 `Koa` 启发, 想把 `Koa` 中间件机制通用化, 使用在任何地方.

`Millet` 是一个更通用, 更灵活的中间件框架; 结合 http 请求可实现 `Koa` 功能; 结合其他业务实现更多可能.

## 特性

- 支持 `Koa` 中间件 
- **支持中间件提前终止**
- **支持任务重试**
- 完美的 `TypeScript` 支持
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
        // 下游中间件将不会执行
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
> 使用 `next.end()` 可以提前终止下游中间件的执行, 快速返回


### **任务重试**

在一些业务中, 有时遇到接口 token 过期时, 会直接导致接口失败, 而且有可能本次的多个接口都因为 token 过期而失败.

此时在业务上一般是跳转登录页去获取新 token, 然后返回本页面触发接口发送; 或者是需要调用刷新 token 的接口后再刷新此页面. 

这两种方法都会导致页面不能正常工作而导致不好的用户体验.

而 `Millet` 可以在发现接口过期后, 立即挂起本次和后续请求, 此时调用接口的业务层都将会得到 `PENDING` 状态的 `Promise`

使用开发者自定义的 `ctx.rescue()` 方法, 获取最新 token, 之后重试因为 token 而挂起的所有请求(包括 token 过期后导致失败的那次请求). 请求成功后, 业务层会得到 `FULFILLED` 状态的 `Promise`

使用 `Millet`, 业务代码无需改动, 可以正常获取数据, 而且对业务层是无感知的!

```ts
    // 需要导入提供的 rescuer 中间件 
    import Millet, { rescuer } from 'Millet';
    const middleware1 = async (ctx: Context, next: Next) => {
        ctx.req.token = localStorage.getItem('token')
        const { data, code } = await request(ctx.req)
        // 发现 token 过期
        if(code == 401){
            // needRescue = true 后, 会挂起本次和后续请求
            ctx.needRescue = true
        }else{
            ctx.res.data = data
        }
        await next()
    }

    const ctx = {
      rescue: async (ctx: Context) => {
        // 异步获取 token
        ctx.token = await asyncGetToken()
        localStorage.setItem('token', ctx.token)
      }
    }

    // rescuer 中间件 可以使用开发者自定义的 rescue 方法, 异步获取 token, 之后再重试被挂起的请求
    const millet = new Millet(rescuer, middleware1)

    // 这次请求因为 token 过期而失败, 然后被挂起. Millet 会自动使用 ctx.rescue() 方法获取新 token, 再重试本次请求
   const data1 = await millet.do({req : { url:'http://liuma.top/api/data/1', method: 'GET' }, res:{}, ...ctx })

    // 被挂起, token 获取后会自动重试
    const data2 = await  millet.do({req : { url:'http://liuma.top/api/data/2', method: 'GET' }, res:{}, ...ctx })

    // 被挂起, token 获取后会自动重试
    const data3 = await millet.do({req : { url:'http://liuma.top/api/data/3', method: 'GET' }, res:{}, ...ctx })

```
> 这种场景下, 需要使用 `rescuer` 中间件, 并且需要在 `ctx` 提供 `rescue()` 方法


## 其他

> 更多使用请查看测试用例和源码