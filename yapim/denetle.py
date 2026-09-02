# -*- coding: utf-8 -*-
"""index.html içindeki <script> gövdesini ayıklayıp .js olarak yazar (node --check için)."""
import io, os, re, sys

yol = sys.argv[1]
cikti = sys.argv[2]
s = io.open(yol, encoding='utf-8').read()
# harici src'li script etiketlerini atla; gövdeli olanı al
parcalar = re.findall(r'<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>', s, re.S)
gövde = '\n'.join(parcalar)
io.open(cikti, 'w', encoding='utf-8', newline='\n').write(gövde)
print('js satir:', gövde.count('\n'))
