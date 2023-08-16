<h1 align="center">nest-ratelimiter</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/nest-ratelimiter">
    <img alt="npm" src="https://img.shields.io/npm/v/nest-ratelimiter" />
  </a>
  <a href="https://www.npmjs.com/package/nest-ratelimiter">
    <img alt="npm" src="https://img.shields.io/npm/dm/nest-ratelimiter" />
  </a>
  <a href="https://github.com/iamolegga/nestjs-ratelimiter/actions">
    <img alt="GitHub branch checks state" src="https://badgen.net/github/checks/iamolegga/nestjs-ratelimiter" />
  </a>
  <a href="https://codeclimate.com/github/iamolegga/nestjs-ratelimiter/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/abcce849fa20ece7a413/test_coverage" />
  </a>
  <a href="https://snyk.io/test/github/iamolegga/nestjs-ratelimiter">
    <img alt="Known Vulnerabilities" src="https://snyk.io/test/github/iamolegga/nestjs-ratelimiter/badge.svg" />
  </a>
  <a href="https://libraries.io/npm/nest-ratelimiter">
    <img alt="Libraries.io" src="https://img.shields.io/librariesio/release/npm/nest-ratelimiter" />
  </a>
  <img alt="Dependabot" src="https://badgen.net/github/dependabot/iamolegga/nestjs-ratelimiter" />
  <img alt="Supported platforms: Express & Fastify" src="https://img.shields.io/badge/platforms-Express%20%26%20Fastify-green" />
</p>

<p align="center"><b>The most flexible NestJS rate limiter based on Redis (rate limit against not only req path but req body to block distributed brute force attacks).</b></p>

## Install

```sh
npm i nest-ratelimiter ratelimiter @types/ratelimiter
```

**If you want to use the default response when reaching a limit (text: "Rate limit exceeded, retry in _human readable time value_") also install `ms`.**

```sh
npm i nest-ratelimiter ratelimiter @types/ratelimiter ms
```

## Usage

### Decorator

Let's start with controllers.
Controllers are the places where you set parameters for the rate-limiter guard.
You can set parameters for an entire controller or handler.
Also, you can override the parameters of an entire controller by providing parameters for a specific handler.
And finally, you can set several parameters for multi-checking.

```ts
import { RateLimiter, LimiterInfo } from 'nest-ratelimiter';

// Let's define several functions that returns the identifier
// to limit against.

// This is functions for limiting requests by IP
function getRequestIP(ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest();
  return request.ip;
}

// Also you can limit every path separately
function getRequestIPAndPath(ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest();
  return `${request.ip}:${request.path}`;
}

// For blocking brute force attacks on login
// you can return `login` value as identifier
function getRequestBodyLogin(ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest();
  return request.body.login;
}

// Now let's setup controller

@Controller('/')
// set params for entire controller
@RateLimiter({ getId: getRequestIP })
class TestController {
  // without providing params for specific handler
  // it will inherit params of entire controller
  @Get('some-api')
  someApi() {
    // ...
  }

  @Get('some-other-api')
  // override params for specific handler
  @RateLimiter({
    getId: getRequestIPAndPath,
    max: 10,
    duration: 10000,
  })
  someOtherApi() {
    // ...
  }

  @Get('one-more-api')
  // turn off rate limiter for specific handler
  @RateLimiter(false)
  oneMoreApi() {
    // ...
  }

  @Get('login')
  // override params for specific handler
  // by providing several params
  @RateLimiter(
    {
      getId: getRequestIPAndPath,
      max: 3,
      duration: 60 * 60 * 1000,
    },
    {
      getId: getRequestBodyLogin,
      max: 3,
      duration: 60 * 60 * 1000,
      // this is default `createErrorBody` function
      // but you can set your own
      createErrorBody: (limit: LimiterInfo) => {
        const delta = limit.reset * 1000 - Date.now();
        // ms is imported from `ms` module
        const readable = ms(delta, { long: true });
        return 'Rate limit exceeded, retry in ' + readable;
      },
    },
  )
  login(creds: CredsDto) {
    // ...
  }
}
```

