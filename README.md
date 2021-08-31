<h1 align="center">nest-ratelimiter</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/nest-ratelimiter">
    <img alt="npm" src="https://img.shields.io/npm/v/nest-ratelimiter" />
  </a>
  <img alt="GitHub branch checks state" src="https://badgen.net/github/checks/iamolegga/nestjs-ratelimiter" />
  <a href="https://codeclimate.com/github/iamolegga/nestjs-ratelimiter/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/abcce849fa20ece7a413/test_coverage" />
  </a>
  <img alt="Supported platforms: Express & Fastify" src="https://img.shields.io/badge/platforms-Express%20%26%20Fastify-green" />
</p>
<p align="center">
  <a href="https://snyk.io/test/github/iamolegga/nestjs-ratelimiter">
    <img alt="Snyk Vulnerabilities for npm package" src="https://img.shields.io/snyk/vulnerabilities/npm/nest-ratelimiter" />
  </a>
  <a href="https://david-dm.org/iamolegga/nestjs-ratelimiter">
    <img alt="Dependencies status" src="https://badgen.net/david/dep/iamolegga/nestjs-ratelimiter">
  </a>
  <img alt="Dependabot" src="https://badgen.net/dependabot/iamolegga/nestjs-ratelimiter/?icon=dependabot">
  <a href="https://codeclimate.com/github/iamolegga/nestjs-ratelimiter">
    <img alt="Maintainability" src="https://badgen.net/codeclimate/maintainability/iamolegga/nestjs-ratelimiter">
  </a>
</p>

<p align="center"><b>The most flexible NestJS rate limiter based on Redis (rate limit against not only req path but req body to block distributed brute force attacks).</b></p>

## Install

```sh
npm i nest-ratelimiter ratelimiter @types/ratelimiter
```

**If you want to use default response when reaching limit (text: "Rate limit exceeded, retry in _human readable time value_") also install `ms`.**

```sh
npm i nest-ratelimiter ratelimiter @types/ratelimiter ms
```

## Usage

Let's start with controllers.
Controllers are the places where you set parameters for rate-limiter guard.
You can set parameters for an entire controller or handler.
Also, you can override the parameters of an entire controller by providing parameters for a specific handler.
And finally, you can set several params for multi-checking.

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

