//== dayanikli
/* =========================================================
   YAZMANIN DAYANIKLILIĞI

   Soru (kullanıcı, 02.09.2026): "Bir saat sürecek bir parti; en son
   'kaydet' dediğimde ne olur, zaman aşımına uğrar mı? Yoksa el girdikçe
   mi kaydetsin?"

   Cevap: el girdikçe kaydediyor, "en son kaydet" diye bir şey yok.
   Her hücre değişiminde kaydet() çağrılıyor, 450 ms bekleyip maçı
   buluta yazıyor. Oturum anahtarı da kendini yeniliyor
   (autoRefreshToken), yani bir saat de sürse üç saat de sürse
   zaman aşımı olmuyor.

   ASIL RİSK BAŞKAYDI: yazma BAŞARISIZ olursa eskiden ekranda iki
   saniyelik bir uyarı çıkıyor, sonra hiçbir şey olmuyordu. Parkverde'de
   internet bir dakika giderse o eller yalnız tarayıcının belleğinde
   kalıyor; sekme kapanınca gidiyordu. Bu dosya onu kapatıyor:

     1) YEREL AYNA — her yazma denemesinden ÖNCE tabela localStorage'a
        kopyalanıyor. Sekme kapansa, telefon kilitlense, uygulama
        çökse bile duruyor.
     2) BIKMAYAN YENİDEN DENEME — yazma başarısızsa 2·5·10·20·30 sn
        aralıklarla, bağlantı gelene kadar deniyor. Ayrıca internet
        geri geldiğinde (online olayı) hemen deniyor.
     3) GÖRÜNÜR UYARI — geçici bildirim yerine ekranın altında duran
        kırmızı şerit: "N eldir buluta yazılamıyor". Yazılınca yeşile
        dönüp "hh:mm'de kaydedildi" diyor.
     4) SEKME KAPATMA KORUMASI — yazılmamış el varsa tarayıcı "çıkmak
        istediğine emin misin?" diye soruyor.
     5) AÇILIŞTA KURTARMA — bir maçı açarken yerel aynada buluttakinden
        FAZLA el varsa (yani kaydedilemeyen eller varsa) uyarıyor ve
        tek dokunuşla buluta yazıyor.
   ========================================================= */

const AYNA_ON = 'kkd_celse_';
const YENIDEN = [2000, 5000, 10000, 20000, 30000];   // sn: 2, 5, 10, 20, 30…

let _yazHata = 0;          // üst üste kaçıncı başarısızlık
let _yazTimer = null;      // yeniden deneme zamanlayıcısı
let _sonYazma = null;      // son başarılı yazmanın saati
let _aynaBekleyen = 0;     // aynada duran ama yazılamamış el sayısı

const elSay = c => (c?.partiler || []).reduce((t, p) => t + ((p.eller || []).length), 0);

/* ---------------- yerel ayna ---------------- */
function aynaYaz(c) {
  if (!c?.id) return;
  try {
    localStorage.setItem(AYNA_ON + c.id, JSON.stringify({
      celse: aktifBelge(c), el: elSay(c), zaman: Date.now(), grupId: c.grupId
    }));
  } catch (e) { /* kota dolduysa yapacak bir şey yok, bulut zaten asıl yer */ }
}
function aynaOku(id) {
  try { return JSON.parse(localStorage.getItem(AYNA_ON + id) || 'null'); }
  catch (e) { return null; }
}
function aynaSil(id) {
  try { localStorage.removeItem(AYNA_ON + id); } catch (e) {}
}
/* Kapanmış maçların aynaları birikmesin */
function aynaTemizle() {
  try {
    const acikIdler = (DB.acik || []).map(c => c.id);
    Object.keys(localStorage).filter(k => k.startsWith(AYNA_ON)).forEach(k => {
      if (!acikIdler.includes(k.slice(AYNA_ON.length))) localStorage.removeItem(k);
    });
  } catch (e) {}
}

/* ---------------- görünür şerit ---------------- */
function yazSeridi(durum, metin) {
  let n = document.getElementById('yazSerit');
  if (!durum) { if (n) n.remove(); return; }
  if (!n) {
    n = document.createElement('div');
    n.id = 'yazSerit';
    n.style.cssText = 'position:fixed;left:10px;right:10px;bottom:calc(var(--tab-h,62px) + 10px);'
      + 'z-index:60;border-radius:12px;padding:9px 12px;font-size:12.5px;line-height:1.45;'
      + 'text-align:center;border:1px solid;backdrop-filter:blur(6px)';
    document.body.appendChild(n);
  }
  const renk = durum === 'hata'
    ? { a: 'rgba(120,42,42,.92)', b: '#E8B4B4', c: '#8C3A3A' }
    : { a: 'rgba(30,58,38,.92)', b: '#9BD0AA', c: '#2E5A3A' };
  n.style.background = renk.a; n.style.color = renk.b; n.style.borderColor = renk.c;
  n.innerHTML = metin;
  if (durum === 'ok') { clearTimeout(n._z); n._z = setTimeout(() => n.remove(), 2600); }
}

