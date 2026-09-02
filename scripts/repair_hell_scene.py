from __future__ import annotations

import io
import math
import random
import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageFile

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "src/game/engine.ts"
WORLD = ROOT / "src/game/world.ts"
TEST = ROOT / "scripts/island-content.test.mjs"
ART = ROOT / "public/sprites/hell-reception-v1.png"

W = 1536
H = 1536
TILE = 32


def replace_once(path: Path, old: str, new: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return False
    if old not in text:
        raise RuntimeError(f"Expected source fragment was not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    return True


def patch_source() -> None:
    replace_once(
        ENGINE,
        "const HELL_INTRO = [\n",
        "const HELL_DEVIL = { c: 24, r: 16 } as const;\n"
        "const HELL_EXIT = { c: 24, r: 46 } as const;\n"
        "const HELL_INTRO_CAMERA_Y = 19 * TILE;\n\n"
        "const HELL_INTRO = [\n",
    )
    replace_once(
        ENGINE,
        "    const k = 1 - Math.exp(-5 * dt);\n"
        "    cam.x += (px - cam.x) * k;\n"
        "    cam.y += (py - cam.y) * k;\n",
        "    const k = 1 - Math.exp(-5 * dt);\n"
        "    let cameraX = map === \"hell\" && mode === \"intro\" ? HELL_DEVIL.c * TILE + 16 : px;\n"
        "    let cameraY = map === \"hell\" && mode === \"intro\" ? HELL_INTRO_CAMERA_Y : py;\n"
        "    if (map === \"hell\") {\n"
        "      const worldW = MAP_SIZE.hell.cols * TILE;\n"
        "      const worldH = MAP_SIZE.hell.rows * TILE;\n"
        "      cameraX = worldW <= cssW ? worldW / 2 : Math.max(cssW / 2, Math.min(worldW - cssW / 2, cameraX));\n"
        "      cameraY = worldH <= cssH ? worldH / 2 : Math.max(cssH / 2, Math.min(worldH - cssH / 2, cameraY));\n"
        "    }\n"
        "    cam.x += (cameraX - cam.x) * k;\n"
        "    cam.y += (cameraY - cam.y) * k;\n",
    )
    replace_once(
        ENGINE,
        "    log.push(\"Дьявол собирается провести собеседование. Оно сразу идёт не по плану.\");\n"
        "    cam.x = px;\n"
        "    cam.y = py;\n"
        "    sparks.length = 0;\n",
        "    log.push(\"Дьявол собирается провести собеседование. Оно сразу идёт не по плану.\");\n"
        "    cam.x = HELL_DEVIL.c * TILE + 16;\n"
        "    cam.y = HELL_INTRO_CAMERA_Y;\n"
        "    sparks.length = 0;\n",
    )
    replace_once(
        ENGINE,
        "    const devilX = 24 * TILE + 16;\n"
        "    const devilY = 9 * TILE + 16;\n",
        "    const devilX = HELL_DEVIL.c * TILE + 16;\n"
        "    const devilY = HELL_DEVIL.r * TILE + 16;\n",
    )
    replace_once(
        ENGINE,
        "        const devilSize = 218;\n"
        "        const devil = wrld(24 * TILE + 16 - devilSize / 2, 9 * TILE + 24 - devilSize * 0.78 + drift);\n",
        "        const devilSize = 250;\n"
        "        const devil = wrld(\n"
        "          HELL_DEVIL.c * TILE + 16 - devilSize / 2,\n"
        "          HELL_DEVIL.r * TILE + 24 - devilSize * 0.78 + drift,\n"
        "        );\n",
    )
    replace_once(
        ENGINE,
        "        const gateX = 24 * TILE + 16;\n"
        "        const gateY = 30 * TILE + 12;\n",
        "        const gateX = HELL_EXIT.c * TILE + 16;\n"
        "        const gateY = HELL_EXIT.r * TILE + 12;\n",
    )
    replace_once(
        WORLD,
        "function buildHell(): TileCh[][] {\n"
        "  const cols = 48;\n"
        "  const rows = 32;\n"
        "  const t: TileCh[][] = Array.from({ length: rows }, () => Array<TileCh>(cols).fill(\"W\"));\n"
        "  for (let r = 4; r < rows - 1; r++) {\n"
        "    for (let c = 7; c < cols - 7; c++) t[r][c] = \"d\";\n"
        "  }\n"
        "  for (let r = 7; r < 25; r++) {\n"
        "    for (let c = 2; c <= 5; c++) t[r][c] = \"L\";\n"
        "    for (let c = cols - 6; c <= cols - 3; c++) t[r][c] = \"L\";\n"
        "  }\n"
        "  for (let r = 18; r < rows; r++) {\n"
        "    for (let c = 20; c <= 27; c++) t[r][c] = \"d\";\n"
        "  }\n"
        "  for (let c = 14; c <= 33; c++) t[8][c] = \"d\";\n"
        "  t[31][24] = \"p\";\n"
        "  return t;\n"
        "}\n",
        "function buildHell(): TileCh[][] {\n"
        "  const cols = 48;\n"
        "  const rows = 48;\n"
        "  const t: TileCh[][] = Array.from({ length: rows }, () => Array<TileCh>(cols).fill(\"W\"));\n"
        "  for (let r = 4; r < rows - 1; r++) {\n"
        "    for (let c = 7; c < cols - 7; c++) t[r][c] = \"d\";\n"
        "  }\n"
        "  for (let r = 7; r < 41; r++) {\n"
        "    for (let c = 2; c <= 5; c++) t[r][c] = \"L\";\n"
        "    for (let c = cols - 6; c <= cols - 3; c++) t[r][c] = \"L\";\n"
        "  }\n"
        "  for (let r = 18; r < rows; r++) {\n"
        "    for (let c = 20; c <= 27; c++) t[r][c] = \"d\";\n"
        "  }\n"
        "  for (let c = 14; c <= 33; c++) t[8][c] = \"d\";\n"
        "  t[46][24] = \"p\";\n"
        "  return t;\n"
        "}\n",
    )
    replace_once(
        WORLD,
        '  hell: [{ c: 24, r: 31, to: "shoal", tc: 6, tr: 13 }],',
        '  hell: [{ c: 24, r: 46, to: "shoal", tc: 6, tr: 13 }],',
    )
    replace_once(
        TEST,
        '  assert.equal(reachable("hell", SPAWN.hell, { c: 24, r: 31 }), true);',
        '  assert.equal(reachable("hell", SPAWN.hell, { c: 24, r: 46 }), true);',
    )
    replace_once(
        TEST,
        "  assert.ok(roomArt.byteLength > 500_000);\n"
        "  assert.ok(devilArt.byteLength > 150_000);\n",
        "  assert.ok(roomArt.byteLength > 500_000);\n"
        "  assert.equal(roomArt.readUInt32BE(16), 1536);\n"
        "  assert.equal(roomArt.readUInt32BE(20), 1536);\n"
        "  assert.ok(devilArt.byteLength > 150_000);\n",
    )


def recover_top(source: bytes) -> Image.Image:
    if source[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("The old hell image is not a PNG")
    pos = 8
    output = bytearray(source[:8])
    for _ in range(14):
        length = struct.unpack(">I", source[pos : pos + 4])[0]
        chunk_type = source[pos + 4 : pos + 8]
        data = source[pos + 8 : pos + 8 + length]
        if len(data) != length:
            raise RuntimeError("The recoverable PNG prefix is shorter than expected")
        checksum = zlib.crc32(data, zlib.crc32(chunk_type)) & 0xFFFFFFFF
        output += struct.pack(">I", length) + chunk_type + data + struct.pack(">I", checksum)
        pos += length + 12
    iend = b"IEND"
    output += struct.pack(">I", 0) + iend + struct.pack(">I", zlib.crc32(iend) & 0xFFFFFFFF)

    ImageFile.LOAD_TRUNCATED_IMAGES = True
    image = Image.open(io.BytesIO(output))
    image.load()
    return image.convert("RGB")


def map_ch(c: int, r: int) -> str:
    ch = "W"
    if 4 <= r < 47 and 7 <= c < 41:
        ch = "d"
    if 7 <= r < 41 and (2 <= c <= 5 or 42 <= c <= 45):
        ch = "L"
    if 18 <= r < 48 and 20 <= c <= 27:
        ch = "d"
    if r == 8 and 14 <= c <= 33:
        ch = "d"
    if r == 46 and c == 24:
        ch = "p"
    return ch


def generate_art() -> None:
    try:
        current = Image.open(ART)
        if current.size == (W, H):
            current.verify()
            return
    except Exception:
        pass

    top_full = recover_top(ART.read_bytes())
    dfloor = Image.open(ROOT / "public/sprites/t-dfloor.png").convert("RGB")
    dwall = Image.open(ROOT / "public/sprites/t-dwall.png").convert("RGB")
    lava = Image.open(ROOT / "public/sprites/t-lava.png").convert("RGB")

    canvas = Image.new("RGB", (W, H), "#080605")
    for r in range(48):
        for c in range(48):
            texture = {"d": dfloor, "L": lava}.get(map_ch(c, r), dwall)
            variant = texture
            mode = (c * 17 + r * 31) % 4
            if mode == 1:
                variant = ImageOps.mirror(texture)
            elif mode == 2:
                variant = ImageOps.flip(texture)
            elif mode == 3:
                variant = ImageOps.mirror(ImageOps.flip(texture))
            canvas.paste(variant, (c * TILE, r * TILE))

    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    for y in range(0, H, 8):
        alpha = int(64 + 42 * (y / H))
        shade_draw.rectangle((0, y, W, y + 7), fill=(14, 3, 2, alpha))
    canvas_rgba = Image.alpha_composite(canvas.convert("RGBA"), shade)

    canvas_rgba.alpha_composite(top_full.crop((0, 0, W, 409)).convert("RGBA"), (0, 0))
    seam = top_full.crop((0, 340, W, 409)).resize((W, 120), Image.Resampling.NEAREST).convert("RGBA")
    seam_mask = Image.new("L", seam.size)
    seam_draw = ImageDraw.Draw(seam_mask)
    for y in range(seam.height):
        seam_draw.line((0, y, seam.width, y), fill=max(0, 180 - int(180 * y / (seam.height - 1))))
    seam.putalpha(seam_mask)
    canvas_rgba.alpha_composite(seam, (0, 392))

    details = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(details)
    aisle_left, aisle_right = 560, 976
    draw.rectangle((aisle_left, 420, aisle_right, 1500), fill=(15, 10, 10, 105))
    draw.line((aisle_left, 420, aisle_left, 1500), fill=(105, 42, 28, 230), width=5)
    draw.line((aisle_right, 420, aisle_right, 1500), fill=(105, 42, 28, 230), width=5)
    draw.line((aisle_left + 10, 420, aisle_left + 10, 1500), fill=(30, 17, 14, 240), width=3)
    draw.line((aisle_right - 10, 420, aisle_right - 10, 1500), fill=(30, 17, 14, 240), width=3)
    for y in range(466, 1490, 96):
        draw.rectangle((aisle_left + 14, y, aisle_right - 14, y + 7), fill=(63, 39, 27, 210))
        draw.line((aisle_left + 14, y, aisle_right - 14, y), fill=(135, 70, 39, 165), width=1)
        for x in range(aisle_left + 32, aisle_right - 20, 54):
            draw.ellipse((x, y + 1, x + 4, y + 5), fill=(181, 92, 44, 180))

    for left, right in ((64, 206), (1330, 1472)):
        draw.rectangle((left, 428, right, 1470), outline=(80, 30, 19, 235), width=6)
        for y in range(450, 1450, 64):
            draw.line((left + 4, y, right - 4, y + 18), fill=(241, 65, 25, 110), width=2)
            draw.line((left + 8, y + 17, right - 8, y + 41), fill=(255, 122, 38, 75), width=1)
        rail_x = right + 24 if left < W // 2 else left - 24
        draw.line((rail_x, 420, rail_x, 1492), fill=(70, 57, 48, 255), width=7)
        rail_inner = rail_x + (8 if left < W // 2 else -8)
        draw.line((rail_inner, 420, rail_inner, 1492), fill=(18, 13, 11, 255), width=3)
        for y in range(435, 1492, 92):
            draw.rectangle((rail_x - 10, y, rail_x + 10, y + 8), fill=(111, 66, 39, 245))
            draw.rectangle((rail_x - 5, y - 15, rail_x + 5, y + 20), fill=(55, 43, 36, 255))

    for x in (300, 1236):
        for y in (470, 690, 910, 1130, 1350):
            draw.rectangle((x - 20, y - 46, x + 20, y + 58), fill=(18, 14, 12, 255))
            draw.rectangle((x - 31, y - 52, x + 31, y - 39), fill=(77, 48, 33, 255))
            draw.rectangle((x - 31, y + 50, x + 31, y + 63), fill=(62, 39, 28, 255))
            draw.line((x - 12, y - 38, x - 12, y + 49), fill=(118, 57, 32, 170), width=3)
            draw.ellipse((x - 15, y - 31, x + 15, y - 2), fill=(50, 34, 27, 255), outline=(132, 74, 43, 230), width=2)
            draw.ellipse((x - 8, y - 21, x - 2, y - 14), fill=(4, 3, 3, 255))
            draw.ellipse((x + 2, y - 21, x + 8, y - 14), fill=(4, 3, 3, 255))
            draw.polygon([(x, y - 13), (x - 4, y - 7), (x + 4, y - 7)], fill=(5, 3, 3, 255))

    cx, cy = 768, 850
    for radius, color, width in (
        (204, (51, 25, 19, 245), 8),
        (184, (143, 52, 31, 180), 3),
        (145, (75, 35, 24, 220), 5),
        (92, (166, 59, 32, 145), 3),
    ):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=color, width=width)
    for index in range(12):
        angle = index * math.tau / 12
        x1, y1 = cx + math.cos(angle) * 105, cy + math.sin(angle) * 105
        x2, y2 = cx + math.cos(angle) * 176, cy + math.sin(angle) * 176
        draw.line((x1, y1, x2, y2), fill=(110, 46, 29, 155), width=3)
        rx, ry = cx + math.cos(angle) * 162, cy + math.sin(angle) * 162
        draw.rectangle((rx - 6, ry - 6, rx + 6, ry + 6), outline=(190, 72, 35, 150), width=2)

    stamp = []
    for index in range(5):
        angle = -math.pi / 2 + index * math.tau / 5
        stamp.append((cx + math.cos(angle) * 72, cy + math.sin(angle) * 72))
    for index in range(5):
        draw.line((*stamp[index], *stamp[(index + 2) % 5]), fill=(117, 43, 28, 145), width=3)
    draw.rectangle((cx - 42, cy - 19, cx + 42, cy + 19), outline=(151, 60, 34, 160), width=3)
    for yy in (-10, 0, 10):
        draw.line((cx - 27, cy + yy, cx + 27, cy + yy), fill=(156, 77, 45, 120), width=2)

    for y in (1085, 1185, 1285):
        draw.polygon(
            [(cx, y + 24), (cx - 28, y - 5), (cx - 10, y - 5), (cx - 10, y - 23),
             (cx + 10, y - 23), (cx + 10, y - 5), (cx + 28, y - 5)],
            fill=(114, 38, 25, 130),
            outline=(194, 71, 37, 175),
        )

    draw.rounded_rectangle((630, 1370, 906, 1534), radius=26, fill=(10, 7, 7, 240), outline=(113, 44, 29, 245), width=6)
    for radius in (112, 84, 56):
        draw.ellipse((cx - radius, 1415 - radius // 3, cx + radius, 1415 + radius // 3), outline=(196, 66, 34, 175), width=4)
    draw.rectangle((686, 1465, 850, 1528), fill=(9, 3, 3, 255), outline=(87, 34, 25, 230), width=4)
    for x in range(700, 846, 24):
        draw.line((x, 1470, x, 1524), fill=(114, 48, 31, 135), width=2)

    for x in (420, 1116):
        for y in range(435, 1300, 34):
            offset = int(math.sin(y * 0.045 + x) * 4)
            draw.ellipse((x + offset - 5, y - 9, x + offset + 5, y + 9), outline=(91, 67, 51, 160), width=2)

    rng = random.Random(666)
    for _ in range(22):
        x = rng.choice(list(range(390, 535)) + list(range(1000, 1145)))
        y = rng.randint(500, 1340)
        width = rng.randint(18, 34)
        height = rng.randint(8, 16)
        draw.polygon(
            [(x, y), (x + width, y + rng.randint(-3, 3)), (x + width - 2, y + height),
             (x + 2, y + height + rng.randint(-2, 2))],
            fill=(78, 54, 35, 110),
            outline=(121, 72, 39, 95),
        )

    canvas_rgba = Image.alpha_composite(canvas_rgba, details)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for left, right in ((50, 220), (1316, 1486)):
        glow_draw.rectangle((left, 420, right, 1490), fill=(233, 42, 12, 54))
    glow_draw.ellipse((cx - 235, cy - 235, cx + 235, cy + 235), fill=(185, 39, 18, 24))
    glow_draw.ellipse((610, 1330, 926, 1536), fill=(244, 55, 21, 45))
    canvas_rgba = Image.alpha_composite(canvas_rgba, glow.filter(ImageFilter.GaussianBlur(30)))

    final = canvas_rgba.convert("RGB")
    texture = Image.effect_noise((W, H), 7).convert("L")
    warm_noise = Image.merge("RGB", (texture, texture.point(lambda p: p * 3 // 5), texture.point(lambda p: p * 2 // 5)))
    final = Image.blend(final, warm_noise, 0.035)
    final = final.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    final.save(ART, format="PNG", optimize=True, compress_level=9)


if __name__ == "__main__":
    patch_source()
    generate_art()
    print(f"Hell scene repaired: {ART.stat().st_size} bytes")
