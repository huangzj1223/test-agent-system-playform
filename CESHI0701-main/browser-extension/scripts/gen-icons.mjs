/**
 * 生成扩展工具栏占位图标（纯色圆角蓝方块 + 白色 AG 字形近似）。
 * 无第三方依赖：用内置 zlib 手写最小 PNG。品牌细节在 sidepanel 的 HTML/CSS 里精修。
 * 输出：src/assets/icon-16.png / icon-48.png / icon-128.png
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../src/assets')
mkdirSync(OUT, { recursive: true })

// 主色（与主平台蓝一致，取 element-plus 默认主色 #409eff 的偏深企业蓝）
const BLUE = [37, 99, 235] // #2563eb
const WHITE = [255, 255, 255]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

/** 判断像素是否落在圆角方块内（用于抗锯齿边缘的简单裁切） */
function inRoundedRect(x, y, size) {
  const r = size * 0.22 // 圆角半径
  const min = 0
  const max = size - 1
  // 四角圆弧外的点剔除
  const cx = x < r ? r : x > max - r ? max - r : x
  const cy = y < r ? r : y > max - r ? max - r : y
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

/**
 * 画一个近似 "A" 字形（白色）：用三角轮廓判定。
 * size 归一化坐标，返回该点是否属于字形。
 */
function inGlyphA(x, y, size) {
  const nx = x / size
  const ny = y / size
  // 字形区域：中部
  if (ny < 0.28 || ny > 0.74) return false
  const cx = 0.5
  const spread = (ny - 0.28) * 0.42 // 越往下越宽
  const leftOuter = cx - spread - 0.06
  const leftInner = cx - spread + 0.03
  const rightInner = cx + spread - 0.03
  const rightOuter = cx + spread + 0.06
  const onLeftLeg = nx >= leftOuter && nx <= leftInner
  const onRightLeg = nx >= rightInner && nx <= rightOuter
  const onBar = ny > 0.52 && ny < 0.6 && nx > leftInner && nx < rightInner
  return onLeftLeg || onRightLeg || onBar
}

function makePng(size) {
  const bytesPerPixel = 4
  const raw = Buffer.alloc((size * bytesPerPixel + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * bytesPerPixel + 1)
    raw[rowStart] = 0 // filter type 0
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * bytesPerPixel
      const inside = inRoundedRect(x, y, size)
      if (!inside) {
        raw[p] = 0
        raw[p + 1] = 0
        raw[p + 2] = 0
        raw[p + 3] = 0 // 透明
        continue
      }
      const glyph = inGlyphA(x, y, size)
      const c = glyph ? WHITE : BLUE
      raw[p] = c[0]
      raw[p + 1] = c[1]
      raw[p + 2] = c[2]
      raw[p + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

for (const size of [16, 48, 128]) {
  const png = makePng(size)
  writeFileSync(resolve(OUT, `icon-${size}.png`), png)
  console.log(`wrote icon-${size}.png (${png.length} bytes)`)
}

