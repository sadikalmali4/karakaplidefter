# -*- coding: utf-8 -*-
"""101: silme (ödül) ve elle ceza alanlarını aktifYz ekranına + istatistiğe işler.

kur.py bunu çağırır. Ayrı dosyada olmasının sebebi: değiştirilecek metinler
JS şablon dizgisi içeriyor, kur.py içine gömülünce tırnak kaçışları okunmaz
hâle geliyor.
"""

# (aranan, konulacak, açıklama)
DEGISIKLIKLER = []

# --- 1) durum çipleri .durumlar kutusuna alınır (silme çipi onlardan bağımsız)
DEGISIKLIKLER.append((
    '      <div class="row wrap" style="gap:6px">\n'
    '        <div class="chip" data-d="bitirdi" onclick="yzDurumSec(this)" style="font-size:12px;padding:6px 10px">Bitirdi</div>',
    '      <div class="row wrap durumlar" style="gap:6px">\n'
    '        <div class="chip" data-d="bitirdi" onclick="yzDurumSec(this)" style="font-size:12px;padding:6px 10px">Bitirdi</div>',
    '101 durum çipleri'))

# --- 2) her oyuncu kartına SİLME düğmesi + EK CEZA kutusu
_EK_ESKI = '      <div class="ek" style="margin-top:8px;display:none"></div></div>`).join(\'\')}'
_EK_YENI = (
    '      <div class="ek" style="margin-top:8px;display:none"></div>\n'
    '      <div class="row" style="margin-top:8px;gap:8px;align-items:center">\n'
    '        <div class="chip silme" onclick="yzSilmeSec(this)" style="font-size:12px;padding:6px 10px"\n'
    '          title="Ödül: hanesinden ${Math.abs(Number(a.silme)||0)} puan düşer">🧹 Silme</div>\n'
    '        <input type="number" class="cezaGir" placeholder="ek ceza" inputmode="numeric"\n'
    '          style="width:104px;padding:7px 9px;font-size:12.5px">\n'
    '      </div></div>`).join(\'\')}')
DEGISIKLIKLER.append((_EK_ESKI, _EK_YENI, '101 oyuncu kartı silme/ceza'))

# --- 3) ipucu satırına silme de girsin
_IP_ESKI = ('<div class="xs dim" style="margin-bottom:10px">Bitiren <b>${a.bitiren}</b> '
            '· açamayan <b>+${a.acamayan}</b> · çifte <b>×${a.cifteCarpan}</b></div>')
_IP_YENI = ('<div class="xs dim" style="margin-bottom:10px">Bitiren <b>${a.bitiren}</b> '
            '· açamayan <b>+${a.acamayan}</b> · çifte <b>×${a.cifteCarpan}</b> · silme <b>${a.silme}</b>'
            '<br>Silme ve ek ceza, normal puanın DIŞINDA yazılır; ikisi de her oyuncu için ayrı ayrı.</div>')
DEGISIKLIKLER.append((_IP_ESKI, _IP_YENI, '101 ipucu satırı'))

# --- 4) tabelaya Normal / Ödül (silme) / Ek ceza kırılımı + TOPLAM
_TB_ESKI = """      <tbody>${parti.eller.map((el,i)=>`<tr><td>${i+1}</td>${c.oyuncular.map(id=>{
        const p=yzDurumPuan(el.durum[id]),d=el.durum[id]||{};
        const ip={bitirdi:'B',es:'E',acamadi:'A',kaldi:'',cifte:'Ç'}[d.tip]||'';
        return `<td class="${snf(-p)}">${art(p)}${ip?` <span class="xs dim">${ip}</span>`:''}</td>`;}).join('')}</tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td><b>Toplam</b></td>${
        c.oyuncular.map(id=>`<td><b>${yzPartiToplam(parti,c)[id]}</b></td>`).join('')}</tr></tbody></table></div>"""

_TB_YENI = """      <tbody>${parti.eller.map((el,i)=>`<tr><td>${i+1}</td>${c.oyuncular.map(id=>{
        const d=el.durum[id]||{},kr=yzKirilim(d),p=kr.toplam;
        const ip={bitirdi:'B',es:'E',acamadi:'A',kaldi:'',cifte:'Ç'}[d.tip]||'';
        return `<td class="${snf(-p)}">${art(p)}${ip?` <span class="xs dim">${ip}</span>`:''}${
          d.silme?' <span class="xs" style="color:var(--gold)">🧹</span>':''}${
          d.ceza?` <span class="xs neg">+${d.ceza}</span>`:''}</td>`;}).join('')}</tr>`).join('')}
      ${(()=>{ const t={n:{},o:{},z:{}};
        c.oyuncular.forEach(id=>{t.n[id]=0;t.o[id]=0;t.z[id]=0;});
        parti.eller.forEach(el=>c.oyuncular.forEach(id=>{const k=yzKirilim(el.durum[id]);
          t.n[id]+=k.normal; t.o[id]+=k.odul; t.z[id]+=k.ceza;}));
        const varMi=o=>c.oyuncular.some(id=>o[id]);
        const sat=(bas,o,renkli)=>`<tr><td class="xs dim">${bas}</td>${c.oyuncular.map(id=>
          `<td class="xs ${renkli?snf(-o[id]):'dim'}">${o[id]?art(o[id]):'—'}</td>`).join('')}</tr>`;
        return sat('Normal',t.n,false)
             + (varMi(t.o)?sat('Ödül · silme',t.o,true):'')
             + (varMi(t.z)?sat('Ek ceza',t.z,true):''); })()}
      <tr style="border-top:2px solid var(--line)"><td><b>TOPLAM</b></td>${
        c.oyuncular.map(id=>`<td><b>${yzPartiToplam(parti,c)[id]}</b></td>`).join('')}</tr></tbody></table></div>"""
DEGISIKLIKLER.append((_TB_ESKI, _TB_YENI, '101 tabela kırılımı'))

# --- 5) istatistikte silme ve ek ceza sayaçları
DEGISIKLIKLER.append((
    "        if(d.tip==='cifte')p.cifte++;",
    "        if(d.tip==='cifte')p.cifte++;\n"
    "        if(d.silme) p.silmeSay=(p.silmeSay||0)+1;\n"
    "        if(d.ceza)  p.ekCeza=(p.ekCeza||0)+Number(d.ceza);",
    '101 istatistik sayaçları'))

# --- 6) zabıta rekabet notu (Aramızda)
_RK_ESKI = "  if(c.not){ L.push(''); L.push(`ŞERH: ${c.not}`); }"
_RK_YENI = ("  const rk=aramizdaNotu(c);" + chr(10) +
            "  if(rk){ L.push(''); L.push(`REKABET: ${rk}`); }" + chr(10) +
            "  if(c.not){ L.push(''); L.push(`ŞERH: ${c.not}`); }")
DEGISIKLIKLER.append((_RK_ESKI, _RK_YENI, 'zabıt rekabet notu'))


def uygula(s):
    for eski, yeni, ad in DEGISIKLIKLER:
        if eski not in s:
            raise SystemExit('YAMA 101 BULUNAMADI: ' + ad)
        s = s.replace(eski, yeni, 1)
    return s
