/* =========================================================
   SAHİP PANELİ — "kim ne yaptı"

   İSTEK: "yeni bir yetki ekle, ben admin olayım, kim ne yaptı göreyim"
   + "admin gibi yapmasın, beni — sadık kullanıcısını" + "silebileyim".

   BU YÜZDEN:
   · Ayrı bir admin hesabı/rolü YOK. Yetki mevcut `sadik` hesabına bağlı;
     sunucudaki sahip_mi() sabit e-postayla eşleştiriyor. Uygulamadan
     kimse kendini sahip yapamaz — bayrak istemcide DEĞİL, sunucuda.
   · SAHIP değişkeni burada sadece kartı göstermek için. Biri konsoldan
     SAHIP=true yazsa bile hiçbir şey açılmaz: veriyi getiren rpc'ler
     kapıda tekrar sahip_mi() soruyor, değilse hata veriyor.
   · Sahip başka grubun MAÇ DETAYINI, akış metnini, borcunu OKUMAZ.
     Gördüğü şey: grup listesi + sayımlar + hareket başlıkları + hesaplar.
     RLS hiçbir tabloda gevşetilmedi (supabase_yama_14.sql notuna bak).

   Kaynak fonksiyonlar: sahip_mi / sahip_gruplar / sahip_hareketler /
   sahip_hesaplar / sahip_grup_sil
   ========================================================= */

let SAHIP = false;
let SAHIP_SEK = 'gruplar';
let SAHIP_SUZ = '';            // hareketleri tek gruba süz (masa_id)
let SAHIP_SUZ_AD = '';

async function sahipKontrol(){
  SAHIP=false;
  try{
    const {data,error}=await sb.rpc('sahip_mi');
    SAHIP = !error && data===true;
  }catch(e){ SAHIP=false; }
  return SAHIP;
}

/* tırnak kaçırma: onclick içine ad basacağız */
const shTirnaksiz = s => String(s==null?'':s).split("'").join('’');

/* Ayarlar'a düşen kart — sahip değilsen hiç basılmıyor */
function sahipKart(){
  if(!SAHIP) return '';
  return `<div class="card" style="border-color:var(--gold)">
    <h3>🛡️ Sahip Paneli</h3>
    <div class="xs dim" style="margin-bottom:10px">Bu kart yalnız senin hesabında görünür.
      Sistemdeki <b>bütün grupları</b>, kimin ne zaman ne yaptığını ve hesapları buradan görürsün;
      üyesi olmadığın grubu da silebilirsin.</div>
    <button class="btn-g btn-full" onclick="sahipPanel('gruplar')">Sistemi Aç</button>
    <div class="xs dim" style="margin-top:8px;opacity:.7">Maç detayı, akış metni ve borç kayıtları
      buradan da okunmaz — yalnız özet ve hareket başlıkları gelir.</div>
  </div>`;
}

