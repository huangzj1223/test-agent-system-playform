import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { SaveConversationDto } from '../dto/conversation.dto';

/** 会话元数据（列表项，不含消息正文） */
export interface ConversationMeta {
  threadId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

/** 会话完整数据（含消息） */
export interface ConversationDetail extends ConversationMeta {
  messages: unknown[];
}

/** 隐藏 JSON 数据块的起止标记（承载无损还原用的消息结构） */
const DATA_BEGIN = '<!-- AGENT_SESSION_DATA';
const DATA_END = '-->';

/**
 * AG-UI 会话持久化服务
 *
 * 每个会话持久化为一个 Markdown 文件：YAML frontmatter 存元数据，
 * 正文为人类可读的对话记录，末尾隐藏 JSON 块承载无损还原的消息结构。
 * 按用户隔离：data/ag-conversations/<userId>/<threadId>.md
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  /** 存储根目录（非静态资源目录，不对外暴露） */
  private readonly rootDir = join(process.cwd(), 'data', 'ag-conversations');

  /** 用户目录（对 userId 做安全化，杜绝路径穿越） */
  private userDir(userId: number | string): string {
    const safe = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
    return join(this.rootDir, safe || 'anonymous');
  }

  /** 线程文件路径（threadId 安全化后校验仍在用户目录内，防穿越） */
  private threadFile(userId: number | string, threadId: string): string {
    const safe = threadId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safe) throw new BadRequestException('非法的会话 ID');
    const dir = this.userDir(userId);
    const file = join(dir, `${safe}.md`);
    if (!resolve(file).startsWith(resolve(dir))) {
      throw new BadRequestException('非法的会话路径');
    }
    return file;
  }

  /** 转义 YAML frontmatter 中的标题（去换行，避免破坏结构） */
  private escapeMeta(text: string): string {
    return text.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
  }

  /** 将会话序列化为 Markdown 文本 */
  private serialize(dto: SaveConversationDto, createdAt: number, updatedAt: number): string {
    const fm = [
      '---',
      `threadId: ${dto.threadId}`,
      `title: "${this.escapeMeta(dto.title)}"`,
      `createdAt: ${createdAt}`,
      `updatedAt: ${updatedAt}`,
      '---',
      '',
    ].join('\n');

    const body = dto.messages
      .map((m) => {
        const label = m.role === 'user' ? '## 🧑 用户' : '## 🤖 助手';
        return `${label}\n\n${m.content || ''}`;
      })
      .join('\n\n');

    // 隐藏数据块：无损承载消息结构（含 blocks），供还原使用。
    // 用 base64 包裹——base64 字符集不含标记文本，确保载荷绝不与 DATA_BEGIN/DATA_END 冲突，
    // 从而 parse 用 lastIndexOf 定位块头时不会被正文或载荷中的同名文本误导。
    const data = Buffer.from(
      JSON.stringify({ messages: dto.messages }),
      'utf-8',
    ).toString('base64');
    const hidden = `\n\n${DATA_BEGIN}\n${data}\n${DATA_END}\n`;

    return `${fm}# ${dto.title}\n\n${body}${hidden}`;
  }

  /** 从 Markdown 文本解析出元数据与消息 */
  private parse(raw: string): ConversationDetail | null {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const pick = (key: string): string => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
      return m ? m[1].trim() : '';
    };
    const threadId = pick('threadId');
    if (!threadId) return null;
    const title = pick('title').replace(/^"|"$/g, '').replace(/\\"/g, '"');
    const createdAt = Number(pick('createdAt')) || 0;
    const updatedAt = Number(pick('updatedAt')) || createdAt;

    let messages: unknown[] = [];
    // 从「最后一次」出现的标记处定位数据块——数据块由 serialize 固定追加在文件末尾，
    // 用 lastIndexOf 避免正文中恰好包含标记文本时匹配到错误位置。
    const beginIdx = raw.lastIndexOf(DATA_BEGIN);
    if (beginIdx >= 0) {
      const afterBegin = raw.indexOf('\n', beginIdx);
      const endIdx = raw.indexOf(DATA_END, afterBegin);
      if (afterBegin >= 0 && endIdx > afterBegin) {
        const payload = raw.slice(afterBegin + 1, endIdx).trim();
        const messagesOf = (text: string): unknown[] | null => {
          try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed?.messages) ? parsed.messages : null;
          } catch {
            return null;
          }
        };
        // 当前格式：base64 包裹的 JSON；先按 base64 解码解析
        const decoded = messagesOf(Buffer.from(payload, 'base64').toString('utf-8'));
        // 兼容早期格式：数据块曾直接写原始 JSON（非 base64），回退再试一次
        const legacy = decoded === null ? messagesOf(payload) : null;
        if (decoded) messages = decoded;
        else if (legacy) messages = legacy;
        else this.logger.warn(`会话 ${threadId} 的数据块解析失败，消息置空`);
      }
    }
    return { threadId, title, createdAt, updatedAt, messageCount: messages.length, messages };
  }

  /** 列出某用户的全部会话元数据（按更新时间倒序） */
  async list(userId: number | string): Promise<ConversationMeta[]> {
    const dir = this.userDir(userId);
    let files: string[];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
    } catch {
      return []; // 目录不存在 = 无历史
    }
    const metas: ConversationMeta[] = [];
    for (const f of files) {
      try {
        const raw = await fs.readFile(join(dir, f), 'utf-8');
        const parsed = this.parse(raw);
        if (parsed) {
          const { messages, ...meta } = parsed;
          void messages;
          metas.push(meta);
        }
      } catch {
        this.logger.warn(`读取会话文件失败: ${f}`);
      }
    }
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** 读取单个会话完整内容（含消息） */
  async get(userId: number | string, threadId: string): Promise<ConversationDetail | null> {
    const file = this.threadFile(userId, threadId);
    try {
      const raw = await fs.readFile(file, 'utf-8');
      return this.parse(raw);
    } catch {
      return null;
    }
  }

  /** 保存/更新会话（upsert：已存在则保留原 createdAt） */
  async save(userId: number | string, dto: SaveConversationDto): Promise<ConversationMeta> {
    const dir = this.userDir(userId);
    await fs.mkdir(dir, { recursive: true });
    const now = Date.now();
    const existing = await this.get(userId, dto.threadId);
    const createdAt = existing?.createdAt || dto.createdAt || now;
    const md = this.serialize(dto, createdAt, now);
    await fs.writeFile(this.threadFile(userId, dto.threadId), md, 'utf-8');
    return {
      threadId: dto.threadId,
      title: dto.title,
      createdAt,
      updatedAt: now,
      messageCount: dto.messages.length,
    };
  }

  /**
   * 清空某用户的全部会话（删除其目录下所有 .md 文件，幂等）。
   * 只删 .md 文件而非整个目录，避免误删目录内其他潜在文件；目录不存在视为已清空。
   * @param userId 用户 ID
   * @returns 实际删除的会话数量
   */
  async clear(userId: number | string): Promise<number> {
    const dir = this.userDir(userId);
    let files: string[];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
    } catch {
      return 0; // 目录不存在 = 无历史可清
    }
    let removed = 0;
    for (const f of files) {
      try {
        await fs.unlink(join(dir, f));
        removed++;
      } catch {
        this.logger.warn(`清空会话时删除文件失败: ${f}`);
      }
    }
    return removed;
  }

  /** 删除会话（幂等：不存在也不报错） */
  async remove(userId: number | string, threadId: string): Promise<void> {
    // threadFile 放在 try 外：非法 ID 应抛 BadRequestException 返回 400，
    // 不能被下面为 ENOENT 准备的 catch 吞掉。
    const file = this.threadFile(userId, threadId);
    try {
      await fs.unlink(file);
    } catch {
      // 文件不存在，视为已删除
    }
  }
}
