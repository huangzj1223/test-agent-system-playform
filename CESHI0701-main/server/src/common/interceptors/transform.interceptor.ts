import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应转换拦截器
 *
 * 统一出参格式并格式化日期：
 * - 控制器已返回 { code, data, message } 结构时，仅对 data 做日期格式化；
 * - 控制器直接返回业务数据时，包装为 { code: 200, data, message: 'success' }。
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  /**
   * 拦截响应流并统一包装
   * @param context 执行上下文
   * @param next 调用处理器
   * @returns 包装后的响应 Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 已是标准响应结构：展开原对象（code/message 及任何附加字段均保留），仅将 data 替换为格式化后的版本
        if (data && typeof data === 'object' && 'code' in data) {
          return { ...data, data: formatDates(data.data) };
        }
        // 裸业务数据：补全统一响应外壳
        return { code: 200, data: formatDates(data) ?? null, message: 'success' };
      }),
    );
  }
}

/**
 * 递归格式化对象中的日期字段
 * 将 ISO 格式（2026-05-30T13:29:46.339Z）转为 YYYY-MM-DD HH:mm:ss
 * @param obj 任意值（对象/数组/原始值）
 * @returns 日期字段被格式化后的同构数据
 */
function formatDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return formatDate(obj);
  if (Array.isArray(obj)) return obj.map(formatDates);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value instanceof Date) {
        result[key] = formatDate(value);
      } else if (typeof value === 'string' && isISODateString(value)) {
        result[key] = formatDate(new Date(value));
      } else if (Array.isArray(value)) {
        result[key] = value.map(formatDates);
      } else if (value && typeof value === 'object') {
        result[key] = formatDates(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}

function isISODateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function formatDate(date: Date): string {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offset);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const h = String(local.getUTCHours()).padStart(2, '0');
  const min = String(local.getUTCMinutes()).padStart(2, '0');
  const s = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}
