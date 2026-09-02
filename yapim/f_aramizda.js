/* =========================================================
   ARAMIZDA — ikili sicil, kabuslar, eş uyumu
   "Kim kime karşı ne durumda" masada en çok konuşulan şey;
   burada kayda geçer ve kimse hafızasına güvenemez.
   ========================================================= */

/* Her İKİLİ için karşılıklı sicil: a, b'ye karşı kaç kazandı/kaybetti */
function ikiliSicil(oyun){
  const m={};                                  // "a|b" (a<b) → {a:kazanma, b:kazanma}
  const anahtar=(x,y)=>x<y?`${x}|${y}`:`${y}|${x}`;
  const kur=(x,y)=>{const k=anahtar(x,y); return m[k]=m[k]||{k,x:(x<y?x:y),y:(x<y?y:x),xg:0,yg:0};};

  for(const c of grupCelseleri().filter(c=>c.oyun===oyun)){
    if(oyun==='batak'){
      const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) continue;
      const A=c.takimlar[0].oyuncular, B=c.takimlar[1].oyuncular;
      A.forEach(a=>B.forEach(b=>{
        const r=kur(a,b);
        const aKazandi = kz===0;
        if((r.x===a)===aKazandi) r.xg++; else r.yg++;
      }));
    }else{
      const sr=yzMac(c).sira;
      for(let i=0;i<sr.length;i++) for(let j=i+1;j<sr.length;j++){
        const p=sr[i], q=sr[j], r=kur(p.id,q.id);       // p daha iyi sırada
        if(r.x===p.id) r.xg++; else r.yg++;
      }
    }
  }
  return Object.values(m).filter(r=>r.xg+r.yg>0);
}

/* Batak: EŞ olarak birlikte oynayan ikililerin uyumu */
function esSicil(){
  const m={};
  const kur=(x,y)=>{const k=x<y?`${x}|${y}`:`${y}|${x}`; return m[k]=m[k]||{x,y,g:0,mgl:0};};
  for(const c of grupCelseleri().filter(c=>c.oyun==='batak')){
    const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) continue;
    c.takimlar.forEach((t,ti)=>{
      if(t.oyuncular.length<2) return;
      const r=kur(t.oyuncular[0],t.oyuncular[1]);
      if(ti===kz) r.g++; else r.mgl++;
    });
  }
  return Object.values(m).filter(r=>r.g+r.mgl>0);
}

const husumetLafi=f=>
  f>=4 ? 'artık sahibi sayılır'
: f===3 ? 'üstünlük tescillidir'
: f===2 ? 'ağırlığını koymuştur'
: f===1 ? 'kıl payı önde'
: 'kimse öne geçemedi, husumet sürüyor';

