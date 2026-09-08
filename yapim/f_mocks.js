//== mocks
/* =========================================================
   THE MOCKS — kafe menüsü + masa hesabı

   İstek (kullanıcı, 03.09.2026): "Parkverde'de bu kafede oynuyoruz.
   The Mocks'un güncel tüm ürünleri açılsın, seçtiklerinin hesabı
   çıksın. Sipariş GÖNDERME, sistemi zorlama."

   NE YAPIYOR
     · The Mocks'un canlı menüsünü çekip gösteriyor (229 ürün, güncel
       fiyat). Kaynak, kafenin kendi genel menü ucu:
         menuluxmenuapi…/MobileAPI/GetMenu?weburl=themocks.qr.menulux.com
       Anahtar gerekmiyor, CORS açık — kimseyi zorlamıyor, yalnız
       herkese açık menüyü okuyor.
     · Seçtiğin ürünleri "Masa Hesabı"na ekliyor, toplamı kafe
       fiyatıyla çıkarıyor. Hesap bu cihazda (localStorage) tutuluyor;
       borç/ısmarlama defteriyle karışmıyor.

   NE YAPMIYOR — bilerek
     · Sipariş GÖNDERMİYOR. Kafenin sipariş ucuna (OnlineOrderAPI/Post)
       hiç dokunmuyoruz; o gerçek mutfağa iş açar. İsteyen "Menüde Aç"
       ile kafenin kendi sipariş akışına gider.
     · Kafenin masa hesabını / adisyonunu OKUMUYOR. O işletme verisi;
       biz kendi tarafımızda tuttuğumuz seçimleri topluyoruz.
     · Menüyü DEĞİŞTİRMİYOR. Salt okuma.
   ========================================================= */

const MOCKS_URL = 'https://menuluxmenuapi.azurewebsites.net/api/MobileAPI/GetMenu'
  + '?weburl=themocks.qr.menulux.com&language=TR';
const MOCKS_MUSTERI = 17139;
const MOCKS_MASA_ON = 'kkd_mocks_masa';
const MOCKS_ADRES_ON = 'kkd_mocks_adresler';
function mocksAdresler(){ try{ return JSON.parse(localStorage.getItem(MOCKS_ADRES_ON)||'[]'); }catch(e){ return []; } }
function mocksAdresYaz(l){ try{ localStorage.setItem(MOCKS_ADRES_ON,JSON.stringify(l)); }catch(e){} }
/* VARSAYILAN YOK (07.09.2026). Eskiden '241' gömülüydü; o numara
   "DAİRE 25 SADIK ALMALI" çıkıyor — yani sipariş/garson çağrısı yanlış
   yere, hatta başkasının dairesine gidebilir. Numara seçilmeden sipariş
   düğmeleri açılmıyor. Doğru numarayı masadaki QR söylüyor; "Sipariş
   Adresi" ekranında numarayı yazınca kafenin kendi ucundan ADI teyit
   ediliyor (ör. 1000 → "SALON 21"). */
function mocksMasaNo(){ try{ return localStorage.getItem(MOCKS_MASA_ON)||''; }catch(e){ return ''; } }
const mocksMasaVarMi = ()=>!!String(mocksMasaNo()||'').trim();
function mocksMasaAdiOku(){ try{ return localStorage.getItem(MOCKS_MASA_ON+'_ad')||''; }catch(e){ return ''; } }
function mocksAdresSec(no,ad){ try{ localStorage.setItem(MOCKS_MASA_ON,String(no)); localStorage.setItem(MOCKS_MASA_ON+'_ad',ad||''); }catch(e){} }
const mocksMenuUrl = ()=>'https://themocks.qr.menulux.com/'
  + (mocksMasaVarMi()?'?tableno='+encodeURIComponent(mocksMasaNo()):'') + '#!/';
/* Tek ürüne doğrudan git — kafenin kendi sipariş akışı, ürün açık gelir.
   Yol onların yönlendirme tablosunda var: app.product → /product/:productId */
const mocksUrunUrl = id=>'https://themocks.qr.menulux.com/'
  + (mocksMasaVarMi()?'?tableno='+encodeURIComponent(mocksMasaNo()):'')
  + '#!/product/'+encodeURIComponent(id);
