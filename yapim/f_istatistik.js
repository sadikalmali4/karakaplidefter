/* =========================================================
   MASADAN NOTLAR — akıştaki istatistik kartı + ek ünvanlar

   İstek (kullanıcı, 07.09.2026): "değişik istatistiki bilgileri de ver
   akışta, ayrıca mizahi ünvanlar falan güzelce ayarla".

   İLKE: hiçbir şey uydurulmuyor. Her satır mevcut kayıttan çıkıyor;
   veri yoksa satır hiç görünmüyor. Süre isteyen satırlar damgası olan
   maçlara bakıyor (03.09.2026'dan öncesinde damga yok).

   ROTASYON: her açılışta beş satır gösteriliyor. Sıra GÜNE göre
   sabitlenmiş — aynı gün içinde ekran her çizildiğinde aynı beşi
   görürsün (render'da zıplamasın), ertesi gün başkaları gelir.
   "🎲 Başka" düğmesi elle çevirir.
   ========================================================= */

let IST_KAYDIR = 0;

/* Gün numarası — rotasyonu gün içinde sabit tutan tohum */
const istGunNo = () => Math.floor(Date.now() / 86400000);

const istSaat = t => { const d = new Date(t || 0); return isNaN(d) ? -1 : d.getHours(); };
const istGunAd = t => { const d = new Date(t || 0);
  return isNaN(d) ? '' : ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][d.getDay()]; };

/* En çok tekrar edeni bul: [{anahtar, n}] */
function istEnCok(sayac){
  const l=Object.entries(sayac).map(([k,n])=>({k,n})).sort((a,b)=>b.n-a.n);
  return l.length?l[0]:null;
}