function aramizdaKart(oyun){
  const ik=ikiliSicil(oyun);
  if(!ik.length) return '';

  /* en çok karşı karşıya gelenler */
  const ezeli=ik.slice().sort((a,b)=>(b.xg+b.yg)-(a.xg+a.yg)).slice(0,5);

  /* herkesin kabusu: en çok kaybettiği rakip (en az 3 karşılaşma) */
  const kabus={};
  ik.forEach(r=>{
    const ekle=(kim,rakip,g,mg)=>{
      if(g+mg<3||mg<=g) return;
      const f=mg-g;
      if(!kabus[kim]||f>kabus[kim].f) kabus[kim]={rakip,g,mg,f};
    };
    ekle(r.x,r.y,r.xg,r.yg);
    ekle(r.y,r.x,r.yg,r.xg);
  });
  const kabusList=Object.entries(kabus).sort((a,b)=>b[1].f-a[1].f).slice(0,5);

  /* batak eş uyumu */
  const es=oyun==='batak'?esSicil().filter(r=>r.g+r.mgl>=2):[];
  const kanka=es.slice().sort((a,b)=>(b.g-b.mgl)-(a.g-a.mgl))[0];
  const ugursuz=es.slice().sort((a,b)=>(a.g-a.mgl)-(b.g-b.mgl))[0];

  const satir=r=>{
    const one=r.xg>=r.yg, ilk=one?r.x:r.y, son=one?r.y:r.x;
    const g=one?r.xg:r.yg, mg=one?r.yg:r.xg;
    return `<div class="row" style="padding:7px 0;gap:8px">
      ${avatar(ilk,26)}
      <div class="grow" style="min-width:0">
        <div style="font-size:13.5px;font-weight:600" class="ell">${esc(ad(ilk))} <span class="dim">vs</span> ${esc(ad(son))}</div>
        <div class="xs dim">${g+mg} karşılaşma · ${esc(husumetLafi(g-mg))}</div></div>
      ${avatar(son,26)}
      <div class="serif" style="font-size:16px;min-width:52px;text-align:right">
        <b class="${g>mg?'pos':'zero'}">${g}</b><span class="dim">–</span><b class="${mg>g?'neg':'zero'}">${mg}</b></div>
    </div>`;
  };

  return `
  <div class="card">
    <h3>⚔️ Aramızda · ${oyun==='batak'?'Batak':'101'}</h3>
    <div class="xs dim" style="margin-bottom:8px">En çok karşı karşıya gelenler. Rakamlar hafızadan güçlüdür.</div>
    ${ezeli.map(satir).join('<div class="sep" style="margin:0 -14px"></div>')}
  </div>

  ${kabusList.length?`<div class="card">
    <h3>😰 Kabuslar</h3>
    <div class="xs dim" style="margin-bottom:8px">Karşısına oturunca eli titreyenler. En az 3 karşılaşma şartı vardır.</div>
    ${kabusList.map(([kim,k])=>`<div class="row" style="padding:7px 0;gap:9px">
      ${avatar(kim,28)}
      <div class="grow" style="min-width:0">
        <div style="font-size:13.5px;font-weight:600" class="ell">${esc(ad(kim))}</div>
        <div class="xs" style="color:#DD8A8A">kabusu: <b>${esc(ad(k.rakip))}</b> · ${k.g}–${k.mg}</div></div>
      ${avatar(k.rakip,28)}
    </div>`).join('')}
  </div>`:''}

  ${(kanka&&kanka.g>kanka.mgl)||(ugursuz&&ugursuz.mgl>ugursuz.g)?`<div class="card">
    <h3>🤝 Eş Uyumu</h3>
    ${(kanka&&kanka.g>kanka.mgl)?`<div class="rozet" style="margin-bottom:8px"><div class="k">🫂</div>
      <div class="grow"><div style="font-weight:700;font-size:13.5px">Kanka</div>
        <div style="font-size:12.5px;color:var(--gold)">${esc(ad(kanka.x))} &amp; ${esc(ad(kanka.y))}</div>
        <div class="xs muted">Eş olarak ${kanka.g} galibiyet, ${kanka.mgl} yenilgi. Birbirini gözünden anlamaktadırlar.</div></div></div>`:''}
    ${(ugursuz&&ugursuz.mgl>ugursuz.g)?`<div class="rozet"><div class="k">🪦</div>
      <div class="grow"><div style="font-weight:700;font-size:13.5px">Uğursuz Eşleşme</div>
        <div style="font-size:12.5px;color:#DD8A8A">${esc(ad(ugursuz.x))} &amp; ${esc(ad(ugursuz.y))}</div>
        <div class="xs muted">Eş olarak ${ugursuz.g} galibiyet, ${ugursuz.mgl} yenilgi. Bu ikilinin bir daha eş düşmemesi masanın yararınadır.</div></div></div>`:''}
  </div>`:''}`;
}

/* Zabıta iliştirilen rekabet notu: bu maç ikili siciller ne yaptı */
function aramizdaNotu(c){
  const ik=ikiliSicil(c.oyun);
  if(!ik.length) return '';
  const ilgili = c.oyun==='batak' ? c.takimlar.flatMap(t=>t.oyuncular) : (c.oyuncular||[]);
  const bizim=ik.filter(r=>ilgili.includes(r.x)&&ilgili.includes(r.y));
  const carpici=bizim.filter(r=>Math.abs(r.xg-r.yg)>=3)
    .sort((a,b)=>Math.abs(b.xg-b.yg)-Math.abs(a.xg-a.yg))[0];
  if(!carpici) return '';
  const one=carpici.xg>carpici.yg;
  const ilk=one?carpici.x:carpici.y, son=one?carpici.y:carpici.x;
  const g=one?carpici.xg:carpici.yg, mg=one?carpici.yg:carpici.xg;
  return `${ad(ilk)}, ${ad(son)} karşısında ${g}-${mg} öne geçmiştir. ${ad(son)}'in bu husustaki beyanları kayda geçirilmemiştir.`;
}
