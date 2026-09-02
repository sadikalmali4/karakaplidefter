//== misafir
/* =========================================================
   MİSAFİR TABELACI — WhatsApp linkiyle sonuç girme

   İstek (kullanıcı, 02.09.2026): "Maç sonuçlarını açacağız ya, onu
   WhatsApp'tan da paylaşayım, oradan da yazsınlar; dışarıdan yazan da
   adını yazıp girsin sonuçları."

   AKIŞ
     Tabelacı  → 📱 WhatsApp'a At → link üretilir, mesaj hazırlanır
     Misafir   → linke tıklar → adını yazar → tabelayı yazar

   GÜVENLİK — kural veritabanında, burada değil (yama 09)
     · Misafirin RLS'i açılmadı. Üç kapı var, hepsi security definer:
         misafir_katil(kod, ad) · misafir_mac(kod) · misafir_celse_yaz(...)
     · misafir_celse_yaz YALNIZ celse alanını yazar. Maçı bitiremez,
       zabıt üretemez, tabelacıyı değiştiremez, silemez.
     · Grubun arşivini, öteki maçları, akışı, borçları, tahminleri
       GÖRMEZ. Yalnız o maçı ve o masanın oyuncu adlarını görür.
     · Link maç kapanınca ölür; tabelacı "misafir yazmayı kapat"
       deyince de o an ölür.
     · Anonim oturum masa kuramaz, gruba katılamaz, akışa yazamaz
       (yama 09'daki anonim_mi() kilitleri).
     · AÇIK RİSK: link iletilebilir. Linki gören herkes maç açıkken
       tabelaya yazabilir. Ekranda da bunu yazıyoruz; kapatma düğmesi
       tabelacının elinde.

   AD → OYUNCU: misafirin yazdığı ad kadroda varsa O OYUNCUYA
   bağlanıyor (sicili bölünmesin), yoksa o adla yeni oyuncu açılıyor.
   Eşleşmeyi sunucu yapıyor (misafir_katil); burada yalnız sonucunu
   gösteriyoruz.

   ÇAKIŞMA: JSONB tek parça yazıldığı için iki kişi aynı anda yazarsa
   biri diğerini ezerdi. Sunucu el sayısını karşılaştırıyor; eksik
   tabela reddediliyor, istemci tazeleyip uyarıyor.
   ========================================================= */

let MISAFIR = null;          // {kod, ad, macId, elBeklenen, oyuncuId, yeniActi}
let _misafirZaman = null;    // gecikmeli yazma
let _misafirNabiz = null;    // düzenli tazeleme

/* ---------- linkten kodu oku ---------- */
function misafirOku() {
  try {
    const k = new URL(location.href).searchParams.get('misafir');
    if (!k) return null;
    /* Sayfa yenilenince kaybolmasın (davet linkindeki ile aynı dert) */
    localStorage.setItem('kkd_misafir', k);
    return k;
  } catch (e) { return null; }
}
const misafirKodu = () => {
  try { return misafirOku() || localStorage.getItem('kkd_misafir') || null; }
  catch (e) { return null; }
};
function misafirBirak() {
  try { localStorage.removeItem('kkd_misafir'); } catch (e) {}
  MISAFIR = null;
  clearInterval(_misafirNabiz);
  location.href = location.origin + location.pathname;
}

/* ---------- misafirin adını sorduğumuz ekran ---------- */
function misafirGirisEkrani(kod, hata) {
  const eskiAd = (() => { try { return localStorage.getItem('kkd_misafir_ad') || ''; } catch (e) { return ''; } })();
  return `<div class="orta"><div style="max-width:400px;margin:0 auto;width:100%">
    <div class="center" style="margin-bottom:18px">
      <div style="font-size:40px">🂡</div>
      <div class="serif" style="font-size:22px;margin-top:6px">Misafir Tabelacı</div>
      <div class="xs dim" style="margin-top:5px">Bu linkle <b>tek bir masanın</b> tabelasını yazabilirsin.</div>
    </div>

    <div class="card">
      ${hata ? `<div class="uyari" style="margin-bottom:12px;border-color:#8C3A3A;color:#E8B4B4">${esc(hata)}</div>` : ''}
      <div class="field"><label class="fl">Adın</label>
        <input id="msAd" maxlength="24" value="${esc(eskiAd)}" placeholder="Ufuk"
          onkeydown="if(event.key==='Enter')misafirKatil()">
        <div class="xs dim" style="margin-top:6px">Yazdığın ad tabelada ve zabıtta böyle görünecek.
          Hesap açmıyorsun, şifre yok.</div></div>
      <button class="btn-p btn-full" id="msBtn" style="margin-top:12px" onclick="misafirKatil()">Masaya Otur</button>
    </div>

    <div class="card tight xs dim">
      Bu link sana <b>yalnız o maçın tabelasını</b> açar. Grubun arşivini, öteki masaları,
      sohbeti ve borçları görmezsin; maçı bitiremez, zabıt üretemezsin.
      Masa kapanınca link kendiliğinden ölür.
    </div>
  </div></div>`;
}

