/* =========================================================
   REKORLAR KİTABI — masanın sayısal efsaneleri
   Efsaneler hikâyeyi, bu sayfa rakamı tutar.
   ========================================================= */
function rekorlar(oyun){
  const R=[];
  const list=grupCelseleri().filter(c=>c.oyun===oyun);
  if(!list.length) return R;
  const ekle=(k,baslik,deger,kim,not,tarih)=>{
    if(deger==null) return;
    R.push({k,baslik,deger,kim:Array.isArray(kim)?kim:[kim],not,tarih});
  };

  if(oyun==='batak'){
    /* en ağır fark: maç toplam puan farkı */
    let f=null;
    list.forEach(c=>{
      const m=batakMac(c), kz=c.kazanan??m.macKazanan??0;
      const d=m.gTop[kz]-m.gTop[1-kz];
      if(!(m.gTop[0]||m.gTop[1])) return;                 // puan yazılmamış
      if(!f||d>f.d) f={d,c,kz,kazandi:m.gTop[kz],kaybetti:m.gTop[1-kz]};
    });
    if(f) ekle('💣','En ağır fark',`${f.kazandi} – ${f.kaybetti}`,
      f.c.takimlar[f.kz].oyuncular,
      `${liste(f.c.takimlar[1-f.kz].oyuncular.map(ad))} karşısında. Aradaki ${f.d} puanlık uçurum `+
      `${f.kaybetti<0?'karşı tarafın EKSİDE bitirmesiyle':'tek celsede'} oluşmuş; `+
      `sonuç dillere destan olmuş, bugüne kadar aşılamamıştır. `+
      `Kaybeden tarafın "kağıt gelmedi" savunması reddedilmiştir.`,f.c.tarih);

    /* en ağır batak: ihale - alınan */
    let b=null;
    list.forEach(c=>batakTumEller(c).forEach(el=>{
      const d=el.ihale-el.alinan;
      if(d>0&&(!b||d>b.d)) b={d,el,c};
    }));
    if(b) ekle('🕳️','En ağır batak',`${b.el.ihale} ihale · ${b.el.alinan} el`,
      b.c.takimlar[b.el.ihaleTakim].oyuncular,
      `${b.d} el eksik. "Az kalmıştı" savunması dinlenmemiştir.`,b.c.tarih);

    /* en yüksek ihale (tutan) */
    let y=null;
    list.forEach(c=>batakTumEller(c).forEach(el=>{
      if(el.alinan>=el.ihale&&(!y||el.ihale>y.el.ihale)) y={el,c};
    }));
    if(y) ekle('🎯','Tutturulan en yüksek ihale',`${y.el.ihale}`,
      y.c.takimlar[y.el.ihaleTakim].oyuncular,'Beyanın arkasında durulmuştur.',y.c.tarih);

    /* şlem sayısı */
    const st=istatistik('batak');
    const sl=Object.values(st).filter(p=>p.slem>0).sort((a,b)=>b.slem-a.slem);
    if(sl.length) ekle('🧨','En çok şlem',`${sl[0].slem}`,
      sl.filter(p=>p.slem===sl[0].slem).map(p=>p.id),'Masaya tek el bırakmama sanatı.');

    /* tek partide en yüksek puan */
    let tp=null;
    list.filter(c=>c.giris==='detay').forEach(c=>c.partiler.forEach(p=>{
      const {top}=batakPartiToplam(p);
      [0,1].forEach(i=>{ if(!tp||top[i]>tp.v) tp={v:top[i],c,ti:i}; });
    }));
    if(tp&&tp.v>0) ekle('🚀','Tek partide en yüksek puan',`${tp.v}`,
      tp.c.takimlar[tp.ti].oyuncular,'Hedef aşılmıştır.',tp.c.tarih);
  }else{
    /* tek elde en ağır ceza */
    let a=null;
    list.forEach(c=>(c.partiler||[]).forEach(p=>(p.eller||[]).forEach(el=>{
      (c.oyuncular||[]).forEach(id=>{
        const v=yzElPuan(el,id);
        if(v>0&&(!a||v>a.v)) a={v,id,c};
      });
    })));
    if(a) ekle('🐢','Tek elde en ağır ceza',`+${a.v}`,a.id,'Rekor kendisindedir.',a.c.tarih);

    /* maç sonu en yüksek (kötü) ve en düşük (iyi) toplam */
    let en=null,az=null;
    list.forEach(c=>{
      const sr=yzMac(c).sira;
      if(!sr.length) return;
      const s=sr[sr.length-1], i=sr[0];
      if(s.puan!=null&&(!en||s.puan>en.v)) en={v:s.puan,id:s.id,c};
      if(i.puan!=null&&(!az||i.puan<az.v)) az={v:i.puan,id:i.id,c};
    });
    if(en) ekle('💸','Maç sonu en yüksek ceza',`${en.v}`,en.id,'Masayı fiilen finanse etmiştir.',en.c.tarih);
    if(az) ekle('🧊','Maç sonu en düşük puan',`${az.v}`,az.id,'Kusursuz icra.',az.c.tarih);

    /* en çok el bitirme (tek maçta) */
    let eb=null;
    list.filter(c=>c.giris==='detay').forEach(c=>{
      const say={};
      c.partiler.forEach(p=>p.eller.forEach(el=>(c.oyuncular||[]).forEach(id=>{
        if(el.durum[id]?.tip==='bitirdi') say[id]=(say[id]||0)+1; })));
      Object.entries(say).forEach(([id,n])=>{ if(!eb||n>eb.n) eb={n,id,c}; });
    });
    if(eb) ekle('✂️','Bir maçta en çok el bitirme',`${eb.n}`,eb.id,'Masaya merhamet gösterilmemiştir.',eb.c.tarih);

    /* en çok silme (tek maçta) */
    let sm=null;
    list.filter(c=>c.giris==='detay').forEach(c=>{
      const say={};
      c.partiler.forEach(p=>p.eller.forEach(el=>(c.oyuncular||[]).forEach(id=>{
        if(el.durum[id]?.silme) say[id]=(say[id]||0)+1; })));
      Object.entries(say).forEach(([id,n])=>{ if(!sm||n>sm.n) sm={n,id,c}; });
    });
    if(sm) ekle('🧹','Bir maçta en çok silme',`${sm.n}`,sm.id,'Hane temizliği ustalığı.',sm.c.tarih);
  }

  /* eş analizi (yalnız Batak) */
  if(oyun==='batak'){
    const es=esSicil().filter(r=>r.g+r.mgl>=2);
    const iyi=es.slice().sort((a,b)=>(b.g-b.mgl)-(a.g-a.mgl))[0];
    const kot=es.slice().sort((a,b)=>(a.g-a.mgl)-(b.g-b.mgl))[0];
    const cok=es.slice().sort((a,b)=>(b.g+b.mgl)-(a.g+a.mgl))[0];
    if(iyi&&iyi.g>iyi.mgl) ekle('🫂','En uyumlu eş',`${iyi.g}–${iyi.mgl}`,[iyi.x,iyi.y],
      'Birbirini gözünden anlamaktadırlar. Masa bu ikilinin ayrılmasını talep etmektedir.');
    if(kot&&kot.mgl>kot.g) ekle('🪦','En uğursuz eş',`${kot.g}–${kot.mgl}`,[kot.x,kot.y],
      'Ayrı ayrı iyi oynarlar; birlikte oynadıklarında masaya ikram ederler.');
    if(cok) ekle('⛓️','En çok eş düşenler',`${cok.g+cok.mgl} maç`,[cok.x,cok.y],
      'Kader birliği. Kurayı kim çekiyorsa soruşturulmalıdır.');
  }

  /* iki oyunda da geçerli */
  const st=istatistik(oyun);
  const v=Object.values(st).filter(p=>p.celse>0);
  const ser=v.filter(p=>p.seriTip==='gal').sort((a,b)=>b.seri-a.seri)[0];
  if(ser&&ser.seri>=2) ekle('🔥','En uzun galibiyet serisi',`${ser.seri} maç`,ser.id,'Hâlen sürmektedir.');
  const has=v.filter(p=>p.seriTip==='hasret').sort((a,b)=>b.seri-a.seri)[0];
  if(has&&has.seri>=2) ekle('📉','En uzun galibiyet hasreti',`${has.seri} maç`,has.id,'Dosya derdesttir.');
  const dev=v.slice().sort((a,b)=>b.celse-a.celse)[0];
  if(dev) ekle('🪑','En çok maç',`${dev.celse}`,
    v.filter(p=>p.celse===dev.celse).map(p=>p.id),'Masanın demirbaşı.');
  return R;
}

