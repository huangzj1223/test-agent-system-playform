import { Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiOkVoid, Perms } from '@/common/decorators';
import { RecycleService } from '../services/recycle.service';
import { RecycleDataVo } from '../vo/recycle.vo';
import { RestoreDto, ClearRecycleDto } from '../dto/recycle.dto';

/**
 * 回收站控制器
 *
 * 提供回收站数据的分页查询，以及恢复到原表、彻底删除两个写操作接口。
 * 分页支持按实体名称模糊检索，并可按实体名、操作人精确过滤。
 */
@ApiTags('回收站')
@CrudController({
  prefix: 'admin/recycle/data',
  api: ['page'],
  pageQueryOp: {
    keyWordLikeFields: ['entityName'],
    fieldEq: ['entityName', 'userId'],
  },
})
export class RecycleController extends CrudControllerFactory(RecycleDataVo) {
  constructor(private readonly recycleService: RecycleService) {
    super(recycleService);
  }

  /**
   * 将指定回收站记录恢复到其原始数据表
   * @param dto 待恢复的回收站记录 ID
   */
  @Post('restore')
  @Perms('restore')
  @ApiOperation({ summary: '恢复数据到原表' })
  @ApiOkVoid()
  async restore(@Body() dto: RestoreDto) {
    await this.recycleService.restore(dto.id);
    return this.ok();
  }

  /**
   * 彻底删除回收站记录（物理删除，不可恢复）
   * @param dto 待清除的回收站记录 ID 列表
   */
  @Post('clear')
  @Perms('clear')
  @ApiOperation({ summary: '彻底删除回收站记录' })
  @ApiOkVoid()
  async clear(@Body() dto: ClearRecycleDto) {
    await this.recycleService.clear(dto.ids);
    return this.ok();
  }
}
