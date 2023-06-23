import { HttpStatus, Injectable, Module } from '@nestjs/common';
import * as Redis from 'redis-mock';

import { RateLimiterModule } from '../src';

import { CreateRequestFactory } from './utils/create-request-factory';
import { platforms } from './utils/platforms';

for (const platform of platforms) {
  describe(platform.name, () => {
    describe('decorator', () => {
      const createRequest = CreateRequestFactory(platform);

      it('set default `getId` in forRoot method works', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ getId: () => id, db }),
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('set default `id` in forRoot method works', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ id, db }),
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('set default `getId` in forRootAsync method works', async () => {
        const db = Redis.createClient();

        @Injectable()
        class ConfigService {
          id = Date.now().toString();
        }

        @Module({
          providers: [ConfigService],
          exports: [ConfigService],
        })
        class ConfigModule {}

        const response = await createRequest(
          RateLimiterModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => {
              return { getId: () => cfg.id, db };
            },
          }),
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('set `getId` in decorator params works', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          { getId: () => id },
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('if `getId` throws error returns 500 with corresponding msg', async () => {
        const db = Redis.createClient();

        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          {
            getId: () => {
              throw new Error();
            },
          },
        );

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Can not get id for rate limiter');

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeFalsy();
        expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
        expect(response.get('X-RateLimit-Reset')).toBeFalsy();
      });

      it('skip when not set', async () => {
        const db = Redis.createClient();
        const response = await createRequest(RateLimiterModule.forRoot({ db }));

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toEqual({});

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeFalsy();
        expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
        expect(response.get('X-RateLimit-Reset')).toBeFalsy();
      });

      it('set `false` in decorator turns off rate limiter', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ getId: () => id, db }),
          false,
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeFalsy();
        expect(response.get('X-RateLimit-Remaining')).toBeFalsy();
        expect(response.get('X-RateLimit-Reset')).toBeFalsy();
      });

      it('set minimal remaining value (max is sorted ASC)', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          [
            { id: '1:' + id, max: 1, duration: 5000 },
            { id: '2:' + id, max: 2, duration: 5000 },
          ],
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('set minimal remaining value (max is sorted DESC)', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          [
            { id: '2:' + id, max: 2, duration: 5000 },
            { id: '1:' + id, max: 1, duration: 5000 },
          ],
        );

        expect(response.get('Retry-After')).toBeFalsy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('reach limit works: negative', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          { id, max: 1, duration: 1000 },
        );

        expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(response.body).toMatchObject({});

        expect(response.get('Retry-After')).not.toBeTruthy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('reach limit works: positive', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          { id, max: 1, duration: 1000 },
          2,
        );

        expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(response.body.message).toMatch('Rate limit exceeded, retry in ');

        expect(response.get('Retry-After')).toBeTruthy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('createErrorBody works', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const random = Math.random();
        const response = await createRequest(
          RateLimiterModule.forRoot({
            db,
            createErrorBody: () => ({ random }),
          }),
          { id, max: 1, duration: 1000 },
          2,
        );

        expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(response.body).toMatchObject({ random });

        expect(response.get('Retry-After')).toBeTruthy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });
    });

    describe('service', () => {
      const createRequest = CreateRequestFactory(platform, true);

      it('reach limit works: negative', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          { id, max: 1, duration: 1000 },
        );

        expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(response.body).toMatchObject({});

        expect(response.get('Retry-After')).not.toBeTruthy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });

      it('reach limit works: positive', async () => {
        const db = Redis.createClient();
        const id = Date.now().toString();
        const response = await createRequest(
          RateLimiterModule.forRoot({ db }),
          { id, max: 1, duration: 1000 },
          2,
        );

        expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(response.body.message).toMatch('Rate limit exceeded, retry in ');

        expect(response.get('Retry-After')).toBeTruthy();
        expect(response.get('X-RateLimit-Limit')).toBeTruthy();
        expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
        expect(response.get('X-RateLimit-Reset')).toBeTruthy();
      });
    });
  });
}
