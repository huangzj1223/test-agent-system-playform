import {
  Body,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { PageOptions } from '@/common/crud/base.service';
import { Perms, Admin } from '@/common/decorators';
import { assertSafePublicUrl } from '@/common/utils/url-guard.util';
import { ModelProviderConfigService } from '../services/model-provider-config.service';
import { ProviderConfigVo } from '../vo/model-config.vo';
import {
  AddProviderDto,
  UpdateProviderDto,
  TestConnectionDto,
} from '../dto/model-config.dto';

/**
 * 供应商配置控制器
 *
 * 提供供应商配置的增删改查与连接测试。
 * 安全约束：所有响应经服务层脱敏，绝不返回 apiKeyCipher；
 * 新增/更新的明文 apiKey 加密后落库，错误提示不含密钥；
 * 测试连接对目标地址做 SSRF 校验，禁止访问内网地址。
 * 覆盖 list/detail/add/update 以接入脱敏与加密逻辑（重写方法须重新声明路由与权限装饰器），
 * 并显式禁用 update-status（避免继承路由绕过脱敏返回密文），delete/batch-delete 沿用基类。
 */
@ApiTags('AI 模型-供应商配置')
@CrudController({
  prefix: 'admin/model-config/provider',
  api: ['delete'],
})
export class ModelProviderConfigController extends CrudControllerFactory(
  ProviderConfigVo,
) {
  private readonly logger = new Logger(ModelProviderConfigController.name);

  constructor(private readonly providerService: ModelProviderConfigService) {
    super(providerService);
  }

  /**
   * 分页/列表查询（脱敏，不返回密钥）
   */
  @Get('list')
  @Perms('list')
  @ApiOperation({ summary: '分页/列表查询供应商配置' })
  @ApiQuery({ name: 'page', required: false, description: '页码，从 1 开始' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（1-100）' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键字（模糊匹配配置名称）' })
  async list(@Query() query: PageOptions & Record<string, any>) {
    const sort = query.sort === 'asc' || query.sort === 'desc' ? query.sort : undefined;
    const options: PageOptions = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      order: query.order,
      sort,
    };
    // 关键字模糊匹配配置名称
    const where = query.keyword ? { name: { contains: query.keyword } } : undefined;
    return this.ok(await this.providerService.pageSafe(options, where));
  }

  /**
   * 一次性返回全部供应商配置及其模型（脱敏）
   * 供前端聊天面板首屏加载，单请求取全量，消除逐供应商查模型的 N+1 串行往返。
   * 复用 list 权限点（不新增权限点，避免菜单未登记告警）。
   */
  @Get('all-with-models')
  @Perms('list')
  @ApiOperation({ summary: '一次性返回全部供应商配置及其模型（脱敏，供首屏加载）' })
  async allWithModels() {
    return this.ok({ list: await this.providerService.listAllWithModels() });
  }

  /**
   * 详情查询（脱敏）
   */
  @Get('detail/:id')
  @Perms('detail')
  @ApiOperation({ summary: '按 id 查询供应商配置详情' })
  @ApiParam({ name: 'id', description: '配置 ID', type: Number })
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.ok(await this.providerService.infoSafe(id));
  }

  /**
   * 新增配置（明文 apiKey 加密后存储）
   */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新增供应商配置' })
  async add(@Body() dto: AddProviderDto) {
    return this.ok(await this.providerService.addWithEncryption(dto));
  }

  /**
   * 更新配置（apiKey 非空才替换）
   */
  @Put('update')
  @Perms('update')
  @ApiOperation({ summary: '更新供应商配置' })
  async update(@Body() dto: UpdateProviderDto) {
    const { id, ...data } = dto;
    return this.ok(await this.providerService.updateWithEncryption(id, data));
  }

  /**
   * 揭示已存 API Key 明文（管理端「查看密钥」按需调用）
   *
   * 安全说明：本接口会将已加密的密钥解密后经网络明文返回，仅在用户显式点击查看时调用。
   * 以独立权限点 reveal-key 控制（可单独授予/回收），并记录审计日志（谁查看了哪个配置，
   * 不记录密钥明文）。密钥不存在时返回 null，不泄露配置是否存在的额外信息。
   */
  @Get('reveal-key/:id')
  @Perms('reveal-key')
  @ApiOperation({ summary: '揭示已存 API Key 明文（需 reveal-key 权限）' })
  @ApiParam({ name: 'id', description: '配置 ID', type: Number })
  async revealKey(
    @Param('id', ParseIntPipe) id: number,
    @Admin('userId') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 明文响应禁止任何层级缓存（浏览器/反向代理/CDN），纵深防御
    res.setHeader('Cache-Control', 'no-store');
    // 审计：记录揭示行为（操作人 + 目标配置），绝不记录明文密钥
    this.logger.warn(`用户 ${userId} 揭示了供应商配置 ${id} 的 API Key`);
    const apiKey = await this.providerService.revealApiKey(id);
    if (apiKey === null) {
      return this.fail('配置不存在或尚未设置 API Key');
    }
    return this.ok({ apiKey });
  }

  /**
   * 测试连接：用已存密钥探测供应商可用性，不回显密钥
   * 先做 SSRF 校验（禁止内网地址），再以 redirect:'manual' 发起请求防跳转绕过。
   */
  @Post('test-connection')
  @Perms('test-connection')
  @ApiOperation({ summary: '测试供应商连接' })
  async testConnection(@Body() dto: TestConnectionDto) {
    const ctx = await this.providerService.resolveById(dto.id, dto.modelId);
    if (!ctx) {
      return this.fail('配置不存在或尚未设置 API Key');
    }

    // SSRF 防护：拒绝指向环回/私有/链路本地/元数据的地址
    try {
      await assertSafePublicUrl(ctx.apiEndpoint);
    } catch (e) {
      return this.fail(`连接测试失败：${(e as Error).message}`);
    }

    try {
      // 用 AbortController 控制超时，redirect:'manual' 防校验通过后被 3xx 跳转到内网
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(ctx.apiEndpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${ctx.apiKey}` },
        signal: controller.signal,
        redirect: 'manual',
      }).finally(() => clearTimeout(timer));

      // status < 500 说明 endpoint 可达（401/403 属鉴权层，由真实调用校验），仅 5xx/网络失败视为不可达
      if (resp.status < 500) {
        return this.ok({ reachable: true }, '连接测试成功');
      }
      this.logger.warn(`test-connection 配置 ${dto.id} 目标返回 ${resp.status}`);
      return this.fail(`连接测试失败：服务返回 ${resp.status}`);
    } catch (e) {
      // 脱敏：只记录错误类型，不记录 URL 或密钥
      this.logger.warn(
        `test-connection 配置 ${dto.id} 连接异常：${(e as Error)?.name || 'unknown'}`,
      );
      return this.fail('连接测试失败：无法连接到服务地址');
    }
  }

  /**
   * 显式禁用继承的 update-status 路由
   * 基类实现会返回未脱敏的 Prisma 原始记录（含 apiKeyCipher），存在密文泄露风险；
   * 本模块启用状态统一通过 update 接口修改，故此路由直接拒绝。
   */
  @Put('update-status')
  @Perms('update-status')
  @ApiOperation({ summary: '（已禁用）请改用 update 接口修改启用状态' })
  async updateStatus() {
    return this.fail('该接口已禁用，请使用 update 接口修改启用状态');
  }
}
