import { DynamicModule, Module, Provider } from '@nestjs/common';

import { rateLimiterAsserterProvider } from './asserter.svc';
import { rateLimiterFilterProvider } from './filter';
import { rateLimiterGuardProvider } from './guard';
import {
  MODULE_PARAMS_TOKEN,
  RateLimiterModuleParams,
  RateLimiterModuleParamsAsync,
} from './params';

@Module({})
export class RateLimiterModule {
  static forRoot(params: RateLimiterModuleParams): DynamicModule {
    const paramsProvider: Provider<RateLimiterModuleParams> = {
      provide: MODULE_PARAMS_TOKEN,
      useValue: params,
    };

    return {
      module: RateLimiterModule,
      providers: [
        paramsProvider,
        rateLimiterGuardProvider,
        rateLimiterFilterProvider,
        rateLimiterAsserterProvider,
      ],
      exports: [rateLimiterAsserterProvider],
      global: true,
    };
  }

  static forRootAsync(params: RateLimiterModuleParamsAsync): DynamicModule {
    const paramsProvider: Provider<
      RateLimiterModuleParams | Promise<RateLimiterModuleParams>
    > = {
      provide: MODULE_PARAMS_TOKEN,
      useFactory: params.useFactory,
      inject: params.inject,
    };

    return {
      module: RateLimiterModule,
      imports: params.imports,
      providers: [
        paramsProvider,
        rateLimiterGuardProvider,
        rateLimiterFilterProvider,
        rateLimiterAsserterProvider,
      ],
      exports: [rateLimiterAsserterProvider],
      global: true,
    };
  }
}
