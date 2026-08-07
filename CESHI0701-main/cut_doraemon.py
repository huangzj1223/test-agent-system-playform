"""抠出机器猫(含月亮)：裁掉顶部气泡/文字，边缘泛洪去背景，保留最大连通块去掉散落星星，羽化透明边。"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
OUT = sys.argv[2]

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im)
h, w, _ = arr.shape

# 1) 裁掉顶部气泡+DORAEMON 文字（y<758 的区域），只留机器猫+月亮
Y0 = 758
crop = arr[Y0:, :, :]
ch, cw, _ = crop.shape

# 2) "浅色"掩码：接近白/浅灰的像素（背景 + 机器猫脸/肚白）
light = (crop[:, :, 0] > 225) & (crop[:, :, 1] > 225) & (crop[:, :, 2] > 225)

# 3) 边缘泛洪：只有与图像边框连通的浅色才算背景，机器猫内部封闭的白保留
lbl, n = ndimage.label(light)
border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
border.discard(0)
bg = np.isin(lbl, list(border))
fg = ~bg

# 4) 保留最大连通前景块（机器猫+月亮为一整块），散落的星星是独立小块被丢弃
flbl, fn = ndimage.label(fg)
if fn > 0:
    sizes = ndimage.sum(np.ones_like(flbl), flbl, range(1, fn + 1))
    keep = int(np.argmax(sizes)) + 1
    fg = flbl == keep

# 5) 填补前景内部小孔
fg = ndimage.binary_fill_holes(fg)

# 6) 羽化 alpha：对 0/255 掩码做轻微高斯模糊，得到抗锯齿边
alpha = (fg.astype(np.float32)) * 255.0
alpha = ndimage.gaussian_filter(alpha, sigma=0.6)
alpha = np.clip(alpha, 0, 255).astype(np.uint8)

rgba = np.dstack([crop, alpha])

# 7) 按不透明像素自动裁边 + 留 12px 透明内边距
ys, xs = np.where(alpha > 20)
top, bot = ys.min(), ys.max()
left, right = xs.min(), xs.max()
pad = 12
top = max(0, top - pad); left = max(0, left - pad)
bot = min(ch - 1, bot + pad); right = min(cw - 1, right + pad)
rgba = rgba[top:bot + 1, left:right + 1]

Image.fromarray(rgba, "RGBA").save(OUT)
print("saved", OUT, "size", rgba.shape[1], "x", rgba.shape[0])
