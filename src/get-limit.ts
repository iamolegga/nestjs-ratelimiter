import * as Limiter from 'ratelimiter';

export async function getLimit(
  params: Limiter.LimiterOption,
): Promise<Limiter.LimiterInfo> {
  const limiter = new Limiter(params);

  return new Promise<Limiter.LimiterInfo>((resolve, reject) => {
    limiter.get((err, limit) => {
      if (err) {
        reject(err);
      } else {
        resolve(limit);
      }
    });
  });
}
