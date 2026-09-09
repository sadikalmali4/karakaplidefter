/* =========================================================
   TUTULAN TAKIMLAR — masaya futbol göndermesi

   İstek (kullanıcı, 09.09.2026): kim hangi takımı tutuyor işlensin,
   mizahi/göndermeli olsun. Varsayılan kadro:
     Beşiktaş: Volkan, Ufuk
     Fenerbahçe: Sadık, Mustafa, Hüseyin, Tuğrul, Emre, Ali
     Galatasaray: Orkun

   VERİ: DB.ayar.takimlar = { oyuncuId: 'FB'|'GS'|'BJK' }. Grup ayarı
   (masalar.ayar JSONB) — DB göçü YOK. Yalnız kurucu değiştirir
   (ayarYaz zaten kurucuya kısık değil ama takimSet kurucuMu ile korur).

   NOT: takım rozetlerinde GS'nin kırmızısı vb. TAKIMIN kendi kimliği —
   uygulamanın "kırmızıyı kaldır" tercihiyle ilgisi yok, kullanıcı bu
   göndermeleri özellikle istedi. Rozetler küçük tutuldu.
   ========================================================= */

/* Takim amblemleri — 128px kare, JPEG. Kullanicinin verdigi gorseller (09.09.2026). */
const AMBLEM_IMG={
  FB:'data:image/jpeg;base64,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',
  GS:'data:image/jpeg;base64,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',
  BJK:'data:image/jpeg;base64,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'
};

const TAKIMLAR={
  FB:  {ad:'Fenerbahçe',  kisa:'FB',  amblem:'🐂', halka:'#2E6FB0', r1:'#164F8C', r2:'#F4D03F', yazi:'#fff',
        laf:['Masa Kadıköy’e taşındı.','Şampiyonluk masada gelir.','Sarı-lacivert sicil tutuyor.']},
  GS:  {ad:'Galatasaray', kisa:'GS',  amblem:'🦁', halka:'#C4143F', r1:'#A4123F', r2:'#F5B301', yazi:'#fff',
        laf:['Sürü içinde tek Aslan.','Tek başına dört yıldız taşıyor.','Aslan masaya kondu.']},
  BJK: {ad:'Beşiktaş',    kisa:'BJK', amblem:'🦅', halka:'#CFCFCF', r1:'#111111', r2:'#e8e8e8', yazi:'#fff',
        laf:['Kartal masaya kondu.','Siyah-beyaz kanatlar açıldı.','Çarşı burada da var.']}
};
/* NOT: gerçek kulüp armaları tescilli/telifli — herkese açık uygulamaya
   gömülmez. Onun yerine takımın MASKOTU (Kanarya/Aslan/Kartal) takım
   renginde halka içinde; hem serbest hem daha görsel. */
function takimAmblemHtml(t,boy){
  const b=boy||24, src=(typeof AMBLEM_IMG!=='undefined')?AMBLEM_IMG[t.kisa]:null;
  if(!src) return '';
  return `<img src="${src}" alt="${esc(t.ad)}" title="${esc(t.ad)}"
    style="width:${b}px;height:${b}px;border-radius:50%;object-fit:cover;
    border:2px solid ${t.halka};vertical-align:middle;flex-shrink:0;background:#000;box-shadow:0 1px 3px #0007">`;
}
const TAKIM_VARSAYILAN={  // isimle eşleşen hazır kadro
  'volkan':'BJK','ufuk':'BJK',
  'sadık':'FB','sadik':'FB','mustafa':'FB','hüseyin':'FB','huseyin':'FB','tuğrul':'FB','tugrul':'FB','emre':'FB','ali':'FB',
  'orkun':'GS'
};

function takimHaritasi(){ return (DB.ayar && DB.ayar.takimlar) || {}; }
function takimKodu(id){ return takimHaritasi()[id]||''; }
function takimBilgi(id){ const k=takimKodu(id); return k?TAKIMLAR[k]:null; }

/* küçük rozet — iki renkli pill */
function takimRozet(id,boy){
  const t=takimBilgi(id); if(!t) return '';
  return takimAmblemHtml(t,boy||20);
}

/* koda göre rozet (oyuncu değil takım) */
function takimRozetKod(kod,boy){
  const t=TAKIMLAR[kod]; if(!t) return '';
  return takimAmblemHtml(t,boy||22);
}

async function takimSet(id,kod){
  if(!kurucuMu()) return toast('Takımı yalnız grubu kuran atar',true);
  if(!DB.ayar.takimlar) DB.ayar.takimlar={};
  if(kod) DB.ayar.takimlar[id]=kod; else delete DB.ayar.takimlar[id];
  await ayarYaz(true);
  render();
}
async function takimParkverdeAta(){
  if(!kurucuMu()) return toast('Yalnız grubu kuran atayabilir',true);
  if(!DB.ayar.takimlar) DB.ayar.takimlar={};
  let n=0;
  DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif).forEach(o=>{
    const k=TAKIM_VARSAYILAN[String(o.ad||'').toLocaleLowerCase('tr-TR').trim()];
    if(k && !DB.ayar.takimlar[o.id]){ DB.ayar.takimlar[o.id]=k; n++; }
  });
  if(!n) return toast('Eşleşen yeni oyuncu yok (adlar tutmuyor olabilir)',true);
  await ayarYaz(true); render();
  toast(`${n} oyuncuya takımı atandı`,true);
}