function masaNotlari(){
  const c=grupCelseleri();
  const N=[];                                   // {i:ikon, m:metin}
  const ek=(i,m)=>{ if(m) N.push({i,m}); };
  if(!c.length) return N;

  const batak=c.filter(x=>x.oyun==='batak'), yz=c.filter(x=>x.oyun!=='batak');

  /* --- hacim --- */
  ek('🗂️',`Bu deftere <b>${c.length}</b> oyun işlendi — ${batak.length} batak, ${yz.length} 101.`);

  let el=0; c.forEach(x=>(x.partiler||[]).forEach(p=>el+=(p.eller||[]).length));
  if(el) ek('🃏',`Toplam <b>${el}</b> el yazıldı. Her biri ayrı ayrı zabıta geçti.`);

  let parti=0; c.forEach(x=>parti+=(x.partiler||[]).length);
  if(parti) ek('📑',`<b>${parti}</b> parti oynandı; maç başına ${(parti/c.length).toFixed(1)}.`);

  /* --- takvim --- */
  const ilk=c.slice().sort((a,b)=>String(a.tarih).localeCompare(String(b.tarih)))[0];
  if(ilk&&ilk.tarih){
    const gun=Math.floor((Date.now()-new Date(ilk.tarih).getTime())/86400000);
    if(gun>0) ek('📅',`İlk celse <b>${trh(ilk.tarih)}</b>. O günden bu yana ${gun} gün geçti.`);
  }
  const gunS={}; c.forEach(x=>{ const g=istGunAd(x.tarih); if(g) gunS[g]=(gunS[g]||0)+1; });
  const eg=istEnCok(gunS);
  if(eg&&eg.n>1) ek('🗓️',`En çok <b>${eg.k}</b> günü oynanıyor (${eg.n} kez). Alışkanlık kayda geçmiştir.`);

  const yerS={}; c.forEach(x=>{ if(x.yer) yerS[x.yer]=(yerS[x.yer]||0)+1; });
  const ey=istEnCok(yerS);
  if(ey&&ey.n>1) ek('📍',`Masanın yurdu <b>${esc(ey.k)}</b> — ${ey.n} oyun orada oynandı.`);

  /* --- saat --- */
  const geceler=c.filter(x=>{ const s=istSaat(x.olusturma); return s>=0&&(s>=23||s<4); });
  if(geceler.length) ek('🌙',`<b>${geceler.length}</b> oyun gece yarısını gördü. Uyku savunması dinlenmemiştir.`);
  const enGec=c.slice().filter(x=>istSaat(x.olusturma)>=0)
    .sort((a,b)=>{ const f=s=>{const h=istSaat(s.olusturma); return h<6?h+24:h;}; return f(b)-f(a); })[0];
  if(enGec){ const h=istSaat(enGec.olusturma);
    ek('🕛',`En geç açılan masa saat <b>${String(h).padStart(2,'0')}:00</b> civarı. ${trh(enGec.tarih)}.`); }

  /* --- süre --- */
  if(typeof macSuresi==='function'){
    const sl=c.filter(x=>(x.partiler||[]).some(p=>p.basla)).map(x=>({x,ms:macSuresi(x).ms}))
             .filter(o=>o.ms>0);
    if(sl.length){
      const top=sl.reduce((a,o)=>a+o.ms,0);
      ek('⏱️',`Bu masada toplam <b>${SURE_BICIM(top)}</b> oynandı (${sl.length} ölçülü oyun).`);
      const uzun=sl.slice().sort((a,b)=>b.ms-a.ms)[0];
      ek('🐘',`En uzun oyun <b>${SURE_BICIM(uzun.ms)}</b> sürdü — ${trh(uzun.x.tarih)}. Bitmemesi için direnilmiştir.`);
      const kisa=sl.slice().sort((a,b)=>a.ms-b.ms)[0];
      if(sl.length>1) ek('🐇',`En kısa oyun <b>${SURE_BICIM(kisa.ms)}</b>. ${trh(kisa.x.tarih)} — kimse ısınamadı.`);
      ek('📐',`Oyun başına ortalama <b>${SURE_BICIM(top/sl.length)}</b>.`);
    }
  }

  /* --- tabelacı --- */
  const tS={}; c.forEach(x=>{ if(x.tabelaci) tS[x.tabelaci]=(tS[x.tabelaci]||0)+1; });
  const et=istEnCok(tS);
  if(et&&et.n>1) ek('✍️',`Kalemi en çok <b>${esc(ad(et.k))}</b> tuttu — ${et.n} oyun. Zabıt kâtipliği fiilî hâle gelmiştir.`);
  const hicTutmayan=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&!tS[o.id]);
  if(hicTutmayan.length&&c.length>3)
    ek('🙅',`Hiç tabela tutmayan: <b>${esc(liste(hicTutmayan.map(o=>o.ad)))}</b>. Mazeretleri dosyada yoktur.`);

  /* --- çıkıştırma / şlem / notlar --- */
  const cikis=c.filter(x=>(x.partiler||[]).length>=3);
  if(cikis.length) ek('🔥',`<b>${cikis.length}</b> oyun çıkıştırmaya kaldı. Sinir sistemi masanın malıdır.`);

  let notSay=0, cizdi=0;
  c.forEach(x=>(x.partiler||[]).forEach(p=>(p.eller||[]).forEach(e=>{
    if(e&&e.etiket){ notSay++; if(e.etiket.t==='cizdi') cizdi++; } })));
  if(notSay) ek('🎭',`Ellere <b>${notSay}</b> şerh düşüldü. Mizah da arşive girer.`);
  if(cizdi) ek('🖐️',`<b>${cizdi}</b> kez çizildi — 13 elin 13'ü. Karşı taraf ihalesi kadar batmıştır.`);

  /* --- eş / rakip --- */
  const esS={}, rkS={};
  batak.forEach(x=>{
    const t=x.takimlar||[]; if(t.length!==2) return;
    t.forEach(tk=>{ const o=(tk.oyuncular||[]).filter(Boolean).slice().sort();
      if(o.length===2) esS[o.join('|')]=(esS[o.join('|')]||0)+1; });
    const a=(t[0].oyuncular||[]).filter(Boolean), b2=(t[1].oyuncular||[]).filter(Boolean);
    a.forEach(x1=>b2.forEach(y1=>{ const k=[x1,y1].sort().join('|'); rkS[k]=(rkS[k]||0)+1; }));
  });
  const ee=istEnCok(esS);
  if(ee&&ee.n>1) ek('🤝',`En sık eş: <b>${esc(ee.k.split('|').map(ad).join(' & '))}</b> — ${ee.n} maç birlikte.`);
  const er=istEnCok(rkS);
  if(er&&er.n>2) ek('🗡️',`En sık karşı karşıya gelen: <b>${esc(er.k.split('|').map(ad).join(' – '))}</b>, ${er.n} kez.`);

  /* --- kalabalık --- */
  const enKalabalik=yz.slice().sort((a,b)=>(b.oyuncular||[]).length-(a.oyuncular||[]).length)[0];
  if(enKalabalik&&(enKalabalik.oyuncular||[]).length>4)
    ek('👥',`En kalabalık 101 masası <b>${enKalabalik.oyuncular.length}</b> kişiydi (${trh(enKalabalik.tarih)}).`);

  /* --- bahis / borç --- */
  if(typeof bahisBorcluKalemler==='function'){
    const kalem={};
    c.forEach(x=>bahisBorcluKalemler(x.bahis).forEach(k=>kalem[k.ne]=(kalem[k.ne]||0)+k.adet));
    const ekz=istEnCok(kalem);
    if(ekz) ek('🥃',`En çok oynanan bahis <b>${esc(ekz.k)}</b> — toplam ${ekz.n} adet el değiştirdi.`);
  }

  /* --- kafe --- */
  let kafeTop=0, kafeKalem=0;
  c.forEach(x=>(x.kafe||[]).forEach(k=>{ kafeTop+=(Number(k.fiyat)||0)*(Number(k.adet)||0); kafeKalem+=(Number(k.adet)||0); }));
  if(kafeKalem) ek('☕',`Masaya <b>${kafeKalem}</b> kalem söylendi${kafeTop?` — menü fiyatıyla ${mocksTL?mocksTL(kafeTop):kafeTop+' ₺'}`:''}.`);

  /* --- Yeşilçam repliği: gün tohumuyla sabit, her gün başkası --- */
  if(typeof replikRast==='function'){
    const r=replikRast('gun'+istGunNo()+(DB.aktifGrup||''));
    if(r) ek('🎬',`<i>"${r}"</i>`);
  }

  /* --- akış --- */
  const ak=(DB.akis||[]).filter(a=>a.grupId===DB.aktifGrup);
  if(ak.length>3){
    const yS={}; ak.forEach(a=>{ if(a.yazan) yS[a.yazan]=(yS[a.yazan]||0)+1; });
    const ey2=istEnCok(yS);
    ek('💬',`Akışa <b>${ak.length}</b> kayıt girildi${ey2?`; en çok yazan ${esc(akisKisi(ey2.k)?.ad||ad(ey2.k))} (${ey2.n})`:''}.`);
  }

  return N;
}

