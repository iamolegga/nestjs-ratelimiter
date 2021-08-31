import { ServerResponse } from 'http';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LimiterInfo, LimiterOption } from 'ratelimiter';
import { defaultErrorBodyCreator } from './default-error-body-creator';
import { getLimit } from './get-limit';
import { DECORATOR_PARAMS_TOKEN, MODULE_PARAMS_TOKEN } from './tokens';
import { TooManyRequestsException } from './too-many-requests.exception';
import {
  RateLimiterModuleParams,
  RateLimiterParams,
  RedisClient,
} from './types';

export class RateLimiterGuard implements CanActivate {
  private readonly db: RedisClient;

  constructor(
    @Inject(MODULE_PARAMS_TOKEN)
    private readonly defaultParams: RateLimiterModuleParams,
    private readonly reflector: Reflector,
  ) {
    this.db = defaultParams.db;
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
    const nativeResponse: ServerResponse = response.raw || response;

    for (const param of paramsList) {
      await this.checkSingleParam(param, context, nativeResponse);
    }

    return true;
  }

  private async checkSingleParam(
    param: RateLimiterParams,
    context: ExecutionContext,
    response: ServerResponse,
  ) {
    const getId = param.getId || this.defaultParams.getId;
    if (!getId) {
      return;
    }

    let id: string;

    try {
      id = await getId(context);
    } catch (error) {
      throw new InternalServerErrorException(
        'Can not get id for rate limiter',
        String(error),
      );
    }

    const limiterParams: LimiterOption = {
      id,
      db: this.db,
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
        String(error),
      );
    }

    setLimitHeaders(response, limit);

    if (limit.remaining < 1) {
      this.onLimitExceed(limit, response, param);
    }
  }

  private onLimitExceed(
    limit: LimiterInfo,
    response: ServerResponse,
    param: RateLimiterParams,
  ) {
    const after = (limit.reset - Date.now() / 1000) | 0;
    response.setHeader('Retry-After', after);

    const createErrorBody =
      param.createErrorBody ||
      this.defaultParams.createErrorBody ||
      defaultErrorBodyCreator;
    throw new TooManyRequestsException(createErrorBody(limit));
  }
}

function isTurnedOff(
  params: RateLimiterParams[] | [false] | undefined,
): params is [false] {
  return !!params && params[0] === false;
}

function setLimitHeaders(response: ServerResponse, limit: LimiterInfo) {
  response.setHeader('X-RateLimit-Limit', limit.total);
  response.setHeader('X-RateLimit-Remaining', limit.remaining - 1);
  response.setHeader('X-RateLimit-Reset', limit.reset);
}
