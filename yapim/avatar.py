# -*- coding: utf-8 -*-
"""Oyuncu fotoğraflarını kare avatara çevirir (bulut/kurulum/)."""
import io, json, os
from PIL import Image, ImageOps

IND = os.path.join(os.path.expanduser('~'), 'Downloads')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'kurulum')
os.makedirs(OUT, exist_ok=True)

# (dosya, ad, dosyaadi, kirpma kutusu sol/ust/sag/alt)
ISLER = [
    ('WhatsApp Image 2026-09-01 at 16.23.37.jpeg', 'Tuğrul', 'tugrul', (150, 200, 800, 850)),
    ('WhatsApp Image 2026-09-01 at 16.24.05.jpeg', 'Sadık',  'sadik',  (355, 500, 775, 920)),
    ('WhatsApp Image 2026-09-01 at 16.30.58.jpeg', 'Volkan', 'volkan', (595, 205, 935, 545)),
    ('WhatsApp Image 2026-09-01 at 16.37.13.jpeg', 'Emre',   'emre',   (185, 445, 475, 735)),
    ('WhatsApp Image 2026-09-02 at 09.19.40.jpeg', 'Ufuk',   'ufuk',   (1055, 70, 1375, 390)),
]

B = 480   # avatar kenarı
for dosya, ad, kod, kutu in ISLER:
    yol = os.path.join(IND, dosya)
    im = ImageOps.exif_transpose(Image.open(yol)).convert('RGB')
    k = im.crop(kutu)
    kenar = min(k.size)
    k = k.crop(((k.width - kenar)//2, (k.height - kenar)//2,
                (k.width + kenar)//2, (k.height + kenar)//2))
    k = k.resize((B, B), Image.LANCZOS)
    hedef = os.path.join(OUT, kod + '.jpg')
    k.save(hedef, 'JPEG', quality=86, optimize=True)
    print('%-8s -> %-12s %6d bayt' % (ad, kod + '.jpg', os.path.getsize(hedef)))
