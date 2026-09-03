# -*- coding: utf-8 -*-
"""temel.html (tek dosya şablon) üzerinden bulut sürümünü üretir.

Yollar betiğin bulunduğu yere göre çözülür; mutlak yol yok, böylece
depo başka bir makineye klonlandığında da çalışır.

    yapim/temel.html      kaynak şablon
    yapim/f_*.js          parçalar
    yapim/yama_*.py       nokta atışı düzeltmeler
    ../index.html         üretilen, yayınlanan dosya
"""
import io, os, re, sys

BURA = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURA)
from kkd_ortak import oku, yaz, fn_degistir, arasini_degistir
import yama_101, yama_sosyal, yama_gorsel, yama_talik

YAYIN  = os.path.dirname(BURA)                 # .../bulut
KAYNAK = os.path.join(BURA, 'temel.html')
HEDEF  = os.path.join(YAYIN, 'index.html')
F = lambda n: oku(os.path.join(BURA, n))

s = oku(KAYNAK)

# ---------------------------------------------------------------- 1) BAŞLIK
EK_CSS = """
/* --- bulut sürümü --- */
.yukleniyor{display:inline-block;width:15px;height:15px;border:2px solid #fff5;border-top-color:#fff;
  border-radius:50%;animation:don .7s linear infinite;vertical-align:-2px}
@keyframes don{to{transform:rotate(360deg)}}
.kod{font:700 26px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.28em;color:var(--gold)}
.orta{min-height:66vh;display:flex;flex-direction:column;justify-content:center}
.uyari{background:#2B2410;border:1px solid var(--gold);border-radius:12px;padding:11px 13px;font-size:12.5px;color:#E8D9A8}
.toast.hata{background:var(--red);color:#fff}
.canli{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--red);
  animation:nabiz 1.4s ease-in-out infinite;margin-right:6px;vertical-align:2px}
@keyframes nabiz{0%,100%{opacity:1}50%{opacity:.2}}
.yaziyor{font-size:10px;color:var(--gold);margin-left:5px}
/* Sicilde iki oyun: telefonda alt alta, geniş ekranda yan yana */
.ikili{display:grid;grid-template-columns:1fr;gap:12px;align-items:start}
.ikili>*{margin-bottom:0}
@media(min-width:820px){.ikili{grid-template-columns:1fr 1fr}}
select:disabled,input:disabled,button:disabled{opacity:.55}
/* textarea tarayıcı varsayılanı olan daktilo yazı tipine düşüyordu */
textarea{font-family:inherit;font-size:15px;line-height:1.5}
"""
BAS_EK = (EK_CSS + '</style>\n'
          '<link rel="manifest" href="manifest.json">\n'
          '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
          '<link rel="icon" href="ikon-192.png" type="image/png">\n'
          '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>\n'
          '</head>')
s = s.replace('</style>\n</head>', BAS_EK, 1)

# ------------------------------------------------------- 2) ÇEKİRDEK/DEPOLAMA
s = arasini_degistir(s,
                     "const KEY='kkd_v3';",
                     '/* ---------------- yardımcı ---------------- */',
                     F('f_cekirdek.js') + '\n')

# toast: hata rengi
s = s.replace(
    "function toast(m,uzun){const t=$('#toast');t.textContent=m;t.classList.add('on');\n"
    "  clearTimeout(t._z);t._z=setTimeout(()=>t.classList.remove('on'),uzun?4200:2000);}",
    "function toast(m,hata){const t=$('#toast');t.textContent=m;\n"
    "  t.classList.toggle('hata',!!hata);t.classList.add('on');\n"
    "  clearTimeout(t._z);t._z=setTimeout(()=>t.classList.remove('on'),hata?4200:2000);}")
assert 'hata?4200:2000' in s, 'toast yamalanmadı'

# ---------------------------------------------------------- 3) FONKSİYONLAR
def parcala(metin):
    bloklar, ad, tampon = {}, None, []
    for satir in metin.split('\n'):
        m = re.match(r'^//==\s*(\S+)\s*$', satir)
        if m:
            if ad: bloklar[ad] = '\n'.join(tampon).strip('\n')
            ad, tampon = m.group(1), []
        else:
            tampon.append(satir)
    if ad: bloklar[ad] = '\n'.join(tampon).strip('\n')
    return bloklar

