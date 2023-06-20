import { SetMetadata } from '@nestjs/common';

import { DECORATOR_PARAMS_TOKEN, RateLimiterParams } from './params';

export function RateLimiter(...params: RateLimiterParams[] | [false]) {
  return SetMetadata(DECORATOR_PARAMS_TOKEN, params);
}
