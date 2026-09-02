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

  /* borç durumu */
  const t=borcTablosu();
  const borclu=Object.entries(t).filter(([,v])=>v<0)
    .map(([k,v])=>{const i=k.indexOf('|');
      const taraf=tarafKisiler(k.slice(0,i));
      return `${taraf.map(ad).join(' & ')} ${Math.abs(v)} ${k.slice(i+1)}${taraf.length>1?' (ortak)':''}`;});
  if(borclu.length){
    L.push('');
    L.push(`ZİMMET: ${liste(borclu)}. İfa süresi bir sonraki celseye kadardır.`);
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
      onclick="kopyala(document.getElementById('hoMetin').textContent)">📋 Kopyala · WhatsApp'a Yapıştır</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="haftaOzetiAkisa(${gun||7})">💬 Akışa da yaz</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
async function haftaOzetiAkisa(gun){
  const id=await akisEkle('mesaj',haftaOzetiUret(gun),{ozet:'donem',gun});
  if(id){ kapatModal(); render(); toast('Özet akışa yazıldı'); }
}

/* --------- EŞ KURASI ---------
   Aktif oyunculardan 4'ünü ve eşlerini kura çeker. Kuraya itiraz edilmez. */
let KURA=null;
function kuraCek(){
  const oyn=grupOyunculari().map(o=>o.id);
  if(oyn.length<4) return toast('Kura için en az 4 oyuncu gerekli',true);
  const k=oyn.slice();
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
    ${uyari}
    <button class="btn-p btn-full" style="margin-top:12px" onclick="kuraylaAc()">Bu kurayla Batak aç</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="kuraCek()">🎲 Yeniden çek</button>
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