/* ---------- katılma ---------- */
async function misafirKatil() {
  const kod = misafirKodu();
  const ad2 = ($('#msAd')?.value || '').trim();
  if (!ad2) return toast('Adını yaz', true);
  const btn = $('#msBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="yukleniyor"></span>'; }
  try { localStorage.setItem('kkd_misafir_ad', ad2); } catch (e) {}

  try {
    /* Hesabı olmayan kişi için anonim oturum. Panelde "Anonymous
       sign-ins" kapalıysa Supabase burada hata döner; mesajı olduğu
       gibi gösteriyoruz ki sebep anlaşılsın. */
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data, error } = await sb.rpc('misafir_katil', { p_kod: kod, p_ad: ad2 });
    if (error) throw error;
    MISAFIR = { kod, ad: ad2, macId: data.mac.id, elBeklenen: data.mac.el_sayisi };
    misafirPencereKur(data);
    DURUM = 'misafir';
    misafirNabizKur();
    render(); window.scrollTo(0, 0);
    /* Sunucu adı kadroda buldu mu, yeni mi açtı? */
    toast(MISAFIR.yeniActi
      ? `Hoş geldin ${ad2} — bu adla kadroya yeni eklendin`
      : `Hoş geldin ${ad2} — kadrodaki kaydına bağlandın`, true);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Masaya Otur'; }
    const m = hataMetni(e);
    if (/anonymous|disabled|signups/i.test(m))
      return toast('Misafir girişi Supabase panelinde açık değil — masayı kuran açmalı', true);
    toast(m, true);
  }
}

/* ---------- sunucudan gelen pencereyi DB'ye oturt ----------
   Tabela çizicileri DB üzerinden çalışıyor; misafir için DB'nin
   yalnız o maça ait küçük bir kopyasını kuruyoruz. */
function misafirPencereKur(p) {
  const m = p.mac;
  DB.oyuncular = (p.oyuncular || []).map(o => ({
    id: o.id, ad: o.ad, renk: o.renk || '#C9A227', fotoUrl: o.foto_url || null,
    masaId: m.masa_id, profilId: null, aktif: true
  }));
  DB.ayar = Object.assign(JSON.parse(JSON.stringify(VARSAYILAN_AYAR)), p.ayar || {});
  DB.gruplar = [{ id: m.masa_id, ad: m.masa_ad || 'Masa', emoji: '🍀', kod: '', kuran: null, rol: 'misafir', uyeler: DB.oyuncular.map(o => o.id), ayar: DB.ayar }];
  DB.aktifGrup = m.masa_id;
  DB.celseler = []; DB.akis = []; DB.iddialar = [];
  DB.haftalar = []; DB.karsilasmalar = []; DB.tahminler = []; DB.odemeler = [];
  UYELIKLER = []; MASA_UYELERI = []; BEKLEYENLER = [];
  DB.ben = null;

  const c = Object.assign({}, m.celse || {}, {
    id: m.id, grupId: m.masa_id, bitti: m.bitti,
    oyun: m.oyun, giris: m.giris, mod: m.mod, tarih: m.tarih, yer: m.yer,
    partiHedef: m.parti_hedef
  });
  if (!Array.isArray(c.partiler) || !c.partiler.length) c.partiler = [{ eller: [], kazanan: null }];
  DB.acik = [c]; DB.aktif = c; SECILI_MAC = c.id;
  MISAFIRLER = (p.misafirler || []).map(x => x.ad);
  if (MISAFIR) {
    MISAFIR.elBeklenen = m.el_sayisi;
    MISAFIR.oyuncuId = p.ben?.oyuncu_id || null;
    MISAFIR.yeniActi = !!p.ben?.yeni_acti;
    if (p.ben?.ad) MISAFIR.ad = p.ben.ad;
  }
}
let MISAFIRLER = [];