Please, check out the docs of [ratelimiter npm module](https://www.npmjs.com/package/ratelimiter#result-object) for a better understanding of `@RateLimiter` configuration.


### Service

Another feature is using rate limiting in complex scenarios when `id` could not be retrieved from request context. For example when it's required to make a request for id in 3rd party systems:

```ts
import {
  RATE_LIMITER_ASSERTER_TOKEN,
  RateLimiterAsserter,
  setHeaders,
} from 'nest-ratelimiter'

@Controller('/')
class TestController {
  constructor(
    @Inject(RATE_LIMITER_ASSERTER_TOKEN)
    private asserter: RateLimiterAsserter,
    private db: DB;
  ) {}

  @Get('some-api')
  someApi(
    @Res({ passthrough: true }) response: any
  ) {
    const id = await this.db.getId();

    // this potentially throws `RateLimiterError` which is handled by internal
    // filter and mapped to `TooManyRequestsException`. If that doesn't fit your
    // needs, semply use filters, interceptors, try/catch to handle those errors
    const limiterInfo = this.asserter.assert({
      id,
      max: 10,
      duration: 24 * 60 * 60 * 1000,
    });

    // In this simple example limiterInfo is retrieved in controller and
    // `X-RateLimit-...` headers could be easily set with `setHeaders` function.
    // In a real world scenario this is done on a services layer and in a such
    // case limiterInfo should be passed back to a controller where there is an
    // access to underlying framework's response object. But this is optional
    // and only required if there is a need for such headers in a positive case.
    setHeaders(response, limiterInfo);
  }
}
```

## Setup

Let's move to module registration.
As `nest-ratelimiter` is using Redis as a data storage you have to provide an instance of `Redis` client (`redis` or `ioredis`). As Redis client instantiation is out of the scope of this package, you can find something that fits your needs [on npm](https://www.npmjs.com/search?q=nestjs%20redis) or create your own module for NestJS. Here we will show two examples: with [redis](https://www.npmjs.com/package/redis) and [nestjs-redis](https://www.npmjs.com/package/nestjs-redis) modules:

```ts
import { RedisModule } from 'nestjs-redis';
import { RateLimiterModule, LimiterInfo } from 'nest-ratelimiter';

@Module({
  imports: [

    // redis example

    RateLimiterModule.forRoot({

      // The only required field is `db` (redis client), all the rest fields
      // will be used as defaults for `@RateLimiter(...)` and RateLimiterAsserter
      db: require("redis").createClient()

    }),

    // nestjs-redis example

    RateLimiterModule.forRootAsync({

      // 1 Register third-party module that provides `redis` or `ioredis` client
      imports: [
        RedisModule.register({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT),
          db: parseInt(process.env.REDIS_DB),
        }),
      ],

      // 2 And then inject redis client provider
      inject: [RedisService],

      // 3. build and return `RateLimiterModuleParams` from factory
      useFactory: async (redisService: RedisService) => {

        // You can set default fields for every @RateLimiter and then you don't
        // have to copy-paste your params on entire codebase.

        // IF YOU SET `getId` HERE, THEN ALL CONTROLLERS (EVEN THOSE WITHOUT
        // @RateLimiter GUARD) WILL USE THIS FUNCTION BY DEFAULT. IF IN THAT
        // CASE YOU NEED TO TURN OFF RATE LIMITER ON SOME SPECIFIC HANDLER OR
        // CONTROLLER JUST USE `@RateLimiter(false)`

        return {
          db: redisService.getClient(),
          max: 10,
          duration: 10000,
          getId: getRequestIPAndPath;
          createErrorBody: (limit: LimiterInfo) => ({
            error: {
              code: 'MY-RATE-LIMIT-ERROR-CODE',
              params: limit,
            },
          }),
        };
      },

    }),
  ],
  controllers: [TestController],
})
class TestModule {}
```

## Comparison with others

This `nest-ratelimiter` is using TJ's [ratelimiter](https://www.npmjs.com/package/ratelimiter) package underhood, so it allows the creation of a flexible strategy for limiting not only per request path but per **headers** or **body** values or even asynchronously computed values on a services layer. **It stores data only in `redis`**. If you need another store you can look at [nestjs-rate-limiter](https://www.npmjs.com/package/nestjs-rate-limiter), but it allows the use of strategies based on a request path only. Also, there is an example in [official docs](https://docs.nestjs.com/techniques/security#rate-limiting) with setting up [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) middleware.

## Migration

### 0.3.0

- no need to use `app.useGlobalGuards` as now it's set automatically
- dropped support of nestjs < 8.0.0
- dropped support of node < 16.0.0

### 0.2.0

- `nestjs-redis` was moved from dependencies, now you are free to use any redis module that fit your needs, but you have to set new field `RateLimiterModuleParams.db` that should be `redis` or `ioredis` instance.
- `ratelimiter` (with `@types/ratelimiter`) was moved to peer dependencies. If you are using `npm@7` it will install it automatically, either way you should install it manually.

---

<h2 align="center">Do you use this library?<br/>Don't be shy to give it a star! ★</h2>

<h3 align="center">Also if you are into NestJS you might be interested in one of my <a href="https://github.com/iamolegga#nestjs">other NestJS libs</a>.</h3>
