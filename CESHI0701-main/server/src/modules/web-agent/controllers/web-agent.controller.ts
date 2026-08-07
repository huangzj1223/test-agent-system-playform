import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Admin } from '@/common/decorators';
import { PlaywrightService, type ReadPageResult } from '../services/playwright.service';
import { ReadPageDto } from '../dto/web-agent.dto';
import { resolveTargetUrl } from '../web-agent.sites';

/**
 * 网页读取接口（智能体后端工具）。
 *
 * 前缀 admin/web-agent，走 admin 鉴权。前端 web.readPage 工具经此调用无头浏览器
 * 读取页面渲染后正文，回传给模型总结。仅只读浏览，不带登录态。
 */
@ApiTags('智能体网页读取')
@Controller('admin/web-agent')
export class WebAgentController extends BaseController {
  constructor(private readonly playwright: PlaywrightService) {
    super();
  }

  /** 读取网页正文（site+keyword 或 url 二选一） */
  @Post('read')
  @ApiOperation({ summary: '无头浏览器读取网页正文（需登录）' })
  async read(
    @Body() dto: ReadPageDto,
    @Admin('userId') _userId: number,
  ): Promise<ReadPageResult> {
    const target = resolveTargetUrl(dto);
    if (!target) {
      throw new BadRequestException('请提供 url，或同时提供 site 与 keyword');
    }
    try {
      return await this.playwright.readPage(target, dto.site);
    } catch (e) {
      // 脱敏：不外泄内部错误细节，仅回可读原因
      throw new BadRequestException((e as Error)?.message || '网页读取失败');
    }
  }
}
