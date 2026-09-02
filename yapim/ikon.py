# -*- coding: utf-8 -*-
"""Kara Kaplı Defter — uygulama ikonları (mühür: koyu zemin, bordo halka, §)."""
import os
from PIL import Image, ImageDraw, ImageFont

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../bulut
ZEMIN = (18, 16, 15, 255)
BORDO = (163, 46, 56, 255)
FILDISI = (237, 230, 220, 255)

def yazitipi(boy):
    for ad in ('georgiab.ttf', 'georgia.ttf', 'timesbd.ttf', 'times.ttf', 'segoeui.ttf'):
        yol = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', ad)
        if os.path.exists(yol):
            try:
                return ImageFont.truetype(yol, boy)
            except Exception:
                pass
    return ImageFont.load_default()

def uret(B, dolgu_orani, ad):
    K = 8                                   # kenar yumuşatma için büyüt-küçült
    im = Image.new('RGBA', (B*K, B*K), ZEMIN)
    d = ImageDraw.Draw(im)
    m = int(B*K*dolgu_orani)                # maskelenebilir ikonlarda güvenli boşluk
    kalinlik = max(2, int(B*K*0.035))
    d.ellipse([m, m, B*K-m, B*K-m], outline=BORDO, width=kalinlik)
    im = im.resize((B, B), Image.LANCZOS)

    d = ImageDraw.Draw(im)
    boy = int(B*(1-2*dolgu_orani)*0.62)
    f = yazitipi(boy)
    t = '§'
    kutu = d.textbbox((0, 0), t, font=f)
    d.text(((B-(kutu[2]-kutu[0]))/2 - kutu[0], (B-(kutu[3]-kutu[1]))/2 - kutu[1]),
           t, font=f, fill=FILDISI)
    yol = os.path.join(KOK, ad)
    im.save(yol, 'PNG')
    print('yazildi:', ad, im.size)

uret(192, 0.16, 'ikon-192.png')
uret(512, 0.16, 'ikon-512.png')
uret(512, 0.24, 'ikon-maskelenebilir-512.png')   # Android adaptif ikon: kenardan kırpar
uret(180, 0.14, 'apple-touch-icon.png')
