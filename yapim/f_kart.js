/* =========================================================
   PAYLAŞILABİLİR SKOR KARTI — "Bu Gece Parkverde"

   İstek (kullanıcı, 09.09.2026): maç kapanınca WhatsApp grubuna
   atılacak GÖRSEL bir kart. Düz metin zabıt zaten var; bu onun
   yanına resim koyuyor.

   NASIL: kart saf SVG olarak çiziliyor (dış görsel YOK — avatarlar
   renkli baş harf daireleri, çünkü Storage'daki foto URL'i canvas'ı
   "tainted" yapıp toBlob'u kırar). SVG bir Blob URL'ine, oradan
   <img>'e, oradan canvas'a, canvas'tan PNG blob'una çevriliyor.
   Sunucu gerekmez, tamamen tarayıcıda.

   PAYLAŞMA: navigator.share destekliyorsa dosya doğrudan paylaşım
   sayfasına (WhatsApp orada çıkar); yoksa indirme + "uzun bas kaydet"
   için görsel modalda gösteriliyor.
   ========================================================= */

/* ---------------------------------------------------------
   YEŞİLÇAM REPLİKLERİ — eski Türk filmi ağzı, masaya serpilir.
   Skor kartı başlığında ve "Masadan Notlar"da 🎬 satırı olarak
   çıkar. Kişiye/gerçeğe gönderme YOK — genel, melodram tonu.
   İstek: kullanıcı, 09.09.2026. --------------------------------- */