bloklar = {}
bloklar.update(parcala(F('f_fn.js')))
bloklar.update(parcala(F('f_fn2.js')))
bloklar.update(parcala(F('f_masa.js')))   # çok masa: viewCelse/celseKur/... bunları ezer
bloklar.update(parcala(F('f_unvan.js')))  # unvanlar: berabere kalan eşler ortak taşır
bloklar.update(parcala(F('f_batak.js')))  # şlem: karşı takım ihale kadar batar
bloklar.update(parcala(F('f_yz.js')))     # 101: silme (ödül) + elle ceza
bloklar.update(parcala(F('f_divan.js')))  # Divan: alt bölümlü sekme (viewRozet'i ezer)
bloklar.update(parcala(F('f_sicil.js')))  # Sicil: iki oyun bir arada, sekme yok

VAR = lambda ad: re.search(r'^(?:async\s+)?function\s+' + re.escape(ad) + r'\s*\(', s, re.M) is not None
yeniler = []
for fn_adi, yeni in bloklar.items():
    if VAR(fn_adi):
        s = fn_degistir(s, fn_adi, yeni)   # prototipteki karşılığının yerine
    else:
        yeniler.append(yeni)               # yeni fonksiyon: sona eklenecek

s = fn_degistir(s, 'viewAyar', F('f_ayar.js'))

# prototipteki eski başlık + _foto bildirimi (yenisi blokla birlikte geldi)
s = s.replace("/* ---------- PROFİL (üyelik + foto) ---------- */\nlet _foto=null;\n", "")


# alt menü: Akış sekmesi eklendi (6 -> 7 sütun)
s = s.replace('grid-template-columns:repeat(6,1fr)', 'grid-template-columns:repeat(7,1fr)')
s = s.replace('''<button data-t="sicil"><span class="ic">📊</span>Sicil</button>''',
              '''<button data-t="akis"><span class="ic">💬</span>Akış</button>
  <button data-t="sicil"><span class="ic">📊</span>Sicil</button>''')
s = s.replace('nav.tabbar button{background:none;border:0;color:var(--ink3);padding:9px 1px 10px;',
              'nav.tabbar button{background:none;border:0;color:var(--ink3);padding:9px 0 10px;')

# maç kurulum penceresine MASA ADI alanı
eski_ma = '''    <div class="field"><label class="fl">Giriş şekli</label>'''
assert eski_ma in s, 'maç kurulum penceresi bulunamadı'
s = s.replace(eski_ma, '''    <div class="field"><label class="fl">Masa adı</label>
      <input id="mMasaAd" value="${varsayilanMasaAd()}" maxlength="24" placeholder="1. Masa">
      <div class="xs dim" style="margin-top:5px">Aynı anda birden çok masa açıksa hangisi olduğu buradan ayırt edilir.</div></div>

''' + eski_ma, 1)

# NOT: "← Masalar" düğmesi eskiden burada her "İptal"in yanına
# eklenirdi. Artık dört tabela ekranının da kaynağında yazılı
# (f_tabela.js x2, temel.html x2); yama ikinci kopya üretiyordu.

# chipSec: seçim sırası damgası. Date.now() aynı milisaniyedeki iki seçimi
# eşitleyip eş/sıralama tayinini bozuyordu — artan sayaç kullan.
eski = "el.dataset.sira=el.classList.contains('on')?String(Date.now()):'';"
assert eski in s, 'chipSec sira damgasi bulunamadi'
s = s.replace(eski, "el.dataset.sira=el.classList.contains('on')?String(++SEC_NO):'';", 1)

# ------------------------------------------------------------ 4) NOKTA ATIŞI
# canlı izleme: tabelacı ben değilsem yazma ekranını açma
eski = "  if(DB.aktif) return DB.aktif.giris==='hizli' ? hizliEkran() : (DB.aktif.oyun==='batak'?aktifBatak():aktifYz());"
assert eski in s, 'viewCelse girişi bulunamadı'
s = s.replace(eski,
    "  if(DB.aktif&&!tabelaciMiyim()) return canliIzle();\n" + eski, 1)