/* ---------- misafirin ekranı ---------- */
function misafirEkran() {
  const c = DB.aktif;
  if (!c) return misafirGirisEkrani(misafirKodu(), 'Masa okunamadı.');
  if (c.bitti) return `<div class="card"><div class="empty">
    <div class="big">✔️</div>
    <div class="serif" style="font-size:17px;color:var(--ink)">Masa kapandı</div>
    <div class="sm" style="margin-top:8px">Bu maç bitirilmiş; tabela artık yazılamıyor.</div>
    <button class="btn-gh" style="margin-top:14px" onclick="misafirBirak()">Çık</button></div></div>`;

  const tabela = c.giris === 'hizli'
    ? (c.oyun === 'batak' ? batakTabela() : yzTabela())
    : (c.oyun === 'batak' ? aktifBatak() : aktifYz());

  /* Bağlandığım oyuncu bu masada oturuyor mu? Oturmuyorsa tabelayı
     başkası adına yazıyorum demektir; bunu söylemek gerekiyor. */
  /* oy() bulamayinca {ad:'?'} donduruyor; gercekten kadroda olani ariyoruz. */
  const benOyn = MISAFIR?.oyuncuId
    ? (DB.oyuncular.find(o => o.id === MISAFIR.oyuncuId) || null) : null;
  const benAd = benOyn?.ad || MISAFIR?.ad || 'Misafir';
  const masada = benOyn ? macOyunculari(c).includes(benOyn.id) : false;

  return `
  <div class="card tight" style="border-color:var(--gold)">
    <div class="row" style="gap:9px">
      ${benOyn ? avatar(benOyn.id, 34) : '<div style="font-size:20px;flex-shrink:0">📱</div>'}
      <div class="grow" style="min-width:0">
        <div class="sm" style="font-weight:700">${esc(MISAFIR?.ad || '')}
          <span class="xs dim" style="font-weight:500">· misafir tabelacı</span></div>
        <div class="xs dim">${esc(DB.gruplar[0]?.ad || 'Masa')} · ${c.oyun === 'batak' ? 'Batak' : '101'}
          ${MISAFIRLER.length > 1 ? ` · masada ${MISAFIRLER.length} misafir` : ''}</div>
      </div>
      <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="misafirTazele(true)">↻</button>
    </div>
    <div class="xs dim" style="margin-top:8px">${
      !benOyn ? 'Kadroda bir kayda bağlanamadın; yazdıkların masaya işler.'
      : MISAFIR.yeniActi ? `<b>${esc(benAd)}</b> adıyla kadroya yeni eklendin.
          Bundan sonra bu ad senin sicilin olacak.`
      : masada ? `Kadrodaki <b>${esc(benAd)}</b> kaydına bağlandın; bu masada oturuyorsun.`
      : `Kadrodaki <b>${esc(benAd)}</b> kaydına bağlandın.
          Bu masada oturmuyorsun — tabelayı oynayanlar adına yazıyorsun.`}</div>
  </div>
  ${tabela}
  <div class="card tight xs dim center">Yazdığın her sayı anında masaya gidiyor.
    Bu link yalnız bu maça açılır; maç kapanınca ölür.<br>
    <b style="text-decoration:underline;cursor:pointer" onclick="misafirBirak()">Masadan kalk</b></div>`;
}

/* ---------- misafirin yazması ---------- */
function misafirKaydet() {
  _bekleyenYazi = true; yazIsigi();
  clearTimeout(_misafirZaman);
  _misafirZaman = setTimeout(misafirYaz, 500);
}
async function misafirYaz() {
  const c = DB.aktif; if (!c || !MISAFIR) return;
  aynaYaz(c);
  try {
    const { data, error } = await sb.rpc('misafir_celse_yaz', {
      p_kod: MISAFIR.kod, p_celse: aktifBelge(c), p_beklenen_el: MISAFIR.elBeklenen
    });
    if (error) throw error;
    MISAFIR.elBeklenen = data.mac.el_sayisi;
    aynaSil(c.id);
    _bekleyenYazi = false; yazIsigi();
    yazSeridi('ok', `✓ ${saatKisa(Date.now())} · masaya yazıldı`);
  } catch (e) {
    const m = hataMetni(e);
    _bekleyenYazi = false; yazIsigi();
    if (/CAKISMA/i.test(m)) {
      yazSeridi('hata', '⚠️ <b>Bu arada masaya başka biri yazdı</b><br>'
        + '<span style="opacity:.85">Ekran güncellendi; kendi elini tekrar yaz.</span>');
      return misafirTazele(true);
    }
    if (/yetkin yok|kapat/i.test(m)) {
      yazSeridi('hata', '⚠️ <b>Misafir yazma kapatıldı</b><br><span style="opacity:.85">Tabelacı linki iptal etti.</span>');
      return misafirTazele(true);
    }
    yazSeridi('hata', `⚠️ <b>Yazılamadı</b> — ${esc(m)}<br>`
      + '<b style="text-decoration:underline;cursor:pointer" onclick="misafirYaz()">şimdi dene</b>');
  }
}

