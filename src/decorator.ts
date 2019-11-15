import { SetMetadata } from '@nestjs/common';
import { DECORATOR_PARAMS_TOKEN } from './tokens';
import { RateLimiterParams } from './types';

export function RateLimiter(...params: RateLimiterParams[]) {
  return SetMetadata(DECORATOR_PARAMS_TOKEN, params);
}
