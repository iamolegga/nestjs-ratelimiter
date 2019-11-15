# nest-ratelimiter

Distributed consistent flexible NestJS rate limiter based on Redis.

## Install

```sh
npm i nest-ratelimiter nestjs-redis
```

or

```sh
yarn add nest-ratelimiter nestjs-redis
```

**If you want to use default response when riching limit (text: "Rate limit exceeded, retry in some time") also install `ms`.**

```sh
npm i nest-ratelimiter nestjs-redis ms
```

or

```sh
yarn add nest-ratelimiter nestjs-redis ms
```

## Usage

Let's start with controllers.
Controllers is the place where you set parameters for rate limiter guard.
You can set parameters for entire controller or handler.
Also you can override parameters of entire controller by parameters for certain handler.
And finally you can set several params for multi checking.

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
  // without providing params for certain handler
  // will inherit params of entire controller
  @Get('some-api')
  someApi() {
    // ...
  }

  @Get('some-other-api')
  // override params for certain handler
  @RateLimiter({
    getId: getRequestIPAndPath,
    max: 10,
    duration: 10000,
  })
  someOtherApi() {
    // ...
  }

  @Get('one-more-api')
  // turn off rate limiter for certain handler
  @RateLimiter(false)
  oneMoreApi() {
    // ...
  }

  @Get('login')
  // override params for certain handler
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

After controllers let's move to module registration.
As `nest-ratelimiter` is using `redis` as store for it's own data you have to install and register `nestjs-redis` module.
See more about `nestjs-redis` module configuration [here](https://www.npmjs.com/package/nestjs-redis).

```ts
import { RedisModule } from 'nestjs-redis';
import { RateLimiterModule, LimiterInfo } from 'nest-ratelimiter';

@Module({
  imports: [
    RedisModule.register({}),
    RateLimiterModule.forRoot(),

    // or you can create own connection for rate limiter
    RedisModule.register([
      { name: 'main' }
      { name: 'ratelimiter', db: 2 },
    ]),
    RateLimiterModule.forRoot({ name: 'ratelimiter' }),

    // or you can set default params for every controller
    // and then you don't have to copy-paste your params
    // on entire codebase. Also you can setup it in async way

    // IF YOU SET `getId` HERE, THAN ALL CONTROLLERS WILL USE THIS
    // FUNCTION BY DEFAULT. IF YOU NEED TO TURN OFF RATE LIMITER
    // ON SOME SPECIAL HANDLER OR CONTROLLER PASS `false` LIKE SO:
    //
    // @RateLimiter(false)

    RateLimiterModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return config.env === 'production' ? {
          name: 'ratelimiter',
          max: 10,
          duration: 10000,
          getId: getRequestIPAndPath;
          createErrorBody: (limit: LimiterInfo) => ({
            error: {
              code: 'MY-RATE-LIMIT-ERROR-CODE',
              params: limit,
            },
          }),
        } : {};
      },
    }),
  ],
  controllers: [TestController],
})
class TestModule {}
```

And the last one thing that you need to do is setup guard globally:

```ts
import { RATELIMITER_GUARD_TOKEN } from 'nest-ratelimiter';

const app = await NestFactory.create(AppModule);
app.useGlobalGuards(app.get(RATELIMITER_GUARD_TOKEN));
```
