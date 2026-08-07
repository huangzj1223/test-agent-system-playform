import { Body, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { Perms } from '@/common/decorators';
import { ModelConfigService } from '../services/model-config.service';
import { ModelConfigVo } from '../vo/model-config.vo';
import { AddModelDto, UpdateModelDto } from '../dto/model-config.dto';

/**
 * 模型控制器
 *
 * 管理供应商配置下的模型条目。list 支持按 providerConfigId 精确过滤，
 * add/update 覆盖基类以做「同一供应商下 modelId 不重复」校验。
 * 模型无敏感字段，无需脱敏。
 */
@ApiTags('AI 模型-模型列表')
@CrudController({
  prefix: 'admin/model-config/model',
  api: ['list', 'info', 'delete'],
  pageQueryOp: {
    keyWordLikeFields: ['name', 'modelId'],
    fieldEq: ['providerConfigId'],
  },
})
export class ModelConfigController extends CrudControllerFactory(ModelConfigVo) {
  constructor(private readonly modelService: ModelConfigService) {
    super(modelService);
  }

  /**
   * 新增模型（校验同供应商下 modelId 不重复）
   */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新增模型' })
  async add(@Body() dto: AddModelDto) {
    if (
      await this.modelService.isModelIdDuplicated(dto.providerConfigId, dto.modelId)
    ) {
      return this.fail('该供应商下已存在相同模型 ID');
    }
    return this.ok(await this.modelService.add(dto));
  }

  /**
   * 更新模型（若改动 modelId，校验不与同供应商下其他模型重复）
   */
  @Put('update')
  @Perms('update')
  @ApiOperation({ summary: '更新模型' })
  async update(@Body() dto: UpdateModelDto) {
    const { id, ...data } = dto;
    // 仅当传入 modelId 时才需查重（需先取所属供应商）
    if (data.modelId) {
      const current = await this.modelService.info(id);
      if (!current) {
        return this.fail('模型不存在');
      }
      const providerConfigId = (current as { providerConfigId: number }).providerConfigId;
      if (
        await this.modelService.isModelIdDuplicated(
          providerConfigId,
          data.modelId,
          id,
        )
      ) {
        return this.fail('该供应商下已存在相同模型 ID');
      }
    }
    return this.ok(await this.modelService.update(id, data));
  }
}