function sahipAn(t){
  if(!t) return '—';
  try{
    return new Date(t).toLocaleString('tr-TR',
      {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  }catch(e){ return String(t); }
}

function sahipGun(t){
  if(!t) return '';
  const g=Math.floor((Date.now()-new Date(t).getTime())/86400000);
  if(g<=0) return 'bugün';
  if(g===1) return 'dün';
  if(g<30) return g+' gün önce';
  return Math.floor(g/30)+' ay önce';
}

async function sahipPanel(sek){
  if(sek) SAHIP_SEK=sek;
  acModal(`<h2 class="serif" style="margin:0 0 4px">🛡️ Sahip Paneli</h2>
    <div class="xs dim" style="margin-bottom:14px">Yükleniyor…</div>
    <div class="center"><span class="yukleniyor"></span></div>`);

  let icerik='';
  try{
    if(SAHIP_SEK==='gruplar')      icerik=await sahipGruplarIcerik();
    else if(SAHIP_SEK==='hareket') icerik=await sahipHareketIcerik();
    else                           icerik=await sahipHesapIcerik();
  }catch(e){
    icerik=`<div class="card tight" style="border-color:var(--red)">
      <div class="sm" style="color:#D2A08F">${esc(hataMetni(e))}</div>
      <div class="xs dim" style="margin-top:6px">Bu hatayı görüyorsan büyük olasılıkla
        <b>supabase_yama_14.sql</b> henüz çalıştırılmadı.</div></div>`;
  }

  const sk=(k,ad)=>`<button class="btn-xs ${SAHIP_SEK===k?'btn-b':'btn-gh'}"
      onclick="sahipPanel('${k}')">${ad}</button>`;

  acModal(`<h2 class="serif" style="margin:0 0 4px">🛡️ Sahip Paneli</h2>
    <div class="xs dim" style="margin-bottom:12px">Yalnız senin hesabına açık.</div>
    <div class="row" style="gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${sk('gruplar','Gruplar')}${sk('hareket','Kim Ne Yaptı')}${sk('hesap','Hesaplar')}
    </div>
    ${icerik}
    <button class="btn-gh btn-full btn-sm" style="margin-top:14px" onclick="kapatModal()">Kapat</button>`);
}

/* ---------- 1) bütün gruplar ---------- */
async function sahipGruplarIcerik(){
  const {data,error}=await sb.rpc('sahip_gruplar');
  if(error) throw error;
  const l=data||[];
  if(!l.length) return '<div class="xs dim">Sistemde hiç grup yok.</div>';

  const bosN=l.filter(g=>g.mac_sayisi===0&&g.acik_masa===0).length;
  const yabanci=l.filter(g=>!g.ben_uye_miyim).length;

  return `<div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="sm"><b>${l.length}</b> grup · <b>${bosN}</b> boş · <b>${yabanci}</b> tanesinde üye değilsin</div>
    </div>
    ${l.map(g=>{
      const bos=g.mac_sayisi===0&&g.acik_masa===0;
      const adk=shTirnaksiz(g.ad);
      return `<div class="row" style="padding:9px 0;gap:10px;align-items:flex-start">
        <div class="grow" style="min-width:0">
          <div style="font-weight:600">${esc(g.ad)}
            ${bos?'<span class="pill red">boş</span>':''}
            ${g.ben_uye_miyim?'':'<span class="pill">üye değilsin</span>'}</div>
          <div class="xs dim">${g.oyuncu_sayisi} oyuncu · ${g.uye_sayisi} hesap ·
            ${g.mac_sayisi} maç${g.acik_masa?` · ${g.acik_masa} açık`:''} · ${g.akis_sayisi} akış</div>
          <div class="xs dim">kuran: <b>${esc(g.kuran)}</b> · ${sahipAn(g.olusturma)}</div>
          <div class="xs dim" style="opacity:.65">son hareket: ${sahipGun(g.son_hareket)} (${sahipAn(g.son_hareket)})</div>
          <div class="xs dim" style="opacity:.55;font-family:ui-monospace,monospace">kod ${esc(String(g.kod||''))} · ${esc(String(g.masa_id).slice(0,8))}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
          <button class="btn-xs btn-gh" onclick="sahipSuz('${g.masa_id}','${esc(adk)}')">Hareket</button>
          <button class="btn-xs btn-dn" onclick="sahipSilSor('${g.masa_id}','${esc(adk)}',${g.mac_sayisi},${g.oyuncu_sayisi})">Sil</button>
        </div>
      </div>`;}).join('<div class="sep" style="margin:0 -14px"></div>')}`;
}

function sahipSuz(id,ad){ SAHIP_SUZ=id; SAHIP_SUZ_AD=ad; sahipPanel('hareket'); }

/* ---------- 2) kim ne yaptı ---------- */
async function sahipHareketIcerik(){
  const p={p_limit:300}; if(SAHIP_SUZ) p.p_masa=SAHIP_SUZ;
  const {data,error}=await sb.rpc('sahip_hareketler',p);
  if(error) throw error;
  const l=data||[];

  const suzSerit = SAHIP_SUZ
    ? `<div class="row" style="margin:0 0 10px;gap:8px;align-items:center">
        <div class="sm grow">Süzgeç: <b>${esc(SAHIP_SUZ_AD)}</b></div>
        <button class="btn-xs btn-gh" onclick="SAHIP_SUZ='';SAHIP_SUZ_AD='';sahipPanel('hareket')">Hepsi</button>
      </div>`
    : '<div class="xs dim" style="margin-bottom:10px">Bütün gruplar, en yeni üstte (son 300 hareket).</div>';

  if(!l.length) return suzSerit+'<div class="xs dim">Hiç hareket yok.</div>';

  /* Kim en çok ne yapmış — dökümün üstüne kısa sayım */
  const say={};
  l.forEach(h=>{ say[h.kim]=(say[h.kim]||0)+1; });
  const enler=Object.entries(say).sort((a,b)=>b[1]-a[1]).slice(0,6);

  let gun='';
  const satir=l.map(h=>{
    const g=new Date(h.ne_zaman).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
    let bas='';
    if(g!==gun){ gun=g; bas=`<div class="xs dim" style="margin:12px 0 4px;font-weight:600">${g}</div>`; }
    const saat=new Date(h.ne_zaman).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    return bas+`<div class="row" style="gap:8px;padding:3px 0;align-items:flex-start">
      <div class="xs dim" style="width:38px;flex-shrink:0;font-family:ui-monospace,monospace">${saat}</div>
      <div class="grow" style="min-width:0">
        <div class="sm"><b>${esc(h.kim)}</b> ${esc(h.islem)}</div>
        ${h.ayrinti?`<div class="xs dim" style="word-break:break-word">${esc(h.ayrinti)}</div>`:''}
        ${SAHIP_SUZ?'':`<div class="xs dim" style="opacity:.55">${esc(h.masa_ad)}</div>`}
      </div>
    </div>`;
  }).join('');

  return suzSerit+
    `<div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="xs dim" style="margin-bottom:6px">EN HAREKETLİLER</div>
      ${enler.map(([k,n])=>`<div class="sm">· ${esc(k)} — ${n} hareket</div>`).join('')}
    </div>${satir}`;
}

/* ---------- 3) hesaplar ---------- */
async function sahipHesapIcerik(){
  const {data,error}=await sb.rpc('sahip_hesaplar');
  if(error) throw error;
  const l=data||[];
  if(!l.length) return '<div class="xs dim">Hesap yok.</div>';
  const hic=l.filter(h=>!h.son_giris).length;

  return `<div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="sm"><b>${l.length}</b> hesap · <b>${hic}</b> tanesi hiç giriş yapmamış</div>
      <div class="xs dim" style="margin-top:4px">Şifreler burada da görünmez, hiçbir yerde görünmez —
        veritabanında yalnız özetleri duruyor.</div>
    </div>
    ${l.map(h=>`<div class="row" style="padding:8px 0;gap:10px;align-items:flex-start">
      <div class="grow" style="min-width:0">
        <div style="font-weight:600">${esc(h.ad||'(adsız)')}
          ${h.anonim?'<span class="pill">misafir</span>':''}
          ${h.son_giris?'':'<span class="pill red">hiç girmedi</span>'}</div>
        <div class="xs dim">@${esc(h.kullanici||'?')} · ${h.grup_sayisi} grup · ${h.oyuncu_bagli} oyuncu kaydı</div>
        <div class="xs dim" style="opacity:.65">kayıt ${sahipAn(h.kayit)} · son giriş ${h.son_giris?sahipAn(h.son_giris)+' ('+sahipGun(h.son_giris)+')':'—'}</div>
      </div>
    </div>`).join('<div class="sep" style="margin:0 -14px"></div>')}`;
}

/* ---------- silme ---------- */
function sahipSilSor(id,ad,macN,oyN){
  acModal(`<h2 class="serif" style="margin:0 0 4px">${esc(ad)} — Sahip Olarak Sil</h2>
    <div class="xs dim" style="margin-bottom:12px">Geri dönüşü yoktur.</div>
    <div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="xs dim" style="margin-bottom:6px">SİLİNECEKLER</div>
      <div class="sm">· ${oyN} oyuncu kaydı</div>
      <div class="sm">· ${macN} maç ve bütün zabıtları</div>
      <div class="sm">· grubun akışı, iddiaları, borç hesabı, efsaneleri</div>
    </div>
    ${macN>0
      ? `<div class="card tight" style="margin:0 0 12px;border-color:var(--red)">
          <div class="sm" style="color:#D2A08F"><b>Bu grup DOLU.</b> Üyesi olmadığın bir grubun
          ${macN} maçlık sicilini siliyorsun — o insanların kaydı gidiyor. Emin ol.</div></div>`
      : `<div class="uyari" style="margin-bottom:12px">Bu grupta hiç maç yok — <b>boş</b>.
          Yanlışlıkla ikinci kez kurulmuş olması muhtemel.</div>`}
    <div class="field"><label class="fl">Onay için grubun adını yaz</label>
      <input id="shOnay" placeholder="${esc(ad)}" autocapitalize="off"></div>
    <button class="btn-dn btn-full" id="shBtn" style="margin-top:14px"
      onclick="sahipSilOnayla('${id}')">Kalıcı Olarak Sil</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="sahipPanel('gruplar')">Vazgeç</button>`);
}

async function sahipSilOnayla(id){
  const yazilan=($('#shOnay')?.value||'').trim();
  if(!yazilan) return toast('Grubun adını yazman gerekiyor',true);
  const btn=$('#shBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';

  const {data,error}=await sb.rpc('sahip_grup_sil',{p_masa:id,p_ad_onay:yazilan});
  if(error){ btn.disabled=false; btn.textContent='Kalıcı Olarak Sil'; return toast(hataMetni(error),true); }

  /* Kendi aktif grubumu sildiysem uygulamayı toparla */
  if(DB.aktifGrup===id){ DB.aktifGrup=null; try{localStorage.removeItem('kkd_aktif_masa');}catch(e){} SECILI_MAC=null; }
  if(DB.gruplar.some(g=>g.id===id)){
    await verileriGetir();
    DURUM=DB.gruplar.length?'hazir':'masayok';
    if(typeof kanalKur==='function') kanalKur();
  }
  toast((data||'Grup')+' silindi.',true);
  render(); sahipPanel('gruplar');
}
