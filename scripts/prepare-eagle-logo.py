#!/usr/bin/env python3
"""Remove light background from eagle photo and export transparent PNG."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def is_background(r: int, g: int, b: int, threshold: int = 215, variance: int = 28) -> bool:
    brightness = (r + g + b) / 3
    spread = max(r, g, b) - min(r, g, b)
    return brightness >= threshold and spread <= variance


def remove_background(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if is_background(r, g, b):
                pixels[x, y] = (r, g, b, 0)
                continue

            brightness = (r + g + b) / 3
            if brightness > 190:
                alpha = int(max(0, min(255, (215 - brightness) * 12)))
                pixels[x, y] = (r, g, b, alpha)
            else:
                pixels[x, y] = (r, g, b, 255)

    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)

    return rgba


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'public/images/organization-eagle-logo.png'
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'public/images/organization-eagle-logo.png'

    image = Image.open(source)
    processed = remove_background(image)
    output.parent.mkdir(parents=True, exist_ok=True)
    processed.save(output, 'PNG')
    print(f'Wrote {output} ({processed.size[0]}x{processed.size[1]})')


if __name__ == '__main__':
    main()