function rekorKart(oyun){
  const R=rekorlar(oyun);
  if(!R.length) return `<div class="card"><div class="empty"><div class="big">📖</div>
    Rekor yok.<div class="sm" style="margin-top:6px">Birkaç maç girilince kitap kendiliğinden yazılır.</div></div></div>`;
  return `<div class="card">
    <h3>📖 Rekorlar Kitabı · ${oyun==='batak'?'Batak':'101'}</h3>
    <div class="xs dim" style="margin-bottom:10px">Masanın sayısal efsaneleri. Kırılana kadar geçerlidir.</div>
    <div class="stack">${R.map(r=>`<div class="rozet">
      <div class="k">${r.k}</div>
      <div class="grow" style="min-width:0">
        <div style="font-weight:700;font-size:13px">${esc(r.baslik)}</div>
        <div class="serif" style="font-size:19px;color:var(--gold);line-height:1.2">${esc(String(r.deger))}</div>
        <div class="xs" style="color:var(--ink2)">${esc(unvanAd(r.kim))}${r.tarih?` · ${trh(r.tarih)}`:''}</div>
        ${r.not?`<div class="xs muted" style="margin-top:2px">${esc(r.not)}</div>`:''}
      </div>
      <div class="row" style="gap:4px;flex-shrink:0">${unvanAvatar(r.kim,24)}</div>
    </div>`).join('')}</div>
    <button class="btn-g btn-full btn-sm" style="margin-top:12px" onclick="rekorPaylas('${oyun}')">📋 Rekorları Kopyala</button>
  </div>`;
}
function rekorPaylas(oyun){
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const R=rekorlar(oyun);
  const L=[`${g.emoji||''} ${String(g.ad).toLocaleUpperCase('tr-TR')} — ${oyun==='batak'?'BATAK':'101'} REKORLARI`,''];
  R.forEach(r=>L.push(`${r.k} ${r.baslik}: ${r.deger} — ${unvanAd(r.kim)}${r.tarih?` (${trh(r.tarih)})`:''}`));
  L.push('');
  L.push('Kırılana kadar geçerlidir.');
  kopyala(L.join('\n'));
}
