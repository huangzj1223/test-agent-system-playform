import { Module } from '@nestjs/common';
import { SpaceInfoController } from './controllers/space-info.controller';
import { SpaceTypeController } from './controllers/space-type.controller';
import { SpaceInfoService } from './services/space-info.service';
import { SpaceTypeService } from './services/space-type.service';

/**
 * 空间模块（文件管理）
 *
 * 聚合文件信息（SpaceInfo）与文件分类（SpaceType）的控制器与服务，
 * 提供文件上传、管理及分类能力，并对外导出两个服务。
 */
@Module({
  controllers: [SpaceInfoController, SpaceTypeController],
  providers: [SpaceInfoService, SpaceTypeService],
  exports: [SpaceInfoService, SpaceTypeService],
})
export class SpaceModule {}