# maç kurma düğmesine kimlik (yükleniyor göstergesi için)
eski = """onclick="celseKur('${oyun}')">Tabelayı Aç</button>"""
assert eski in s
s = s.replace(eski, """id="mKurBtn" onclick="celseKur('${oyun}')">Tabelayı Aç</button>""", 1)

# arşivde silme yalnız kurucuda (RLS zaten engelliyor; düğmeyi de gizle)
eski = """${sade?'':`<button class="btn-xs btn-dn" onclick="celseSil('${c.id}')">Sil</button>`}"""
assert eski in s
s = s.replace(eski, """${sade||!kurucuMu()?'':`<button class="btn-xs btn-dn" onclick="celseSil('${c.id}')">Sil</button>`}""", 1)

# kronoloji: id (UUID) yerine kaydın oluşma anına göre sırala.
# Yoksa aynı gün oynanan maçlar rastgele sıralanır ve "üst üste N galibiyet"
# serileri yanlış hesaplanır.
for eski, yeni in [
    ("sort((a,b)=>(a.tarih+a.id).localeCompare(b.tarih+b.id))",
     "sort((a,b)=>(a.tarih+(a._sira||'')).localeCompare(b.tarih+(b._sira||'')))"),
    ("sort((a,b)=>(b.tarih+b.id).localeCompare(a.tarih+a.id))",
     "sort((a,b)=>(b.tarih+(b._sira||'')).localeCompare(a.tarih+(a._sira||'')))"),
]:
    assert eski in s, 'siralama bulunamadi: ' + eski
    s = s.replace(eski, yeni)

# başlıktaki "üye ol" akışı kalktı: karsilama artık oyuncu bağlama ekranı
s = s.replace("""onclick="git('ayar')">Oyuncu / Grup Yönet</button>""",
              """onclick="git('ayar')">Oyuncu Ekle</button>""")

# Arşiv ekranına "Geçmiş Maç Ekle" kartı
eski = """  if(!list.length) return f+`<div class="card"><div class="empty"><div class="big">📚</div>Arşiv boş.</div></div>`;
  return f+`<div class="card">${list.map(c=>arsivSatir(c)).join('<div class="sep"></div>')}</div>`;"""
assert eski in s, 'viewArsiv sonu bulunamadı'
s = s.replace(eski, """  const ekle=`<div class="card">
    <h3>Deftere Geçmiş Maç Ekle</h3>
    <div class="xs dim" style="margin-bottom:10px">Uygulamadan önce oynanmış maçları da girebilirsin;
      sicil, unvanlar ve kürsü hepsini birlikte hesaplar.</div>
    <div class="two">
      <button class="btn-p btn-sm" onclick="gecmisAc('batak')">🂡 Geçmiş Batak</button>
      <button class="btn-b btn-sm" onclick="gecmisAc('101')">🀄 Geçmiş 101</button>
    </div></div>`;
  if(!list.length) return f+ekle+`<div class="card"><div class="empty"><div class="big">📚</div>Arşiv boş.
    <div class="sm" style="margin-top:6px">Eski maçları yukarıdan girmeye başlayabilirsin.</div></div></div>`;
  return f+ekle+`<div class="card">${list.map(c=>arsivSatir(c)).join('<div class="sep"></div>')}</div>`;""", 1)

# Unvan sahibi artık DİZİ (eşler ortak taşıyabiliyor) — yazıya çeviren üç yer
for eski, yeni in [
    ("akisEkle('unvan',r.aciklama||'',{unvan:r.ad,k:r.k,kim:ad(r.kim),oyun:c.oyun})",
     "akisEkle('unvan',r.aciklama||'',{unvan:r.ad,k:r.k,kim:unvanAd(r.kim),oyun:c.oyun})"),
    ("""<div><div style="font-weight:700;font-size:13.5px">${esc(r.ad)} — <span style="color:var(--gold)">${esc(ad(r.kim))}</span></div>""",
     """<div><div style="font-weight:700;font-size:13.5px">${esc(r.ad)} — <span style="color:var(--gold)">${esc(unvanAd(r.kim))}</span></div>"""),
]:
    assert eski in s, 'unvan kullanimi bulunamadi: ' + eski[:60]
    s = s.replace(eski, yeni, 1)