const MOCKS_ONBELLEK = 'kkd_mocks_menu';
const MOCKS_HESAP_ON = 'kkd_mocks_hesap';

let MOCKS = null;            // {para, kdv, gruplar:[{ad, urunler:[{id,ad,fiyat,foto}]}]}
let MOCKS_GRUP = 0;         // seçili kategori
let MOCKS_HESAP = [];   // cihaz kovası KALDIRILDI (kullanıcı, 07.09.2026)
/* Kafe hesabı YALNIZCA açık maça (celse.kafe) yazılır: tabelayı tutan
   ekler, buluta gider, herkes görür, zabıta işler. Ayrı cihaz listesi yok;
   açık maç yoksa yalnız menü gezilir, ekleme kapalıdır. */
function mocksMacAktif(){ return !!(DB.aktif && !DB.aktif.bitti && DB.aktif._hesap===OTURUM?.id); }
function mocksHesapRef(){
  if(mocksMacAktif()){ if(!Array.isArray(DB.aktif.kafe)) DB.aktif.kafe=[]; return DB.aktif.kafe; }
  return [];
}
function mocksHesapKaydet(){ if(mocksMacAktif() && typeof kaydet==='function') kaydet(); }
/* İki açıcı da aynı: hesap açık maça yazılır. */
function mocksMacAc(){ mocksAc(); }
function mocksGenelAc(){ mocksAc(); }

/* SIK SİPARİŞ — SABİT LİSTE (kullanıcı, 07.09.2026: "hep orası değişiyor").
   Eskiden anahtar kelime + otomatik sayaçla puanlanıyordu; her seferinde
   sıra değişiyordu. Artık liste SABİT ve elle düzenlenir: ürünün yanındaki
   ⭐ ile ekle/çıkar, sıra bozulmaz.

   Varsayılanlar kullanıcının saydıkları (07.09.2026), ürün no'ları The
   Mocks menüsünden teyit edildi. "Büyük çay" o adla menüde YOK; karşılığı
   Fincan Çay (50 ₺) — kullanıcı 07.09.2026'da teyit etti.
   Kafe ürünü yeniden oluşturursa no değişir; o yüzden ADLA da eşleşiyor. */
const MOCKS_FAV_ON  = 'kkd_mocks_fav';
const MOCKS_SABIT_ON = 'kkd_mocks_sabit';
const MOCKS_SABIT_VARSAYILAN = [
  {id:3744493, ad:'Çay'},
  {id:3744494, ad:'Fincan Çay'},
  {id:3801924, ad:'Oralet'},
  {id:3744475, ad:'Su'},
  {id:3777860, ad:'Karışık Kuruyemiş'},
  {id:3783126, ad:'Tuzlu Fıstık'},
  {id:3745045, ad:'Çilekli Magnolia'},
  {id:3810095, ad:'Oreolu Magnolia'}
];
function mocksSabitOku(){
  try{ const l=JSON.parse(localStorage.getItem(MOCKS_SABIT_ON)||'null');
    return Array.isArray(l)?l:MOCKS_SABIT_VARSAYILAN.slice(); }
  catch(e){ return MOCKS_SABIT_VARSAYILAN.slice(); }
}
function mocksSabitYaz(l){ try{ localStorage.setItem(MOCKS_SABIT_ON,JSON.stringify(l)); }catch(e){} }
function mocksSabitMi(id){ return mocksSabitOku().some(x=>Number(x.id)===Number(id)); }
function mocksSabitCevir(id){
  const l=mocksSabitOku(), i=l.findIndex(x=>Number(x.id)===Number(id));
  if(i>=0){ l.splice(i,1); mocksSabitYaz(l); toast('Sık siparişten çıkarıldı'); }
  else{
    const u=(MOCKS?MOCKS.gruplar.flatMap(g=>g.urunler):[]).find(x=>Number(x.id)===Number(id));
    if(!u) return;
    l.push({id:Number(id),ad:u.ad}); mocksSabitYaz(l); toast('⭐ '+u.ad+' sık siparişe eklendi');
  }
  mocksCiz();
}
function mocksSabitSifirla(){
  mocksSabitYaz(MOCKS_SABIT_VARSAYILAN.slice());
  toast('Sık sipariş varsayılana döndü'); mocksCiz();
}
let MOCKS_SAYAC = (()=>{ try{ return JSON.parse(localStorage.getItem(MOCKS_FAV_ON)||'{}'); }catch(e){ return {}; } })();
function mocksSayacYaz(){ try{ localStorage.setItem(MOCKS_FAV_ON,JSON.stringify(MOCKS_SAYAC)); }catch(e){} }

