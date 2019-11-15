import * as Limiter from 'ratelimiter';
import { LimiterInfo, LimiterOption } from './types';

export async function getLimit(params: LimiterOption): Promise<LimiterInfo> {
  const limiter = new Limiter(params);

  return new Promise<LimiterInfo>((resolve, reject) => {
    limiter.get((err, limit) => {
      if (err) {
        reject(err);
      } else {
        resolve(limit);
      }
    });
  });
}
