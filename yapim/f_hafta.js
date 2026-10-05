/* =========================================================
   HAFTALIK ÖZET + EŞ KURASI
   İkisi de tek amaca hizmet ediyor: masanın işini kolaylaştırmak.
   ========================================================= */

/* --------- HAFTA ÖZETİ ---------
   Verilen gün sayısı içindeki celselerden WhatsApp'a yapıştırılacak metin. */
function haftaOzetiUret(gun){
  gun=gun||7;
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const bitis=new Date(), baslangic=new Date(Date.now()-gun*86400000);
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const b0=iso(baslangic), b1=iso(bitis);

  const list=grupCelseleri().filter(c=>c.tarih>=b0&&c.tarih<=b1)
    .sort((a,b)=>(a.tarih+(a._sira||'')).localeCompare(b.tarih+(b._sira||'')));

  const L=[`${g.emoji||''} ${String(g.ad).toLocaleUpperCase('tr-TR')} — ${gun} GÜNLÜK ÖZET`,
           `${trh(b0)} – ${trh(b1)}`,''];
  if(!list.length){
    L.push('Bu dönemde celse görülmemiştir.');
    L.push('Masanın uzun süre kurulmaması, üyelerin sağlığı bakımından kaygı vericidir.');
    return L.join('\n');
  }

  const bat=list.filter(c=>c.oyun==='batak').length, yz=list.length-bat;
  L.push(`${list.length} celse görülmüştür${bat&&yz?` (${bat} Batak, ${yz} 101)`:(bat?' (Batak)':' (101)')}.`);
  L.push('');

  /* celse dökümü */
  L.push('DÖKÜM:');
  list.forEach(c=>{
    if(c.oyun==='batak'){
      const m=batakMac(c), kz=c.kazanan??m.macKazanan??0;
      L.push(`  ${trh(c.tarih)} · Batak — ${liste(c.takimlar[kz].oyuncular.map(ad))} kazandı`+
             `${(m.gTop[0]||m.gTop[1])?` (${m.gTop[kz]}–${m.gTop[1-kz]})`:''}`);
    }else{
      const sr=yzMac(c).sira;
      L.push(`  ${trh(c.tarih)} · 101 — ${ad(sr[0].id)} birinci, ${ad(sr[sr.length-1].id)} sonuncu`);
    }
  });

  /* ara verilen (talik) ve hâlâ süren açık masalar — DÖKÜM biten maçları
     gösteriyor; bunlar ayrı, çünkü henüz zabta geçmediler. */
  const talikKim=c=>{
    if(c.oyun==='batak'&&c.takimlar) return c.takimlar.map(t=>(t.oyuncular||[]).map(ad).join(' & ')).join(' / ');
    return (c.oyuncular||[]).map(ad).join(', ');
  };
  const acikDonem=(DB.acik||[]).filter(c=>!c.tarih||(c.tarih>=b0&&c.tarih<=b1));
  const talikler=acikDonem.filter(c=>c.talik);
  const yuruyen=acikDonem.filter(c=>!c.talik);
  if(talikler.length||yuruyen.length){
    L.push('');
    L.push('MASANIN HÂLİ:');
    talikler.forEach(c=>L.push(`  ⏸️ ${trh(c.tarih)} ${c.oyun==='batak'?'Batak':'101'} — ${talikKim(c)}: ara verildi, `+
      `${c.talik&&c.talik.not?esc(c.talik.not):'kaldığı elden devam edecek'}. Henüz hükme bağlanmamıştır.`));
    yuruyen.forEach(c=>L.push(`  ▶️ ${trh(c.tarih)} ${c.oyun==='batak'?'Batak':'101'} — ${talikKim(c)}: masa hâlâ açık, tabela tutuluyor.`));
  }

  /* dönemin galibi: en çok birincilik */
  const say={};
  list.forEach(c=>{
    if(c.oyun==='batak'){
      const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) return;
      c.takimlar[kz].oyuncular.forEach(id=>say[id]=(say[id]||0)+1);
    }else{
      const sr=yzMac(c).sira; if(sr.length) say[sr[0].id]=(say[sr[0].id]||0)+1;
    }
  });
  const sirali=Object.entries(say).sort((a,b)=>b[1]-a[1]);
  if(sirali.length){
    const en=sirali[0][1];
    const kimler=sirali.filter(([,n])=>n===en).map(([id])=>ad(id));
    L.push('');
    L.push(`ÜSTÜNLÜK: ${liste(kimler)}, dönem içinde ${en} kez kazanmıştır.`);
  }

  /* dönemin sponsoru: en çok sonuncu/kaybeden */
  const kayip={};
  list.forEach(c=>{
    if(c.oyun==='batak'){
      const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) return;
      c.takimlar[1-kz].oyuncular.forEach(id=>kayip[id]=(kayip[id]||0)+1);
    }else{
      const sr=yzMac(c).sira; if(sr.length) { const s=sr[sr.length-1].id; kayip[s]=(kayip[s]||0)+1; }
    }
  });
  const ks=Object.entries(kayip).sort((a,b)=>b[1]-a[1]);
  if(ks.length&&ks[0][1]>0){
    const en=ks[0][1];
    L.push(`SPONSORLUK: ${liste(ks.filter(([,n])=>n===en).map(([id])=>ad(id)))} ${en} kez kaybetmiş, masanın masraflarına katkıda bulunmuştur.`);
  }

  /* dönemde oynanan süre (macSuresi artık p.son'a göre; unutulan maç şişirmez) */
  if(typeof macSuresi==='function'&&typeof SURE_BICIM==='function'){
    const sl=list.map(c=>macSuresi(c).ms).filter(ms=>ms>0);
    if(sl.length){
      const top=sl.reduce((a,b)=>a+b,0);
      L.push('');
      L.push(`SÜRE: Dönemde toplam ${SURE_BICIM(top)} masa başında geçirilmiş; celse başına ortalama ${SURE_BICIM(Math.round(top/sl.length))}.`);
      if(sl.length>1) L.push(`  En uzun celse ${SURE_BICIM(Math.max(...sl))} sürmüştür; sabır kayda geçirilmiştir.`);
    }
  }

  /* borç durumu */
  const t=borcTablosu();
  const borclu=Object.entries(t).filter(([,v])=>v<0)
    .map(([k,v])=>{const i=k.indexOf('|');
      const taraf=tarafKisiler(k.slice(0,i));
      return `${taraf.map(ad).join(' & ')} ${typeof frak==='function'?frak(v):Math.abs(v)} ${k.slice(i+1)}`;});
  if(borclu.length){
    L.push('');
    L.push(`ZİMMET: ${liste(borclu)}. İfa süresi bir sonraki celseye kadardır.`);
  }

  /* dönemde yapılan ödemeler (ifa) */
  const odemeler=(DB.akis||[]).filter(a=>{
    const o=a.veri&&a.veri.odeme; if(!o||!o.ne) return false;
    const d=(a.olusturma||'').slice(0,10); return d>=b0&&d<=b1;
  }).map(a=>a.veri.odeme);
  if(odemeler.length){
    const fr=v=>typeof frak==='function'?frak(v):v;
    L.push('');
    L.push('İFA (ÖDENEN BORÇLAR):');
    odemeler.forEach(o=>{
      const kim=liste(((o.taraf&&o.taraf.length)?o.taraf:[o.kim]).filter(Boolean).map(ad));
      const kime=(Array.isArray(o.alacakli)&&o.alacakli.length)?` ${liste(o.alacakli.map(ad))} lehine`:'';
      L.push(`  • ${kim}, ${fr(o.adet)} ${o.ne}${kime} borcunu ifa etmiştir.`);
    });
    if(odemeler.some(o=>/cin|gin|çay|kahve|soda|bira|rakı|viski|nargile|tost/i.test(o.ne||'')))
      L.push('  Söz konusu ikramlar masaca keyifle tüketilmiş, zimmetler bu ölçüde kapanmıştır.');
  }

  /* açık iddialar */
  const idd=grupIddialari().filter(i=>i.durum==='acik');
  if(idd.length){
    L.push('');
    L.push(`DERDEST İDDİA: ${idd.length} adet.`);
    idd.slice(0,3).forEach(i=>L.push(`  • ${ad(i.kim)}${i.kime?` ↔ ${ad(i.kime)}`:''}: “${i.metin}”`));
  }

  /* unvan sahipleri */
  ['batak','101'].forEach(oy=>{
    const u=muayyideler(oy);
    const sp=u.find(x=>x.ad==='Masanın Sponsoru');
    const em=u.find(x=>x.ad==='Emsal Karar');
    if(!sp&&!em) return;
    L.push('');
    L.push(`${oy==='batak'?'BATAK':'101'} SİCİLİ: ${em?`${unvanAd(em.kim)} önde`:''}${em&&sp?', ':''}${sp?`${unvanAd(sp.kim)} sponsor`:''}.`);
  });

  const en=(typeof elNotlariListe==='function')?elNotlariListe(list,12):[];
  if(en.length){ L.push(''); L.push('EL NOTLARI:'); en.forEach(s=>L.push(`  • ${s}`)); }

  L.push('');
  L.push('Bir sonraki celsenin tarihi taraflarca serbestçe belirlenecektir.');
  return L.join('\n');
}

