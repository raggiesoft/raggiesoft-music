#!/bin/bash
# ============================================================================
# ARCHITECTURAL BLOCK COMMENT: generate_pwa_assets.sh
# ============================================================================
# Purpose:
#     Automates the generation of Progressive Web App (PWA) icons, adaptive SVG/ICO
#     favicons, and dual-theme (Light Mode + Dark Mode) iOS startup splash screens
#     for Engine Room Records (`music.raggiesoft.com`).
#
# Design Decisions & Future Maintenance:
#     1. Dual-Theme iOS Splash Screens (`prefers-color-scheme: light` & `dark`):
#        Generates all 46 iOS/iPadOS device resolutions in both Light Mode
#        (black gear logo on `#F8FAFC` light studio slate) and Dark Mode
#        (white gear logo on `#020617` deep studio slate).
#     2. CDN Hosting (`raggiesoft-assets/engine-room-records/images/pwa-icons/`):
#        Stores the 92 splash screens and PWA icons on the DigitalOcean Spaces CDN
#        (`https://assets.raggiesoft.com/engine-room-records/images/pwa-icons/`)
#        mirroring `books.raggiesoft.com`, while also keeping core manifest icons
#        in `raggiesoft-music/static/icons/`.
#     3. Zero-Network Deterministic Build:
#        Uses Python + Pillow (`PIL`) to composite high-resolution Lanczos-resampled
#        icons and splash screens directly from the master PNG logos in `static/logos/`.
# ============================================================================

set -e

# Navigate to the raggiesoft-music root directory regardless of invocation path
cd "$(dirname "$0")/.." || exit

echo "Generating Engine Room Records PWA icons and Light/Dark iOS splash screens..."

python3 - << 'EOF'
import os, io, base64
from PIL import Image

music_root = os.getcwd()
cdn_pwa_dir = os.path.abspath(os.path.join(music_root, "../raggiesoft-assets/engine-room-records/images/pwa-icons"))
static_icons_dir = os.path.join(music_root, "static/icons")

os.makedirs(cdn_pwa_dir, exist_ok=True)
os.makedirs(static_icons_dir, exist_ok=True)

logo_black = Image.open(os.path.join(music_root, "static/logos/engine-room-records-logo.png")).convert("RGBA")
logo_white = Image.open(os.path.join(music_root, "static/logos/engine-room-records-logo-white.png")).convert("RGBA")

# Colors matching Engine Room Records Studio Light (#F8FAFC) and Studio Dark (#020617)
DARK_BG = (2, 6, 23)       # #020617
LIGHT_BG = (248, 250, 252) # #F8FAFC

# Tight square bounding box around the Engine Room Records gear emblem
bbox = logo_black.getbbox()
cx = (bbox[0] + bbox[2]) // 2
cy = (bbox[1] + bbox[3]) // 2
half = max(bbox[2] - bbox[0], bbox[3] - bbox[1]) // 2 + 12
crop_box = (cx - half, cy - half, cx + half, cy + half)

cropped_black = logo_black.crop(crop_box)
cropped_white = logo_white.crop(crop_box)

# 1. Generate Adaptive SVG Favicon (switches via @media (prefers-color-scheme: dark))
fav_black = cropped_black.resize((128, 128), Image.Resampling.LANCZOS)
fav_white = cropped_white.resize((128, 128), Image.Resampling.LANCZOS)

buf_b = io.BytesIO()
fav_black.save(buf_b, format="PNG", optimize=True)
b64_black = base64.b64encode(buf_b.getvalue()).decode("ascii")

buf_w = io.BytesIO()
fav_white.save(buf_w, format="PNG", optimize=True)
b64_white = base64.b64encode(buf_w.getvalue()).decode("ascii")

svg_favicon = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <title>Engine Room Records</title>
  <style>
    .logo-dark {{ display: none; }}
    .logo-light {{ display: block; }}
    @media (prefers-color-scheme: dark) {{
      .logo-dark {{ display: block; }}
      .logo-light {{ display: none; }}
    }}
  </style>
  <image class="logo-light" width="128" height="128" href="data:image/png;base64,{b64_black}" />
  <image class="logo-dark" width="128" height="128" href="data:image/png;base64,{b64_white}" />
