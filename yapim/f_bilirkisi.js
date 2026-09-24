//== bilirkisi
/* =========================================================
   BİLİRKİŞİ RAPORLARI — yalnız masa üyelerine açık raporlar

   İstek (kullanıcı, 24.09.2026): WhatsApp grubunun analiz raporu
   "programda paylaşılsın", ama depo ve site HERKESE AÇIK olduğu için
   rapor dosya olarak yayına KONMADI. İçerik Supabase'deki `raporlar`
   tablosunda durur (yama 16); RLS yalnız onaylı masa üyelerine okutur.
   Uygulamadan rapor eklenemez — yalnız SQL Editor'den.

   Akış sekmesinin tepesinde, o masanın raporu varsa tek satırlık şerit
   çıkar. Liste html'siz çekilir; html yalnız "Aç" denince gelir.
   Görüntüleme: tam ekran katman + sandbox'lı iframe (script çalışmaz).
   ========================================================= */

let RAPORLAR={masa:null, liste:[], yukleniyor:false};

async function raporlarYukle(){
  const m=DB.aktifGrup;
  if(!m || RAPORLAR.yukleniyor || RAPORLAR.masa===m) return;
  RAPORLAR.yukleniyor=true;
  try{
    const {data,error}=await sb.from('raporlar')
      .select('id,baslik,ozet,olusturma').eq('masa_id',m)
      .order('olusturma',{ascending:false});
    /* tablo henüz yoksa (yama 16 çalışmadıysa) sessizce hiçbir şey göstermeyiz */
    RAPORLAR.liste = error ? [] : (data||[]);
    RAPORLAR.masa=m;
  } finally { RAPORLAR.yukleniyor=false; }
  if(TAB==='akis' && RAPORLAR.liste.length) render();
}

function bilirkisiSerit(){
  if(RAPORLAR.masa!==DB.aktifGrup){ raporlarYukle(); return ''; }
  if(!RAPORLAR.liste.length) return '';
  const r=RAPORLAR.liste[0], digeri=RAPORLAR.liste.length-1;
  return `<div class="card" style="border-color:var(--gold)">
    <div class="row" style="gap:10px;align-items:center">
      <div style="font-size:26px;line-height:1">📜</div>
      <div class="grow" style="min-width:0">
        <div class="xs dim">Bilirkişi Raporu · yalnız masa üyelerine</div>
        <div class="serif ell" style="font-size:16px">${esc(r.baslik)}</div>
        ${r.ozet?`<div class="xs dim">${esc(r.ozet)}</div>`:''}
      </div>
      <button class="btn-p btn-sm" onclick="raporAc('${r.id}')">Aç</button>
    </div>
    ${digeri>0?`<div style="margin-top:8px"><button class="btn-xs btn-gh" onclick="raporListesi()">Önceki raporlar (${digeri})</button></div>`:''}
  </div>`;
}

function raporListesi(){
  acModal(`<h2 class="serif" style="margin:0 0 10px">Bilirkişi Raporları</h2>
    ${RAPORLAR.liste.map(r=>`<div class="row" style="gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
      <div class="grow"><div>${esc(r.baslik)}</div><div class="xs dim">${esc((r.olusturma||'').slice(0,10))}</div></div>
      <button class="btn-sm btn-gh" onclick="kapatModal();raporAc('${r.id}')">Aç</button></div>`).join('')}
    <button class="btn-gh btn-full btn-sm" style="margin-top:12px" onclick="kapatModal()">Kapat</button>`);
}

async function raporAc(id){
  toast('Rapor açılıyor…');
  const {data,error}=await sb.from('raporlar').select('baslik,html').eq('id',id).single();
  if(error||!data){ toast(error?hataMetni(error):'Rapor bulunamadı',true); return; }
  raporKapat();
  const kat=document.createElement('div');
  kat.id='raporKatman';
  kat.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--bg,#111);display:flex;flex-direction:column';
  const bar=document.createElement('div');
  bar.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top,0px));border-bottom:1px solid var(--line)';
  bar.innerHTML=`<div class="grow serif ell" style="font-size:15px">📜 ${esc(data.baslik)}</div>
    <button class="btn-sm btn-gh" onclick="raporKapat()">Kapat ✕</button>`;
  const fr=document.createElement('iframe');
  fr.setAttribute('sandbox','');            /* script yok, form yok, üst pencereye erişim yok */
  fr.setAttribute('referrerpolicy','no-referrer');
  fr.style.cssText='flex:1;width:100%;border:0;background:#fff';
  fr.srcdoc=data.html;
  kat.append(bar,fr);
  document.body.appendChild(kat);
}
function raporKapat(){ document.getElementById('raporKatman')?.remove(); }
