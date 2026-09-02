//== talik
/* =========================================================
   CELSENİN TALİKİ — oyun bitmeden ara vermek

   Oyun her zaman aynı gece bitmiyor: gece ilerliyor, kalabalık
   dağılıyor, yer kapanıyor. Eskiden tek çıkış yolu "İptal" idi
   ve o tabelayı SİLİYORDU. Artık celse TALİK EDİLİYOR: tabela
   olduğu gibi duruyor, masa "talik edildi" görünüyor, oturunca
   kaldığı elden devam ediliyor.

   VERİ — şema değişmedi, hepsi celse (JSONB) içinde:
     c.talik        = {tarih, saat, kim, not}   → şu an askıda
     c.talikGecmisi = [ {tarih,saat,kim,not, devamTarih,devamSaat} ]

   Akış kaydı tip='mesaj' + veri.talik ile atılıyor; akis.tip
   sütununda CHECK listesi var ('mesaj','zabit','unvan',
   'dogumgunu','iddia','cagri') ve yeni tip eklemek SQL
   çalıştırmayı gerektirirdi. Gerek yok.

   YETKİ: arayı da devamı da TABELAYI TUTAN verir. Veritabanı
   tarafında da böyle — maclar satırını yalnız tabelacı
   güncelleyebiliyor (yama 07). Düğmeyi gizlemek süs; asıl
   engel orada.
   ========================================================= */

const TALIK_SEBEP = ['Gece ilerledi','Yemek arası','Yarın devam',
                     'Kalabalık dağıldı','Yer kapanıyor','Sabah işi var'];

