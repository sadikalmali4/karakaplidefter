# -*- coding: utf-8 -*-
"""Tanımlı olmayan fonksiyon çağrısı var mı? (kaba ama işe yarar tarama)"""
import io, re, sys

s = io.open(sys.argv[1], encoding='utf-8').read()

tanimli = set()
tanimli |= set(re.findall(r'(?:^|\s)(?:async\s+)?function\s+([A-Za-zçğıöşüÇĞİÖŞÜ_$][\w$]*)', s))
tanimli |= set(re.findall(r'(?:const|let|var)\s+([A-Za-zçğıöşüÇĞİÖŞÜ_$][\w$]*)\s*=', s))
tanimli |= set(re.findall(r'([A-Za-zçğıöşüÇĞİÖŞÜ_$][\w$]*)\s*[:=]\s*(?:async\s*)?\(?[\w,\s]*\)?\s*=>', s))

YERLESIK = set('''if for while switch catch return typeof new delete void function
console JSON Math Date Object Array String Number Boolean Promise Set Map RegExp Error
document window localStorage sessionStorage setTimeout clearTimeout setInterval alert confirm
parseInt parseFloat isNaN encodeURIComponent decodeURIComponent URL Blob FileReader Image
navigator require then catch of in do else try finally await async class extends super this
querySelector querySelectorAll getElementById createElement forEach map filter slice sort join
push pop find some every reduce split replace trim toString concat includes indexOf keys values
sb supabase createClient'''.split())

cagri = set(re.findall(r'\b([A-Za-zçğıöşüÇĞİÖŞÜ_$][\w$]*)\s*\(', s))
eksik = sorted(c for c in cagri
               if c not in tanimli and c not in YERLESIK and not c[0].isupper())

# metot çağrısı (.x() ) olanları ele
metotlar = set(re.findall(r'\.([A-Za-z_$][\w$]*)\s*\(', s))
eksik = [c for c in eksik if c not in metotlar]

print('TANIMSIZ OLABILIR:', eksik if eksik else '(yok)')
