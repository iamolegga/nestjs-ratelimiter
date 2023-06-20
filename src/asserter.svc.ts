import {
  ClassProvider,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { LimiterInfo } from 'ratelimiter';

import {
  RATE_LIMITER_ASSERTER_TOKEN,
  RateLimiterAsserter,
  RateLimiterError,
} from './asserter.interface';
import {
  MODULE_PARAMS_TOKEN,
  RateLimiterModuleParams,
  RateLimiterParams,
} from './params';
import { defaultErrorBodyCreator } from './utils/default-error-body-creator';
import { getLimit } from './utils/get-limit';
import { RequireField } from './utils/require-field';

export class RateLimiterAsserterImpl implements RateLimiterAsserter {
  constructor(
    @Inject(MODULE_PARAMS_TOKEN)
    private readonly defaultParams: RateLimiterModuleParams,
  ) {}

  async assert(
    params: RequireField<RateLimiterParams, 'id'>,
  ): Promise<LimiterInfo> {
    let limiterInfo: LimiterInfo;
    try {
      limiterInfo = await getLimit({
        id: params.id,
        db: this.defaultParams.db,
        max: params.max || this.defaultParams.max,
        duration: params.duration || this.defaultParams.duration,
      });
    } catch (error) /* istanbul ignore next */ {
      // Redis error while creating limiter
      throw new InternalServerErrorException(
        'Can not create rate limiter',
        String(error),
      );
    }

    if (limiterInfo.remaining < 1) {
      const body = (
        params.createErrorBody ||
        this.defaultParams.createErrorBody ||
        defaultErrorBodyCreator
      )(limiterInfo);
      throw new RateLimiterError(body, limiterInfo);
    }

    return limiterInfo;
  }
}

export const rateLimiterAsserterProvider: ClassProvider<RateLimiterAsserter> = {
  provide: RATE_LIMITER_ASSERTER_TOKEN,
  useClass: RateLimiterAsserterImpl,
};
