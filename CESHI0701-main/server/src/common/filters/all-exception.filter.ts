import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * 全局异常过滤器
 *
 * 捕获所有未处理异常，统一转换为 { code, data, message } 失败响应：
 * - HttpException 透传其状态码与消息；
 * - Prisma 已知错误转 400 并给出友好提示，不泄露内部细节；
 * - 其余未知异常记录堆栈并返回 500。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * 异常处理入口
   * @param exception 捕获到的异常
   * @param host 参数宿主，用于取出 HTTP 响应对象
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      if (Array.isArray(message)) {
        message = message[0];
      }
    } else if (this.isPrismaError(exception)) {
      // Prisma 已知错误转 400 + 友好提示，不向客户端泄露内部细节
      status = HttpStatus.BAD_REQUEST;
      message = this.prismaMessage(exception);
      this.logger.warn(`Prisma 错误: ${(exception as Error).message.split('\n').pop()}`);
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      // 失败响应：保持 HTTP 错误码作为业务码；若异常状态恰为 200 则用 400 兜底（避免与成功码 200 冲突）
      code: status === 200 ? 400 : status,
      data: null,
      message,
    });
  }

  /** 是否为 Prisma 已知错误（请求错误或参数校验错误） */
  private isPrismaError(e: unknown): boolean {
    return (
      e instanceof Prisma.PrismaClientKnownRequestError ||
      e instanceof Prisma.PrismaClientValidationError
    );
  }

  /** 把 Prisma 错误转为友好提示（不泄露字段/SQL 细节） */
  private prismaMessage(e: unknown): string {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      switch (e.code) {
        case 'P2025':
          return '记录不存在';
        case 'P2002':
          return '数据已存在（唯一约束冲突）';
        case 'P2003':
          return '关联数据不存在或被引用';
        default:
          return '数据库请求错误';
      }
    }
    // 校验错误（字段不存在、类型不符等）
    return '请求参数与数据模型不匹配';
  }
}
