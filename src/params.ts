import { ExecutionContext } from '@nestjs/common';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common/interfaces';
import { LimiterInfo, LimiterOption } from 'ratelimiter';

// Decorator params

export const DECORATOR_PARAMS_TOKEN = Symbol.for(
  'nest-ratelimiter:params-decorator',
);
export type RateLimiterParams = Pick<LimiterOption, 'max' | 'duration'> & {
  createErrorBody?: CreateErrorBodyFn;
  // eslint-disable-next-line @typescript-eslint/ban-types
} & ({ getId: GetIdFn } | { id: string } | {});

export type GetIdFn = (context: ExecutionContext) => string | Promise<string>;

export type CreateErrorBodyFn = (limit: LimiterInfo) => unknown;

// Module params

export const MODULE_PARAMS_TOKEN = Symbol.for('nest-ratelimiter:params-module');
export type RateLimiterModuleParams = Partial<RateLimiterParams> &
  Pick<LimiterOption, 'db'>;

export interface RateLimiterModuleParamsAsync
  extends Pick<ModuleMetadata, 'imports' | 'providers'>,
    Pick<
      FactoryProvider<
        RateLimiterModuleParams | Promise<RateLimiterModuleParams>
      >,
      'useFactory' | 'inject'
    > {}