/* ---------------- menü çekme ---------------- */
function mocksHesapOku() {
  try { return JSON.parse(localStorage.getItem(MOCKS_HESAP_ON) || '[]'); }
  catch (e) { return []; }
}
function mocksHesapYaz() {
  try { localStorage.setItem(MOCKS_HESAP_ON, JSON.stringify(MOCKS_HESAP)); } catch (e) {}
}

function mocksAyristir(j) {
  const para = j.Currency || '₺', kdv = j.Tax || 0;
  const gruplar = (j.MenuGroup || [])
    .map(g => ({
      ad: g.Title,
      urunler: (g.Products || [])
        .filter(p => p.Status !== -1 && !p.Deleted)
        .map(p => ({
          id: p.ProductID,
          ad: p.Name || p.ProductName || '?',
          fiyat: Number(p.Price) || 0,
          desc: p.Description || '',
          foto: p.ImageUrl || ''
        }))
    }))
    .filter(g => g.urunler.length);
  return { para, kdv, gruplar, guncelleme: Date.now() };
}

async function mocksMenuGetir(zorla) {
  /* Önce önbellek (anında açılsın), sonra ağdan tazele. */
  if (!zorla) {
    try {
      const c = JSON.parse(localStorage.getItem(MOCKS_ONBELLEK) || 'null');
      if (c && c.gruplar) MOCKS = c;
    } catch (e) {}
  }
  try {
    const r = await fetch(MOCKS_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    MOCKS = mocksAyristir(await r.json());
    try { localStorage.setItem(MOCKS_ONBELLEK, JSON.stringify(MOCKS)); } catch (e) {}
    return true;
  } catch (e) {
    return !!MOCKS;      // ağ yoksa önbellekle idare et
  }
}

/* ---------------- hesap ---------------- */
const mocksTL = n => (Math.round(n) === n ? n : n.toFixed(2)) + ' ₺';
const mocksToplam = () => mocksHesapRef().reduce((t, x) => t + x.fiyat * x.adet, 0);
const mocksAdet = () => mocksHesapRef().reduce((t, x) => t + x.adet, 0);

/* Ürünü id ile menüden bul — adı/fiyatı onclick'e gömmeyiz (tırnak kırıyordu). */
function mocksUrunBul(id){
  if(!MOCKS) return null;
  for(const g of MOCKS.gruplar){ const u=(g.urunler||[]).find(x=>String(x.id)===String(id)); if(u) return u; }
  return null;
}
function mocksEkle(id) {
  if(!mocksMacAktif()) return toast('Kafe hesabı açık maça yazılır — önce maçı aç (tabelayı sen tut)',true);
  const u = mocksUrunBul(id);
  const ad = u ? u.ad : 'Ürün', fiyat = u ? Number(u.fiyat)||0 : 0;
  const h = mocksHesapRef();
  const v = h.find(x => String(x.id) === String(id));
  if (v) v.adet++;
  else h.push({ id, ad, fiyat, adet: 1 });
  MOCKS_SAYAC[id]=(MOCKS_SAYAC[id]||0)+1; mocksSayacYaz();
  mocksHesapKaydet(); mocksCiz();
  toast(`${ad} eklendi`);
}
function mocksArtir(id, d) {
  const h = mocksHesapRef();
  const v = h.find(x => x.id === id); if (!v) return;
  v.adet += d;
  if (v.adet <= 0) { const i=h.indexOf(v); if(i>=0) h.splice(i,1); }
  mocksHesapKaydet(); mocksCiz();
}
function mocksTemizle() {
  const h = mocksHesapRef();
  if (!h.length) return;
  if (!confirm('Bu maçın kafe hesabı sıfırlansın mı?')) return;
  h.length = 0;
  mocksHesapKaydet(); mocksCiz();
}

/* Sık sipariş: adı MOCKS_SIK'te geçenler + en çok eklenenler.
   Menüdeki gerçek ürünlerle eşleştirilir; olmayan atlanır. */
/* Sabit listeyi menüdeki güncel ürüne bağlar. ÖNCE no ile, bulunamazsa
   ADLA eşleşir (kafe ürünü silip yeniden açarsa no değişiyor).
   Sıra listedeki sıradır — kendiliğinden değişmez. */
function mocksSikUrunler(){
  if(!MOCKS) return [];
  const hepsi=MOCKS.gruplar.flatMap(g=>g.urunler.map(u=>({...u,grup:g.ad})));
  const nrm=t=>String(t||'').toLocaleLowerCase('tr-TR').trim();
  const out=[];
  mocksSabitOku().forEach(sb2=>{
    let u=hepsi.find(x=>Number(x.id)===Number(sb2.id));
    if(!u && sb2.ad) u=hepsi.find(x=>nrm(x.ad)===nrm(sb2.ad));
    if(u && !out.some(o=>o.id===u.id)) out.push(u);
  });
  return out;
}

/* ---------------- ekran ---------------- */
function mocksAc() {
  acModal(`<div id="mkGovde"><div class="empty"><span class="yukleniyor"></span>
    <div class="sm dim" style="margin-top:10px">The Mocks menüsü yükleniyor…</div></div></div>`);
  mocksMenuGetir().then(ok => {
    if (!ok) { const g = $('#mkGovde'); if (g) g.innerHTML = mocksHata(); return; }
    MOCKS_GRUP = Math.min(MOCKS_GRUP, MOCKS.gruplar.length - 1);
    mocksCiz();
  });
}
function mocksHata() {
  return `<h2 class="serif" style="margin:0 0 4px">The Mocks</h2>
    <div class="uyari" style="margin:10px 0">Menü şu an alınamadı — internet gidip gelmiş olabilir.
      Birazdan yine dene.</div>
    <button class="btn-gh btn-full btn-sm" onclick="mocksAc()">Yeniden dene</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`;
}

function mocksCiz() {
  const g = $('#mkGovde'); if (!g || !MOCKS) return;
  const grup = MOCKS.gruplar[MOCKS_GRUP] || MOCKS.gruplar[0];
  const hesap = mocksHesapRef();
  const top = mocksToplam();
  const macModu = mocksMacAktif();

  g.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h2 class="serif" style="margin:0">The Mocks</h2>
        <div class="xs dim">Kitchen &amp; Mocktail Bar · canlı menü · KDV dahil</div></div>
      <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="mocksAc()">↻ Tazele</button>
    </div>
    <div class="card tight" style="margin:10px 0;background:var(--panel2)">
      <div class="row" style="justify-content:space-between;gap:8px">
        <div class="grow" style="min-width:0">
          <div class="xs dim">Sipariş adresi</div>
          <div class="sm ell" style="font-weight:700;${mocksMasaVarMi()?'':'color:#DD8A8A'}">${
            mocksMasaVarMi()
              ? esc(mocksMasaAdiOku()||('Masa/Daire '+mocksMasaNo()))
              : 'seçilmedi — sipariş için gerekli'}</div></div>
        <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="mocksMasaAc()">Değiştir</button>
      </div>
    </div>

    ${macModu?`<div class="uyari" style="margin:0 0 10px">Bu hesap <b>açık maça</b> yazılıyor:
      herkes görür, zabıta işler.</div>`
      :`<div class="uyari" style="margin:0 0 10px">Şu an <b>açık maç yok</b> (ya da tabelayı sen tutmuyorsun).
      Menüyü gezebilir, fiyatlara bakabilirsin; hesap tutmak için maçı açık tut.</div>`}
    ${hesap.length ? `<div class="card tight" style="margin:12px 0;border-color:var(--gold)">
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <span class="sm" style="font-weight:700">🧾 ${macModu?'Bu Masanın Hesabı':'Masa Hesabı'}</span>
        <span class="serif" style="font-size:20px;color:var(--gold)">${mocksTL(top)}</span></div>
      ${hesap.map(x => `<div class="row" style="justify-content:space-between;padding:4px 0;gap:8px">
        <div class="grow sm ell">${esc(x.ad)} <span class="xs dim">${x.fiyat ? mocksTL(x.fiyat) : ''}</span></div>
        <div class="row" style="gap:6px;flex-shrink:0;align-items:center">
          <button class="btn-xs btn-gh" onclick="mocksArtir(${x.id},-1)">−</button>
          <span class="sm" style="min-width:20px;text-align:center;font-weight:700">${x.adet}</span>
          <button class="btn-xs btn-gh" onclick="mocksArtir(${x.id},1)">+</button>
          <span class="sm" style="min-width:56px;text-align:right;font-weight:600">${mocksTL(x.fiyat * x.adet)}</span>
        </div></div>`).join('')}
      <button class="btn-p btn-full btn-sm" style="margin-top:9px" onclick="mocksSiparisAc()">📲 Siparişi WhatsApp'a Hazırla</button>
      <div class="two" style="margin-top:7px">
        <button class="btn-b btn-sm" onclick="mocksHesapPaylas()">📋 Hesabı Kopyala</button>
        <button class="btn-gh btn-sm" onclick="mocksTemizle()">Sıfırla</button>
      </div>
    </div>` : `<div class="xs dim" style="margin:12px 0">Aşağıdan seç; hesap burada birikir.
      Sipariş gitmez, yalnız ne içtiğinizin tutarını tutar.</div>`}

    ${(()=>{ const sik=mocksSikUrunler(); return sik.length?`
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="xs dim" style="font-weight:700">⭐ SIK SİPARİŞ</span>
        <button class="btn-xs btn-gh" style="padding:3px 7px" onclick="mocksSabitSifirla()">varsayılana dön</button>
      </div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">
        ${sik.map(u=>`<button class="btn-sm btn-gh" style="padding:7px 11px"
          onclick="mocksEkle(${u.id})">
          ${esc(u.ad)} ${u.fiyat?`<span class="xs dim">${mocksTL(u.fiyat)}</span>`:''}</button>`).join('')}
      </div>`:''; })()}

    <div class="row wrap" style="gap:5px;margin-bottom:10px">
      ${MOCKS.gruplar.map((x, i) => `<span class="chip ${i === MOCKS_GRUP ? 'on' : ''}"
        onclick="MOCKS_GRUP=${i};mocksCiz()">${esc(x.ad)}</span>`).join('')}
    </div>

    <div class="stack">
      ${grup.urunler.map(u => `<div class="row" style="gap:9px;padding:6px 0;align-items:center">
        <div class="grow" style="min-width:0">
          <div class="sm" style="font-weight:600" >${esc(u.ad)}</div>
          ${u.desc ? `<div class="xs dim ell">${esc(u.desc)}</div>` : ''}</div>
        <div class="sm" style="font-weight:700;flex-shrink:0;min-width:52px;text-align:right">
          ${u.fiyat ? mocksTL(u.fiyat) : '<span class="xs dim">—</span>'}</div>
        <button class="btn-xs btn-gh" style="flex-shrink:0;padding:4px 7px"
          title="sık siparişe ekle/çıkar" onclick="mocksSabitCevir(${u.id})">${mocksSabitMi(u.id)?'⭐':'☆'}</button>
        <button class="btn-xs btn-g" style="flex-shrink:0"
          onclick="mocksEkle(${u.id})">+ Ekle</button>
      </div>`).join('<div style="height:1px;background:var(--line)"></div>')}
    </div>

    <a class="btn-gh btn-full btn-sm" style="margin-top:12px;display:block;text-align:center;text-decoration:none"
      href="${mocksMenuUrl()}" target="_blank" rel="noopener">🔗 Kafenin QR Menüsünü Aç (${esc(mocksMasaAdiOku()||('no '+mocksMasaNo()))})</a>
    <div class="xs dim center" style="margin-top:7px">Menü The Mocks'tan canlı çekilir; fiyatlar oradan gelir.
      Sipariş vermek için yukarıdaki bağlantı.</div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="kapatModal()">Kapat</button>`;
}

function mocksHesapPaylas() {
  const h = mocksHesapRef();
  if (!h.length) return;
  const L = ['🧾 THE MOCKS — Masa Hesabı', ''];
  h.forEach(x => L.push(`${x.adet}× ${x.ad}  ${mocksTL(x.fiyat * x.adet)}`));
  L.push('');
  L.push(`TOPLAM: ${mocksTL(mocksToplam())} (KDV dahil)`);
  kopyala(L.join('\n'));
}


/* =========================================================
   SİPARİŞİ WHATSAPP'A HAZIRLA

   NEDEN DOĞRUDAN SİPARİŞ GEÇMİYORUZ: Menulux'ün sipariş ucu
   (OnlineOrderAPI/Post) kafenin kendi web istemcisi için; belgelenmiş
   bir arayüz değil. Oraya kendi başımıza istek atmak (a) gerçek
   mutfağa iş açar — yanlış giden bir kayıt kimsenin iptal etmediği
   sipariş olur, (b) bizim sistemimiz değil, izinsiz kullanım olur.
   Menüyü OKUMAK herkese açık; SİPARİŞ YAZMAK değil.

   (İşletmeci Tuğrul masadan arkadaş; mesele onunla bir sorun DEĞİL —
   mesele Menulux'ün ucunu izinsiz kullanmak ve mutfağa gerçek iş açmak.)

   YAPILAN: siparişi metne çeviriyoruz, WhatsApp'ı açıyoruz, GÖNDEREN
   İNSAN oluyor. Kafe tarafında hiçbir şeyi zorlamıyoruz, sipariş
   normal yolla — bir insanın mesajıyla — gidiyor. Numara bir kez
   kaydedilir, cihazda durur.
   Resmî ikinci yol da yerinde: "QR Menüsünü Aç" kafenin kendi
   sipariş akışına masa numarasıyla gidiyor.
   ========================================================= */
const MOCKS_TEL_ON='kkd_mocks_tel';
function mocksTelOku(){ try{ return localStorage.getItem(MOCKS_TEL_ON)||''; }catch(e){ return ''; } }
function mocksTelYaz(t){ try{ localStorage.setItem(MOCKS_TEL_ON,String(t||'')); }catch(e){} }
/* wa.me sadece rakam ister: 90XXXXXXXXXX */
function mocksTelDuzelt(t){
  let d=String(t||'').replace(/[^0-9]/g,'');
  if(d.startsWith('00')) d=d.slice(2);
  if(d.length===10) d='90'+d;                 // 5XX...
  if(d.length===11 && d.startsWith('0')) d='90'+d.slice(1);
  return d;
}
function mocksSiparisMetni(){
  const h=mocksHesapRef();
  const yer=mocksMasaAdiOku()||('Masa/Daire '+mocksMasaNo());
  const L=['Merhaba, '+yer+' icin siparis:',''];
  h.forEach(x=>L.push('- '+x.adet+' x '+x.ad));
  L.push('');
  L.push('Toplam (menu fiyatiyla): '+mocksTL(mocksToplam()));
  return L.join(String.fromCharCode(10));
}
function mocksSiparisAc(){
  const h=mocksHesapRef();
  if(!h.length) return toast('Hesap boş — önce ürün ekle',true);
  if(!mocksMasaVarMi()){
    toast('Önce sipariş adresini seç — yanlış masaya gitmesin',true);
    return mocksMasaAc();
  }
  const tel=mocksTelOku();
  acModal(`<h2 class="serif" style="margin:0 0 4px">Siparişi Gönder</h2>
    <div class="xs dim" style="margin-bottom:12px">Sipariş <b>WhatsApp'tan sen</b> gönderiyorsun.
      Uygulama kafenin sistemine kendi başına sipariş <b>yazmaz</b> — o gerçek mutfağa iş açar
      ve bizim sistemimiz değil. Metni hazırlıyoruz, göndermek sende.</div>

    <div class="card tight" style="margin:0 0 12px;background:var(--panel2);white-space:pre-wrap;
      font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.5">${esc(mocksSiparisMetni())}</div>

    <div class="field"><label class="fl">The Mocks WhatsApp numarası</label>
      <input id="mkTel" value="${esc(tel)}" placeholder="0532 000 00 00" inputmode="tel">
      <div class="xs dim" style="margin-top:5px">Bir kez yaz, bu cihazda kalır. Numarayı bilmiyorsan
        aşağıdan metni kopyalayıp kendi sohbetine yapıştırabilirsin.</div></div>

    <button class="btn-p btn-full" style="margin-top:12px" onclick="mocksSiparisGonder()">📲 WhatsApp'ta Aç</button>
    <div class="two" style="margin-top:8px">
      <button class="btn-b btn-sm" onclick="kopyala(mocksSiparisMetni());toast('Sipariş metni kopyalandı')">📋 Metni Kopyala</button>
      <a class="btn-gh btn-sm" style="text-align:center;text-decoration:none;display:block;padding:9px 0"
        href="${mocksMenuUrl()}" target="_blank" rel="noopener">🔗 QR Menüyü Aç</a>
    </div>

    <div class="sep"></div>
    <div class="xs dim" style="font-weight:700;margin-bottom:6px">QR MENÜDEN TEK TEK VER</div>
    <div class="xs dim" style="margin-bottom:8px">Her satır kafenin kendi uygulamasında <b>o ürünü açık</b> getirir;
      orada "Sepete Ekle" deyip siparişi resmî yoldan verirsin. Sepeti biz devredemiyoruz — onların sepeti
      tarayıcılarının hafızasında duruyor, dışarıdan yazılamıyor.</div>
    <div class="stack">
      ${h.map(x=>`<a class="btn-gh btn-sm" style="text-decoration:none;display:block;text-align:left;padding:8px 10px"
        href="${mocksUrunUrl(x.id)}" target="_blank" rel="noopener">${x.adet}× ${esc(x.ad)} <span class="xs dim">→ QR'da aç</span></a>`).join('')}
    </div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="mocksCiz()">Geri</button>`);
}
function mocksSiparisGonder(){
  const ham=($('#mkTel')?.value||'').trim();
  const d=mocksTelDuzelt(ham);
  if(d.length<12) return toast('Numarayı tam yaz (ör. 0532 000 00 00)',true);
  mocksTelYaz(ham);
  const url='https://wa.me/'+d+'?text='+encodeURIComponent(mocksSiparisMetni());
  window.open(url,'_blank','noopener');
  toast('WhatsApp açıldı — göndermeyi sen onaylayacaksın');
}

//== mocksMasa
/* Siparis adresi (daire/masa no) ayari. Numara KULLANICIDAN gelir;
   kafenin kendi dogrulama ucuyla teyit edip adini gosteriyoruz. Yeni
   kayit ACMIYORUZ; yalniz var olani seciyoruz. Siparis gonderilmez. */
function mocksMasaAc(){
  const liste=mocksAdresler(), aktif=mocksMasaNo();
  acModal(`<h2 class="serif" style="margin:0 0 4px">Siparis Adresi</h2>
    <div class="xs dim" style="margin-bottom:12px">Daire ya da salon farketmez — kullandigin yerleri
      buraya kaydet, tek dokunusla sec. Numara masadaki/salondaki QR'da yazili ya da The Mocks'a sorarsin.
      Yeni kayit acilmaz; var olan numara hedef secilir.</div>

    ${liste.length?`<div class="xs dim" style="font-weight:700;margin-bottom:6px">KAYITLI ADRESLER</div>
      <div class="stack" style="margin-bottom:12px">${liste.map(a=>`
        <div class="row" style="gap:8px;padding:5px 0;align-items:center">
          <button class="btn-sm ${String(a.no)===String(aktif)?'btn-g':'btn-gh'}" style="flex:1;text-align:left;justify-content:flex-start"
            onclick="mocksAdresKullan('${esc(String(a.no))}',${JSON.stringify(a.ad)})">
            ${String(a.no)===String(aktif)?'✓ ':''}${esc(a.ad)} <span class="xs dim">no ${esc(String(a.no))}</span></button>
          <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="mocksAdresSil('${esc(String(a.no))}')">✕</button>
        </div>`).join('')}</div>`:''}

    <div class="xs dim" style="font-weight:700;margin-bottom:6px">YENİ ADRES EKLE</div>
    <div class="field"><label class="fl">Daire / salon no</label>
      <input id="mkNo" inputmode="numeric" placeholder="masadaki QR'da yazan numara"
        onkeydown="if(event.key==='Enter')mocksMasaDogrula()"></div>
    <div id="mkNoSonuc" class="xs" style="margin-top:8px"></div>
    <button class="btn-p btn-full" id="mkNoBtn" style="margin-top:12px" onclick="mocksMasaDogrula()">Dogrula ve Ekle</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="mocksAc()">Kapat</button>`);
}
function mocksAdresKullan(no,ad){ mocksAdresSec(no,ad); toast(ad+' seçildi'); mocksAc(); }
function mocksAdresSil(no){
  const l=mocksAdresler().filter(a=>String(a.no)!==String(no));
  mocksAdresYaz(l);
  /* Seçili adresi sildiyse: başka kayıt varsa ona geç, yoksa BOŞ bırak.
     Eskiden '241'e düşüyordu — silinen adresin yerine başkasının dairesi. */
  if(String(mocksMasaNo())===String(no)){ const y=l[0]; mocksAdresSec(y?y.no:'', y?y.ad:''); }
  mocksMasaAc();
}
async function mocksMasaDogrula(){
  const no=($('#mkNo')?.value||'').trim();
  const sonuc=$('#mkNoSonuc'), btn=$('#mkNoBtn');
  if(!/^[0-9]+$/.test(no)){ if(sonuc){sonuc.textContent='Sadece rakam yaz';sonuc.style.color='#DD8A8A';} return; }
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }
  try{
    const r=await fetch('https://menuluxmenuapi.azurewebsites.net/api/OnlineOrderAPI/GetTableByTableNo?customerID='+MOCKS_MUSTERI+'&tableNo='+encodeURIComponent(no));
    let j=null; try{ j=await r.json(); }catch(e){}
    if(!j||!j.TableID){
      if(sonuc){ sonuc.innerHTML='Bu numara The Mocks sisteminde <b>bulunamadi</b>. Dogru numarayi The Mocks\'a sor.'; sonuc.style.color='#DD8A8A'; }
      if(btn){ btn.disabled=false; btn.textContent='Dogrula ve Kaydet'; }
      return;
    }
    const ad=j.Name||j.TableName||('Daire '+no);
    const l=mocksAdresler().filter(a=>String(a.no)!==String(no));
    l.push({no,ad}); mocksAdresYaz(l);
    mocksAdresSec(no,ad);
    if(sonuc){ sonuc.innerHTML='✓ <b>'+esc(ad)+'</b> eklendi ve seçildi'; sonuc.style.color='var(--green)'; }
    toast(ad+' eklendi',true);
    setTimeout(mocksMasaAc,800);
  }catch(e){
    if(sonuc){ sonuc.textContent='Dogrulanamadi — internet gidip gelmis olabilir'; sonuc.style.color='#DD8A8A'; }
    if(btn){ btn.disabled=false; btn.textContent='Dogrula ve Kaydet'; }
  }
}

//== macKafe
/* Açık/biten maça bağlı kafe hesabı toplamı ve özeti (zabıt + PDF için) */
function macKafeToplam(c){ return (c&&Array.isArray(c.kafe)?c.kafe:[]).reduce((t,x)=>t+(Number(x.fiyat)||0)*(Number(x.adet)||0),0); }
function macKafeZabit(c){
  const k=c&&Array.isArray(c.kafe)?c.kafe:[]; if(!k.length) return '';
  const dokum=k.map(x=>`${x.adet} ${x.ad}`).join(', ');
  return `MASA HESABI: ${dokum}. Toplam ${macKafeToplam(c)} ₺ (The Mocks). Ödeme, defterin sahibi huzurunda yapılır.`;
}
/* Tabela ekranında gösterilen kısa kart */
function macKafeKart(c){
  if(!c) return '';
  const k=Array.isArray(c.kafe)?c.kafe:[];
  const yaz = c._hesap===OTURUM?.id && !c.bitti;   // yalnız tabelacı ekler
  if(!k.length && !yaz) return '';
  return `<div class="card tight">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div><div class="xs dim">☕ Masa Hesabı · The Mocks</div>
        <div class="serif" style="font-size:19px;color:var(--gold)">${k.length?macKafeToplam(c)+' ₺':'—'}</div></div>
      ${yaz?`<button class="btn-sm btn-b" onclick="mocksMacAc()">+ Çay / Kahve / Ekle</button>`:''}
    </div>
    ${k.length?`<div class="xs dim" style="margin-top:6px">${k.map(x=>`${x.adet}× ${esc(x.ad)}`).join(' · ')}</div>`:''}
  </div>`;
}
