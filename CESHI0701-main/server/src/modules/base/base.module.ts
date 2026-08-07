import { Module } from '@nestjs/common';
import { OpenController } from './controllers/open.controller';
import { UserController } from './controllers/user.controller';
import { RoleController } from './controllers/role.controller';
import { MenuController } from './controllers/menu.controller';
import { DepartmentController } from './controllers/department.controller';
import { PositionController } from './controllers/position.controller';
import { LogController } from './controllers/log.controller';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';
import { MenuService } from './services/menu.service';
import { DepartmentService } from './services/department.service';
import { PositionService } from './services/position.service';
import { LogService } from './services/log.service';

/**
 * 基础模块（base）
 * 系统管理基座，聚合用户、角色、菜单、部门、岗位、日志等基础数据的接口与服务，
 * 并对外导出认证服务（AuthService）与日志服务（LogService）供其他模块复用。
 */
@Module({
  controllers: [
    OpenController,
    UserController,
    RoleController,
    MenuController,
    DepartmentController,
    PositionController,
    LogController,
  ],
  providers: [
    AuthService,
    UserService,
    RoleService,
    MenuService,
    DepartmentService,
    PositionService,
    LogService,
  ],
  exports: [AuthService, LogService],
})
export class BaseModule {}
