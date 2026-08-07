import {
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiResult, Perms } from '@/common/decorators';
import { SpaceInfoService } from '../services/space-info.service';
import { SpaceInfoVo } from '../vo/space.vo';

// 上传文件保存目录
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// 允许的文件扩展名白名单（不含 SVG，SVG 可内嵌脚本构成 XSS）
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.zip', '.mp4', '.mp3',
]);

// 单文件最大 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 文件管理控制器
 *
 * 提供文件的删除、详情、分页查询接口，并实现文件上传：
 * 上传文件经扩展名白名单与大小限制校验后，以 UUID 重命名落盘，
 * 并将元信息记录入库。
 */
@ApiTags('文件管理')
@CrudController({
  prefix: 'admin/space/info',
  api: ['delete', 'info', 'page'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['type', 'classifyId'],
  },
})
export class SpaceInfoController extends CrudControllerFactory(SpaceInfoVo) {
  constructor(private readonly spaceInfoService: SpaceInfoService) {
    super(spaceInfoService);
  }

  @Post('upload')
  @Perms('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiResult(SpaceInfoVo)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          // 用 UUID 重命名，杜绝路径穿越和文件名冲突
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
          cb(new BadRequestException(`不支持的文件类型: ${ext}`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  /**
   * 上传单个文件并保存元信息
   * @param file Multer 解析后的上传文件对象
   * @returns 入库后的文件记录
   */
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未接收到文件');
    }

    const saved = await this.spaceInfoService.saveFile({
      url: `/uploads/${file.filename}`,
      // 原始文件名截断，防止超长字符串
      name: file.originalname.slice(0, 255),
      type: file.mimetype,
      size: file.size,
    });

    return this.ok(saved);
  }
}
