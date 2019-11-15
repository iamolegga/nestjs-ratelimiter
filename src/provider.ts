import { Provider } from '@nestjs/common';
import { RateLimiterGuard } from './guard';
import { RATELIMITER_GUARD_TOKEN } from './tokens';

export const provider: Provider<any> = {
  provide: RATELIMITER_GUARD_TOKEN,
  useClass: RateLimiterGuard,
};