function istatistikKart(){
  const N=masaNotlari();
  if(!N.length) return '';
  const n=Math.min(5,N.length);
  const bas=((istGunNo()+IST_KAYDIR)%N.length+N.length)%N.length;
  const gos=[]; for(let i=0;i<n;i++) gos.push(N[(bas+i)%N.length]);

  return `<div class="card">
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">📊 Masadan Notlar</h3>
      ${N.length>n?`<button class="btn-xs btn-gh" onclick="IST_KAYDIR+=${n};render()">🎲 Başka</button>`:''}
    </div>
    ${gos.map(x=>`<div class="row" style="gap:9px;padding:5px 0;align-items:flex-start">
      <span style="font-size:15px;flex-shrink:0;width:20px;text-align:center">${x.i}</span>
      <span class="sm" style="line-height:1.45">${x.m}</span>
    </div>`).join('')}
    <div class="xs dim" style="margin-top:8px">${N.length} not var, ${n} tanesi gösteriliyor.
      Hepsi kayıttan çıkıyor — uydurma yok.</div>
  </div>`;
}


/* =========================================================
   EK ÜNVANLAR — oyundan bağımsız (süre, şerh, eş/rakip, devamsızlık)
   genelMuayyideler() bunları sonuna ekliyor.
   ========================================================= */
