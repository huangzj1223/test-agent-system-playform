/**
 * 站点搜索白名单（后端读取正文用）。
 *
 * 每个站点声明搜索 URL 模板（{kw} 占位，运行时按关键词 encodeURIComponent 后替换），
 * 以及可选的正文抽取选择器（命中则只取该区域文本，否则回退到整页可见文本）。
 * 新增站点在此登记即可。
 */
export interface WebSite {
  /** 站点键（模型/前端引用） */
  key: string;
  /** 站点显示名 */
  label: string;
  /** 搜索 URL 模板，{kw} 为关键词占位 */
  searchTemplate: string;
  /** 正文抽取 CSS 选择器（可选；用于聚焦搜索结果区域，减少噪声） */
  resultSelector?: string;
}

/** 站点白名单 */
export const WEB_SITES: WebSite[] = [
  {
    key: 'bilibili',
    label: 'B站',
    searchTemplate: 'https://search.bilibili.com/all?keyword={kw}',
    resultSelector: '.video-list, .search-page',
  },
  {
    key: 'baidu',
    label: '百度',
    searchTemplate: 'https://www.baidu.com/s?wd={kw}',
    resultSelector: '#content_left',
  },
  {
    key: 'taobao',
    label: '淘宝',
    searchTemplate: 'https://s.taobao.com/search?q={kw}',
  },
  {
    key: 'zhihu',
    label: '知乎',
    searchTemplate: 'https://www.zhihu.com/search?type=content&q={kw}',
    resultSelector: '.SearchMain, .Search-container',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    searchTemplate: 'https://www.youtube.com/results?search_query={kw}',
  },
];

/** 站点键列表（供 DTO 校验用） */
export const WEB_SITE_KEYS: string[] = WEB_SITES.map((s) => s.key);

/** 按键查站点 */
export function getWebSite(key: string): WebSite | undefined {
  return WEB_SITES.find((s) => s.key === key);
}

/**
 * 解析读取目标 URL：优先 site+keyword 按模板拼，否则用直传 url。
 * @returns 解析出的 URL；无法解析返回 null
 */
export function resolveTargetUrl(params: {
  site?: string;
  keyword?: string;
  url?: string;
}): string | null {
  const { site, keyword, url } = params;
  if (site && keyword) {
    const s = getWebSite(site);
    if (!s) return null;
    return s.searchTemplate.replace('{kw}', encodeURIComponent(keyword.trim()));
  }
  if (url && url.trim()) return url.trim();
  return null;
}
