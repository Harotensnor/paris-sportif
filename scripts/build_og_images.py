#!/usr/bin/env python3
"""build_og_images.py — Generate Open Graph images (1200x630) for the site.

Replaces the basic icon-512.png OG image with proper social cards that:
  - Show stats (WR, ROI, Brier) from backtest_report_v2.json
  - Are branded (purple gradient + accent green)
  - Include the page title
  - Are 1200x630 PNG (Twitter/FB/WhatsApp/Discord standard)

Outputs:
  /og-default.png  — for index, dashboard
  /og-backtest.png — for backtest.html
  /og-credibilite.png — for credibilite.html
  /og-methodologie.png — for methodologie.html

Skipped if Pillow is missing (printed as info, not error). Idempotent.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKTEST_JSON = ROOT / 'backtest_report_v2.json'

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    print('[build_og_images] Pillow non installé — skip (pip install pillow).')
    sys.exit(0)

W, H = 1200, 630
BG = (8, 8, 10)
PURPLE = (167, 139, 250)
PURPLE_DARK = (139, 92, 246)
GREEN = (52, 211, 153)
TEXT = (236, 235, 239)
TEXT_DIM = (138, 138, 144)
TEXT_DIM2 = (92, 92, 98)
PANEL = (18, 18, 21)


def load_backtest():
    if not BACKTEST_JSON.exists():
        return None
    try:
        return json.loads(BACKTEST_JSON.read_text(encoding='utf-8'))
    except Exception:
        return None


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Try to load a system font, fall back to PIL default."""
    candidates_bold = [
        # Linux (GitHub Actions ubuntu-latest)
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        # macOS
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial Bold.ttf',
        # Windows
        'C:\\Windows\\Fonts\\arialbd.ttf',
        'C:\\Windows\\Fonts\\arial.ttf',
    ]
    candidates_normal = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
        'C:\\Windows\\Fonts\\arial.ttf',
    ]
    paths = candidates_bold if bold else candidates_normal
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_gradient(img: Image.Image):
    """Soft purple→green radial gradient on dark bg."""
    base = Image.new('RGB', (W, H), BG)
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Top-right purple glow
    for r in range(800, 0, -50):
        alpha = int(40 * (1 - r/800))
        draw.ellipse([(W*0.5-r, -r), (W+r, r*1.2)], fill=(167, 139, 250, alpha))
    # Bottom-left green glow
    for r in range(700, 0, -50):
        alpha = int(20 * (1 - r/700))
        draw.ellipse([(-r, H*0.5-r), (r*1.2, H+r)], fill=(52, 211, 153, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=40))
    base.paste(overlay, (0, 0), overlay)
    return base


def draw_brand_bar(img: Image.Image):
    draw = ImageDraw.Draw(img)
    # Top brand strip
    draw.rectangle([(0, 0), (W, 6)], fill=(*PURPLE, 255))
    # Logo block + brand name
    draw.rounded_rectangle([(56, 50), (104, 98)], radius=12, fill=PURPLE_DARK)
    f_brand = get_font(28, bold=True)
    draw.text((58, 58), '🎯', font=get_font(28), fill=TEXT)
    draw.text((116, 56), 'Paris-Sportif', font=f_brand, fill=TEXT)
    f_sub = get_font(14)
    draw.text((116, 88), 'pronostics data-driven · open-source', font=f_sub, fill=TEXT_DIM)


