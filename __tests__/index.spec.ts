import {
  applyDecorators,
  Controller,
  DynamicModule,
  Get,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RedisModule } from 'nestjs-redis';
import * as request from 'supertest';
import {
  RateLimiter,
  RATELIMITER_GUARD_TOKEN,
  RateLimiterModule,
  RateLimiterParams,
} from '../src';

it('should return headers', async () => {
  const response = await createRequest(
    RateLimiterModule.forRoot({ getId: () => 'should return headers' }),
  );

  expect(response.get('X-RateLimit-Limit')).toBeTruthy();
  expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
  expect(response.get('X-RateLimit-Reset')).toBeTruthy();
});

async function createRequest(
  rmModule: DynamicModule,
  params?: RateLimiterParams,
) {
  const handlerDecorator = params
    ? applyDecorators(RateLimiter(params), Get())
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
  class TestModule {}

  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalGuards(app.get(RATELIMITER_GUARD_TOKEN));

  const server = app.getHttpServer();

  await app.init();
  const response = await request(server).get('/');
  await app.close();

  return response;
}