function haftaOzetiAc(gun){
  const metin=haftaOzetiUret(gun||7);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Dönem Özeti</h2>
    <div class="seg" style="margin:10px 0 12px">
      ${[[7,'Hafta'],[30,'Ay'],[90,'3 Ay']].map(([n,ad2])=>
        `<button class="${(gun||7)===n?'on':''}" onclick="haftaOzetiAc(${n})">${ad2}</button>`).join('')}
    </div>
    <div class="zabit" id="hoMetin" style="font-size:13px">${esc(metin)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="haftaResimAc(${gun||7})">📲 Resim olarak paylaş (WhatsApp)</button>
    <div class="two" style="margin-top:8px">
      <button class="btn-b btn-sm" onclick="kopyala(document.getElementById('hoMetin').textContent)">📋 Kopyala</button>
      <button class="btn-b btn-sm" onclick="kapatModal();haftaRaporAc(${gun||7})">🖨️ PDF / Yazdır</button>
    </div>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="haftaOzetiAkisa(${gun||7})">💬 Akışa da yaz</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>
    <div class="xs dim" style="margin-top:8px;text-align:center">iPhone'da ana ekrana ekli uygulamada yazdırma çalışmayabilir; <b>Resim olarak paylaş</b> her yerde çalışır.</div>`);
}
async function haftaOzetiAkisa(gun){
  const id=await akisEkle('mesaj',haftaOzetiUret(gun),{ozet:'donem',gun});
  if(id){ kapatModal(); render(); toast('Özet akışa yazıldı'); }
}

/* --------- DÖNEM ÖZETİ — PDF / YAZDIR ---------
   Genel Sicil raporuyla aynı baskı altyapısını (RAPOR_STIL + #raporHost +
   window.print) kullanır. Metni haftaOzetiUret'ten alıp mahkeme-kararı
   görünümüne (rkapak/rh2/rmini) çeviriyoruz; tek kaynak haftaOzetiUret. */
function haftaBelgeHtml(gun){
  const g=aktifGrup()||{ad:'Masa',emoji:'🍀'};
  const satlar=haftaOzetiUret(gun||7).split('\n');
  const baslik=(satlar.shift()||'').replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü]+/,'')||'DÖNEM ÖZETİ';
  let govde='';
  satlar.forEach(ham=>{
    const t=ham.trim(); if(!t) return;
    if(/^•/.test(t)){ govde+=`<div class="rmini">• ${esc(t.replace(/^•\s*/,''))}</div>`; return; }
    const m=t.match(/^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 ()]{2,}):\s*(.*)$/);   // BAŞLIK: içerik
    if(m){ govde+=`<h2 class="rh2">${esc(m[1].trim())}</h2>`; if(m[2]) govde+=`<p class="rmini">${esc(m[2])}</p>`; return; }
    if(/^\s/.test(ham)){ govde+=`<div class="rmini">${esc(t)}</div>`; return; }  // girintili alt satır
    govde+=`<p class="rmini">${esc(t)}</p>`;
  });
  return `<div class="rsayfa">
    <div class="rkapak">
      <div class="rmuhur">§</div>
      <div class="rust">${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} MASA DİVANI</div>
      <h1 class="rbaslik">${esc(baslik.toLocaleUpperCase('tr-TR'))}</h1>
      <div class="rmeta">${(typeof raporTarih==='function'?raporTarih():trh(bugun()))}</div>
    </div>
    ${govde}
    <div class="rimza">
      <p>İşbu özet masanın defterine geçirilmiş olup, itirazlar defterin sahibi huzurunda,
        çay demlenmiş iken yapılır.</p>
      <div class="rimzasat">${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} DİVANI ADINA<br>
        <span class="rmuhursat">§ Kara Kaplı Defter</span></div>
    </div>
  </div>`;
}
function haftaRaporAc(gun){
  const eski=document.getElementById('raporHost'); if(eski) eski.remove();
  const host=document.createElement('div'); host.id='raporHost';
  host.innerHTML=`
    <div class="rarac">
      <button class="btn-p btn-sm" onclick="window.print()">🖨️ Yazdır / PDF olarak kaydet</button>
      <button class="btn-gh btn-sm" onclick="raporKapat()">Kapat</button>
    </div>
    <div class="rbelge">${haftaBelgeHtml(gun)}</div>`;
  document.body.appendChild(host);
  if(!document.getElementById('raporStil') && typeof RAPOR_STIL==='string'){
    const st=document.createElement('style'); st.id='raporStil'; st.textContent=RAPOR_STIL;
    document.head.appendChild(st);
  }
  window.scrollTo(0,0);
}

