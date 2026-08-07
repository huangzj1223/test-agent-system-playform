import { Module } from '@nestjs/common';
import { GeneratorController } from './controllers/generator.controller';
import { GeneratorService } from './services/generator.service';
import { IrBuilderService } from './services/ir-builder.service';
import { IntrospectService } from './services/introspect.service';

/**
 * 代码生成器模块
 *
 * 提供数据库表结构内省（IntrospectService）、IR 中间表示构建（IrBuilderService）
 * 与模块代码生成/写盘（GeneratorService）能力，对外导出供其它模块复用。
 */
@Module({
  controllers: [GeneratorController],
  providers: [GeneratorService, IrBuilderService, IntrospectService],
  exports: [GeneratorService, IrBuilderService, IntrospectService],
})
export class CodingModule {}