# Eski sabikaGorunum'daki tek-kişi filtresi. f_sicil.js bu fonksiyonu baştan
# yazdığı için artık bulunmayabilir — o hâlde yapılacak bir şey yok.
eski = "const rozetleri=muayyideler(oyun).filter(r=>r.kim===id);"
if eski in s:
    s = s.replace(eski, "const rozetleri=muayyideler(oyun).filter(r=>unvanKisi(r.kim).includes(id));", 1)

# 101: silme (ödül) ve elle ceza alanları
s = yama_101.uygula(s)
s = yama_talik.uygula(s)
s = yama_sosyal.uygula(s)

# ---- Açılış sekmesi ----
# İlk kez açan Divan > Efsane ile karşılansın: pankart ve lakaplar orada,
# asıl etkiyi orası yapıyor. Ama tabelayı tutan kişi skor girmeye geliyor;
# her açılışta efsaneye düşmesi onu yavaşlatır. O yüzden yalnız İLK açılış
# efsaneye gider, sonrasında kişinin son bulunduğu sekme hatırlanır.
eski = "let TAB='celse', SABIKA_ID=null, ARSIV_FILTRE='hepsi', SICIL_OYUN='batak', ROZET_OYUN='batak';"
assert eski in s, 'TAB bildirimi bulunamadı'
s = s.replace(eski, '\n'.join([
  "const SEKME_ANAHTAR='kkd_sekme';",
  "function sekmeOku(){",
  "  try{ return JSON.parse(localStorage.getItem(SEKME_ANAHTAR)||'null'); }catch(e){ return null; }",
  "}",
  "function sekmeYaz(){",
  "  try{ localStorage.setItem(SEKME_ANAHTAR, JSON.stringify({t:TAB,d:DIVAN})); }catch(e){}",
  "}",
  "const _sekme = sekmeOku();",
  "let TAB = _sekme ? _sekme.t : 'rozet';        /* ilk açılış: Divan */",
  "let DIVAN = _sekme ? (_sekme.d||'unvan') : 'efsane';   /* ilk açılış: efsaneler */",
  "let SABIKA_ID=null, ARSIV_FILTRE='hepsi', SICIL_OYUN='batak', ROZET_OYUN='batak';",
]), 1)

# git(): seçilen sekme hatırlansın
eski = "function git(t){TAB=t;render();window.scrollTo(0,0);}"
assert eski in s, 'git() bulunamadı'
s = s.replace(eski, "function git(t){TAB=t;sekmeYaz();render();window.scrollTo(0,0);}", 1)

# Divan alt bölümü değişince de hatırlansın
eski_dv = "onclick=\"DIVAN='${k}';render();window.scrollTo(0,0)\""
assert eski_dv in s, 'Divan alt bölüm tıklaması bulunamadı'
s = s.replace(eski_dv, "onclick=\"DIVAN='${k}';sekmeYaz();render();window.scrollTo(0,0)\"", 1)

eski = "let SECILI_MAC=null;"
assert eski in s, 'SECILI_MAC bildirimi bulunamadı'

# ------------------------------------------------------------- 5) GİRİŞ EKRANI
s = s.replace('/* ---------- modal ---------- */',
              F('f_giris.js') + '\n' + F('f_akis.js') + '\n' + F('f_kadro.js') + '\n'
              + F('f_gecmis.js') + '\n' + F('f_yonerge.js') + '\n' + F('f_aramizda.js') + '\n'
              + F('f_efsane.js') + '\n' + F('f_lakap.js') + '\n' + F('f_yer.js') + '\n'
              + F('f_tabela.js') + '\n' + F('f_devret.js') + '\n'
              + F('f_sure.js') + '\n'
              + F('f_sezon.js') + '\n' + F('f_cagri.js') + '\n'
              + F('f_tahmin.js') + '\n' + F('f_tahmin2.js') + '\n'
              + F('f_tmisafir.js') + '\n'
              + F('f_borc.js') + '\n' + F('f_hesap.js') + '\n'
              + F('f_mocks.js') + '\n'
              + F('f_rapor.js') + '\n'
              + F('f_talik.js') + '\n'
              + F('f_dayanikli.js') + '\n'
              + F('f_misafir.js') + '\n'
              + F('f_rekor.js') + '\n' + F('f_hafta.js') + '\n' + F('f_devir.js') + '\n'
              + '\n\n'.join(yeniler) + '\n\n/* ---------- modal ---------- */', 1)

