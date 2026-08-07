import { Module } from '@nestjs/common';
import { ModelProviderConfigController } from './controllers/model-provider-config.controller';
import { ModelConfigController } from './controllers/model-config.controller';
import { ModelProviderConfigService } from './services/model-provider-config.service';
import { ModelConfigService } from './services/model-config.service';

/**
 * AI 模型配置模块
 *
 * 管理模型供应商配置（含 API Key 加密存储）与其下模型列表。
 * 导出 ModelProviderConfigService，供后续 AG-UI 对话模块内部调用
 * resolveById 解密取用模型连接上下文（明文密钥仅在内存传递）。
 */
@Module({
  controllers: [ModelProviderConfigController, ModelConfigController],
  providers: [ModelProviderConfigService, ModelConfigService],
  exports: [ModelProviderConfigService, ModelConfigService],
})
export class ModelConfigModule {}
