# -*- coding: utf-8 -*-
"""
把设计稿里的机器猫从「蓝天+草地+花朵」背景中抠出，输出透明底 PNG。
优先用 rembg（卡通角色效果最好）；不可用时回退到 PIL 边缘洪水填充 + 最大连通域保留。
用法: python cutout_welcome.py <src.png> <dst.png>
"""
import sys
from PIL import Image


def try_rembg(src, dst):
    from rembg import remove, new_session
    inp = Image.open(src).convert("RGBA")
    session = new_session("isnet-general-use")  # 对卡通/线稿边缘更干净
    out = remove(inp, session=session)
    return out


def try_floodfill(src, dst):
    """区域生长去背景：与「来源像素」比色而非固定种子，
    平滑渐变（蓝天/草地）可连续蔓延，机器猫黑色描边是硬跳变会挡住填充。"""
    from collections import deque

    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    step_tol = 36  # 单步容差：背景相邻色差≤33，黑描边跳变>400，取中间值

    wall_max = 90  # 各通道都低于此值视为黑色描边→不可穿越的墙

    def diff(c1, c2):
        return abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) + abs(c1[2] - c2[2])

    def is_wall(c):
        return c[0] < wall_max and c[1] < wall_max and c[2] < wall_max

    # 全部边界像素作为背景种子（渐变天空/草地都贴边）
    seeds = []
    for x in range(w):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(h):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    visited = bytearray(w * h)
    q = deque()
    for x, y in seeds:
        idx = y * w + x
        if not visited[idx]:
            r, g, b, _ = px[x, y]
            if is_wall((r, g, b)):  # 边缘正好是黑边则不作背景种子
                continue
            visited[idx] = 1
            px[x, y] = (r, g, b, 0)
            q.append((x, y))

    while q:
        x, y = q.popleft()
        cur = px[x, y][:3]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if visited[nidx]:
                    continue
                r, g, b, a = px[nx, ny]
                if is_wall((r, g, b)):   # 黑色描边：设为已访问但不填充、不越过
                    visited[nidx] = 1
                    continue
                if diff((r, g, b), cur) <= step_tol:  # 与来源像素相似→同属背景
                    visited[nidx] = 1
                    px[nx, ny] = (r, g, b, 0)
                    q.append((nx, ny))

    return im


def keep_largest_blob(im):
    """去掉花朵/云朵等未连边缘的背景孤岛：只保留最大不透明连通域。"""
    from collections import deque

    w, h = im.size
    px = im.load()
    opaque = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 8:
                opaque[y * w + x] = 1

    label = [0] * (w * h)
    best_size, best_id = 0, 0
    cur = 0
    for sy in range(h):
        for sx in range(w):
            sidx = sy * w + sx
            if opaque[sidx] and label[sidx] == 0:
                cur += 1
                size = 0
                q = deque([(sx, sy)])
                label[sidx] = cur
                while q:
                    x, y = q.popleft()
                    size += 1
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h:
                            nidx = ny * w + nx
                            if opaque[nidx] and label[nidx] == 0:
                                label[nidx] = cur
                                q.append((nx, ny))
                if size > best_size:
                    best_size, best_id = size, cur

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if label[idx] != best_id:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    return im


def defringe(im, passes=2, wall_max=90):
    """去边缘杂色：把贴着透明区、且本身不是黑色描边的不透明像素剥掉，
    清掉黑边与背景之间的抗锯齿混合色斑，同时保留黑色轮廓边界。"""
    from collections import deque

    w, h = im.size
    px = im.load()
    for _ in range(passes):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if r < wall_max and g < wall_max and b < wall_max:
                    continue  # 黑色描边像素保留，作为真正边界
                # 与透明像素相邻的彩色像素 = 残留杂边
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        to_clear.append((x, y))
                        break
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return im


def autocrop(im, pad=12):
    """按不透明区域裁剪并留少量边距。"""
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(im.size[0], r + pad); b = min(im.size[1], b + pad)
    return im.crop((l, t, r, b))


def main():
    src, dst = sys.argv[1], sys.argv[2]
    try:
        out = try_rembg(src, dst)
        method = "rembg"
    except Exception as e:
        print("rembg 不可用，回退洪水填充:", e)
        out = try_floodfill(src, dst)
        out = keep_largest_blob(out)
        out = defringe(out)
        method = "floodfill"

    out = autocrop(out)
    out.save(dst)
    print(f"完成[{method}] -> {dst}  尺寸 {out.size}")


if __name__ == "__main__":
    main()

