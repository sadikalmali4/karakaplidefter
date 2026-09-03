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
function mocksMasaNo(){ try{ return localStorage.getItem(MOCKS_MASA_ON)||'241'; }catch(e){ return '241'; } }
function mocksMasaAdiOku(){ try{ return localStorage.getItem(MOCKS_MASA_ON+'_ad')||''; }catch(e){ return ''; } }
const mocksMenuUrl = ()=>'https://themocks.qr.menulux.com/?tableno='+encodeURIComponent(mocksMasaNo())+'#!/';
const MOCKS_ONBELLEK = 'kkd_mocks_menu';
const MOCKS_HESAP_ON = 'kkd_mocks_hesap';

let MOCKS = null;            // {para, kdv, gruplar:[{ad, urunler:[{id,ad,fiyat,foto}]}]}
let MOCKS_GRUP = 0;         // seçili kategori
let MOCKS_HESAP = mocksHesapOku();

/* Sık verilenler: kullanıcı listesi + otomatik öğrenilen sayaç.
   İkisi birleşip en üstte "Sık Sipariş" bölümü oluyor. */
const MOCKS_FAV_ON = 'kkd_mocks_fav';
const MOCKS_SIK = ['çay','büyük çay','kahve','türk kahve','oralet','su','kuruyemiş','fıstık','soda','çerez'];
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
const mocksToplam = () => MOCKS_HESAP.reduce((t, x) => t + x.fiyat * x.adet, 0);
const mocksAdet = () => MOCKS_HESAP.reduce((t, x) => t + x.adet, 0);

function mocksEkle(id, ad, fiyat) {
  const v = MOCKS_HESAP.find(x => x.id === id);
  if (v) v.adet++;
  else MOCKS_HESAP.push({ id, ad, fiyat, adet: 1 });
  MOCKS_SAYAC[id]=(MOCKS_SAYAC[id]||0)+1; mocksSayacYaz();
  mocksHesapYaz(); mocksCiz();
  toast(`${ad} eklendi`);
}
function mocksArtir(id, d) {
  const v = MOCKS_HESAP.find(x => x.id === id); if (!v) return;
  v.adet += d;
  if (v.adet <= 0) MOCKS_HESAP = MOCKS_HESAP.filter(x => x.id !== id);
  mocksHesapYaz(); mocksCiz();
}
function mocksTemizle() {
  if (!MOCKS_HESAP.length) return;
  if (!confirm('Masa hesabı sıfırlansın mı? (Yalnız bu cihazdaki liste)')) return;
  MOCKS_HESAP = []; mocksHesapYaz(); mocksCiz();
}

/* Sık sipariş: adı MOCKS_SIK'te geçenler + en çok eklenenler.
   Menüdeki gerçek ürünlerle eşleştirilir; olmayan atlanır. */
