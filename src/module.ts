import { DynamicModule, Module, Provider } from '@nestjs/common';
import { provider } from './provider';
import { MODULE_PARAMS_TOKEN } from './tokens';
import { RateLimiterModuleParams, RateLimiterModuleParamsAsync } from './types';

@Module({})
export class RateLimiterModule {
  static forRoot(params: RateLimiterModuleParams): DynamicModule {
    const paramsProvider: Provider<RateLimiterModuleParams> = {
      provide: MODULE_PARAMS_TOKEN,
      useValue: params,
    };

    return {
      module: RateLimiterModule,
      providers: [paramsProvider, provider],
      exports: [provider],
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
      providers: [paramsProvider, provider],
      exports: [provider],
    };
  }
}