function ekUnvanlar(){
  const out=[], c=grupCelseleri();
  if(!c.length) return out;
  const ek=(k,ad2,kim,acik,tip)=>{ if(kim&&kim.length) out.push({k,ad:ad2,kim,aciklama:acik,tip:tip||'iyi'}); };

  /* --- süre temelli --- */
  if(typeof kisiSureleri==='function'){
    const {d}=kisiSureleri();
    const ids=Object.keys(d).filter(i=>d[i].toplam>0);
    if(ids.length){
      const enb=f=>{ const m=Math.max(...ids.map(f)); return m>0?ids.filter(i=>f(i)===m):null; };
      const tk=enb(i=>d[i].toplam);
      ek('⏳','Masanın Demirbaşı',tk,tk&&`Masada ${SURE_BICIM(d[tk[0]].toplam)} geçirdi. Sandalye kendisini tanımaktadır.`);
      const ort=i=>{ const n=d[i].macB+d[i].macY; return n?d[i].toplam/n:0; };
      const uz=enb(ort);
      if(uz&&ids.length>1) ek('🐌','Maç Uzatan',uz,`Maç başına ${SURE_BICIM(ort(uz[0]))}. Aceleye getirmemek bir sanattır.`);
    }
  }

  /* --- gece bekçisi: en geç saatte açılan masada oturanlar --- */
  const gecel=c.filter(x=>{ const h=istSaat(x.olusturma); return h>=0; })
    .sort((a,b)=>{ const f=s=>{const h=istSaat(s.olusturma); return h<6?h+24:h;}; return f(b)-f(a); });
  if(gecel.length){
    const g=gecel[0], h=istSaat(g.olusturma);
    if(h>=23||h<5){
      const kim=(typeof macKatilanlar==='function')?macKatilanlar(g):[];
      ek('🌙','Gece Bekçisi',kim,`Saat ${String(h).padStart(2,'0')} civarı masa açtılar (${trh(g.tarih)}). Sabah mazereti kabul edilmez.`);
    }
  }

  /* --- şerh: en çok el notu ALAN --- */
  const serh={};
  c.forEach(x=>(x.partiler||[]).forEach(p=>(p.eller||[]).forEach(e=>{
    if(e&&e.etiket&&e.etiket.oy) serh[e.etiket.oy]=(serh[e.etiket.oy]||0)+1; })));
  const sk=Object.keys(serh);
  if(sk.length){
    const m=Math.max(...sk.map(i=>serh[i]));
    if(m>=2) ek('🎭','Şerh Kahramanı',sk.filter(i=>serh[i]===m),
      `${m} el hakkında şerh düşüldü. Adı en çok geçen sanıktır.`);
  }

  /* --- eş / rakip --- */
  const esS={}, rkS={};
  c.filter(x=>x.oyun==='batak').forEach(x=>{
    const t=x.takimlar||[]; if(t.length!==2) return;
    t.forEach(tk=>{ const o=(tk.oyuncular||[]).filter(Boolean).slice().sort();
      if(o.length===2) esS[o.join('|')]=(esS[o.join('|')]||0)+1; });
    const a=(t[0].oyuncular||[]).filter(Boolean), b=(t[1].oyuncular||[]).filter(Boolean);
    a.forEach(x1=>b.forEach(y1=>{ const k=[x1,y1].sort().join('|'); rkS[k]=(rkS[k]||0)+1; }));
  });
  const ee=istEnCok(esS);
  if(ee&&ee.n>=3) ek('🤝','Kader Ortakları',ee.k.split('|'),
    `${ee.n} maç aynı tarafta. Ayrılıkları ihtimalden uzaktır.`);
  const er=istEnCok(rkS);
  if(er&&er.n>=4) ek('🗡️','Ezeli Rakipler',er.k.split('|'),
    `${er.n} kez karşı karşıya. Husumet dostluk sayılmaktadır.`);

  /* --- kayıp şahıs: en uzun süredir gelmeyen --- */
  const son={};
  c.forEach(x=>{ const t=String(x.tarih||'');
    ((typeof macKatilanlar==='function')?macKatilanlar(x):[]).forEach(i=>{
      if(!son[i]||t>son[i]) son[i]=t; }); });
  const uyeler=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup);
  const gecen=t=>Math.floor((Date.now()-new Date(t).getTime())/86400000);
  const kayip=uyeler.filter(o=>son[o.id]&&gecen(son[o.id])>=21)
    .sort((a,b)=>gecen(son[b.id])-gecen(son[a.id]));
  if(kayip.length&&uyeler.length>2)
    ek('🔍','Kayıp Şahıs',[kayip[0].id],
      `${gecen(son[kayip[0].id])} gündür masaya oturmadı. Aranması kararlaştırılmıştır.`,'kotu');

  return out;
}
