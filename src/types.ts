import { ExecutionContext } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import * as Limiter from 'ratelimiter';
import { FirstConstructorArgument } from './first-constructor-argument.type';

// Not exported 'ratelimiter' module types

export type LimiterOption = FirstConstructorArgument<typeof Limiter>;
export type LimiterInfo = Parameters<Parameters<Limiter['get']>[0]>[1];

// own types

export type GetIdFn = (context: ExecutionContext) => string | Promise<string>;

export type CreateErrorBodyFn = (limit: LimiterInfo) => any;

export type RateLimiterParams = Pick<LimiterOption, 'max' | 'duration'> & {
  getId?: GetIdFn;
  createErrorBody?: CreateErrorBodyFn;
};

export interface RateLimiterModuleParams extends RateLimiterParams {
  name?: string;
}

export interface RateLimiterModuleParamsAsync
  extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  useFactory: (
    ...args: any[]
  ) => RateLimiterModuleParams | Promise<RateLimiterModuleParams>;
  inject?: any[];
}