Please, check out the docs of [ratelimiter npm module](https://www.npmjs.com/package/ratelimiter#result-object) for better understanding of `@RateLimiter` configuration.

Let's move to module registration.
As `nest-ratelimiter` is using `redis` as data store you have to provide an instance of Redis client (`redis` or `ioredis`). As Redis client instantiation is out of scope of this package, you can find something that fit your needs [on npm](https://www.npmjs.com/search?q=nestjs%20redis) or create your own module for NestJS. Here we will show an example with [nestjs-redis](https://www.npmjs.com/package/nestjs-redis) module:

```ts
import { RedisModule } from 'nestjs-redis';
import { RateLimiterModule, LimiterInfo } from 'nest-ratelimiter';

@Module({
  imports: [
    RateLimiterModule.forRoot({

      // The only required field is `db` (redis client), all the rest fields
      // will be used as defaults for `@RateLimiter(...)`
      db: require("redis").createClient()

    }),

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

And the last thing to do is set up guard globally:

```ts
import { RATELIMITER_GUARD_TOKEN } from 'nest-ratelimiter';

const app = await NestFactory.create(AppModule);
app.useGlobalGuards(app.get(RATELIMITER_GUARD_TOKEN));
```

## Comparison with others

This `nest-ratelimiter` is using TJ's [ratelimiter](https://www.npmjs.com/package/ratelimiter) package underhood, so it allows the creation of really flexible strategy for limiting not only per request path but per **headers** or **body** values and so on (see examples above). **It stores data only in `redis`**. If you need another store you can look at [nestjs-rate-limiter](https://www.npmjs.com/package/nestjs-rate-limiter), but it allows the use of strategies based on request path only. Also there is an example in [official docs](https://docs.nestjs.com/techniques/security#rate-limiting) with setting up [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) middleware.

## Migration

### 0.2.0

- `nestjs-redis` was moved from dependencies, now you are free to use any redis module that fit your needs, but you have to set new field `RateLimiterModuleParams.db` that should be `redis` or `ioredis` instance.
- `ratelimiter` (with `@types/ratelimiter`) was moved to peer dependencies. If you are using `npm@7` it will install it automatically, either way you should install it manually.

---

<h2 align="center">Do you use this library?<br/>Don't be shy to give it a star! ★</h2>

Also, if you are into NestJS ecosystem you may be interested in one of my other libs:

[nestjs-pino](https://github.com/iamolegga/nestjs-pino)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-pino?style=flat-square)](https://github.com/iamolegga/nestjs-pino)
[![npm](https://img.shields.io/npm/dm/nestjs-pino?style=flat-square)](https://www.npmjs.com/package/nestjs-pino)

Platform agnostic logger for NestJS based on [pino](http://getpino.io/) with request context in every log

---

[nestjs-session](https://github.com/iamolegga/nestjs-session)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-session?style=flat-square)](https://github.com/iamolegga/nestjs-session)
[![npm](https://img.shields.io/npm/dm/nestjs-session?style=flat-square)](https://www.npmjs.com/package/nestjs-session)

Idiomatic session module for NestJS. Built on top of [express-session](https://www.npmjs.com/package/express-session)

---

[nestjs-cookie-session](https://github.com/iamolegga/nestjs-cookie-session)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-cookie-session?style=flat-square)](https://github.com/iamolegga/nestjs-cookie-session)
[![npm](https://img.shields.io/npm/dm/nestjs-cookie-session?style=flat-square)](https://www.npmjs.com/package/nestjs-cookie-session)

Idiomatic cookie session module for NestJS. Built on top of [cookie-session](https://www.npmjs.com/package/cookie-session)

---

[nestjs-roles](https://github.com/iamolegga/nestjs-roles)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-roles?style=flat-square)](https://github.com/iamolegga/nestjs-roles)
[![npm](https://img.shields.io/npm/dm/nestjs-roles?style=flat-square)](https://www.npmjs.com/package/nestjs-roles)

Type safe roles guard and decorator made easy

---

[nestjs-injectable](https://github.com/segmentstream/nestjs-injectable)

[![GitHub stars](https://img.shields.io/github/stars/segmentstream/nestjs-injectable?style=flat-square)](https://github.com/segmentstream/nestjs-injectable)
[![npm](https://img.shields.io/npm/dm/nestjs-injectable?style=flat-square)](https://www.npmjs.com/package/nestjs-injectable)

`@Injectable()` on steroids that simplifies work with inversion of control in your hexagonal architecture

---

[nest-ratelimiter](https://github.com/iamolegga/nestjs-ratelimiter)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-ratelimiter?style=flat-square)](https://github.com/iamolegga/nestjs-ratelimiter)
[![npm](https://img.shields.io/npm/dm/nest-ratelimiter?style=flat-square)](https://www.npmjs.com/package/nest-ratelimiter)

Distributed consistent flexible NestJS rate limiter based on Redis

---

[create-nestjs-middleware-module](https://github.com/iamolegga/create-nestjs-middleware-module)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/create-nestjs-middleware-module?style=flat-square)](https://github.com/iamolegga/create-nestjs-middleware-module)
[![npm](https://img.shields.io/npm/dm/create-nestjs-middleware-module?style=flat-square)](https://www.npmjs.com/package/create-nestjs-middleware-module)

Create simple idiomatic NestJS module based on Express/Fastify middleware in just a few lines of code with routing out of the box

---

[nestjs-configure-after](https://github.com/iamolegga/nestjs-configure-after)

[![GitHub stars](https://img.shields.io/github/stars/iamolegga/nestjs-configure-after?style=flat-square)](https://github.com/iamolegga/nestjs-configure-after)
[![npm](https://img.shields.io/npm/dm/nestjs-configure-after?style=flat-square)](https://www.npmjs.com/package/nestjs-configure-after)

Declarative configuration of NestJS middleware order