/* --------- DÖNEM ÖZETİ — RESİM (WhatsApp/iOS için) ---------
   iOS'ta ana ekrana ekli PWA'da window.print()/indirme çalışmaz. Skor
   kartının kanıtlanmış yolu: metni SVG'ye dizip PNG'ye çeviriyoruz,
   navigator.share ile WhatsApp'a dosya olarak gidiyor (harici kütüphane yok,
   dış görsel yok → canvas "tainted" olmaz). */
function _haftaSar(metin,enb){
  const kel=String(metin).split(/\s+/), out=[]; let s='';
  kel.forEach(k=>{ if((s+' '+k).trim().length>enb){ if(s) out.push(s); s=k; } else s=(s?s+' ':'')+k; });
  if(s) out.push(s); return out.length?out:[''];
}
function haftaSvgYap(gun){
  const g=aktifGrup()||{ad:'Masa',emoji:'🍀'};
  const ham=haftaOzetiUret(gun||7).split('\n');
  const baslik=(ham.shift()||'').replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü]+/,'')||'DÖNEM ÖZETİ';
  const G=720, P=46, LH=26;
  const vis=[];
  ham.forEach(raw=>{
    const t=raw.trim();
    if(!t){ vis.push({tip:'bos'}); return; }
    const bullet=/^•/.test(t);
    const m=(!bullet)&&t.match(/^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 ()]{2,}):\s*(.*)$/);
    if(m){ vis.push({tip:'bas',t:m[1].trim()});
      if(m[2]) _haftaSar(m[2],60).forEach(l=>vis.push({tip:'p',t:l})); return; }
    const pre=bullet?'•  ':'', body=bullet?t.replace(/^•\s*/,''):t;
    _haftaSar(body,bullet?54:60).forEach((l,i)=>vis.push({tip:bullet?'li':'p',t:(i===0?pre:'   ')+l}));
  });
  const basH=150, botH=86;
  const Y=basH + vis.reduce((s,v)=>s+(v.tip==='bos'?12:(v.tip==='bas'?36:LH)),0) + botH;
  let y=basH, govde='';
  vis.forEach(v=>{
    if(v.tip==='bos'){ y+=12; return; }
    if(v.tip==='bas'){ y+=24; govde+=`<text x="${P}" y="${y}" font-family="Georgia,'Times New Roman',serif" font-size="19" font-weight="700" fill="#8a2f23">${esc(v.t)}</text>`; y+=12; return; }
    govde+=`<text x="${v.tip==='li'?P+6:P}" y="${y}" font-family="system-ui,Arial,sans-serif" font-size="16" fill="#2a2622">${esc(v.t)}</text>`; y+=LH;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
    <rect width="${G}" height="${Y}" fill="#efe9dd"/>
    <rect x="14" y="14" width="${G-28}" height="${Y-28}" fill="none" stroke="#c9bfa8" stroke-width="2"/>
    <text x="${G/2}" y="64" text-anchor="middle" font-family="Georgia,serif" font-size="36" fill="#8a2f23">§</text>
    <text x="${G/2}" y="94" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="13" letter-spacing="2" fill="#6b6256">${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} MASA DİVANI</text>
    <text x="${G/2}" y="124" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="700" fill="#2a2622">${esc(baslik.toLocaleUpperCase('tr-TR'))}</text>
    ${govde}
    <text x="${G/2}" y="${Y-38}" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#8a2f23">§ Kara Kaplı Defter</text>
  </svg>`;
  return {svg,w:G,h:Y};
}
function _svgPng(svg,w,h){
  return new Promise((coz,red)=>{
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}); const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{ try{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      const ctx=cv.getContext('2d'); ctx.fillStyle='#efe9dd'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url); cv.toBlob(b=>b?coz(b):red(new Error('PNG üretilemedi')),'image/png');
    }catch(e){ URL.revokeObjectURL(url); red(e); } };
    img.onerror=()=>{ URL.revokeObjectURL(url); red(new Error('SVG çizilemedi')); };
    img.src=url;
  });
}
let _haftaUrl=null;
async function haftaResimAc(gun){
  acModal(`<h2 class="serif" style="margin:0 0 12px">📸 Dönem Özeti — Görüntü</h2>
    <div class="center" style="padding:24px 0"><span class="yukleniyor"></span>
      <div class="sm dim" style="margin-top:10px">Görüntü hazırlanıyor…</div></div>`);
  let blob;
  try{ const r=haftaSvgYap(gun||7); blob=await _svgPng(r.svg,r.w,r.h); }
  catch(e){ return acModal(`<h2 class="serif" style="margin:0 0 8px">📸 Dönem Özeti</h2>
    <div class="card tight" style="border-color:var(--red)"><div class="sm" style="color:#D2A08F">Görüntü üretilemedi: ${esc(typeof hataMetni==='function'?hataMetni(e):String(e))}</div></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:12px" onclick="kapatModal()">Kapat</button>`); }
  if(_haftaUrl){ try{URL.revokeObjectURL(_haftaUrl);}catch(e){} }
  _haftaUrl=URL.createObjectURL(blob);
  const dosya=new File([blob],`parkverde-ozet-${bugun().replace(/-/g,'')}.png`,{type:'image/png'});
  window._haftaDosya=dosya;
  const paylasabilir=navigator.canShare&&navigator.canShare({files:[dosya]});
  acModal(`<h2 class="serif" style="margin:0 0 10px">📸 Dönem Özeti</h2>
    <img src="${_haftaUrl}" alt="dönem özeti" style="width:100%;border-radius:12px;border:1px solid var(--line);display:block">
    <div class="xs dim" style="margin:8px 0 12px;text-align:center">Görsele <b>uzun bas → Kaydet / Paylaş</b> da yapabilirsin.</div>
    ${paylasabilir?`<button class="btn-g btn-full" onclick="haftaResimPaylas()">📲 WhatsApp'a / Paylaş</button>`:''}
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="haftaResimIndir()">⬇ İndir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
async function haftaResimPaylas(){
  const f=window._haftaDosya; if(!f) return;
  try{ await navigator.share({files:[f], title:'Kara Kaplı Defter', text:'Parkverde dönem özeti 🃏'}); }catch(e){}
}
function haftaResimIndir(){
  if(!_haftaUrl) return;
  const a=document.createElement('a'); a.href=_haftaUrl;
  a.download=(window._haftaDosya&&window._haftaDosya.name)||'parkverde-ozet.png';
  document.body.appendChild(a); a.click(); a.remove();
}

/* --------- EŞ KURASI ---------
   Kura, kadronun tamamından değil O AN MASADA OLANLARDAN çekilir —
   yoksa gelmeyeni de masaya oturtuyordu. Önce "kimler var" sorulur,
   seçim oturum boyunca hatırlanır; "Yeniden çek" aynı kişiler arasında
   tekrar dağıtır, kimlerin olduğunu değiştirmek ayrı düğmede. */
let KURA=null, KURA_MEVCUT=null;

function kuraCek(){
  if(!KURA_MEVCUT||KURA_MEVCUT.length<4) return kuraKimlerAc();
  kuraDagit();
}
function kuraKimlerAc(){
  const oyn=grupOyunculari();
  if(oyn.length<4) return toast('Kura için kadroda en az 4 oyuncu olmalı',true);
  /* Varsayılan: açık bir masada oturmayan herkes. Zaten oynayan biri
     yeni kuraya girmesin. */
  const mesgul=new Set((DB.acik||[]).flatMap(a=>macOyunculari(a)));
  const secili=new Set(KURA_MEVCUT||oyn.filter(o=>!mesgul.has(o.id)).map(o=>o.id));
  acModal(`<div class="center"><div style="font-size:30px">🎲</div>
      <h2 class="serif" style="margin:6px 0 4px">Bugün masada kimler var?</h2>
      <div class="xs dim" style="margin-bottom:14px">Kura yalnız işaretlediklerin arasından çekilir.
        Dört kişiden fazlaysa kalanlar bekleyene yazılır.</div></div>
    <div class="row wrap" id="kmKim">${oyn.map(o=>
      `<div class="chip ${secili.has(o.id)?'on':''}" data-id="${o.id}"
        onclick="this.classList.toggle('on');kuraSayac()">${avatar(o.id,20)}${esc(o.ad)}${
        mesgul.has(o.id)?'<span class="xs dim" style="font-weight:500">· masada</span>':''}</div>`).join('')}</div>
    <div class="xs dim" id="kmSayac" style="margin-top:8px"></div>
    <button class="btn-p btn-full" id="kmBtn" style="margin-top:14px" onclick="kuraMevcutKaydet()">🎲 Kurayı Çek</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
  kuraSayac();
}
function kuraSayac(){
  const n=document.querySelectorAll('#kmKim .chip.on').length;
  const s=$('#kmSayac'), b=$('#kmBtn');
  if(s) s.textContent = n<4 ? `${n} kişi seçili — en az 4 gerekiyor.`
        : (n===4 ? '4 kişi: tam masa, bekleyen olmayacak.'
                 : `${n} kişi: 4'ü oynar, ${n-4} kişi bekler.`);
  if(b) b.disabled = n<4;
}
function kuraMevcutKaydet(){
  const s=[...document.querySelectorAll('#kmKim .chip.on')].map(e=>e.dataset.id);
  if(s.length<4) return toast('En az 4 kişi seç',true);
  KURA_MEVCUT=s;
  kuraDagit();
}
function kuraDagit(){
  const k=KURA_MEVCUT.slice();
  for(let i=k.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [k[i],k[j]]=[k[j],k[i]]; }
  KURA={A:[k[0],k[1]],B:[k[2],k[3]],bekleyen:k.slice(4)};
  kuraGoster();
}
function kuraGoster(){
  if(!KURA) return;
  const uyari=efsaneUyari([KURA.A,KURA.B]);
  acModal(`
    <div class="center"><div style="font-size:34px">🎲</div>
      <h2 class="serif" style="margin:6px 0 4px">Kura Çekildi</h2>
      <div class="xs dim" style="margin-bottom:14px">Kurayı defter çeker; itiraz kabul edilmez.</div></div>
    <div class="card tight" style="margin:0 0 10px;background:var(--panel2)">
      <div class="row" style="gap:8px;padding:4px 0">
        <span class="pill red">A</span>
        <div class="grow" style="font-weight:700;font-size:14px">${esc(KURA.A.map(ad).join(' & '))}</div>
        ${KURA.A.map(id=>avatar(id,26)).join('')}
      </div>
      <div class="sep" style="margin:8px -13px"></div>
      <div class="row" style="gap:8px;padding:4px 0">
        <span class="pill blue">B</span>
        <div class="grow" style="font-weight:700;font-size:14px">${esc(KURA.B.map(ad).join(' & '))}</div>
        ${KURA.B.map(id=>avatar(id,26)).join('')}
      </div>
    </div>
    ${KURA.bekleyen.length?`<div class="card tight" style="margin:0 0 10px">
      <div class="xs dim">Bekleyenler: ${esc(KURA.bekleyen.map(ad).join(', '))}</div></div>`:''}
    <div class="xs dim center" style="margin-bottom:10px">
      Kura ${KURA_MEVCUT.length} kişi arasından çekildi.</div>
    ${uyari}
    <button class="btn-p btn-full" style="margin-top:12px" onclick="kuraylaAc()">Bu kurayla Batak aç</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="kuraDagit()">🎲 Yeniden çek</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kuraKimlerAc()">👥 Kimler var, değiştir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px"
      onclick='kopyala(${JSON.stringify('🎲 Kura çekildi\n')}+"A: "+${JSON.stringify('')}+document.querySelector("#modalHost .card.tight").innerText)'>📋 Kopyala</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
/* kurayı maç kurulumuna taşı: çipleri kuraya göre işaretler */
function kuraylaAc(){
  const s=[...KURA.A,...KURA.B];
  kapatModal();
  celseBaslat('batak');
  setTimeout(()=>{
    s.forEach(id=>{
      const c=document.querySelector(`#mOyuncular .chip[data-id="${id}"]`);
      if(c&&!c.classList.contains('on')) c.click();
    });
  },60);
}
