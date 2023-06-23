import { ServerResponse } from 'http';

import {
  CanActivate,
  ClassProvider,
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';

import {
  RATE_LIMITER_ASSERTER_TOKEN,
  RateLimiterAsserter,
  RateLimiterError,
} from './asserter.interface';
import {
  DECORATOR_PARAMS_TOKEN,
  MODULE_PARAMS_TOKEN,
  RateLimiterModuleParams,
  RateLimiterParams,
} from './params';
import { TooManyRequestsException } from './too-many-requests.exception';
import { setHeaders } from './utils/set-headers.fn';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    @Inject(MODULE_PARAMS_TOKEN)
    private readonly defaultParams: RateLimiterModuleParams,
    @Inject(RATE_LIMITER_ASSERTER_TOKEN)
    private readonly asserter: RateLimiterAsserter,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const paramsList = this.reflector.getAllAndOverride<
      RateLimiterParams[] | [false] | undefined
    >(DECORATOR_PARAMS_TOKEN, [context.getHandler(), context.getClass()]);

    if (isTurnedOff(paramsList)) return true;

    const response = context.switchToHttp().getResponse();

    // in case of `fastify` get native response via `res` property
    // https://www.fastify.io/docs/latest/Reply/#introduction
    // in case of `express` response inherit native response
    const nativeResponse: ServerResponse = response.raw || response;

    for (const param of paramsList || [{}]) {
      await this.checkSingleParam(param, context, nativeResponse);
    }

    return true;
  }

  private async checkSingleParam(
    params: RateLimiterParams,
    context: ExecutionContext,
    response: ServerResponse,
  ) {
    const id = await this.getId(params, context);
    if (!id) return;

    const { max, duration, createErrorBody } = params;

    try {
      const limit = await this.asserter.assert({
        id,
        max,
        duration,
        createErrorBody,
      });
      setHeaders(response, limit);
    } catch (error) {
      /* istanbul ignore else */
      if (error instanceof RateLimiterError) {
        response.setHeader(
          'Retry-After',
          (error.limiterInfo.reset - Date.now() / 1000) | 0,
        );
        setHeaders(response, error.limiterInfo);
        throw new TooManyRequestsException(JSON.parse(error.message));
      } else throw error;
    }
  }

  private async getId(params: RateLimiterParams, context: ExecutionContext) {
    let id: string | undefined = undefined;
    try {
      if ('id' in params) {
        id = params.id;
      } else if ('getId' in params) {
        id = await params.getId(context);
      } else if ('id' in this.defaultParams) {
        id = this.defaultParams.id;
      } else if ('getId' in this.defaultParams && this.defaultParams.getId) {
        id = await this.defaultParams.getId(context);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Can not get id for rate limiter',
        String(error),
      );
    }
    return id;
  }
}

function isTurnedOff(
  params: RateLimiterParams[] | [false] | undefined,
): params is [false] {
  return !!params && params.length === 1 && params[0] === false;
}

export const rateLimiterGuardProvider: ClassProvider<CanActivate> = {
  provide: APP_GUARD,
  useClass: RateLimiterGuard,
};
