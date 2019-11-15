export const MODULE_PARAMS_TOKEN = Symbol.for(
  'nestjs-ratelimiter:params-module',
);

export const DECORATOR_PARAMS_TOKEN = Symbol.for(
  'nestjs-ratelimiter:params-local',
);

export const RATELIMITER_GUARD_TOKEN = Symbol.for('nestjs-ratelimiter:guard');
