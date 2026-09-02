# -*- coding: utf-8 -*-
"""Bahis (neye oynanıyor) + borç tabelası + efsane uyarısı + sekme adı.

kur.py bunu çağırır. Ayrı dosyada: değiştirilecek metinler JS şablon
dizgisi içeriyor, gömülü tırnaklar okunmaz hâle geliyor.
"""

NL = chr(10)
DEGISIKLIKLER = []

# --- 1) maç kurulum penceresine BAHİS seçici (masa adının hemen ardına)
_B_ESKI = ('    <div class="field"><label class="fl">Giriş şekli</label>')
_B_YENI = ('    ${bahisSecici(DB.ayar.bahis)}' + NL + NL +
           '    <div class="field"><label class="fl">Giriş şekli</label>')
DEGISIKLIKLER.append((_B_ESKI, _B_YENI, 'maç kurulumuna bahis seçici'))

# --- 2) eş seçilince EFSANE UYARISI göster (chipSec'in eş kutusu)
_E_ESKI = """        <div class="sm"><span class="pill blue">B</span> ${esc(ad(s[2]))} &amp; ${esc(ad(s[3]))}</div>
      </div></div>`:'';"""
_E_YENI = """        <div class="sm"><span class="pill blue">B</span> ${esc(ad(s[2]))} &amp; ${esc(ad(s[3]))}</div>
      </div></div>`+efsaneUyari([[s[0],s[1]],[s[2],s[3]]]):'';"""
DEGISIKLIKLER.append((_E_ESKI, _E_YENI, 'eş kutusuna efsane uyarısı'))

# --- 3) zabıta BAHİS satırı (rekabet notundan hemen önce)
_Z_ESKI = "  const rk=aramizdaNotu(c);"
_Z_YENI = ("  const bh=bahisNotu(c);" + NL +
           "  if(bh){ L.push(''); L.push(bh); }" + NL +
           "  const rk=aramizdaNotu(c);")
DEGISIKLIKLER.append((_Z_ESKI, _Z_YENI, 'zabıta bahis satırı'))

# --- 4) alt menü: "Unvan" → "Divan" (unvan + aramızda + efsane + borç)
_T_ESKI = '<button data-t="rozet"><span class="ic">🏅</span>Unvan</button>'
_T_YENI = '<button data-t="rozet"><span class="ic">⚖️</span>Divan</button>'
DEGISIKLIKLER.append((_T_ESKI, _T_YENI, 'sekme adı Divan'))


def uygula(s):
    for eski, yeni, ad in DEGISIKLIKLER:
        if eski not in s:
            raise SystemExit('YAMA SOSYAL BULUNAMADI: ' + ad)
        s = s.replace(eski, yeni, 1)
    return s
