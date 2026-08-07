import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

/**
 * 应用启动入口
 *
 * 依次完成：创建 Nest 应用 → 放宽请求体大小限制 → 挂载上传目录静态资源 →
 * 注册全局校验管道 → 配置 CORS → 非生产环境挂载 Swagger 文档 → 启用优雅关闭钩子 → 监听端口。
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 提高请求体大小限制（默认 100kb 过小）：基础配置 Logo 的 base64、富文本内容等可能超限
  // 注：body 解析早于鉴权，生产环境建议在网关层（Nginx client_max_body_size）再设一道大小限制兜底
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('SERVER_PORT', 9001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // 不设全局前缀：路由前缀由各 controller 显式声明（admin/* 或 app/*），支持多鉴权体系分层

  // 静态资源：上传文件目录
  const uploadDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      // 防止浏览器 MIME 嗅探导致的存储型 XSS
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : (nodeEnv === 'production' ? false : true),
    credentials: true,
  });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AgentPM Admin')
      .setDescription('AgentPM 通用后端框架 API 文档')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // 启用优雅关闭钩子，确保定时任务等资源正确释放
  app.enableShutdownHooks();

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`服务已启动: http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`API 文档: http://localhost:${port}/docs`);
    // 仅当 pnpm dev 后台拉起了 Prisma Studio 时才提示其地址（pnpm start:dev 不会设此标志）
    const studioPort = process.env.PRISMA_STUDIO_PORT;
    if (studioPort) {
      logger.log(`数据库 GUI: http://localhost:${studioPort}`);
    }
  }
}
bootstrap();
