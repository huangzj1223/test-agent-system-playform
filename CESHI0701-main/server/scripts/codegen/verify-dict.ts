/**
 * 代码生成器验收脚本：验证分层（admin/app）生成结构正确、DTO 有效
 *
 * 运行：npx ts-node -r tsconfig-paths/register scripts/codegen/verify-dict.ts
 *
 * 放在 scripts/ 下（不在 tsconfig include 的 src/ 范围内），避免被编译进生产产物。
 */
import { GeneratorService } from '@/modules/coding/services/generator.service';
import { EntityIR } from '@/modules/coding/types/ir.types';

// dict-type：纯标准 CRUD，无自定义方法 → 用于验证生成结构
const dictTypeIR: EntityIR = {
  tier: 'admin',
  module: 'dict',
  name: 'DictType',
  modelName: 'dictType',
  tableName: 'dict_type',
  comment: '字典类型',
  fields: [],
  options: {
    api: ['add', 'delete', 'update', 'info', 'page', 'list'],
    keyWordLikeFields: ['name', 'key'],
    fieldEq: [],
  },
};

const dictInfoIR: EntityIR = {
  tier: 'admin',
  module: 'dict',
  name: 'DictInfo',
  modelName: 'dictInfo',
  tableName: 'dict_info',
  comment: '字典项',
  fields: [],
  options: {
    api: ['add', 'delete', 'update', 'info', 'page', 'list'],
    keyWordLikeFields: ['name', 'value'],
    fieldEq: ['typeId'],
  },
};

// PART_2

/** 验收脚本输出（CLI 工具的标准输出，非调试日志） */
function print(msg: string): void {
  process.stdout.write(msg + '\n');
}

/** 断言：condition 为真则 PASS，否则 FAIL 并打印详情 */
function assert(label: string, condition: boolean, detail?: string): boolean {
  print(`[${condition ? 'PASS' : 'FAIL'}] ${label}`);
  if (!condition && detail) print(`    ${detail}`);
  return condition;
}

function main(): void {
  const svc = new GeneratorService();
  svc.onModuleInit();

  const results: boolean[] = [];

  // 1. admin 层：dict-type 生成结构验证
  const typeFiles = svc.renderEntity(dictTypeIR);
  const svcContent = typeFiles['services/dict-type.service.ts'];
  const ctrlPath = 'controllers/admin/dict-type.controller.ts';
  const ctrlContent = typeFiles[ctrlPath];

  results.push(assert(
    'admin controller 写入 controllers/admin/ 子目录',
    !!ctrlContent,
    `实际产物键: ${Object.keys(typeFiles).join(', ')}`,
  ));
  results.push(assert(
    'admin controller prefix 为 admin/dict/type',
    !!ctrlContent && ctrlContent.includes("prefix: 'admin/dict/type'"),
  ));
  results.push(assert(
    'controller import service 为 ../../services/（深一层）',
    !!ctrlContent && ctrlContent.includes("from '../../services/dict-type.service'"),
  ));
  results.push(assert(
    'service 不分端，仍在 services/ 下',
    !!svcContent && svcContent.includes("super(prisma, 'dictType')"),
  ));

  // 2. app 层：同一表生成到 app 体系，前缀与目录随 tier 变化
  const appIR = { ...dictTypeIR, tier: 'app' as const };
  const appFiles = svc.renderEntity(appIR);
  results.push(assert(
    'app controller 写入 controllers/app/ 子目录',
    !!appFiles['controllers/app/dict-type.controller.ts'],
  ));
  results.push(assert(
    'app controller prefix 为 app/dict/type',
    appFiles['controllers/app/dict-type.controller.ts']?.includes("prefix: 'app/dict/type'") ?? false,
  ));

  // 3. module 聚合：import 路径含 tier 子目录
  const moduleFiles = svc.renderModule('dict', [dictTypeIR, dictInfoIR]);
  const mod = moduleFiles['dict.module.ts'];
  results.push(assert(
    'module.ts import controller 含 admin/ 子目录',
    !!mod && mod.includes("./controllers/admin/dict-type.controller"),
  ));

  // 4. DTO 渲染有效性（带字段实体）
  const equipmentIR: EntityIR = {
    tier: 'admin',
    module: 'equipment',
    name: 'EquipmentArchive',
    modelName: 'equipmentArchive',
    tableName: 'equipment_archive',
    comment: '设备档案',
    fields: [
      {
        name: 'deviceNo', columnName: 'device_no', tsType: 'string', prismaType: 'String',
        nullable: false, comment: '设备编号', isPrimary: false, isCommon: false,
        validators: ['@IsString()', '@MaxLength(64)'], inDto: true, inQuery: true,
      },
    ],
    options: { api: ['add', 'delete', 'update', 'info', 'page', 'list'], keyWordLikeFields: ['deviceNo'], fieldEq: [] },
  };
  const dto = svc.renderEntity(equipmentIR)['dto/equipment-archive.dto.ts'];
  results.push(assert(
    'DTO 有效（导入非空 + 字段 + 类名）',
    !!dto && !/import \{\s*\} from/.test(dto) && dto.includes('IsString') &&
      dto.includes('deviceNo') && dto.includes('CreateEquipmentArchiveDto'),
  ));

  const allPass = results.every(Boolean);
  print(`\n总计: ${results.filter(Boolean).length}/${results.length} 通过`);
  process.exit(allPass ? 0 : 1);
}

main();

