import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, BrowserContext } from 'playwright';
import { assertSafePublicUrl } from '@/common/utils/url-guard.util';
import { getWebSite } from '../web-agent.sites';

/** 读取结果 */
export interface ReadPageResult {
  /** 最终 URL（可能因重定向变化） */
  url: string;
  /** 页面标题 */
  title: string;
  /** 抽取的正文文本（已截断） */
  text: string;
  /** 是否被截断 */
  truncated: boolean;
}

/** 正文最大返回字符数（防止把超长页面塞爆模型上下文） */
const MAX_TEXT_LEN = 8000;
/** 单次导航超时（毫秒） */
const NAV_TIMEOUT_MS = 20000;
/** 并发上限（无头浏览器较重，限制同时打开的页面数） */
const MAX_CONCURRENCY = 3;

/**
 * 无头浏览器服务：用 Playwright 打开页面、跑 JS、抽取渲染后正文。
 * 单例浏览器懒启动，每请求独立无状态 context（不带 cookie/登录态），
 * 并发信号量限流，进程退出时关闭浏览器。仅只读浏览，绝不提交表单/登录/支付。
 */
@Injectable()
export class PlaywrightService implements OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightService.name);
  private browser: Browser | null = null;
  /** 浏览器启动 Promise（避免并发重复启动） */
  private launching: Promise<Browser> | null = null;
  /** 当前占用的并发槽位数 */
  private active = 0;

  /** 懒启动单例浏览器（并发安全：共用同一个 launching Promise） */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (!this.launching) {
      // 动态 import：仅在首次真正需要时加载 playwright，避免未安装浏览器时影响进程启动
      this.launching = import('playwright')
        .then(({ chromium }) =>
          chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
          }),
        )
        .then((b) => {
          this.browser = b;
          this.launching = null;
          // 浏览器异常断开时清空引用，下次重启
          b.on('disconnected', () => {
            if (this.browser === b) this.browser = null;
          });
          return b;
        })
        .catch((e) => {
          this.launching = null;
          throw e;
        });
    }
    return this.launching;
  }

  /**
   * 读取页面正文：SSRF 校验 → 无状态 context 导航 → 等渲染 → 抽正文 → 截断。
   * @param target 目标 URL（已由调用方按 site/url 解析）
   * @param siteKey 站点键（可选，用于取该站点的正文选择器）
   */
  async readPage(target: string, siteKey?: string): Promise<ReadPageResult> {
    // SSRF 校验：挡内网/localhost/DNS 重绑定，仅放行公网 http/https
    await assertSafePublicUrl(target);

    if (this.active >= MAX_CONCURRENCY) {
      throw new Error('网页读取繁忙，请稍后再试');
    }
    this.active++;
    let context: BrowserContext | null = null;
    try {
      const browser = await this.getBrowser();
      // 每请求独立 context：无 cookie/localStorage/登录态，请求间互不影响
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        javaScriptEnabled: true,
      });
      const page = await context.newPage();
      // 阻断弹窗对话框（alert/confirm）避免卡死
      page.on('dialog', (d) => void d.dismiss().catch(() => undefined));

      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

      // SSRF 防重定向：初始 URL 已校验，但服务端 3xx 可能把我们导向内网（如云元数据 169.254.169.254）。
      // page.goto 会自动跟随重定向，故在此对「最终落地 URL」二次校验，命中内网则不抽取、不返回正文，
      // 阻断响应体外泄。（多跳中间经过的内网地址属残留盲 SSRF，风险低：无响应返回。）
      const finalUrl = page.url();
      if (finalUrl && finalUrl !== target) {
        await assertSafePublicUrl(finalUrl);
      }

      // 再等网络大致空闲，给 JS 渲染留时间（超时不致命，能抽多少算多少）
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      const title = await page.title().catch(() => '');

      // 优先按站点选择器聚焦正文，回退到整页可见文本
      const selector = siteKey ? getWebSite(siteKey)?.resultSelector : undefined;
      const raw = await this.extractText(page, selector);
      const text = raw.slice(0, MAX_TEXT_LEN);
      return { url: finalUrl, title, text, truncated: raw.length > MAX_TEXT_LEN };
    } finally {
      await context?.close().catch(() => undefined);
      this.active--;
    }
  }

  /**
   * 抽取页面可见文本：优先选择器区域，否则整页 body。
   * @param page Playwright 页面
   * @param selector 可选 CSS 选择器（逗号分隔多个，取首个命中的）
   */
  private async extractText(
    page: import('playwright').Page,
    selector?: string,
  ): Promise<string> {
    if (selector) {
      const scoped = await page
        .evaluate((sel: string) => {
          const el = document.querySelector(sel.split(',')[0].trim());
          return el ? (el as HTMLElement).innerText : '';
        }, selector)
        .catch(() => '');
      if (scoped && scoped.trim()) return scoped.replace(/\n{3,}/g, '\n\n').trim();
    }
    const body = await page
      .evaluate(() => document.body?.innerText || '')
      .catch(() => '');
    return body.replace(/\n{3,}/g, '\n\n').trim();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }
}
