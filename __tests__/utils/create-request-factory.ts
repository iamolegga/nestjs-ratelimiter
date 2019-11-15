import {
  applyDecorators,
  Controller,
  DynamicModule,
  Get,
  Module,
  Type,
} from '@nestjs/common';
import { AbstractHttpAdapter, NestFactory } from '@nestjs/core';
import { RedisModule } from 'nestjs-redis';
import * as request from 'supertest';
import {
  RateLimiter,
  RATELIMITER_GUARD_TOKEN,
  RateLimiterParams,
} from '../../src';
import { fastifyExtraWait } from './fastify-extra-wait';

export function CreateRequestFactory(
  Platform: Type<AbstractHttpAdapter<any, any, any>>,
) {
  return async function createRequest(
    rmModule: DynamicModule,
    params?: RateLimiterParams,
  ) {
    const handlerDecorator = params
      ? applyDecorators(Get(), RateLimiter(params))
      : Get();

    @Controller('/')
    class TestController {
      @handlerDecorator
      get() {
        return {};
      }
    }

    // tslint:disable-next-line: max-classes-per-file
    @Module({
      imports: [rmModule, RedisModule.register({})],
      controllers: [TestController],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, new Platform(), {
      logger: false,
    });
    app.useGlobalGuards(app.get(RATELIMITER_GUARD_TOKEN));

    const server = app.getHttpServer();

    await app.init();
    await fastifyExtraWait(Platform, app);
    const response = await request(server).get('/');
    await app.close();

    return response;
  };
}
