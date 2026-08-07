import { Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { Public } from '@/common/decorators';
import { DictInfoService } from '../services/dict-info.service';
import { DictInfoVo } from '../vo/dict.vo';
import { GetDictByKeysDto } from '../dto/dict.dto';

/**
 * 字典项控制器
 *
 * 提供字典项的标准 CRUD 接口，并额外暴露按字典类型 key 批量取数的开放接口，
 * 供前端在无需登录的场景下加载下拉选项等基础字典数据。
 */
@ApiTags('字典项')
@CrudController({
  prefix: 'admin/dict/info',
  api: ['add', 'delete', 'update', 'info', 'page', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name', 'value'],
    fieldEq: ['typeId'],
  },
})
export class DictInfoController extends CrudControllerFactory(DictInfoVo) {
  constructor(private readonly dictInfoService: DictInfoService) {
    super(dictInfoService);
  }

  /**
   * 根据字典类型 key 列表批量获取字典项（开放接口，无需鉴权）
   * @param dto 包含字典类型 key 列表的请求体
   * @returns 以字典类型 key 分组的字典项映射
   */
  @Post('data')
  @Public()
  @ApiOperation({ summary: '根据字典类型 key 批量获取字典项' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'object', description: '按字典类型 key 分组的字典项' },
      },
    },
  })
  async data(@Body() dto: GetDictByKeysDto) {
    const data = await this.dictInfoService.getByKeys(dto.keys);
    return this.ok(data);
  }
}
