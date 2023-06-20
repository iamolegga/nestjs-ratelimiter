import { ServerResponse } from 'http';

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ClassProvider,
} from '@nestjs/common';
import { APP_FILTER, BaseExceptionFilter } from '@nestjs/core';

import { RateLimiterError } from './asserter.interface';
import { TooManyRequestsException } from './too-many-requests.exception';
import { setHeaders } from './utils/set-headers.fn';

@Catch(RateLimiterError)
export class RateLimiterFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: RateLimiterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    // in case of `fastify` get native response via `res` property
    // https://www.fastify.io/docs/latest/Reply/#introduction
    // in case of `express` response inherit native response
    const nativeResponse: ServerResponse = response.raw || response;

    setHeaders(nativeResponse, exception.limiterInfo);
    nativeResponse.setHeader(
      'Retry-After',
      (exception.limiterInfo.reset - Date.now() / 1000) | 0,
    );

    return super.catch(new TooManyRequestsException(exception.message), host);
  }
}

export const rateLimiterFilterProvider: ClassProvider<ExceptionFilter> = {
  provide: APP_FILTER,
  useClass: RateLimiterFilter,
};
