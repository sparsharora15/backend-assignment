import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { MongoServerError } from 'mongodb';

interface ErrorResponsePayload {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const defaultStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const status = this.determineStatus(exception, defaultStatus);

    const responseBody = this.buildResponse(exception, status, request?.url);

    this.logException(exception, responseBody);
    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }

  private buildResponse(
    exception: unknown,
    statusCode: number,
    path?: string,
  ): ErrorResponsePayload {
    if (this.isDuplicateKeyError(exception)) {
      return this.buildDuplicateKeyResponse(exception, statusCode, path);
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as
        | string
        | {
            message?: string | string[];
            error?: string;
            statusCode?: number;
            [key: string]: unknown;
          };

      const message =
        typeof response === 'string'
          ? response
          : Array.isArray(response.message)
            ? response.message.join(', ')
            : (response.message ?? exception.message);

      const { error, ...rest } =
        typeof response === 'string' ? {} : (response ?? {});

      return {
        statusCode,
        message,
        error: error ?? exception.name,
        timestamp: new Date().toISOString(),
        path: path ?? '',
        details: Object.keys(rest).length ? rest : undefined,
      };
    }

    return {
      statusCode,
      message: 'Unexpected error occurred',
      error: (exception as Error)?.name ?? 'Error',
      timestamp: new Date().toISOString(),
      path: path ?? '',
    };
  }

  private determineStatus(exception: unknown, currentStatus: number): number {
    if (this.isDuplicateKeyError(exception)) {
      return HttpStatus.CONFLICT;
    }
    return currentStatus;
  }

  private isDuplicateKeyError(
    exception: unknown,
  ): exception is MongoServerError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as MongoServerError).code === 11000
    );
  }

  private buildDuplicateKeyResponse(
    exception: MongoServerError,
    statusCode: number,
    path?: string,
  ): ErrorResponsePayload {
    const keyNames = Object.keys(
      (exception as MongoServerError & { keyPattern?: Record<string, unknown> })
        .keyPattern ?? {},
    );
    const message =
      keyNames.length === 1
        ? `Duplicate value for '${keyNames[0]}'. A record with this ${keyNames[0]} already exists.`
        : keyNames.length > 1
          ? `Duplicate values for fields: ${keyNames.join(', ')}. A record with these values already exists.`
          : 'Duplicate key error. A record with the provided value already exists.';

    const { keyValue, keyPattern } = exception as MongoServerError & {
      keyValue?: Record<string, unknown>;
      keyPattern?: Record<string, unknown>;
    };

    const details = {
      ...(keyValue ? { keyValue } : {}),
      ...(keyPattern ? { keyPattern } : {}),
    };

    return {
      statusCode,
      message,
      error: 'DuplicateKeyError',
      timestamp: new Date().toISOString(),
      path: path ?? '',
      details: Object.keys(details).length ? details : undefined,
    };
  }

  private logException(exception: unknown, responseBody: ErrorResponsePayload) {
    if (exception instanceof HttpException) {
      this.logger.warn(
        `${responseBody.error ?? exception.name}: ${responseBody.message}`,
      );
      return;
    }
    this.logger.error(
      `${responseBody.error ?? 'Error'}: ${responseBody.message}`,
      (exception as Error)?.stack,
    );
  }
}
