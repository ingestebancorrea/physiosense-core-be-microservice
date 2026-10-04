import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorMessages } from '../enum/error-messages.enum';

/**
 * Formato de error unico para todo el microservicio.
 *
 * Se mantiene identico al de authentication-be-microservice porque el cliente
 * movil (`readErrorMessage` en services/api/client.ts) ya deserializa
 * `{ statusCode, message, error }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  async catch(exception: Error, host: ArgumentsHost): Promise<any> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

let requestException: string | string[] = ErrorMessages.DEFAULT_REQUEST_EXCEPTION;
let httpMessage: string = ErrorMessages.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      const reqException = exception.getResponse() as { error?: string; message?: string | string[] };
      httpMessage = reqException.error ?? httpMessage;
      requestException = reqException.message ?? requestException;
    } else {
      // Excepciones no HTTP (validación de TypeORM, program bugs) se loguean
      // acá para no perder el stack cuando el filtro contesta 500.
      // eslint-disable-next-line no-console
      console.error('[UNHANDLED_ERROR]', exception);
    }

    const responseBody = {
      statusCode: httpStatus,
      message: requestException,
      error: httpMessage,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}