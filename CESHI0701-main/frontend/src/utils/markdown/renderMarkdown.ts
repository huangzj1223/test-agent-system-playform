/**
 * 零依赖安全 Markdown 渲染器
 * 策略：全文先 HTML 转义（防 XSS），再在转义后的文本上用白名单规则拼接安全标签。
 * 不解析原生 HTML 标签，不产生任何来自用户输入的属性，代码高亮交给 v-highlight 指令。
 * 支持子集：标题、粗体、斜体、行内代码、链接、图片、有序/无序列表、表格、围栏代码块、段落。
 */

/** 允许的链接/图片协议白名单（data:image 排除可内嵌脚本的 svg+xml） */
const SAFE_PROTOCOL = /^(https?:|mailto:|data:image\/(?!svg))/i

/** HTML 转义，杜绝标签注入 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 校验 URL 协议是否安全，安全则返回原值，否则返回空串 */
function safeUrl(raw: string): string {
  // 先剔除 Tab/CR/LF —— 浏览器解析 href 时会忽略这些字符，
  // 保留会让 `java\tscript:` 绕过协议前缀正则，造成 XSS
  const url = raw.replace(/[\t\n\r]/g, '').trim()
  // 相对路径（不含协议）视为安全
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return SAFE_PROTOCOL.test(url) ? url : ''
}

/** 解析行内元素（输入必须已 HTML 转义） */
function renderInline(escaped: string): string {
  let out = escaped
  // 图片 ![alt](url) —— 需在链接之前处理
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) => {
    const safe = safeUrl(url)
    if (!safe) return alt
    return `<img src="${safe}" alt="${alt}" loading="lazy" class="md-img" />`
  })
  // 链接 [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
    const safe = safeUrl(url)
    if (!safe) return text
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })
  // 行内代码 `code`
  out = out.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  // 粗体 **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 删除线 ~~text~~（GFM）
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  // 斜体 *text*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 自动链接（GFM）：裸露的 http(s) URL 转为可点击链接（需未被已生成的标签包裹）
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (_m, pre: string, url: string) => {
    const safe = safeUrl(url)
    if (!safe) return `${pre}${url}`
    return `${pre}<a href="${safe}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
  return out
}

/** 渲染表格（传入已转义的行数组，含表头分隔行） */
function renderTable(rows: string[]): string {
  const parseRow = (line: string): string[] =>
    line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim())
  const header = parseRow(rows[0])
  const body = rows.slice(2).map(parseRow)
  const th = header.map((c) => `<th>${renderInline(c)}</th>`).join('')
  const trs = body
    .map((cells) => `<tr>${cells.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table class="md-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`
}

/** 判断连续行是否构成表格（第二行为分隔行） */
function isTableStart(lines: string[], i: number): boolean {
  return (
    lines[i]?.includes('|') &&
    /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '') &&
    (lines[i + 1] || '').includes('-')
  )
}

/** 主渲染：块级解析 */
export function renderMarkdown(source: string): string {
  if (!source) return ''
  const escaped = escapeHtml(source)
  const lines = escaped.split('\n')
  const html: string[] = []
  let i = 0
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    // 围栏代码块 ```lang
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      closeList()
      const lang = fence[1]
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++])
      i++ // 跳过结束围栏
      const cls = lang ? ` class="language-${lang}"` : ''
      html.push(`<pre><code${cls}>${code.join('\n')}</code></pre>`)
      continue
    }
    // 表格
    if (isTableStart(lines, i)) {
      closeList()
      const tbl: string[] = []
      while (i < lines.length && lines[i].includes('|')) tbl.push(lines[i++])
      html.push(renderTable(tbl))
      continue
    }
    // 标题 # ~ ######
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      i++
      continue
    }
    // 有序列表
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ol) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${renderInline(ol[1])}</li>`)
      i++
      continue
    }
    // 任务列表 - [ ] / - [x]（GFM，需在普通无序列表之前判断）
    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/)
    if (task) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul class="md-task-list">')
        listType = 'ul'
      }
      const checked = task[1].toLowerCase() === 'x' ? ' checked' : ''
      html.push(
        `<li class="md-task-item"><input type="checkbox" disabled${checked} />${renderInline(task[2])}</li>`
      )
      i++
      continue
    }
    // 无序列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${renderInline(ul[1])}</li>`)
      i++
      continue
    }
    // 空行
    if (!line.trim()) {
      closeList()
      i++
      continue
    }
    // 普通段落
    closeList()
    html.push(`<p>${renderInline(line)}</p>`)
    i++
  }
  closeList()
  return html.join('\n')
}