# Görsel yama EN SONDA: kırmızıyı kaldırıp çuha yeşiline geçiyor ve
# çubukları yerleştiriyor. Aramızda/borç çubukları yukarıdaki parçaların
# içinde olduğu için bu satır parça birleştirmeden önce çalışamaz.
s = yama_gorsel.uygula(s)

# Maç kurulumunda "Yer": serbest yazı yerine mutat mekân seçici
# (Parkverde / Kemerdere + istenirse elle yazma). Tarih tek başına kalıyor.
eski = """    <div class="two" style="margin-top:10px">
      <div><label class="fl">Tarih</label><input type="date" id="mTarih" value="${bugun()}"></div>
      <div><label class="fl">Yer</label><input id="mYer" placeholder="Ofis, kahve..."></div>
    </div>"""
assert eski in s, 'maç kurulumundaki Yer alanı bulunamadı'
s = s.replace(eski, """    <div class="field" style="margin-top:10px"><label class="fl">Tarih</label>
      <input type="date" id="mTarih" value="${bugun()}"></div>
    ${yerSecici(sonYer())}""", 1)

# Batak'ta "hızlı giriş" artık gerçek TABELA: iki sütun, alt alta sayı,
# altta toplam, 61'de parti biter. Parti sayacı (−/+) kaldırıldı.
eski = """    const h=c.hizli, T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
    const kz = h.partiSkor[0]===h.partiSkor[1] ? null : (h.partiSkor[0]>h.partiSkor[1]?0:1);"""
assert eski in s, 'hızlı batak girişinin başı bulunamadı'
b1 = s.index(eski)
b2 = s.index("  /* 101 hızlı: sıraya diz */", b1)
s = s[:b1] + "    return batakTabela();\n  }\n\n" + s[b2:]
# yukarıdaki blok kendi '}' ini de götürdüğü için if gövdesini kapattık

# 101'de de sıraya dizme yerine TABELA: oyuncu başına sütun, 11 el, altta toplam.
b3 = s.index("  /* 101 hızlı: sıraya diz */")
b4 = s.index("function hzParti(", b3)
s = s[:b3] + "  return yzTabela();\n}\n\n" + s[b4:]


# --------------------------------------------------------------- 6) AÇILIŞ
eski = "document.querySelectorAll('nav.tabbar button').forEach(b=>b.onclick=()=>{ if(b.dataset.t!=='sicil') SABIKA_ID=null; git(b.dataset.t); });\nrender();"
assert eski in s, 'açılış bloğu bulunamadı'
s = s.replace(eski,
    "document.querySelectorAll('nav.tabbar button').forEach(b=>b.onclick=()=>{ if(b.dataset.t!=='sicil') SABIKA_ID=null; git(b.dataset.t); });\n"
    "baslat().catch(e=>{ DURUM='hata'; HATA=hataMetni(e); render(); });\n"
    "/* PWA: ana ekrana eklendiğinde tam ekran açılsın, ağ yokken kabuk gelsin.\n"
    "   Veri önbelleğe alınmaz — sw.js'deki nedenler. */\n"
    "if('serviceWorker' in navigator && location.protocol!=='file:')\n"
    "  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));")

# başlıktaki alt yazı artık innerHTML ile yazılıyor
s = s.replace('<div class="sub" id="hdrSub">Batak &amp; 101 tabelası</div>',
              '<div class="sub" id="hdrSub">bağlanıyor…</div>')

# NOT: Giriş şekli adları (Tabela / İhaleli / Ceza-Ödül) artık temel.html içinde
# doğrudan yazılı ve oyuna göre değişiyor. Eskiden burada metin değiştirilirdi;
# o yama "bulamazsa sessizce atla" davranışındaydı, silindi.

yaz(HEDEF, s)
print('yazildi:', HEDEF, len(s), 'karakter', s.count('\n'), 'satir')
