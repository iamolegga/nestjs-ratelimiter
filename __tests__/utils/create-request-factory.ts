import {
  applyDecorators,
  Controller,
  DynamicModule,
  Get,
  Inject,
  Module,
  Res,
  Type,
} from '@nestjs/common';
import { AbstractHttpAdapter, NestFactory } from '@nestjs/core';
import * as request from 'supertest';

import {
  setHeaders,
  RateLimiter,
  RateLimiterAsserter,
  RateLimiterParams,
  RATE_LIMITER_ASSERTER_TOKEN,
} from '../../src';

import { fastifyExtraWait } from './fastify-extra-wait';

export function CreateRequestFactory(
  Platform: Type<AbstractHttpAdapter<unknown, unknown, unknown>>,
  asService = false,
) {
  return async function createRequest(
    rmModule: DynamicModule,
    params?: RateLimiterParams | false | RateLimiterParams[],
    requestsCount = 1,
  ) {
    const handlerDecorator = [Get()];
    if (!asService && params !== undefined)
      handlerDecorator.push(
        RateLimiter(
          ...(params === false
            ? [false]
            : Array.isArray(params)
            ? params
            : [params]),
        ),
      );

    @Controller('/')
    class TestController {
      constructor(
        @Inject(RATE_LIMITER_ASSERTER_TOKEN)
        private asserter: RateLimiterAsserter,
      ) {}

      @applyDecorators(...handlerDecorator)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async get(@Res({ passthrough: true }) response: any) {
        if (asService) {
          if (
            params === undefined ||
            Array.isArray(params) ||
            params === false ||
            !('id' in params)
          )
            throw new Error('Wrong params for service test');
          const limitInfo = await this.asserter.assert(params);
          setHeaders(response.raw || response, limitInfo);
          return {};
        }
        return {};
      }
    }

    // make a separate module to check that RateLimiterModule is global
    // and it's exports too
    @Module({
      controllers: [TestController],
    })
    class TestControllerModule {}

    @Module({
      imports: [rmModule, TestControllerModule],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, new Platform());

    await app.init();
    await fastifyExtraWait(Platform, app);
    const server = app.getHttpServer();

    let response = await request(server).get('/'); // at least once
    for (let i = 1; i < requestsCount; i++) {
      response = await request(server).get('/');
    }

    await app.close();
    return response;
  };
}
