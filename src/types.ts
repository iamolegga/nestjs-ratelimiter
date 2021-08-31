import { ExecutionContext } from '@nestjs/common';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common/interfaces';
import * as Limiter from 'ratelimiter';

export type GetIdFn = (context: ExecutionContext) => string | Promise<string>;

export type CreateErrorBodyFn = (limit: Limiter.LimiterInfo) => any;

export type RateLimiterParams = Omit<Limiter.LimiterOption, 'id' | 'db'> & {
  getId?: GetIdFn;
  createErrorBody?: CreateErrorBodyFn;
};

export interface RateLimiterModuleParams
  extends RateLimiterParams,
    Pick<Limiter.LimiterOption, 'db'> {}

export interface RateLimiterModuleParamsAsync
  extends Pick<ModuleMetadata, 'imports' | 'providers'>,
    Pick<FactoryProvider<FactoryResult>, 'useFactory' | 'inject'> {}

type FactoryResult = RateLimiterModuleParams | Promise<RateLimiterModuleParams>;

export type RedisClient = Limiter.LimiterOption['db'];