const talikSaat = () => { const d=new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const talikSayisi = c => (c?.talikGecmisi||[]).length + (c?.talik?1:0);
const yazilanEl   = c => (c?.partiler||[]).reduce((t,p)=>t+((p.eller||[]).length),0);

/* Tabela ekranlarının başlığındaki ⏸️ düğmesi */
const talikDugme = () => `<button class="btn-xs btn-gh" onclick="talikAc()">⏸️ Ara</button>`;

//== talikAc
function talikAc(){
  const c=DB.aktif; if(!c) return;
  if(!tabelaciMiyim()) return toast('Arayı, tabelayı tutan verir',true);
  const o=macOzet(c);
  acModal(`
    <h2 class="serif" style="margin:0 0 4px">Celseye Ara Ver</h2>
    <div class="xs dim" style="margin-bottom:12px">Tabela olduğu gibi durur, tek sayı silinmez.
      Masa listede <b>talik edildi</b> diye bekler; oturduğunuzda kaldığın elden devam edersin.
      Zabıt <b>tutulmaz</b>, sicile <b>işlemez</b> — maç bitmiş sayılmaz.</div>

    <div class="card tight" style="background:var(--panel2);margin:0 0 13px">
      <div class="row wrap" style="gap:6px">
        <span class="pill ${c.oyun==='batak'?'red':'blue'}">${c.oyun==='batak'?'BATAK':'101'}</span>
        <span class="pill gold">${esc(c.masaAd||'Masa')}</span>
      </div>
      <div class="sm" style="font-weight:600;margin-top:6px">${esc(o.kim)}</div>
      <div class="xs muted">${esc(o.skor)}${o.alt?' · '+esc(o.alt):''} · ${yazilanEl(c)} el yazıldı</div>
    </div>

    <label class="fl">Gerekçe (isteğe bağlı)</label>
    <div class="row wrap" style="gap:6px;margin:6px 0 9px">
      ${TALIK_SEBEP.map(s=>`<span class="chip" onclick="talikSebepSec(this)" data-s="${esc(s)}">${esc(s)}</span>`).join('')}
    </div>
    <input id="tlNot" maxlength="80" placeholder="Kendin yaz…">

    <button class="btn-g btn-full" style="margin-top:14px" onclick="talikVer()">⏸️ Ara Ver, Sonra Devam Ederiz</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}
function talikSebepSec(el){
  const secili=el.classList.contains('on');
  el.parentElement.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  const n=$('#tlNot'); if(!n) return;
  if(secili){ n.value=''; return; }
  el.classList.add('on'); n.value=el.dataset.s||'';
}

//== talikVer
async function talikVer(){
  const c=DB.aktif; if(!c) return;
  const btn=document.querySelector('#modalHost .btn-g');
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }

  /* Bekleyen gecikmeli yazma taliki ezmesin: önce onu boşalt. */
  clearTimeout(_yazZaman);
  await aktifYaz();

  c.talik={tarih:bugun(),saat:talikSaat(),kim:DB.ben||null,
           not:($('#tlNot')?.value||'').trim()};
  const {error}=await sb.from('maclar').update({celse:aktifBelge(c)}).eq('id',c.id);
  if(error){
    delete c.talik;
    if(btn){ btn.disabled=false; btn.textContent='⏸️ Ara Ver, Sonra Devam Ederiz'; }
    return toast(hataMetni(error),true);
  }

  const o=macOzet(c);
  akisEkle('mesaj', talikMetni(c), {talik:'ara',mac_id:c.id,oyun:c.oyun,
    masaAd:c.masaAd||'',skor:o.skor,sebep:c.talik.not||''}).catch(()=>{});

  kapatModal(); macBirak();
  toast('Celse talik edildi. Masalar listesinde seni bekliyor.',true);
}

//== talikDevam
async function talikDevam(id){
  const c=DB.acik.find(x=>x.id===id);
  if(!c||!c.talik) return;
  if(c._hesap!==OTURUM.id){
    const kim=DB.oyuncular.find(x=>x.profilId===c._hesap&&x.masaId===c.grupId);
    return toast(`Devam kararını tabelayı tutan ${kim?.ad||'kişi'} verir`,true);
  }
  const eski=c.talik;
  c.talikGecmisi=(c.talikGecmisi||[]).concat([Object.assign({},eski,
    {devamTarih:bugun(),devamSaat:talikSaat()})]);
  delete c.talik;

  const {error}=await sb.from('maclar').update({celse:aktifBelge(c)}).eq('id',c.id);
  if(error){ c.talik=eski; c.talikGecmisi.pop(); return toast(hataMetni(error),true); }

  akisEkle('mesaj', talikDevamMetni(c,eski), {talik:'devam',mac_id:c.id,
    oyun:c.oyun,masaAd:c.masaAd||''}).catch(()=>{});
  macSec(id);
  toast(`Celseye devam edildi. ${yazilanEl(c)}. elden sonrası yazılacak.`,true);
}

/* Tabelacı arayı bitirmeye üşenip doğrudan sayı yazmaya başladıysa
   ara fiilen bitmiştir; kaydet() bunu görüp kendi kapatır.
   Burada RENDER YAPILMAZ — mobilde yazarken odak kaçar. */
function talikKendiCozuldu(c){
  const eski=c.talik; if(!eski) return;
  c.talikGecmisi=(c.talikGecmisi||[]).concat([Object.assign({},eski,
    {devamTarih:bugun(),devamSaat:talikSaat()})]);
  delete c.talik;
  akisEkle('mesaj', talikDevamMetni(c,eski), {talik:'devam',mac_id:c.id,
    oyun:c.oyun,masaAd:c.masaAd||''}).catch(()=>{});
  toast('Yazmaya başladın; ara kendiliğinden kapandı.');
}

//== talikMetni
/* Akışa düşen mizahi metinler */
function talikMetni(c){
  const o=macOzet(c), n=yazilanEl(c), s=c.talik?.not;
  const bas=`⏸️ ${c.oyun==='batak'?'BATAK':'101'} celsesi TALİK EDİLDİ.`;
  const orta=rast([
    `${n} el görülmüş, kalanı sonraya bırakılmıştır.`,
    `Tabela olduğu gibi mühürlenmiştir; ${n} el kayıtta.`,
    `Celse ${n}. elde kesilmiş, dosya açık bırakılmıştır.`]);
  const kap=rast([
    'Devam tarihi taraflara sözlü olarak tefhim edilmiştir.',
    'Kaldığı yerden devam edilecek; unutan mazeret sayılmaz.',
    'Ara kararı derhal infaz edilmiş, çay ocağına gidilmiştir.']);
  return `${bas} ${o.kim} — ${o.skor}. ${orta}${s?` GEREKÇE: ${s}.`:''} ${kap}`;
}
function talikDevamMetni(c,eski){
  const o=macOzet(c);
  const ne=eski?.tarih&&eski.tarih!==bugun()
    ? `${trh(eski.tarih)} tarihinde talik edilen celseye bugün devam edilmiştir.`
    : `Aynı gece verilen araya son verilmiştir.`;
  return `▶️ ${c.oyun==='batak'?'BATAK':'101'} celsesine DEVAM EDİLDİ. ${ne} `
       + `Tabela ${o.skor} ile açılmış, ${yazilanEl(c)}. elden sonrası yazılacaktır. `
       + rast(['Kimsenin sayıyı unutmuş olması mazeret teşkil etmez.',
               'Tabela hafızadan üstündür; itirazlar reddedilmiştir.',
               'Aradaki iddialar zamanaşımına uğramamıştır.']);
}

//== talikBanner
/* Talik edilmiş bir masayı açınca tabelanın üstünde duran şerit */
function talikBanner(c){
  if(!c?.talik) return '';
  const t=c.talik, benim=c._hesap===OTURUM.id;
  const kim=t.kim?ad(t.kim):null;
  return `<div class="card" style="border-color:var(--gold);background:var(--panel2)">
    <div class="row" style="gap:10px;align-items:flex-start">
      <div style="font-size:24px;flex-shrink:0">⏸️</div>
      <div class="grow" style="min-width:0">
        <div class="serif" style="font-size:16px;color:var(--gold)">Bu celse talik edildi</div>
        <div class="xs dim" style="margin-top:3px">${trh(t.tarih)}${t.saat?' · '+esc(t.saat):''}${kim?' · '+esc(kim):''}
          ${talikSayisi(c)>1?` · ${talikSayisi(c)}. ara`:''}</div>
        ${t.not?`<div class="sm" style="margin-top:6px">“${esc(t.not)}”</div>`:''}
        <div class="xs dim" style="margin-top:7px">Tabela olduğu gibi duruyor — ${yazilanEl(c)} el yazılı.
          ${benim?'Devam edince kaldığın elden yazmaya başlarsın.'
                 :'Devam kararını tabelayı tutan verir.'}</div>
      </div>
    </div>
    ${benim?`<button class="btn-g btn-full" style="margin-top:11px" onclick="talikDevam('${c.id}')">▶️ Devam Et</button>`:''}
  </div>`;
}

//== talikKart
/* Masalar ekranında "Talik Edilenler" kutusu */
function talikKart(){
  const bekleyen=DB.acik.filter(c=>c.talik);
  if(!bekleyen.length) return '';
  return `<div class="card" style="border-color:var(--line)">
    <h3>⏸️ Talik Edilen Masalar (${bekleyen.length})</h3>
    <div class="xs dim" style="margin-bottom:10px">Yarım kalan celseler. Silinmediler, bitmiş de sayılmıyorlar;
      oturunca kaldığı elden devam edilir.</div>
    ${bekleyen.map(talikSatir).join('<div class="sep"></div>')}
  </div>`;
}
function talikSatir(c){
  const o=macOzet(c), benim=c._hesap===OTURUM.id, t=c.talik||{};
  const yazan=DB.oyuncular.find(x=>x.profilId===c._hesap&&x.masaId===c.grupId);
  const gun=t.tarih===bugun()?'bugün':trh(t.tarih);
  return `<div class="row" style="gap:10px;align-items:flex-start">
    <div class="grow" style="min-width:0">
      <div class="row wrap" style="gap:6px">
        <span class="pill ${c.oyun==='batak'?'red':'blue'}">${c.oyun==='batak'?'BATAK':'101'}</span>
        <span class="pill gold">${esc(c.masaAd||'Masa')}</span>
        <span class="pill">⏸️ ${esc(gun)}${t.saat?' '+esc(t.saat):''}</span>
        <span class="xs dim">✍️ ${esc(yazan?.ad||'tabelacı')}</span>
      </div>
      <div class="sm" style="margin-top:5px;font-weight:600">${esc(o.kim)}</div>
      <div class="xs muted">${esc(o.skor)}${o.alt?' · '+esc(o.alt):''} · ${yazilanEl(c)} el</div>
      ${t.not?`<div class="xs dim" style="margin-top:4px">“${esc(t.not)}”</div>`:''}
    </div>
    <button class="btn-sm ${benim?'btn-g':''}" onclick="${benim?`talikDevam('${c.id}')`:`macSec('${c.id}')`}">${benim?'▶️ Devam':'Gör'}</button>
  </div>`;
}

//== talikZabitNotu
/* Maç sonunda zabta düşen satır: kaç kez ara verilmiş */
function talikZabitNotu(c){
  /* Maç askıdayken bitirilmişse o ara da sayılır */
  const g=(c.talikGecmisi||[]).concat(c.talik?[c.talik]:[]);
  if(!g.length) return '';
  const gunler=[...new Set(g.map(x=>x.tarih))];
  const sebepler=g.map(x=>x.not).filter(Boolean);
  if(g.length===1)
    return `Celse bir kez talik edilmiştir (${trh(g[0].tarih)}${g[0].saat?' '+g[0].saat:''})`
         + `${sebepler.length?`, gerekçe: ${sebepler[0]}`:''}. Maç aynı tabela üzerinde tamamlanmıştır.`;
  return `Celse ${g.length} kez talik edilmiş, ${gunler.length} güne yayılmıştır`
       + `${sebepler.length?` (${liste(sebepler)})`:''}. `
       + `Tabelanın bu süre boyunca korunmuş olması takdirle karşılanmıştır.`;
}
