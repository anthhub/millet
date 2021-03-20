var http = require("http");
var Millet = require("millet").default;

class App extends Millet {
  listen(port = 8080) {
    http
      .createServer((req, res) => {
        this.do({ req, res });
      })
      .listen(port);
    console.info(`Millet listening: http://localhost:${port}`);
  }
}

const app = new App();

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`spend ${ms}ms`);
});

app.use(async (ctx, next) => {
  await next();
  const msg = "url: " + ctx.req.url;
  ctx.res.write("Hello Millet! " + msg);
  ctx.res.end();
});

app.listen();