/* ---------- tazeleme ---------- */
async function misafirTazele(gorunur) {
  if (!MISAFIR) return;
  if (_bekleyenYazi) return;                 // kendi yazımız beklerken ezme
  try {
    const { data, error } = await sb.rpc('misafir_mac', { p_kod: MISAFIR.kod });
    if (error) throw error;
    misafirPencereKur(data);
    render();
    if (gorunur) toast('Tabela güncellendi');
  } catch (e) {
    if (gorunur) toast(hataMetni(e), true);
  }
}
function misafirNabizKur() {
  clearInterval(_misafirNabiz);
  /* Misafirde canlı yayın (realtime) yok — RLS kapalı olduğu için
     abone olamıyor. Beş saniyede bir soruyor; kâğıt oyunu için yeter. */
  _misafirNabiz = setInterval(() => {
    if (!document.hidden) misafirTazele(false);
  }, 5000);
}

/* =========================================================
   TABELACI TARAFI — linki üret, paylaş, kapat
   ========================================================= */
function misafirPaylasAc() {
  const c = DB.aktif; if (!c) return;
  if (!tabelaciMiyim()) return toast('Linki tabelayı tutan üretir', true);
  acModal(`<h2 class="serif" style="margin:0 0 4px">WhatsApp'tan Sonuç Girme</h2>
    <div class="xs dim" style="margin-bottom:13px">Bu masaya özel bir link üretilir. Linke tıklayan
      <b>adını yazıp</b> tabelaya sonuç girebilir; hesap açması gerekmez.</div>

    <div class="uyari" style="margin-bottom:13px">
      <b>Bilmen gereken:</b> link WhatsApp'ta iletilebilir. Linki gören herkes,
      masa açık olduğu sürece tabelaya yazabilir. Göremediği şeyler: grubun arşivi,
      öteki masalar, sohbet, borçlar, tahminler. Maçı bitiremez, zabıt üretemez,
      tabelacıyı değiştiremez. İstediğin an kapatırsın.
    </div>

    <div id="msKutu"><button class="btn-p btn-full" id="msUretBtn" onclick="misafirLinkUret()">
      🔗 Link Üret</button></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}

async function misafirLinkUret() {
  const c = DB.aktif; if (!c) return;
  const btn = $('#msUretBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="yukleniyor"></span>'; }
  try {
    const { data, error } = await sb.rpc('misafir_kod_uret', { p_mac: c.id });
    if (error) throw error;
    c._misafirKod = data;
    misafirKutuCiz(data);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Link Üret'; }
    const m = hataMetni(e);
    if (/function|does not exist|schema/i.test(m))
      return toast('Yama 09 çalıştırılmamış — Supabase SQL Editor\'de supabase_yama_09.sql', true);
    toast(m, true);
  }
}

function misafirLinki(kod) {
  return `${location.origin}${location.pathname}?misafir=${encodeURIComponent(kod)}`;
}
function misafirMesaji(kod) {
  const c = DB.aktif, o = macOzet(c);
  return `${c.oyun === 'batak' ? '🂡 BATAK' : '🀄 101'} · ${c.masaAd || 'Masa'}`
    + `${c.yer ? ` · ${c.yer}` : ''}\n${o.kim}\n\n`
    + `Sonuçları buradan yazabilirsin (ad yazman yeterli, hesap gerekmez):\n${misafirLinki(kod)}`;
}
function misafirKutuCiz(kod) {
  const k = $('#msKutu'); if (!k) return;
  const link = misafirLinki(kod);
  k.innerHTML = `
    <div class="card tight" style="background:var(--panel2);margin:0 0 11px">
      <div class="xs dim">Masanın misafir linki</div>
      <div class="sm" style="word-break:break-all;margin-top:5px;font-family:ui-monospace,monospace">${esc(link)}</div>
    </div>
    <button class="btn-g btn-full" onclick="misafirWp('${esc(kod)}')">📱 WhatsApp'ta Paylaş</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="kopyala(misafirLinki('${esc(kod)}'))">📋 Linki Kopyala</button>
    <button class="btn-dn btn-full btn-sm" style="margin-top:8px" onclick="misafirKapat()">🚫 Misafir Yazmayı Kapat</button>
    <div class="xs dim" style="margin-top:8px">Kapatınca bu link ölür ve masaya oturan misafirler düşer.
      Maç bitince de kendiliğinden kapanır.</div>`;
}
function misafirWp(kod) {
  window.open('https://wa.me/?text=' + encodeURIComponent(misafirMesaji(kod)), '_blank');
}
async function misafirKapat() {
  const c = DB.aktif; if (!c) return;
  if (!confirm('Misafir linki iptal edilecek; o linkle yazanlar düşecek. Emin misin?')) return;
  try {
    const { error } = await sb.rpc('misafir_kod_kapat', { p_mac: c.id });
    if (error) throw error;
    delete c._misafirKod;
    kapatModal(); toast('Misafir yazma kapatıldı', true);
  } catch (e) { toast(hataMetni(e), true); }
}