/* Ayarlar kartı */
function takimKart(){
  const k=kurucuMu();
  const oyn=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif);
  if(!oyn.length) return '';
  const kodlar=['FB','GS','BJK'];
  return `<div class="card">
    <h3>⚽ Tuttuğu Takımlar</h3>
    <div class="xs dim" style="margin-bottom:10px">Masaya futbol göndermesi — sicilde, kartta ve notlarda görünür.
      ${k?'Her oyuncuya bir takım seç.':'Takımları grubu kuran atar.'}</div>
    ${oyn.map(o=>`<div class="row" style="padding:7px 0;gap:9px;align-items:center">
      ${avatar(o.id,28)}
      <div class="grow ell" style="font-weight:600;font-size:13.5px">${esc(o.ad)} ${takimRozet(o.id)}</div>
      ${k?`<div class="row" style="gap:4px;flex-shrink:0">
        ${kodlar.map(c=>`<button class="btn-xs ${takimKodu(o.id)===c?'btn-g':'btn-gh'}" style="padding:4px 8px"
          onclick="takimSet('${o.id}','${takimKodu(o.id)===c?'':c}')">${c}</button>`).join('')}
      </div>`:''}
    </div>`).join('<div class="sep" style="margin:0 -14px"></div>')}
    ${k?`<button class="btn-b btn-full btn-sm" style="margin-top:12px" onclick="takimParkverdeAta()">⚡ Parkverde Kadrosunu Ata</button>
      <div class="xs dim" style="margin-top:6px">Bilinen isimleri (Volkan/Ufuk Beşiktaş, Orkun Galatasaray, gerisi Fenerbahçe)
        tek dokunuşla atar; elle koyduklarına dokunmaz.</div>`:''}
  </div>`;
}

/* Sicil'de "Takım Ligi" — hangi takımın tuttuğu masada daha çok kazanıyor */
function takimLigi(){
  const har=takimHaritasi();
  if(!Object.keys(har).length) return '';
  const b=istatistik('batak'), y=istatistik('101');
  const T={};
  Object.entries(har).forEach(([id,kod])=>{
    if(!TAKIMLAR[kod]) return;
    const t=T[kod]=T[kod]||{kod,gal:0,mac:0,kisi:0};
    const pb=b[id], py=y[id];
    if(pb){ t.gal+=pb.gal; t.mac+=pb.celse; }
    if(py){ t.gal+=py.gal; t.mac+=py.celse; }
    t.kisi++;
  });
  const l=Object.values(T).filter(t=>t.mac>0).sort((a,b)=>(b.gal/b.mac)-(a.gal/a.mac));
  if(!l.length) return '';
  const lider=l[0], t=TAKIMLAR[lider.kod];
  const alt = l.length>1
    ? `${t.ad}, masanın zirvesinde — ${rast(t.laf)}`
    : `Masada tek takım var: ${t.ad}.`;
  return `<div class="card">
    <h3>⚽ Takım Ligi</h3>
    <div class="xs dim" style="margin-bottom:10px">Hangi takımın tuttuğu bu masada daha çok kazanıyor? (batak + 101)</div>
    ${l.map((x,i)=>{const tk=TAKIMLAR[x.kod], o=x.mac?Math.round(x.gal/x.mac*100):0;
      return `<div class="row" style="padding:8px 0;gap:10px;align-items:center">
      <span class="rank ${i===0?'r1':''}">${i+1}</span>
      ${takimRozetKod(x.kod,12)}
      <div class="grow" style="min-width:0">
        <div style="font-weight:600;font-size:13.5px">${esc(tk.ad)}
          <span class="xs dim" style="font-weight:400">${x.kisi} kişi</span></div>
        <div class="bar" style="margin-top:5px;height:6px"><i style="width:${o}%;background:${tk.r1==='#111111'?'#888':tk.r1}"></i></div>
      </div>
      <div class="serif" style="font-size:18px;color:var(--gold);min-width:44px;text-align:right">%${o}</div>
    </div>`;}).join('<div class="sep" style="margin:0 -14px"></div>')}
    <div class="xs dim" style="margin-top:9px;font-style:italic">${esc(alt)}</div>
  </div>`;
}

/* Masadan Notlar için takım satırları (f_istatistik çağırır) */
function takimNotlari(){
  const har=takimHaritasi(); const out=[];
  const say={}; Object.values(har).forEach(k=>{ if(TAKIMLAR[k]) say[k]=(say[k]||0)+1; });
  const kodlar=Object.keys(say);
  if(kodlar.length>=2){
    const dok=kodlar.sort((a,b)=>say[b]-say[a]).map(k=>`${say[k]} ${TAKIMLAR[k].kisa}`).join(', ');
    out.push({i:'⚽',m:`Masada ${dok} var — <b>her el bir derbi</b>.`});
  }else if(kodlar.length===1){
    const k=kodlar[0];
    out.push({i:'⚽',m:`Masanın tamamı <b>${TAKIMLAR[k].ad}</b>. ${esc(rast(TAKIMLAR[k].laf))}`});
  }
  return out;
}