def draw_default(out_path: Path, report):
    img = draw_gradient(Image.new('RGB', (W, H), BG))
    draw = ImageDraw.Draw(img)
    draw_brand_bar(img)
    # Big title
    f_h1 = get_font(72, bold=True)
    draw.text((56, 200), 'Pronostics sportifs', font=f_h1, fill=TEXT)
    f_h1b = get_font(72, bold=True)
    draw.text((56, 280), 'vérifiables.', font=f_h1b, fill=PURPLE)
    # Sub
    f_sub = get_font(22)
    draw.text((56, 380), 'Foot · Tennis · NBA · NHL · MLB.', font=f_sub, fill=TEXT_DIM)
    draw.text((56, 412), 'Modèle calibré, code ouvert, sans tracker.', font=f_sub, fill=TEXT_DIM)
    # Stats badge
    if report:
        wr = report.get('global_winrate')
        roi = report.get('flat_roi_pct')
        brier = report.get('brier_score')
        n = report.get('n_settled')
        if wr is not None and roi is not None:
            # Stats box
            box_x = 720
            box_y = 200
            box_w = 420
            box_h = 280
            draw.rounded_rectangle([(box_x, box_y), (box_x + box_w, box_y + box_h)], radius=20, fill=PANEL, outline=(255, 255, 255, 30), width=1)
            f_lbl = get_font(13)
            f_val = get_font(54, bold=True)
            f_unit = get_font(18)
            draw.text((box_x + 24, box_y + 24), 'BACKTEST · ' + str(n) + ' picks', font=f_lbl, fill=TEXT_DIM)
            # WR
            draw.text((box_x + 24, box_y + 56), 'Win rate', font=f_lbl, fill=TEXT_DIM)
            draw.text((box_x + 24, box_y + 78), f'{wr*100:.1f}%', font=f_val, fill=GREEN)
            # ROI
            draw.text((box_x + 24, box_y + 156), 'ROI flat', font=f_lbl, fill=TEXT_DIM)
            roi_color = GREEN if roi > 0 else (248, 113, 113)
            roi_sign = '+' if roi > 0 else ''
            draw.text((box_x + 24, box_y + 178), f'{roi_sign}{roi:.1f}%', font=f_val, fill=roi_color)
            # Brier
            if brier is not None:
                draw.text((box_x + 240, box_y + 156), 'Brier', font=f_lbl, fill=TEXT_DIM)
                draw.text((box_x + 240, box_y + 178), f'{brier:.3f}', font=f_val, fill=TEXT)
    # Footer
    f_foot = get_font(15)
    draw.text((56, H - 56), 'harotensnor.github.io/paris-sportif', font=f_foot, fill=TEXT_DIM2)
    draw.text((W - 360, H - 56), '18+ · jouer comporte des risques', font=f_foot, fill=TEXT_DIM2)
    img.save(out_path, 'PNG', optimize=True)
    print(f'[og] {out_path.name} · {out_path.stat().st_size // 1024}KB')


def draw_topic(out_path: Path, eyebrow: str, title: str, sub: str, report=None, accent=PURPLE):
    img = draw_gradient(Image.new('RGB', (W, H), BG))
    draw = ImageDraw.Draw(img)
    draw_brand_bar(img)
    f_eyebrow = get_font(18, bold=True)
    draw.text((56, 200), eyebrow.upper(), font=f_eyebrow, fill=accent)
    f_h1 = get_font(64, bold=True)
    # Wrap title
    max_w = 1080
    words = title.split()
    lines = []
    line = ''
    for word in words:
        test = (line + ' ' + word).strip()
        if draw.textbbox((0, 0), test, font=f_h1)[2] > max_w and line:
            lines.append(line)
            line = word
        else:
            line = test
    if line:
        lines.append(line)
    for i, l in enumerate(lines[:3]):
        draw.text((56, 240 + i * 76), l, font=f_h1, fill=TEXT)
    # Sub
    f_sub = get_font(22)
    sub_y = 240 + len(lines[:3]) * 76 + 24
    draw.text((56, sub_y), sub, font=f_sub, fill=TEXT_DIM)
    # Footer
    f_foot = get_font(15)
    draw.text((56, H - 56), 'harotensnor.github.io/paris-sportif', font=f_foot, fill=TEXT_DIM2)
    draw.text((W - 360, H - 56), '18+ · jouer comporte des risques', font=f_foot, fill=TEXT_DIM2)
    img.save(out_path, 'PNG', optimize=True)
    print(f'[og] {out_path.name} · {out_path.stat().st_size // 1024}KB')


def main():
    report = load_backtest()
    draw_default(ROOT / 'og-default.png', report)
    sub_stats = ''
    if report:
        wr = report.get('global_winrate')
        roi = report.get('flat_roi_pct')
        n = report.get('n_settled')
        if wr is not None and roi is not None and n is not None:
            sub_stats = f'WR {wr*100:.1f}% · ROI flat {"+" if roi >= 0 else ""}{roi:.1f}% · {n} picks réglés'
    draw_topic(
        ROOT / 'og-backtest.png',
        eyebrow='Backtest',
        title='Performance vérifiable du modèle',
        sub=sub_stats or 'Backtest hebdo via vrai predictMatch.',
        accent=GREEN,
    )
    draw_topic(
        ROOT / 'og-credibilite.png',
        eyebrow='Crédibilité',
        title='Le modèle dit la vérité sur ses probabilités ?',
        sub='Diagramme de calibration, Brier score, log-loss.',
        accent=PURPLE,
    )
    draw_topic(
        ROOT / 'og-methodologie.png',
        eyebrow='Méthodologie',
        title='Protocole, métriques, biais — sans boîte noire',
        sub='9 sources publiques · pipeline open · backtest reproductible',
        accent=(96, 165, 250),
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
