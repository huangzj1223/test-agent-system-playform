import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentConfigService } from '../services/agent-config.service';

/**
 * 智能体全局配置控制器
 *
 * 提供只读的全局配置（业务限制值 + 默认界面偏好），供前端驱动 UI 限制（滑块上限、
 * 输入长度、模板数量守卫）与默认值，避免前端硬编码。走认证通道，无敏感信息。
 */
@ApiTags('AG-UI 全局配置')
@Controller('admin/ag-ui/config')
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  /** 获取智能体全局配置（限制值 + 默认界面偏好） */
  @Get()
  @ApiOperation({ summary: '获取智能体全局配置' })
  get() {
    return this.agentConfigService.getConfig();
  }
}
