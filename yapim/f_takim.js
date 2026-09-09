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
  const b=boy||20, f=Math.round(b*0.62);
  return `<span title="${esc(t.ad)}" style="display:inline-flex;align-items:center;justify-content:center;
    width:${b}px;height:${b}px;border-radius:50%;background:var(--panel2);
    border:1.5px solid ${t.halka};font-size:${f}px;line-height:1;vertical-align:middle;flex-shrink:0">${t.amblem}</span>`;
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
          onclick="takimSet('${o.id}','${takimKodu(o.id)===c?'':c}')">${TAKIMLAR[c].amblem} ${c}</button>`).join('')}
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