function mocksSikUrunler(){
  if(!MOCKS) return [];
  const hepsi=MOCKS.gruplar.flatMap(g=>g.urunler.map(u=>({...u,grup:g.ad})));
  const puan=u=>{
    let p=(MOCKS_SAYAC[u.id]||0)*10;                 // en çok eklediğin
    const ad=u.ad.toLocaleLowerCase('tr-TR');
    const kelime=ad.split(/[\s,()]+/);              // "su" -> "Sucuklu"a takılmasın
    if(MOCKS_SIK.some(k=>k.includes(' ')?ad.includes(k):kelime.includes(k))) p+=5;
    return p;
  };
  return hepsi.map(u=>({u,p:puan(u)})).filter(x=>x.p>0)
    .sort((a,b)=>b.p-a.p).slice(0,8).map(x=>x.u);
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
  const top = mocksToplam();

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
          <div class="sm ell" style="font-weight:700">${esc(mocksMasaAdiOku()||('Masa/Daire '+mocksMasaNo()))}</div></div>
        <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="mocksMasaAc()">Değiştir</button>
      </div>
    </div>

    ${MOCKS_HESAP.length ? `<div class="card tight" style="margin:12px 0;border-color:var(--gold)">
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <span class="sm" style="font-weight:700">🧾 Masa Hesabı</span>
        <span class="serif" style="font-size:20px;color:var(--gold)">${mocksTL(top)}</span></div>
      ${MOCKS_HESAP.map(x => `<div class="row" style="justify-content:space-between;padding:4px 0;gap:8px">
        <div class="grow sm ell">${esc(x.ad)} <span class="xs dim">${x.fiyat ? mocksTL(x.fiyat) : ''}</span></div>
        <div class="row" style="gap:6px;flex-shrink:0;align-items:center">
          <button class="btn-xs btn-gh" onclick="mocksArtir(${x.id},-1)">−</button>
          <span class="sm" style="min-width:20px;text-align:center;font-weight:700">${x.adet}</span>
          <button class="btn-xs btn-gh" onclick="mocksArtir(${x.id},1)">+</button>
          <span class="sm" style="min-width:56px;text-align:right;font-weight:600">${mocksTL(x.fiyat * x.adet)}</span>
        </div></div>`).join('')}
      <div class="two" style="margin-top:9px">
        <button class="btn-b btn-sm" onclick="mocksHesapPaylas()">📋 Hesabı Kopyala</button>
        <button class="btn-gh btn-sm" onclick="mocksTemizle()">Sıfırla</button>
      </div>
    </div>` : `<div class="xs dim" style="margin:12px 0">Aşağıdan seç; hesap burada birikir.
      Sipariş gitmez, yalnız ne içtiğinizin tutarını tutar.</div>`}

    ${(()=>{ const sik=mocksSikUrunler(); return sik.length?`
      <div class="xs dim" style="margin-bottom:6px;font-weight:700">⭐ SIK SİPARİŞ</div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">
        ${sik.map(u=>`<button class="btn-sm btn-gh" style="padding:7px 11px"
          onclick='mocksEkle(${u.id},${JSON.stringify(u.ad)},${u.fiyat})'>
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
        <button class="btn-xs btn-g" style="flex-shrink:0"
          onclick="mocksEkle(${u.id},${JSON.stringify(u.ad)},${u.fiyat})">+ Ekle</button>
      </div>`).join('<div style="height:1px;background:var(--line)"></div>')}
    </div>

    <a class="btn-gh btn-full btn-sm" style="margin-top:12px;display:block;text-align:center;text-decoration:none"
      href="${mocksMenuUrl()}" target="_blank" rel="noopener">🔗 Kafenin QR Menüsünü Aç (${esc(mocksMasaAdiOku()||('no '+mocksMasaNo()))})</a>
    <div class="xs dim center" style="margin-top:7px">Menü The Mocks'tan canlı çekilir; fiyatlar oradan gelir.
      Sipariş vermek için yukarıdaki bağlantı.</div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="kapatModal()">Kapat</button>`;
}

function mocksHesapPaylas() {
  if (!MOCKS_HESAP.length) return;
  const L = ['🧾 THE MOCKS — Masa Hesabı', ''];
  MOCKS_HESAP.forEach(x => L.push(`${x.adet}× ${x.ad}  ${mocksTL(x.fiyat * x.adet)}`));
  L.push('');
  L.push(`TOPLAM: ${mocksTL(mocksToplam())} (KDV dahil)`);
  kopyala(L.join('\n'));
}


//== mocksMasa
/* Siparis adresi (daire/masa no) ayari. Numara KULLANICIDAN gelir;
   kafenin kendi dogrulama ucuyla teyit edip adini gosteriyoruz. Yeni
   kayit ACMIYORUZ; yalniz var olani seciyoruz. Siparis gonderilmez. */
function mocksMasaAc(){
  acModal(`<h2 class="serif" style="margin:0 0 4px">Siparis Adresi</h2>
    <div class="xs dim" style="margin-bottom:12px">The Mocks sisteminde <b>daire numarani</b> yaz.
      Numara masadaki QR'da yazili ya da The Mocks'a sorarsin. Yeni kayit acilmaz;
      yalniz var olan bir numara hedef secilir.</div>
    <div class="field"><label class="fl">Daire / masa no</label>
      <input id="mkNo" inputmode="numeric" value="${esc(mocksMasaNo())}"
        onkeydown="if(event.key==='Enter')mocksMasaDogrula()"></div>
    <div id="mkNoSonuc" class="xs" style="margin-top:8px"></div>
    <button class="btn-p btn-full" id="mkNoBtn" style="margin-top:12px" onclick="mocksMasaDogrula()">Dogrula ve Kaydet</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="mocksAc()">Vazgec</button>`);
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
    try{ localStorage.setItem(MOCKS_MASA_ON,no); localStorage.setItem(MOCKS_MASA_ON+'_ad',ad); }catch(e){}
    if(sonuc){ sonuc.innerHTML='✓ <b>'+esc(ad)+'</b> secildi'; sonuc.style.color='var(--green)'; }
    toast(ad+' secildi',true);
    setTimeout(mocksAc,700);
  }catch(e){
    if(sonuc){ sonuc.textContent='Dogrulanamadi — internet gidip gelmis olabilir'; sonuc.style.color='#DD8A8A'; }
    if(btn){ btn.disabled=false; btn.textContent='Dogrula ve Kaydet'; }
  }
}