</svg>
"""

with open(os.path.join(music_root, "static/favicon.svg"), "w") as f:
    f.write(svg_favicon)
with open(os.path.join(cdn_pwa_dir, "icon.svg"), "w") as f:
    f.write(svg_favicon)

# 2. Generate Multi-Resolution favicon.ico (16x16, 32x32, 48x48)
ico_base = Image.new("RGBA", (256, 256), DARK_BG + (255,))
gear_256 = cropped_white.resize((220, 220), Image.Resampling.LANCZOS)
ico_base.paste(gear_256, (18, 18), gear_256)
ico_base.save(os.path.join(music_root, "static/favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# 3. Generate PWA Home Screen & Manifest Icons (180, 192, 512)
def make_square_icon(size, padding_ratio, bg_rgb, fg_cropped):
    canvas = Image.new("RGB", (size, size), bg_rgb)
    logo_size = int(round(size * (1.0 - 2.0 * padding_ratio)))
    resized = fg_cropped.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    offset = (size - logo_size) // 2
    canvas.paste(resized, (offset, offset), resized)
    return canvas

# Standard & Maskable Dark Studio Icons (with safe-zone padding for Android/iOS masks)
icon_180 = make_square_icon(180, 0.12, DARK_BG, cropped_white)
icon_192 = make_square_icon(192, 0.12, DARK_BG, cropped_white)
icon_512 = make_square_icon(512, 0.12, DARK_BG, cropped_white)
icon_192_mask = make_square_icon(192, 0.18, DARK_BG, cropped_white)
icon_512_mask = make_square_icon(512, 0.18, DARK_BG, cropped_white)

icon_180.save(os.path.join(static_icons_dir, "apple-touch-icon.png"), format="PNG", optimize=True)
icon_180.save(os.path.join(cdn_pwa_dir, "apple-icon-180.png"), format="PNG", optimize=True)

icon_192.save(os.path.join(static_icons_dir, "icon-192.png"), format="PNG", optimize=True)
icon_512.save(os.path.join(static_icons_dir, "icon-512.png"), format="PNG", optimize=True)

icon_192_mask.save(os.path.join(cdn_pwa_dir, "manifest-icon-192.maskable.png"), format="PNG", optimize=True)
icon_512_mask.save(os.path.join(cdn_pwa_dir, "manifest-icon-512.maskable.png"), format="PNG", optimize=True)

# 4. Generate All 46 iOS / iPadOS Startup Splash Screen Resolutions (Light & Dark)
splash_resolutions = [
    (2048, 2732), (2732, 2048),
    (2064, 2752), (2752, 2064),
    (1668, 2420), (2420, 1668),
    (1668, 2388), (2388, 1668),
    (1668, 2224), (2224, 1668),
    (1536, 2048), (2048, 1536),
    (1640, 2360), (2360, 1640),
    (1620, 2160), (2160, 1620),
    (1488, 2266), (2266, 1488),
    (1320, 2868), (2868, 1320),
    (1206, 2622), (2622, 1206),
    (1260, 2736), (2736, 1260),
    (1290, 2796), (2796, 1290),
    (1179, 2556), (2556, 1179),
    (1170, 2532), (2532, 1170),
    (1284, 2778), (2778, 1284),
    (1080, 2340), (2340, 1080),
    (1242, 2688), (2688, 1242),
    (1125, 2436), (2436, 1125),
    (828, 1792),  (1792, 828),
    (1242, 2208), (2208, 1242),
    (750, 1334),  (1334, 750),
    (640, 1136),  (1136, 640),
]

def make_splash(w, h, bg_rgb, fg_cropped):
    canvas = Image.new("RGB", (w, h), bg_rgb)
    short_side = min(w, h)
    logo_dim = int(round(short_side * 0.42))
    resized = fg_cropped.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    ox = (w - logo_dim) // 2
    oy = (h - logo_dim) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas

for (w, h) in splash_resolutions:
    # Light Mode splash screen (apple-splash-W-H.jpg)
    light_img = make_splash(w, h, LIGHT_BG, cropped_black)
    light_img.save(os.path.join(cdn_pwa_dir, f"apple-splash-{w}-{h}.jpg"), format="JPEG", quality=92, optimize=True)

    # Dark Mode splash screen (apple-splash-dark-W-H.jpg)
    dark_img = make_splash(w, h, DARK_BG, cropped_white)
    dark_img.save(os.path.join(cdn_pwa_dir, f"apple-splash-dark-{w}-{h}.jpg"), format="JPEG", quality=92, optimize=True)

print(f"Generated {len(splash_resolutions)} Light and {len(splash_resolutions)} Dark splash screens in {cdn_pwa_dir}")
EOF

echo "PWA assets generated successfully!"

