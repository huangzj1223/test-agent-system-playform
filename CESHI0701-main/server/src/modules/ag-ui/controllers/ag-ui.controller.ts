import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { Admin } from '@/common/decorators';
import { RunAgentInputDto } from '../dto/run-agent-input.dto';
import { AgUiService } from '../services/ag-ui.service';

/**
 * AG-UI 统一适配接口
 *
 * 供前端 @ag-ui/client 的 HttpAgent 连接。接收标准 RunAgentInput，
 * 以 SSE（text/event-stream）输出 AG-UI 标准事件流。
 *
 * 使用 @Res() 直写响应，绕过全局 TransformInterceptor 的 JSON 包装。
 * 需登录鉴权：模型密钥由后端按 providerConfigId 解密取用，若公开将被匿名枚举盗用密钥额度，
 * 故要求携带业务 Token（前端 HttpAgent 带 Authorization），由全局 AuthGuard 校验。
 */
@ApiTags('AG-UI')
@Controller('api/ag-ui')
export class AgUiController {
  constructor(private readonly agUiService: AgUiService) {}

  /**
   * 发起一次 Agent 运行（SSE 事件流）
   * @param body RunAgentInput
   * @param res Express 响应对象
   */
  @Post()
  @ApiOperation({ summary: 'AG-UI 运行入口（SSE 事件流，需登录）' })
  async run(
    @Body() body: RunAgentInputDto,
    @Res() res: Response,
    @Admin('userId') userId: number,
  ): Promise<void> {
    await this.agUiService.handleRun(body, res, userId);
  }
}
