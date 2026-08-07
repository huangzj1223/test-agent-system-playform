import { PrismaService } from '../prisma.service';

/** 分页查询参数 */
export interface PageOptions {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 排序字段 */
  order?: string;
  /** 排序方向 */
  sort?: 'asc' | 'desc';
  /** 关键字（模糊查询用） */
  keyword?: string;
}

/** 分页查询结果 */
export interface PageResult<T> {
  /** 当前页数据列表 */
  list: T[];
  /** 分页元信息 */
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * CRUD 基础服务 - 基于 Prisma 的通用增删改查
 *
 * 子类传入对应的 Prisma 模型名即可复用分页、列表、详情、增改删能力，
 * 无需为每个模块重复编写样板查询代码。
 *
 * @template T 实体类型
 */
export class BaseService<T = any> {
  /**
   * @param prisma Prisma 客户端
   * @param modelName Prisma 模型名（对应 prisma 实例上的委托属性）
   */
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  // 按 modelName 动态取到对应的 Prisma 模型委托
  private get model() {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * 分页查询
   * @param options 分页与排序参数
   * @param where Prisma 查询条件
   * @param select 字段投影
   * @param include 关联加载
   * @returns 列表及分页信息
   */
  async page(options: PageOptions, where?: any, select?: any, include?: any): Promise<PageResult<T>> {
    // 页码至少为 1
    const page = Math.max(options.page || 1, 1);
    // 每页条数限制在 1~100，防止超大查询拖垮数据库
    const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const orderBy: any = {};
    if (options.order) {
      orderBy[options.order] = options.sort || 'desc';
    } else {
      // 默认按主键倒序，保证最新数据在前
      orderBy.id = 'desc';
    }

    // 并行获取当页数据与总数，减少往返耗时
    const [list, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        ...(select && { select }),
        ...(include && { include }),
      }),
      this.model.count({ where }),
    ]);

    return { list, pagination: { page, pageSize, total } };
  }

  /**
   * 不分页列表查询（带数量上限）
   * @param where 查询条件
   * @param select 字段投影
   * @param include 关联加载
   * @param limit 最大返回条数，默认 1000，防止全表拉取
   * @returns 数据列表
   */
  async list(where?: any, select?: any, include?: any, limit = 1000): Promise<T[]> {
    return this.model.findMany({
      where,
      take: limit,
      orderBy: { id: 'desc' },
      ...(select && { select }),
      ...(include && { include }),
    });
  }

  /**
   * 按主键查询单条详情
   * @param id 主键
   * @param select 字段投影
   * @param include 关联加载
   * @returns 记录，不存在时返回 null
   */
  async info(id: number, select?: any, include?: any): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...(select && { select }),
      ...(include && { include }),
    });
  }

  /**
   * 新增记录
   * @param data 待创建的数据
   * @returns 创建后的记录
   */
  async add(data: any): Promise<T> {
    return this.model.create({ data });
  }

  /**
   * 按主键更新记录
   * @param id 主键
   * @param data 待更新的字段
   * @returns 更新后的记录
   */
  async update(id: number, data: any): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  /**
   * 按主键删除（支持单个或批量）
   * @param ids 单个主键或主键数组
   */
  async delete(ids: number | number[]): Promise<void> {
    // 统一收敛为数组，单删/批删走同一条 deleteMany
    const idList = Array.isArray(ids) ? ids : [ids];
    await this.model.deleteMany({ where: { id: { in: idList } } });
  }
}
