import { Controller } from '@nestjs/common';

/**
 * CRUD 控制器配置项
 *
 * 通过 @CrudController 装饰器声明，描述自动 CRUD 接口的路由前缀、
 * 开放的接口集合，以及分页查询的字段映射规则。
 */
export interface CrudOptions {
  /** 路由前缀，等价于 @Controller(prefix) */
  prefix?: string;
  /** 开放的 CRUD 接口集合，缺省开放全部 */
  api?: ('add' | 'delete' | 'update' | 'info' | 'list' | 'page')[];
  /** 分页/列表查询配置 */
  pageQueryOp?: {
    /** 关键字模糊匹配的字段（命中任一即返回） */
    keyWordLikeFields?: string[];
    /** 精确匹配的字段 */
    fieldEq?: string[];
    /** 附加排序规则 */
    addOrderBy?: Record<string, 'asc' | 'desc'>;
    /** Prisma select 投影 */
    select?: Record<string, any>;
    /** Prisma include 关联 */
    include?: Record<string, any>;
  };
}

// 存放 CrudOptions 的元数据 key
const CRUD_OPTIONS_KEY = 'crud:options';

/**
 * CRUD 控制器类装饰器
 *
 * 将 CrudOptions 写入类的元数据，供 CrudControllerBase 在运行时读取，
 * 据此构建查询条件与控制接口开放范围。若指定 prefix，同时叠加 @Controller(prefix)。
 *
 * @param options CRUD 配置项，缺省开放全部接口
 * @returns 类装饰器
 */
export function CrudController(options: CrudOptions = {}): ClassDecorator {
  const { prefix = '', api = ['add', 'delete', 'update', 'info', 'list', 'page'] } = options;

  return (target: Function) => {
    // 把配置（补齐默认 api）挂到类元数据上
    Reflect.defineMetadata(CRUD_OPTIONS_KEY, { ...options, api }, target);

    // 有前缀时复用 Nest 原生 @Controller 设置路由前缀
    if (prefix) {
      Controller(prefix)(target);
    }
  };
}

/**
 * 读取类上的 CRUD 配置元数据
 * @param target 控制器类（构造函数）
 * @returns CrudOptions，未声明时返回 undefined
 */
export function getCrudOptions(target: Function): CrudOptions | undefined {
  return Reflect.getMetadata(CRUD_OPTIONS_KEY, target);
}
