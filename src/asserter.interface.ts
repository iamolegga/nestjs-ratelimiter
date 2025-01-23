import { LimiterInfo } from 'ratelimiter';

import { RateLimiterParams } from './params';
import { RequireField } from './utils/require-field';

export const RATE_LIMITER_ASSERTER_TOKEN = Symbol.for(
  'nest-ratelimiter:asserter',
);
export interface RateLimiterAsserter {
  /**
   * Asserts that the request is not rate limited. If the request is rate
   * limited, throws an exception. Otherwise, returns the limiter info.
   * @param params The parameters for the rate limiter.
   * @returns The limiter info.
   * @throws `RateLimiterError` If the request is rate limited.
   */
  assert(params: RequireField<RateLimiterParams, 'id'>): Promise<LimiterInfo>;
}

export class RateLimiterError extends Error {
  constructor(
    message: unknown,
    readonly limiterInfo: LimiterInfo,
  ) {
    super(JSON.stringify(message));
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
