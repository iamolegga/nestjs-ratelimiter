import { ServerResponse } from 'http';

import { LimiterInfo } from 'ratelimiter';

/**
 * Set headers for response
 * @param response - expressjs `response` object or fastify `response.raw` object
 * @param limiterInfo - `LimiterInfo` object from `ratelimiter`
 */
export function setHeaders(response: ServerResponse, limiterInfo: LimiterInfo) {
  const prevRemaining = response.getHeader('X-RateLimit-Remaining') as string;
  if (prevRemaining && parseInt(prevRemaining, 10) < limiterInfo.remaining)
    return;

  response.setHeader('X-RateLimit-Limit', limiterInfo.total);
  response.setHeader('X-RateLimit-Remaining', limiterInfo.remaining - 1);
  response.setHeader('X-RateLimit-Reset', limiterInfo.reset);
}
