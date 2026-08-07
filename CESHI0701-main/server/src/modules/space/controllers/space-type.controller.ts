import { ApiTags } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { SpaceTypeService } from '../services/space-type.service';
import { SpaceTypeVo } from '../vo/space.vo';

/**
 * 文件分类控制器
 *
 * 提供文件分类的增删改查与列表接口，支持按名称模糊检索、按父级 ID 过滤，
 * 用于维护文件的树形分类结构。
 */
@ApiTags('文件分类')
@CrudController({
  prefix: 'admin/space/type',
  api: ['add', 'delete', 'update', 'info', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['parentId'],
  },
})
export class SpaceTypeController extends CrudControllerFactory(SpaceTypeVo) {
  constructor(private readonly spaceTypeService: SpaceTypeService) {
    super(spaceTypeService);
  }
}
