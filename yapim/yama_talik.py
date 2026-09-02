# -*- coding: utf-8 -*-
"""Zabta talik satiri ekler.

Ayri dosyada, cunku hedef metni yama_101.py uretiyor (REKABET satiri);
sirasi kur.py icinde yama_101'den SONRA olmak zorunda.
"""

_ESKI = "  const rk=aramizdaNotu(c);"
_YENI = ("  const tl=talikZabitNotu(c);" + chr(10) +
         "  if(tl){ L.push(''); L.push(`TALIK: ${tl}`); }" + chr(10) +
         "  const rk=aramizdaNotu(c);")


def uygula(s):
    if _ESKI not in s:
        raise SystemExit('YAMA TALIK BULUNAMADI: zabit REKABET satiri')
    return s.replace(_ESKI, _YENI, 1)
