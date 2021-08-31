import { LimiterInfo } from 'ratelimiter';
import { CreateErrorBodyFn } from './types';

export const defaultErrorBodyCreator: CreateErrorBodyFn = (
  limit: LimiterInfo,
) => {
  // When using custom errorBodyCreator don't have to install this module
  // When using this one, 'ms' will be cached after first call, so it's ok
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ms = require('ms');
  const delta = (limit.reset * 1000 - Date.now()) | 0;
  return 'Rate limit exceeded, retry in ' + ms(delta, { long: true });
};
