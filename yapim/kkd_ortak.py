# -*- coding: utf-8 -*-
"""Kara Kaplı Defter — prototip HTML üzerinde cerrahi düzenleme yardımcıları.

Ayraç tarayıcısı JS metinlerini, şablon dizgileri (`...${...}...`) ve
yorumları atlayarak bir `{` bloğunun kapanışını bulur. Şablon dizgi içindeki
`${ ... }` bölümleri kendi içinde kod olduğu için özyinelemeli işlenir —
`${svTablo.map(({o,n})=>{...})}` gibi yapılarda süslü sayımı bozulmasın.
"""
import io, re

TERS = chr(92)   # ters bölü


def oku(p):
    return io.open(p, encoding='utf-8').read()


def yaz(p, s):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)


def _atla_dizgi(s, k, q):
    """k: açan tırnağın indeksi. Kapanıştan SONRAKİ indeksi döndürür."""
    n = len(s)
    k += 1
    while k < n:
        if s[k] == TERS:
            k += 2
            continue
        if s[k] == q:
            return k + 1
        k += 1
    return k


def _atla_sablon(s, k):
    """k: açan ters vurgunun indeksi. Kapanıştan SONRAKİ indeksi döndürür.
    Şablon içinde tırnaklar düz metindir; yalnız ${...} kod olarak işlenir."""
    n = len(s)
    k += 1
    while k < n:
        c = s[k]
        if c == TERS:
            k += 2
            continue
        if c == '`':
            return k + 1
        if c == '$' and k + 1 < n and s[k + 1] == '{':
            son = _atla_blok(s, k + 1)
            if son < 0:
                return n
            k = son + 1
            continue
        k += 1
    return k


def _atla_blok(s, i):
    """i: '{' indeksi. Eşleşen '}' indeksini döndürür, bulamazsa -1."""
    n = len(s)
    d = 0
    k = i
    while k < n:
        c = s[k]
        if c == TERS:
            k += 2
            continue
        if c == '"' or c == "'":
            k = _atla_dizgi(s, k, c)
            continue
        if c == '`':
            k = _atla_sablon(s, k)
            continue
        if c == '/' and s[k + 1:k + 2] == '/':
            y = s.find('\n', k)
            k = n if y < 0 else y
            continue
        if c == '/' and s[k + 1:k + 2] == '*':
            y = s.find('*/', k)
            k = n if y < 0 else y + 2
            continue
        if c == '{':
            d += 1
        elif c == '}':
            d -= 1
            if d == 0:
                return k
        k += 1
    return -1


def fn_degistir(s, ad, yeni):
    """function <ad>(...) { ... } bloğunu yeni metinle değiştirir."""
    m = re.search(r'^(?:async\s+)?function\s+' + re.escape(ad) + r'\s*\(', s, re.M)
    if not m:
        raise SystemExit('BULUNAMADI: function ' + ad)
    a = m.start()
    kap = s.index('{', m.end() - 1)
    b = _atla_blok(s, kap)
    if b < 0:
        raise SystemExit('GOVDE KAPANMADI: ' + ad)
    return s[:a] + yeni.strip('\n') + s[b + 1:]


def arasini_degistir(s, bas, son, yeni):
    a = s.index(bas)
    b = s.index(son, a)
    return s[:a] + yeni + s[b:]
