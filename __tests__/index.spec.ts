import { Injectable, Module } from '@nestjs/common';
import { RateLimiterModule } from '../src';
import { CreateRequestFactory } from './utils/create-request-factory';
import { platforms } from './utils/platforms';

let iterator = 0;

for (const platform of platforms) {
  describe(platform.name, () => {
    const createRequest = CreateRequestFactory(platform);

    it('set default `getId` in forRoot method works', async () => {
      const response = await createRequest(
        RateLimiterModule.forRoot({ getId: () => (iterator++).toString() }),
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
      const response = await createRequest(RateLimiterModule.forRoot(), {
        getId: () => (iterator++).toString(),
      });

      expect(response.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });
}
