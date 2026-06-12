#!/usr/bin/env python3
"""Generate brand assets for Yoqubkhoja Hub presentation."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = Path(__file__).resolve().parent.parent / "docs" / "presentation" / "assets"

# Brand palette (from src/app/globals.css + favicon.svg)
BLUE = (59, 130, 246)
BLUE_DARK = (37, 99, 235)
INDIGO = (99, 102, 241)
PURPLE = (139, 92, 246)
GREEN = (34, 197, 94)
DARK = (10, 14, 20)
DARK_CARD = (17, 24, 39)
TEXT = (241, 245, 249)
MUTED = (148, 163, 184)
LIGHT = (248, 250, 252)
WHITE = (255, 255, 255)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient(size: tuple[int, int], c1: tuple[int, int, int], c2: tuple[int, int, int], diagonal=True):
    img = Image.new("RGB", size)
    px = img.load()
    w, h = size
    for y in range(h):
        for x in range(w):
            t = (x / max(w - 1, 1) + y / max(h - 1, 1)) / 2 if diagonal else x / max(w - 1, 1)
            px[x, y] = (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))
    return img


def radial_glow(size: tuple[int, int], center_color: tuple[int, int, int], base: tuple[int, int, int]):
    img = Image.new("RGB", size, base)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = size[0] // 2, int(size[1] * 0.25)
    max_r = int(max(size) * 0.75)
    for r in range(max_r, 0, -4):
        alpha = int(90 * (1 - r / max_r))
        draw.ellipse(
            (cx - r, cy - r, cx + r, cy + r),
            fill=(*center_color, alpha),
        )
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def load_font(size: int, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_logo(size: int = 512) -> Image.Image:
    img = gradient((size, size), BLUE, PURPLE)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=255)
    rounded = Image.new("RGBA", (size, size))
    rounded.paste(img, mask=mask)
    draw = ImageDraw.Draw(rounded)
    font = load_font(int(size * 0.52), bold=True)
    draw.text((size // 2, size // 2), "Y", font=font, fill=WHITE, anchor="mm")
    return rounded.convert("RGB")


def draw_icon_card(label: str, emoji: str, colors: tuple[tuple[int, int, int], tuple[int, int, int]]) -> Image.Image:
    w, h = 640, 420
    img = gradient((w, h), colors[0], colors[1])
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((24, 24, w - 24, h - 24), radius=28, outline=(*WHITE, 80), width=3)
    emoji_font = load_font(96)
    title_font = load_font(34, bold=True)
    draw.text((w // 2, 150), emoji, font=emoji_font, fill=WHITE, anchor="mm")
    draw.text((w // 2, 300), label, font=title_font, fill=WHITE, anchor="mm")
    return img


def draw_architecture_diagram() -> Image.Image:
    w, h = 900, 520
    img = Image.new("RGB", (w, h), LIGHT)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=24, outline=MUTED, width=2)

    boxes = [
        (60, 80, 260, 180, "Next.js 15", BLUE),
        (320, 80, 520, 180, "4 забон", INDIGO),
        (580, 80, 780, 180, "NextAuth", PURPLE),
        (60, 250, 260, 350, "Netlify", GREEN),
        (320, 250, 520, 350, "JSON Data", BLUE_DARK),
        (580, 250, 780, 350, "yoqubkhoja.tj", PURPLE),
    ]
    font = load_font(26, bold=True)
    for x1, y1, x2, y2, text, color in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=color)
        draw.text(((x1 + x2) // 2, (y1 + y2) // 2), text, font=font, fill=WHITE, anchor="mm")

    draw.line((160, 180, 160, 220), fill=MUTED, width=3)
    draw.line((420, 180, 420, 220), fill=MUTED, width=3)
    draw.line((680, 180, 680, 220), fill=MUTED, width=3)
    draw.line((160, 220, 680, 220), fill=MUTED, width=3)
    draw.line((420, 220, 420, 250), fill=MUTED, width=3)

    subtitle = load_font(22, bold=True)
    draw.text((w // 2, 430), "Yoqubkhoja Hub — архитектура", font=subtitle, fill=DARK_CARD, anchor="mm")
    return img


def draw_results_chart() -> Image.Image:
    w, h = 900, 480
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=24, outline=MUTED, width=2)

    labels = ["Вақт", "Хатогӣ", "Сифат", "Дастрасӣ"]
    before = [90, 85, 45, 30]
    after = [35, 20, 88, 92]
    colors_before = (239, 68, 68)
    colors_after = GREEN

    base_y = 380
    bar_w = 70
    gap = 180
    start_x = 120
    font = load_font(22, bold=True)
    small = load_font(18)

    for i, label in enumerate(labels):
        x = start_x + i * gap
        bh = 2.6
        draw.rectangle((x, base_y - before[i] * bh, x + bar_w, base_y), fill=colors_before)
        draw.rectangle(
            (x + bar_w + 16, base_y - after[i] * bh, x + bar_w * 2 + 16, base_y),
            fill=colors_after,
        )
        draw.text((x + bar_w + 8, base_y + 18), label, font=small, fill=DARK_CARD, anchor="mm")

    draw.text((start_x + gap * 1.5, 50), "Пеш vs Баъд (бо Hub)", font=font, fill=DARK_CARD, anchor="mm")
    draw.rectangle((start_x, 90, start_x + 24, 114), fill=colors_before)
    draw.text((start_x + 34, 102), "Пеш", font=small, fill=DARK_CARD, anchor="lm")
    draw.rectangle((start_x + 120, 90, start_x + 144, 114), fill=colors_after)
    draw.text((start_x + 154, 102), "Баъд", font=small, fill=DARK_CARD, anchor="lm")
    return img


def build_assets() -> dict[str, Path]:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}

    logo = draw_logo(512)
    paths["logo"] = ASSETS_DIR / "logo.png"
    logo.save(paths["logo"])

    logo_sm = draw_logo(128)
    paths["logo_sm"] = ASSETS_DIR / "logo-sm.png"
    logo_sm.save(paths["logo_sm"])

    dark_bg = radial_glow((1920, 1080), BLUE, DARK)
    paths["bg_dark"] = ASSETS_DIR / "slide-bg-dark.png"
    dark_bg.save(paths["bg_dark"])

    light_bg = gradient((1920, 1080), LIGHT, (226, 232, 240), diagonal=False)
    paths["bg_light"] = ASSETS_DIR / "slide-bg-light.png"
    light_bg.save(paths["bg_light"])

    icons = {
        "icon_projects": ("Лоиҳаҳо", "🌐", (BLUE, INDIGO)),
        "icon_org": ("Ташкилотҳо", "🏢", (INDIGO, PURPLE)),
        "icon_staff": ("Кадрҳо", "👥", (PURPLE, BLUE_DARK)),
        "icon_finance": ("Молия", "💰", (GREEN, BLUE)),
        "icon_tech": ("Технология", "⚙️", (BLUE_DARK, INDIGO)),
        "icon_future": ("Оянда", "🚀", (PURPLE, GREEN)),
    }
    for key, (label, emoji, colors) in icons.items():
        path = ASSETS_DIR / f"{key}.png"
        draw_icon_card(label, emoji, colors).save(path)
        paths[key] = path

    paths["diagram_arch"] = ASSETS_DIR / "diagram-architecture.png"
    draw_architecture_diagram().save(paths["diagram_arch"])

    paths["diagram_results"] = ASSETS_DIR / "diagram-results.png"
    draw_results_chart().save(paths["diagram_results"])

    # Copy source favicon for reference
    favicon_src = Path(__file__).resolve().parent.parent / "public" / "favicon.svg"
    if favicon_src.exists():
        paths["favicon_svg"] = ASSETS_DIR / "favicon.svg"
        paths["favicon_svg"].write_text(favicon_src.read_text(encoding="utf-8"), encoding="utf-8")

    return paths


if __name__ == "__main__":
    created = build_assets()
    for name, path in created.items():
        print(f"{name}: {path}")
