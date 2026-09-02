# -*- coding: utf-8 -*-
"""KIRMIZIYI KALDIR + GÖRSELLEŞTİR + LAKAPLAR

Renk kararı: masa çuhası yeşili ana renk oldu ("Kara Kaplı Defter"e
kırmızıdan daha çok yakışıyor). Kırmızı yalnız NEGATİF SAYI için ve
o da tuğla tonuna çekilmiş hâlde kaldı — bilgi taşıyor, süs değil.
"""

NL = chr(10)
DEGISIKLIKLER = []


def _ekle(eski, yeni, ad):
    DEGISIKLIKLER.append((eski, yeni, ad))


# ---------------------------------------------------------------- RENKLER
_ekle('--accent:#A32E38; --accent2:#C4444E; --gold:#C9A227; --green:#4E8B5B; --red:#B4453B; --blue:#4A7A9B;',
      '--accent:#2E6B4F; --accent2:#3E8A66; --gold:#C9A227; --green:#4E8B5B; --red:#A8695E; --blue:#4A7A9B;',
      'ana renk: çuha yeşili')

# mühür ve başlık kırmızıydı
_ekle('header .seal{width:31px;height:31px;border-radius:50%;flex:0 0 31px;border:2px solid var(--accent);',
      'header .seal{width:31px;height:31px;border-radius:50%;flex:0 0 31px;border:2px solid var(--gold);',
      'mühür altın')
_ekle('  color:var(--accent);display:grid;place-items:center;font:600 15px Georgia,serif}',
      '  color:var(--gold);display:grid;place-items:center;font:600 15px Georgia,serif}',
      'mühür yazı altın')

# canlı nokta kırmızı yanıp sönüyordu
_ekle('.canli{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--red);',
      '.canli{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);',
      'canlı nokta altın')

# çıkıştırma şeridi koyu kırmızıydı
_ekle('.cikis{background:linear-gradient(90deg,#3A1D1D,#2A1A1A);border:1px solid #6B2F2F}',
      '.cikis{background:linear-gradient(90deg,#16301F,#12241A);border:1px solid #2E6B4F}',
      'çıkıştırma şeridi yeşil')

# A takımı rozeti kırmızıydı → yeşil; "red" rozeti yalnız uyarı için kalsın
_ekle('.pill.red{background:#3A1D1D;color:#DD8A8A}',
      '.pill.red{background:#33251F;color:#D2A08F}',
      'kırmızı rozet tuğlaya çekildi')

# sil düğmesi
_ekle('.btn-dn{background:none;border-color:#5a2b2b;color:#C97C7C}',
      '.btn-dn{background:none;border-color:#5c3b33;color:#C99A8C}',
      'sil düğmesi tuğla')

# odak rengi
_ekle('input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent2)}',
      'input:focus,select:focus,textarea:focus{outline:none;border-color:var(--gold)}',
      'odak altın')

# ------------------------------------------------------------ GÖRSELLEŞTİRME
# NOT: eski viewSicil'e eklenen oranBar yardımcısı kaldırıldı — Sicil
# f_sicil.js ile baştan yazıldı, çubuk artık tablonun içinde.

# Aramızda satırlarına karşılaştırma çubuğu
_ekle("""      ${avatar(son,26)}
      <div class="serif" style="font-size:16px;min-width:52px;text-align:right">
        <b class="${g>mg?'pos':'zero'}">${g}</b><span class="dim">–</span><b class="${mg>g?'neg':'zero'}">${mg}</b></div>
    </div>`;""",
      """      ${avatar(son,26)}
      <div style="min-width:62px;text-align:right">
        <div class="serif" style="font-size:16px">
          <b class="${g>mg?'pos':'zero'}">${g}</b><span class="dim">–</span><b class="${mg>g?'neg':'zero'}">${mg}</b></div>
        <div class="bar" style="margin-top:3px"><i style="width:${Math.round(g/Math.max(1,g+mg)*100)}%;background:var(--gold)"></i></div>
      </div>
    </div>`;""",
      'aramızda karşılaştırma çubuğu')

# Borç hesabına oransal çubuk
_ekle("""    <div class="serif ${r.v<0?'neg':'pos'}" style="font-size:20px;min-width:34px;text-align:right">
      ${r.v<0?Math.abs(r.v):'+'+r.v}</div>""",
      """    <div style="min-width:58px;text-align:right">
      <div class="serif ${r.v<0?'neg':'pos'}" style="font-size:20px">${r.v<0?Math.abs(r.v):'+'+r.v}</div>
      <div class="bar" style="margin-top:3px"><i style="width:${Math.round(Math.min(1,Math.abs(r.v)/enBuyuk)*100)}%;
        background:${r.v<0?'var(--red)':'var(--green)'}"></i></div></div>""",
      'borç çubuğu')
_ekle("""  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);

  const satir=r=>`<div class="row" style="padding:8px 0;gap:9px">""",
      """  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const enBuyuk=Math.max(1,...kayit.map(r=>Math.abs(r.v)));

  const satir=r=>`<div class="row" style="padding:8px 0;gap:9px">""",
      'borç ölçek')

# Kürsü kartına oran çubuğu
_ekle("""  const sat=(p,i,oyun)=>`<div class="row" style="padding:5px 0">
    <span class="rank ${i===0?'r1':''}">${i+1}</span>${avatar(p.id,24)}
    <span class="grow" style="font-weight:600;font-size:13.5px;margin-left:7px">${esc(ad(p.id))}</span>
    <span class="sm dim">${p.gal}/${p.celse} · %${Math.round(p.oran*100)}</span></div>`;""",
      """  const sat=(p,i,oyun)=>`<div class="row" style="padding:5px 0">
    <span class="rank ${i===0?'r1':''}">${i+1}</span>${avatar(p.id,24)}
    <span class="grow" style="font-weight:600;font-size:13.5px;margin-left:7px">${esc(ad(p.id))}</span>
    <div class="bar" style="width:54px;flex-shrink:0"><i style="width:${Math.round((p.oran||0)*100)}%;background:var(--gold)"></i></div>
    <span class="sm dim" style="min-width:62px;text-align:right">${p.gal}/${p.celse} · %${Math.round(p.oran*100)}</span></div>`;""",
      'kürsü oran çubuğu')


def uygula(s):
    for eski, yeni, ad in DEGISIKLIKLER:
        if eski not in s:
            raise SystemExit('YAMA GORSEL BULUNAMADI: ' + ad)
        s = s.replace(eski, yeni, 1)
    # A/B takım rozetleri: kırmızı yerine yeşil
    s = s.replace('<span class="pill red">A</span>', '<span class="pill green">A</span>')
    s = s.replace('<span class="pill red">${c.takimlar[i].ad}</span>',
                  '<span class="pill green">${c.takimlar[i].ad}</span>')
    s = s.replace("""<span class="pill ${i?'blue':'red'}">""", """<span class="pill ${i?'blue':'green'}">""")
    s = s.replace("""<span class="pill ${c.oyun==='batak'?'red':'blue'}">""",
                  """<span class="pill ${c.oyun==='batak'?'green':'blue'}">""")
    s = s.replace("""<span class="pill ${a.veri?.oyun==='batak'?'red':'blue'}">""",
                  """<span class="pill ${a.veri?.oyun==='batak'?'green':'blue'}">""")
    return s
