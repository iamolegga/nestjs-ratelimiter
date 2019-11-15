import {
  CanActivate,
  ExecutionContext,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServerResponse } from 'http';
import { RedisService } from 'nestjs-redis';
import { defaultErrorBodyCreator } from './default-error-body-creator';
import { getLimit } from './get-limit';
import { DECORATOR_PARAMS_TOKEN, MODULE_PARAMS_TOKEN } from './tokens';
import { TooManyRequestsException } from './too-many-requests.exception';
import {
  LimiterInfo,
  LimiterOption,
  RateLimiterModuleParams,
  RateLimiterParams,
} from './types';

export class RateLimiterGuard implements CanActivate {
  private readonly db: ReturnType<RedisService['getClient']>;

  constructor(
    @Inject(MODULE_PARAMS_TOKEN)
    private readonly defaultParams: RateLimiterModuleParams,
    private readonly reflector: Reflector,
    redis: RedisService,
  ) {
    this.db = redis.getClient(defaultParams.name);
  }

  async canActivate(context: ExecutionContext) {
    let paramsList = this.reflector.getAllAndOverride<
      RateLimiterParams[] | [false] | undefined
    >(DECORATOR_PARAMS_TOKEN, [context.getHandler(), context.getClass()]);

    if (isTurnedOff(paramsList)) {
      return true;
    }

    if (!paramsList) {
      paramsList = [{}];
    }

    const response = context.switchToHttp().getResponse();
    // in case of `fastify` get native response via `res` property
    // https://www.fastify.io/docs/latest/Reply/#introduction
    // in case of `express` response inherit native response
    const nativeResponse: ServerResponse = response.res || response;

    for (const param of paramsList) {
      const getId = param.getId || this.defaultParams.getId;
      if (!getId) {
        continue;
      }

      let id: string;

      try {
        id = await getId(context);
      } catch (error) {
        throw new InternalServerErrorException(
          'Can not get id for rate limiter',
          error,
        );
      }

      const limiterParams: LimiterOption = {
        id,
        // limiter accept instance of 'redis' and 'ioredis':
        // https://github.com/tj/node-ratelimiter/blob/master/test/index.js#L9
        // this is a bug in typings:
        // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/ratelimiter/index.d.ts#L7
        db: this.db as any,
        max: param.max || this.defaultParams.max,
        duration: param.duration || this.defaultParams.duration,
      };

      let limit: LimiterInfo;
      try {
        limit = await getLimit(limiterParams);
      } catch (error) {
        // Redis error while creating limiter
        throw new InternalServerErrorException(
          'Can not create rate limiter',
          error,
        );
      }

      nativeResponse.setHeader('X-RateLimit-Limit', limit.total);
      nativeResponse.setHeader('X-RateLimit-Remaining', limit.remaining - 1);
      nativeResponse.setHeader('X-RateLimit-Reset', limit.reset);

      if (limit.remaining < 1) {
        // tslint:disable-next-line: no-bitwise
        const after = (limit.reset - Date.now() / 1000) | 0;
        nativeResponse.setHeader('Retry-After', after);

        const createErrorBody =
          param.createErrorBody ||
          this.defaultParams.createErrorBody ||
          defaultErrorBodyCreator;
        throw new TooManyRequestsException(createErrorBody(limit));
      }
    }

    return true;
  }
}

function isTurnedOff(
  params: RateLimiterParams[] | [false] | undefined,
): params is [false] {
  return !!params && params[0] === false;
}
