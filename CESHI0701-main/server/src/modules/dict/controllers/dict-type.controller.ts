import { ApiTags } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { DictTypeService } from '../services/dict-type.service';
import { DictTypeVo } from '../vo/dict.vo';

/**
 * 字典类型控制器
 *
 * 提供字典类型的标准 CRUD 接口（增删改查、分页、列表），
 * 分页支持按名称（name）与键（key）模糊检索。
 */
@ApiTags('字典类型')
@CrudController({
  prefix: 'admin/dict/type',
  api: ['add', 'delete', 'update', 'info', 'page', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name', 'key'],
  },
})
export class DictTypeController extends CrudControllerFactory(DictTypeVo) {
  constructor(private readonly dictTypeService: DictTypeService) {
    super(dictTypeService);
  }
}