const saatKisa = t => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* ---------------- yazma ---------------- */
/* kaydet() bunu çağırıyor: ayna + gecikmeli bulut yazması */
function celseKaydet() {
  const c = DB.aktif;
  if (!c) return;
  aynaYaz(c);
  _bekleyenYazi = true; yazIsigi();
  clearTimeout(_yazZaman);
  _yazZaman = setTimeout(celseYaz, 450);
}

function celseYaz() {
  const c = DB.aktif;
  if (!c || !tabelaciMiyim()) { _bekleyenYazi = false; yazIsigi(); return _yazSira; }
  clearTimeout(_yazTimer);

  _yazSira = _yazSira.then(async () => {
    const { error } = await sb.from('maclar').update({
      celse: aktifBelge(c), tarih: c.tarih || bugun(),
      parti_hedef: Math.min(5, Math.max(1, c.partiHedef || 1)),
      giris: c.giris, yer: c.yer || null
    }).eq('id', c.id);
    if (error) throw error;
  }).then(() => {
    _yazHata = 0; _aynaBekleyen = 0; _sonYazma = Date.now();
    aynaSil(c.id);
    _bekleyenYazi = false; yazIsigi();
    yazSeridi('ok', `✓ ${saatKisa(_sonYazma)} · tabela buluta yazıldı`);
  }).catch(e => {
    /* Yazılamadı: ayna duruyor, bıkmadan yeniden dene */
    _yazHata++;
    _aynaBekleyen = elSay(c);
    _bekleyenYazi = true; yazIsigi();
    const bekle = YENIDEN[Math.min(_yazHata - 1, YENIDEN.length - 1)];
    yazSeridi('hata',
      `⚠️ <b>Buluta yazılamıyor</b> — ${_aynaBekleyen} el bu cihazda bekliyor.<br>`
      + `<span style="opacity:.85">${Math.round(bekle / 1000)} sn sonra yine denenecek. `
      + `Sayfayı kapatmazsan hiçbir şey kaybolmaz.</span> `
      + `<b style="text-decoration:underline;cursor:pointer" onclick="celseYaz()">şimdi dene</b>`);
    clearTimeout(_yazTimer);
    _yazTimer = setTimeout(celseYaz, bekle);
    if (_yazHata === 1) toast('Bulut yazılamadı — cihazda saklandı, denemeye devam ediyor', true);
  });
  return _yazSira;
}

/* İnternet geri geldiğinde beklemeden dene */
addEventListener('online', () => { if (_yazHata) celseYaz(); });
/* Uygulamaya dönünce de dene (mobilde sekme uykuya yatıyor) */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && _yazHata) celseYaz();
});

/* Yazılmamış el varken sekmeyi kapatmaya kalkarsa uyar */
addEventListener('beforeunload', e => {
  if (_yazHata && _aynaBekleyen) { e.preventDefault(); e.returnValue = ''; return ''; }
});

/* ---------------- açılışta kurtarma ---------------- */
/* Bir maçı açarken aynada buluttakinden fazla el varsa kaydedilemeyen
   eller var demektir. Sessizce üzerine yazmak yanlış olur (belki başka
   biri devam etti); kullanıcıya sorup öyle yazıyoruz. */
function kurtarmaKontrol(c) {
  if (!c || c._hesap !== OTURUM?.id) return '';
  const a = aynaOku(c.id);
  if (!a || a.el <= elSay(c)) return '';
  return `<div class="card" style="border-color:#8C3A3A;background:var(--panel2)">
    <div class="row" style="gap:10px;align-items:flex-start">
      <div style="font-size:22px;flex-shrink:0">⚠️</div>
      <div class="grow" style="min-width:0">
        <div class="serif" style="font-size:16px;color:#E8B4B4">Kaydedilemeyen eller var</div>
        <div class="xs dim" style="margin-top:4px">Bu cihazda <b>${a.el} el</b> duruyor,
          bulutta <b>${elSay(c)} el</b> var. Muhtemelen internet kesilmişti.
          ${a.zaman ? `Cihazdaki kayıt ${saatKisa(a.zaman)} tarihli.` : ''}</div>
      </div>
    </div>
    <button class="btn-g btn-full" style="margin-top:11px" onclick="kurtarmaYaz('${c.id}')">
      ⬆️ Cihazdakini buluta yaz (${a.el} el)</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:7px" onclick="kurtarmaAt('${c.id}')">
      Cihazdakini at, buluttaki geçerli olsun</button>
  </div>`;
}
async function kurtarmaYaz(id) {
  const c = DB.acik.find(x => x.id === id); if (!c) return;
  const a = aynaOku(id); if (!a?.celse) return toast('Cihazdaki kayıt okunamadı', true);
  Object.assign(c, a.celse);
  if (DB.aktif?.id === id) DB.aktif = c;
  await celseYaz();
  render(); toast(`${a.el} el buluta yazıldı`, true);
}
function kurtarmaAt(id) {
  if (!confirm('Cihazdaki eller silinecek, buluttaki tabela geçerli olacak. Emin misin?')) return;
  aynaSil(id); render(); toast('Cihazdaki kopya atıldı');
}
