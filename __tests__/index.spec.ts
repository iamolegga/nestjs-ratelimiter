import { HttpStatus, Injectable, Module } from '@nestjs/common';
import { RateLimiterModule } from '../src';
import { CreateRequestFactory } from './utils/create-request-factory';
import { platforms } from './utils/platforms';

let iterator = 0;

for (const platform of platforms) {
  describe(platform.name, () => {
    const createRequest = CreateRequestFactory(platform);

    it('set default `getId` in forRoot method works', async () => {
      const id = (iterator++).toString();
      const response = await createRequest(
        RateLimiterModule.forRoot({ getId: () => id }),
      );

      expect(response.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('set default `getId` in forRootAsync method works', async () => {
      @Injectable()
      class ConfigService {
        id = (iterator++).toString();
      }

      // tslint:disable-next-line: max-classes-per-file
      @Module({
        providers: [ConfigService],
        exports: [ConfigService],
      })
      class ConfigModule {}

      const response = await createRequest(
        RateLimiterModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (test: ConfigService) => {
            return { getId: () => test.id };
          },
        }),
      );

      expect(response.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('set `getId` in decorator params works', async () => {
      const id = (iterator++).toString();
      const response = await createRequest(RateLimiterModule.forRoot(), {
        getId: () => id,
      });

      expect(response.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('if `getId` throws error returns 500 with corresponding msg', async () => {
      const response = await createRequest(RateLimiterModule.forRoot(), {
        getId: () => {
          throw new Error();
        },
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Can not get id for rate limiter');

      expect(response.get('X-RateLimit-Limit')).toBeFalsy();
      expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
      expect(response.get('X-RateLimit-Reset')).toBeFalsy();
    });

    it('reach limit works', async () => {
      const id = (iterator++).toString();
      const response = await createRequest(
        RateLimiterModule.forRoot(),
        {
          getId: () => id,
          max: 1,
          duration: 1000,
        },
        2,
      );

      expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.body.message).toMatch('Rate limit exceeded, retry in ');

      expect(response.get('Retry-After')).toBeTruthy();
      expect(response.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('skip when not set', async () => {
      const response = await createRequest(RateLimiterModule.forRoot());

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({});

      expect(response.get('X-RateLimit-Limit')).toBeFalsy();
      expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
      expect(response.get('X-RateLimit-Reset')).toBeFalsy();
    });

    it('set `false` in decorator turns off rate limiter', async () => {
      const id = (iterator++).toString();
      const response = await createRequest(
        RateLimiterModule.forRoot({ getId: () => id }),
        false,
      );

      expect(response.get('X-RateLimit-Limit')).toBeFalsy();
      expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
      expect(response.get('X-RateLimit-Reset')).toBeFalsy();
    });
  });
}