const REPLIKLER=[
  "Bu şehir sana da bana da yeter be Kazım.",
  "Zengin de ağlarmış, kaybeden de.",
  "Kağıdın yoksa elinde, kime ne yutturacaksın?",
  "Feleğin çemberinden geçtik, bu masadan geçemedik.",
  "Amorti bile çıkmadı be abi.",
  "Ağlama sevgilim, sadece bir parti kaybettik.",
  "Ben bu masada büyüdüm evladım.",
  "Kaderim buymuş, kozum yokmuş.",
  "Namus meselesi bu, ihaleyi tutacağım.",
  "Bir çay söyle, hesabı sonra konuşuruz.",
  "Paran çoksa masaya otur, yüreğin varsa ihaleye gir.",
  "Sen benim kim olduğumu biliyor musun? Bu masanın sponsoruyum.",
  "Gülüm, bu el senin değildi.",
  "Dünya bir yana, bu koz bir yana.",
  "Kaybettik ama onurumuzla kaybettik.",
  "Beyler, bu masada centilmenlik ölmedi."
];
function replikRast(tohum){
  if(!REPLIKLER.length) return '';
  const t = (tohum==null) ? Math.floor(Math.random()*REPLIKLER.length)
    : Math.abs(String(tohum).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % REPLIKLER.length;
  return REPLIKLER[t];
}

const KART_G = 1080, KART_Y = 1350;

function kartEsc(s){ return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* Bir maçın kart için özeti */
function kartVeri(c){
  const batak = c.oyun==='batak';
  const m = (typeof macDurum==='function') ? macDurum(c) : (batak?batakMac(c):yzMac(c));
  const kz = c.kazanan!=null ? c.kazanan : m.macKazanan;

  let galip=[], maglup=[], skor='', altSkor='';
  if(batak){
    const t=c.takimlar||[];
    if(kz!=null && t.length===2){
      galip=(t[kz].oyuncular||[]).filter(Boolean);
      maglup=(t[1-kz].oyuncular||[]).filter(Boolean);
    }
    const ps=m.partiSkor||[0,0];
    skor = `${ps[kz]||0} – ${ps[1-kz]||0}`;
    altSkor = 'parti';
  }else{
    const sr=m.sira||[];
    if(sr.length){
      galip=[sr[0].id];
      maglup=[sr[sr.length-1].id];
      const top=m.top||{};
      skor = `${top[sr[0].id]??''}`;
      altSkor = `sonuncu ${ad(sr[sr.length-1].id)}`;
    }
  }

  /* rakamlar */
  let el=0; (c.partiler||[]).forEach(p=>el+=(p.eller||[]).length);
  const sure = (typeof macSuresi==='function' && (c.partiler||[]).some(p=>p.basla))
    ? SURE_BICIM(macSuresi(c).ms) : '';
  const kafe = (typeof macKafeToplam==='function') ? macKafeToplam(c) : 0;

  /* çizen / şlem (batak) */
  let cizdi=0;
  (c.partiler||[]).forEach(p=>(p.eller||[]).forEach(e=>{
    if(!e) return;
    const etCizdi = e.etiket && e.etiket.t==='cizdi';
    const hamCizdi = Array.isArray(e.ham) && (Number(e.ham[0])===13 || Number(e.ham[1])===13);
    if(etCizdi || hamCizdi) cizdi++;
  }));

  /* mizahi başlık — maç id tohumuyla sabit */
  const havuz = batak ? [
    'İhale tuttu, masa tutuldu.',
    'Kâğıtlar konuştu, itiraz reddedildi.',
    'Bu masa da tarihe geçti.',
    'Zabıt tutuldu, mazeret tutulmadı.',
    'Kozlar paylaşıldı, hesap açıldı.'
  ] : [
    'Az yazan kazandı, çok yazan ısmarladı.',
    'Sayılar toplandı, sonuncu belli oldu.',
    'Silme yaptı ama yetmedi.',
    'Kürsü doldu, hesap açıldı.',
    'Puanlar konuştu, itiraz olmadı.'
  ];
  const tohum = String(c.id||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
  /* Tek sayılı tohum → Yeşilçam repliği, çift → oyun başlığı; çeşit olsun */
  let baslik = (tohum % 2 === 1) ? replikRast(c.id) : havuz[tohum % havuz.length];
  if(cizdi>0) baslik = `${cizdi} kez çizildi — 13 elin 13'ü.`;

  return {batak,galip,maglup,skor,altSkor,el,sure,kafe,cizdi,baslik,tarih:c.tarih,yer:c.yer};
}

/* renkli baş-harf dairesi (SVG) */
function kartAvatar(id, cx, cy, r){
  const o=(typeof oy==='function')?oy(id):{renk:'#C9A227',ad:'?'};
  const harf=(String(o.ad||'?').trim()[0]||'?').toLocaleUpperCase('tr-TR');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${kartEsc(o.renk||'#C9A227')}"/>`+
    `<text x="${cx}" y="${cy}" fill="#12100F" font-family="Georgia,serif" font-weight="700" `+
    `font-size="${Math.round(r*1.05)}" text-anchor="middle" dominant-baseline="central">${kartEsc(harf)}</text>`;
}

function kartSvg(c){
  const d=kartVeri(c);
  const G=KART_G, Y=KART_Y;
  const orta=G/2;
  const galipAd = liste(d.galip.map(ad));
  const maglupAd = liste(d.maglup.map(ad));

  /* galip avatarları ortalanmış */
  const rA=52, ara=28;
  const n=d.galip.length;
  const genis=n*rA*2+(n-1)*ara;
  let sx=orta-genis/2+rA;
  const avlar=d.galip.map((id,i)=>kartAvatar(id, sx+i*(rA*2+ara), 470, rA)).join('');

  const altBilgi=[];
  if(d.sure) altBilgi.push(`⏱ ${d.sure}`);
  if(d.el)   altBilgi.push(`🃏 ${d.el} el`);
  if(d.kafe) altBilgi.push(`☕ ${d.kafe} ₺`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
  <rect width="${G}" height="${Y}" fill="#12100F"/>
  <rect x="26" y="26" width="${G-52}" height="${Y-52}" fill="none" stroke="#39322D" stroke-width="2" rx="28"/>
  <rect x="26" y="26" width="${G-52}" height="8" fill="#C9A227" rx="4"/>

  <!-- başlık -->
  <circle cx="${orta}" cy="150" r="34" fill="none" stroke="#A32E38" stroke-width="4"/>
  <text x="${orta}" y="150" fill="#A32E38" font-family="Georgia,serif" font-weight="700" font-size="34" text-anchor="middle" dominant-baseline="central">P</text>
  <text x="${orta}" y="228" fill="#A2968A" font-family="Georgia,serif" font-size="26" letter-spacing="4" text-anchor="middle">KARA KAPLI DEFTER</text>
  <text x="${orta}" y="272" fill="#6E635A" font-family="Georgia,serif" font-size="20" letter-spacing="2" text-anchor="middle">PARKVERDE · ${kartEsc(trh(d.tarih))}${d.yer?' · '+kartEsc(d.yer):''}</text>

  <text x="${orta}" y="360" fill="#C9A227" font-family="Georgia,serif" font-weight="700" font-size="30" letter-spacing="6" text-anchor="middle">${d.batak?'BATAK':'101'} · GALİP</text>

  <!-- galip avatarları -->
  ${avlar}

  <!-- galip adı -->
  <text x="${orta}" y="600" fill="#EDE6DC" font-family="Georgia,serif" font-weight="700" font-size="${galipAd.length>18?46:58}" text-anchor="middle">${kartEsc(galipAd)}</text>

  <!-- skor -->
  <text x="${orta}" y="760" fill="#C9A227" font-family="Georgia,serif" font-weight="700" font-size="150" text-anchor="middle">${kartEsc(d.skor)}</text>
  <text x="${orta}" y="815" fill="#6E635A" font-family="Georgia,serif" font-size="24" letter-spacing="3" text-anchor="middle">${kartEsc(d.altSkor)}</text>

  <!-- maglup -->
  ${maglupAd?`<text x="${orta}" y="895" fill="#A2968A" font-family="Georgia,serif" font-size="30" text-anchor="middle">karşısında ${kartEsc(maglupAd)}</text>`:''}

  <!-- mizahi başlık -->
  <line x1="${orta-160}" y1="960" x2="${orta+160}" y2="960" stroke="#39322D" stroke-width="2"/>
  <text x="${orta}" y="1030" fill="#EDE6DC" font-family="Georgia,serif" font-style="italic" font-size="34" text-anchor="middle">${kartEsc(d.baslik)}</text>

  <!-- alt bilgi -->
  ${altBilgi.length?`<text x="${orta}" y="1160" fill="#A2968A" font-family="Georgia,serif" font-size="30" letter-spacing="1" text-anchor="middle">${kartEsc(altBilgi.join('     '))}</text>`:''}

  <text x="${orta}" y="${Y-70}" fill="#4a423b" font-family="Georgia,serif" font-size="22" letter-spacing="2" text-anchor="middle">Kara Kaplı Defter · Batak &amp; 101 Sicili</text>
</svg>`;
}

/* SVG → PNG blob (Promise) */
function kartPng(svg){
  return new Promise((coz,red)=>{
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{
      try{
        const cv=document.createElement('canvas'); cv.width=KART_G; cv.height=KART_Y;
        const ctx=cv.getContext('2d');
        ctx.fillStyle='#12100F'; ctx.fillRect(0,0,KART_G,KART_Y);
        ctx.drawImage(img,0,0,KART_G,KART_Y);
        URL.revokeObjectURL(url);
        cv.toBlob(b=>b?coz(b):red(new Error('PNG üretilemedi')),'image/png');
      }catch(e){ URL.revokeObjectURL(url); red(e); }
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); red(new Error('SVG çizilemedi')); };
    img.src=url;
  });
}

let _kartUrl=null;
async function macKartAc(id){
  const c=(DB.celseler||[]).concat(DB.acik||[]).find(x=>x.id===id);
  if(!c) return toast('Oyun bulunamadı',true);
  acModal(`<h2 class="serif" style="margin:0 0 12px">📸 Skor Kartı</h2>
    <div class="center" style="padding:24px 0"><span class="yukleniyor"></span>
      <div class="sm dim" style="margin-top:10px">Kart hazırlanıyor…</div></div>`);
  let blob;
  try{ blob=await kartPng(kartSvg(c)); }
  catch(e){ return acModal(`<h2 class="serif" style="margin:0 0 8px">📸 Skor Kartı</h2>
    <div class="card tight" style="border-color:var(--red)"><div class="sm" style="color:#D2A08F">Kart üretilemedi: ${esc(hataMetni?hataMetni(e):String(e))}</div></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:12px" onclick="kapatModal()">Kapat</button>`); }

  if(_kartUrl){ try{URL.revokeObjectURL(_kartUrl);}catch(e){} }
  _kartUrl=URL.createObjectURL(blob);
  const dosya=new File([blob],`kara-kapli-defter-${(c.tarih||'').replace(/-/g,'')}.png`,{type:'image/png'});
  const paylasabilir = navigator.canShare && navigator.canShare({files:[dosya]});

  acModal(`<h2 class="serif" style="margin:0 0 10px">📸 Skor Kartı</h2>
    <img src="${_kartUrl}" alt="skor kartı" style="width:100%;border-radius:12px;border:1px solid var(--line);display:block">
    <div class="xs dim" style="margin:8px 0 12px;text-align:center">Telefonda görsele <b>uzun bas → Kaydet / Paylaş</b> da yapabilirsin.</div>
    ${paylasabilir?`<button class="btn-g btn-full" onclick="macKartPaylas('${id}')">📲 WhatsApp'a / Paylaş</button>`:''}
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="macKartIndir('${id}')">⬇ İndir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
  window._kartDosya=dosya;
}
async function macKartPaylas(id){
  const f=window._kartDosya;
  if(!f) return;
  try{
    await navigator.share({files:[f], title:'Kara Kaplı Defter', text:'Bu gece Parkverde 🃏'});
  }catch(e){ /* kullanıcı vazgeçti */ }
}
function macKartIndir(id){
  if(!_kartUrl) return;
  const a=document.createElement('a');
  a.href=_kartUrl; a.download=(window._kartDosya&&window._kartDosya.name)||'kara-kapli-defter.png';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Kart indirildi');
}
