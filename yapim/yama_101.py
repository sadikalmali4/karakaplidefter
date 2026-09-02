# -*- coding: utf-8 -*-
"""101 tabelasına Sayı / Ceza / Ödül kırılımı + zabıta rekabet notu.

Ayrı dosyada olmasının sebebi: değiştirilecek metinler JS şablon dizgisi
içeriyor, kur.py içine gömülünce tırnak kaçışları okunmaz hâle geliyor.

NOT: Eski hâlinde bu dosya "durum çipleri" (bitirdi/açamadı/çifte) ve
"silme" düğmesini işliyordu. 101 girişi kullanıcı isteğiyle ELLE girişe
çevrildi (sayı + ceza + ödül); o yamalar kaldırıldı, kırılım tablosu
yeni alanlara göre yeniden yazıldı.
"""

DEGISIKLIKLER = []

# --- tabelaya Sayı / Ceza / Ödül kırılımı + TOPLAM
_TB_ESKI = """      <tbody>${parti.eller.map((el,i)=>`<tr><td>${i+1}</td>${c.oyuncular.map(id=>{
        const p=yzDurumPuan(el.durum[id]),d=el.durum[id]||{};
        const ip = d.tip==='elle' ? (d.bitirdi?'B':'')
                 : ({bitirdi:'B',es:'E',acamadi:'A',kaldi:'',cifte:'Ç'}[d.tip]||'');
        return `<td class="${snf(-p)}">${art(p)}${ip?` <span class="xs dim">${ip}</span>`:''}</td>`;}).join('')}</tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td><b>Toplam</b></td>${
        c.oyuncular.map(id=>`<td><b>${yzPartiToplam(parti,c)[id]}</b></td>`).join('')}</tr></tbody></table></div>"""

_TB_YENI = """      <tbody>${parti.eller.map((el,i)=>`<tr><td>${i+1}</td>${c.oyuncular.map(id=>{
        const d=el.durum[id]||{},kr=yzKirilim(d),p=kr.toplam;
        const ip = d.tip==='elle' ? (d.bitirdi?'B':'')
                 : ({bitirdi:'B',es:'E',acamadi:'A',kaldi:'',cifte:'Ç'}[d.tip]||'');
        return `<td class="${snf(-p)}">${art(p)}${ip?` <span class="xs dim">${ip}</span>`:''}${
          kr.ceza?` <span class="xs neg">+${kr.ceza}</span>`:''}${
          kr.odul?` <span class="xs pos">${kr.odul}</span>`:''}</td>`;}).join('')}</tr>`).join('')}
      ${(()=>{ const t={n:{},o:{},z:{}};
        c.oyuncular.forEach(id=>{t.n[id]=0;t.o[id]=0;t.z[id]=0;});
        parti.eller.forEach(el=>c.oyuncular.forEach(id=>{const k=yzKirilim(el.durum[id]);
          t.n[id]+=k.normal; t.o[id]+=k.odul; t.z[id]+=k.ceza;}));
        const varMi=o=>c.oyuncular.some(id=>o[id]);
        const sat=(bas,o,renkli)=>`<tr><td class="xs dim">${bas}</td>${c.oyuncular.map(id=>
          `<td class="xs ${renkli?snf(-o[id]):'dim'}">${o[id]?art(o[id]):'—'}</td>`).join('')}</tr>`;
        return sat('Sayı',t.n,false)
             + (varMi(t.z)?sat('Ceza (+)',t.z,true):'')
             + (varMi(t.o)?sat('Ödül (−)',t.o,true):''); })()}
      <tr style="border-top:2px solid var(--line)"><td><b>TOPLAM</b></td>${
        c.oyuncular.map(id=>`<td><b>${yzPartiToplam(parti,c)[id]}</b></td>`).join('')}</tr></tbody></table></div>"""
DEGISIKLIKLER.append((_TB_ESKI, _TB_YENI, '101 tabela kırılımı'))

# --- istatistikte ceza/ödül toplamları
DEGISIKLIKLER.append((
    "        if(d.tip==='cifte')p.cifte++;",
    "        if(d.tip==='cifte')p.cifte++;\n"
    "        if(d.ceza) p.ekCeza=(p.ekCeza||0)+Number(d.ceza);\n"
    "        if(d.odul) p.ekOdul=(p.ekOdul||0)+Number(d.odul);\n"
    "        if(d.silme) p.silmeSay=(p.silmeSay||0)+1;",
    '101 istatistik sayaçları'))

# --- zabıta rekabet notu (Aramızda)
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
