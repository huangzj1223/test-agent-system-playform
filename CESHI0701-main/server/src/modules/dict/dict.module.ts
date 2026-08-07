import { Module } from '@nestjs/common';
import { DictTypeController } from './controllers/dict-type.controller';
import { DictInfoController } from './controllers/dict-info.controller';
import { DictTypeService } from './services/dict-type.service';
import { DictInfoService } from './services/dict-info.service';

/**
 * 字典模块
 *
 * 聚合字典类型（DictType）与字典项（DictInfo）的控制器与服务，
 * 对外导出两个服务供其他模块复用。
 */
@Module({
  controllers: [DictTypeController, DictInfoController],
  providers: [DictTypeService, DictInfoService],
  exports: [DictTypeService, DictInfoService],
})
export class DictModule {}
