//== bilirkisi
/* =========================================================
   BİLİRKİŞİ RAPORLARI — yalnız masa üyelerine açık raporlar

   İstek (kullanıcı, 24.09.2026): WhatsApp grubunun analiz raporu
   "programda paylaşılsın", ama depo ve site HERKESE AÇIK olduğu için
   rapor dosya olarak yayına KONMADI. İçerik Supabase'deki `raporlar`
   tablosunda durur (yama 16); RLS yalnız onaylı masa üyelerine okutur.
   Uygulamadan rapor eklenemez — yalnız SQL Editor'den.

   AD ÇAKIŞMASI TUZAĞI (11.5): ilk sürümde fonksiyonlar raporAc /
   raporKapat adını taşıyordu; f_rapor.js'teki Genel Sicil Kararı da AYNI
   adları kullanıyor ve daha sonra yüklendiği için bunları eziyordu
   ("Aç" sicil kararını açıyor, "Kapat" hiçbir şey yapmıyordu). Bu
   dosyadaki bütün adlar bk ön ekli; yeni fonksiyon eklerken de öyle.

   Kapatma: üst çubuk (çentik payıyla) + altta sabit büyük düğme +
   Android geri tuşu (history) + Esc.
   ========================================================= */

let BK_RAPOR={masa:null, liste:[], yukleniyor:false};

async function bkRaporlarYukle(){
  const m=DB.aktifGrup;
  if(!m || BK_RAPOR.yukleniyor || BK_RAPOR.masa===m) return;
  BK_RAPOR.yukleniyor=true;
  try{
    const {data,error}=await sb.from('raporlar')
      .select('id,baslik,ozet,olusturma').eq('masa_id',m)
      .order('olusturma',{ascending:false});
    /* tablo yoksa ya da yetki yoksa sessizce hiçbir şey göstermeyiz */
    BK_RAPOR.liste = error ? [] : (data||[]);
    BK_RAPOR.masa=m;
  } finally { BK_RAPOR.yukleniyor=false; }
  if(TAB==='akis' && BK_RAPOR.liste.length) render();
}

function bilirkisiSerit(){
  if(BK_RAPOR.masa!==DB.aktifGrup){ bkRaporlarYukle(); return ''; }
  if(!BK_RAPOR.liste.length) return '';
  const r=BK_RAPOR.liste[0], digeri=BK_RAPOR.liste.length-1;
  return `<div class="card" style="border-color:var(--gold)">
    <div class="row" style="gap:10px;align-items:center">
      <div style="font-size:26px;line-height:1">📜</div>
      <div class="grow" style="min-width:0">
        <div class="xs dim">Bilirkişi Raporu · yalnız masa üyelerine</div>
        <div class="serif ell" style="font-size:16px">${esc(r.baslik)}</div>
        ${r.ozet?`<div class="xs dim">${esc(r.ozet)}</div>`:''}
      </div>
      <button class="btn-p btn-sm" onclick="bkRaporAc('${r.id}')">Aç</button>
    </div>
    ${digeri>0?`<div style="margin-top:8px"><button class="btn-xs btn-gh" onclick="bkRaporListesi()">Önceki raporlar (${digeri})</button></div>`:''}
  </div>`;
}

function bkRaporListesi(){
  acModal(`<h2 class="serif" style="margin:0 0 10px">Bilirkişi Raporları</h2>
    ${BK_RAPOR.liste.map(r=>`<div class="row" style="gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
      <div class="grow"><div>${esc(r.baslik)}</div><div class="xs dim">${esc((r.olusturma||'').slice(0,10))}</div></div>
      <button class="btn-sm btn-gh" onclick="kapatModal();bkRaporAc('${r.id}')">Aç</button></div>`).join('')}
    <button class="btn-gh btn-full btn-sm" style="margin-top:12px" onclick="kapatModal()">Kapat</button>`);
}

async function bkRaporAc(id){
  toast('Rapor açılıyor…');
  const {data,error}=await sb.from('raporlar').select('baslik,html').eq('id',id).single();
  if(error||!data){ toast(error?hataMetni(error):'Rapor bulunamadı',true); return; }
  bkRaporKapat(true);
  const kat=document.createElement('div');
  kat.id='bkRaporKatman';
  kat.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--bg,#12100F);display:flex;flex-direction:column';
  const bar=document.createElement('div');
  bar.style.cssText='flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;'
    +'padding-top:calc(10px + max(env(safe-area-inset-top,0px), 24px));border-bottom:1px solid var(--line)';
  bar.innerHTML=`<div class="grow serif ell" style="font-size:15px;min-width:0">📜 ${esc(data.baslik)}</div>
    <button class="btn-sm btn-gh" style="flex:none" onclick="bkRaporKapat()">Kapat ✕</button>`;
  const fr=document.createElement('iframe');
  fr.setAttribute('sandbox','');            /* script yok, form yok, üst pencereye erişim yok */
  fr.setAttribute('referrerpolicy','no-referrer');
  fr.style.cssText='flex:1;width:100%;border:0;background:#fff';
  fr.srcdoc=data.html;
  /* başparmağın yetiştiği yerde ikinci kapatma düğmesi */
  const alt=document.createElement('button');
  alt.className='btn-p';
  alt.textContent='✕ Raporu Kapat';
  alt.onclick=()=>bkRaporKapat();
  alt.style.cssText='position:absolute;left:50%;transform:translateX(-50%);'
    +'bottom:calc(14px + env(safe-area-inset-bottom,0px));padding:12px 22px;border-radius:999px;'
    +'box-shadow:0 4px 18px rgba(0,0,0,.45);font-size:15px';
  kat.append(bar,fr,alt);
  document.body.appendChild(kat);
  /* Android geri tuşu raporu kapatsın, uygulamadan çıkmasın */
  try{ history.pushState({bkRapor:1},''); }catch(e){}
}
function bkRaporKapat(sessiz){
  const k=document.getElementById('bkRaporKatman'); if(!k) return;
  k.remove();
  if(!sessiz && history.state && history.state.bkRapor){ try{ history.back(); }catch(e){} }
}
window.addEventListener('popstate',()=>{ const k=document.getElementById('bkRaporKatman'); if(k) k.remove(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') bkRaporKapat(); });
