/* =========================================================
   BORÇLULAR HESABI — bakiye + kişi bazında EKSTRE
   Her hareket nereden geldiği belli olacak şekilde listelenir:
   hangi maç borçlandırdı, hangi ödeme düştü.
   ========================================================= */

/* Bir oyuncunun bütün hareketleri, tarihe göre */
function borcHareketleri(id){
  const h=[];
  for(const c of grupCelseleri()){
    /* bir maçta birden çok bahis kalemi olabilir (hesap + içecek);
       ekstrede her kalem ayrı hareket olarak görünür */
    const kalemler=bahisBorcluKalemler(c.bahis); if(!kalemler.length) continue;
    if(c.oyun==='batak'){
      const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) continue;
      const ti=c.takimlar.findIndex(t=>t.oyuncular.includes(id)); if(ti<0) continue;
      const rakip=c.takimlar[1-ti].oyuncular.map(ad).join(' & ');
      /* Borç tarafa ait: eş varsa hareket ORTAK olarak gösterilir, iki kişiye
         ayrı ayrı yazılmaz. Tabeladaki bakiye de bu yüzden tek şişe. */
      const es=c.takimlar[ti].oyuncular.filter(x=>x!==id).map(ad);
      const ortakNot=es.length?` (ortak · ${es.join(' & ')} ile)`:'';
      kalemler.forEach(x=>h.push({tarih:c.tarih,sira:c._sira||'',ne:x.ne,adet:ti===kz?x.adet:-x.adet,
        ortak:es.length>0,
        aciklama:(ti===kz?'Batak galibiyeti · ':'Batak yenilgisi · ')+rakip+ortakNot,macId:c.id}));
    }else{
      const sr=yzMac(c).sira; if(!sr.length) continue;
      if(sr[0].id===id) kalemler.forEach(x=>h.push({tarih:c.tarih,sira:c._sira||'',ne:x.ne,adet:x.adet,
        aciklama:'101 birinciliği',macId:c.id}));
      else if(sr[sr.length-1].id===id) kalemler.forEach(x=>h.push({tarih:c.tarih,sira:c._sira||'',ne:x.ne,adet:-x.adet,
        aciklama:'101 sonuncululuğu',macId:c.id}));
    }
  }
  (DB.akis||[]).forEach(a=>{
    const k=a.veri&&a.veri.borcKaydi;
    if(k&&k.ne){
      const n=Number(k.adet)||1;
      const ortakNot=t=>{
        const es=(t||[]).filter(x=>x!==id).map(ad);
        return es.length?` (ortak · ${es.join(' & ')} ile)`:'';
      };
      if((k.borclular||[]).includes(id))
        h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:k.ne,adet:-n,
          ortak:(k.borclular||[]).length>1,
          aciklama:(k.aciklama||'Borç kaydı · '+liste((k.alacaklilar||[]).map(ad))+' lehine')+ortakNot(k.borclular)});
      if((k.alacaklilar||[]).includes(id))
        h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:k.ne,adet:n,
          ortak:(k.alacaklilar||[]).length>1,
          aciklama:'Alacak kaydı · '+liste((k.borclular||[]).map(ad))+' zimmetinde'+ortakNot(k.alacaklilar)});
    }
    const o=a.veri&&a.veri.odeme;
    if(!o) return;
    const odeyenler=o.taraf&&o.taraf.length?o.taraf:[o.kim];   // eski kayıtlar tek kişi
    if(!odeyenler.includes(id)) return;
    const digerleri=odeyenler.filter(x=>x!==id).map(ad);
    h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:o.ne,
      adet:Number(o.adet)||0,ortak:odeyenler.length>1,
      aciklama:'Ödeme yapıldı'+(digerleri.length?` (ortak · ${digerleri.join(' & ')} ile)`:''),odeme:true});
  });
  return h.sort((x,y)=>(y.tarih+y.sira).localeCompare(x.tarih+x.sira));
}

function borcHesabi(){
  const t=borcTablosu();
  const kayit=Object.entries(t).filter(([,v])=>v!==0)
    .map(([k,v])=>{const i=k.indexOf('|');
      const taraf=tarafKisiler(k.slice(0,i));
      return {taraf, id:taraf[0], ne:k.slice(i+1), v};});

  if(!kayit.length) return `<div class="card"><div class="empty">
    <div class="big">🥃</div>Kimsenin kimseye borcu yok.
    <div class="sm" style="margin-top:6px">Maç açarken "neye oynanıyor" seçilince hesap kendiliğinden tutulur.</div></div>
    <div class="two" style="margin-top:6px">
      <button class="btn-p btn-sm" onclick="borcEkleAc()">+ Borç Kaydı</button>
      <button class="btn-b btn-sm" onclick="devirSor()">⚡ Devir Kayıtları</button>
    </div></div>`;

  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);

  const satir=r=>`<div class="row" style="padding:8px 0;gap:9px">
    <div class="row" style="gap:0;flex-shrink:0">${r.taraf.map((id,i)=>
      `<span style="margin-left:${i?-10:0}px;display:inline-block">${avatar(id,32)}</span>`).join('')}</div>
    <div class="grow" style="min-width:0">
      <div style="font-weight:600;font-size:14px" class="ell">${esc(r.taraf.map(ad).join(' & '))}</div>
      <div class="xs dim">${bahisIkon(r.ne)} ${esc(r.ne)}${r.taraf.length>1?' · ortak':''}</div></div>
    <div class="serif ${r.v<0?'neg':'pos'}" style="font-size:20px;min-width:34px;text-align:right">
      ${r.v<0?Math.abs(r.v):'+'+r.v}</div>
    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
      ${r.taraf.map(id=>`<button class="btn-xs btn-gh" onclick="ekstreAc('${id}')">${
        r.taraf.length>1?esc(ad(id)):'Ekstre'}</button>`).join('')}
      ${r.v<0&&kurucuMu()?`<button class="btn-xs btn-g"
        onclick='borcOdeAc(${JSON.stringify(r.taraf)},${JSON.stringify(r.ne)},${Math.abs(r.v)})'>Ödedi</button>`:''}
    </div></div>`;

  return `
  <div class="card">
    <h3>🥃 Borçlular Hesabı</h3>
    <div class="xs dim" style="margin-bottom:6px">Maçlardan doğan borçlar. Ödeme kaydedilince düşer ve akışa işlenir.</div>
    ${borclu.length?`<div class="xs" style="color:#DD8A8A;font-weight:700;margin:8px 0 2px">BORÇLU</div>
      ${borclu.map(satir).join('<div class="sep" style="margin:0 -14px"></div>')}`:''}
    ${alacakli.length?`<div class="sep"></div>
      <div class="xs" style="color:#8CC79B;font-weight:700;margin:2px 0">ALACAKLI</div>
      ${alacakli.map(satir).join('<div class="sep" style="margin:0 -14px"></div>')}`:''}
  </div>
  <div class="card">
    <div class="two" style="margin-bottom:10px">
      <button class="btn-p btn-sm" onclick="borcEkleAc()">+ Borç Kaydı</button>
      <button class="btn-b btn-sm" onclick="devirSor()">⚡ Devir Kayıtları</button>
    </div>
    <button class="btn-g btn-full" onclick="borcOzetiAc()">📋 Hesap Özetini Kopyala</button>
    <div class="xs dim" style="margin-top:8px">Gruba yapıştırılacak hâli. Kimse "ben ödemiştim" diyemez.</div>
  </div>
  <div class="card tight xs dim">Eşli batakta borç TARAFA yazılır: kaybeden çift birlikte
    <b>bir</b> tane borçlanır, kişi başı bir değil. 101'de sonuncu borçlanır, birinci alacaklı olur.
    "Onur"a oynanan maç borç doğurmaz.</div>`;
}

function ekstreAc(id){
  const h=borcHareketleri(id);
  const bakiye={};
  h.forEach(x=>bakiye[x.ne]=(bakiye[x.ne]||0)+x.adet);
  acModal(`
    <div class="row" style="gap:11px;margin-bottom:4px">${avatar(id,40)}
      <div><h2 class="serif" style="margin:0">${esc(ad(id))}</h2>
        <div class="xs dim">hesap ekstresi</div></div></div>
    <div class="row wrap" style="gap:6px;margin:12px 0">
      ${Object.entries(bakiye).filter(([,v])=>v!==0).map(([ne,v])=>
        `<span class="pill ${v<0?'red':'green'}">${bahisIkon(ne)} ${esc(ne)} ${v<0?Math.abs(v)+' borç':'+'+v+' alacak'}</span>`).join('')
        ||'<span class="pill">temiz</span>'}
    </div>
    ${h.length?`<div style="overflow-x:auto"><table>
      <thead><tr><th>Tarih</th><th style="text-align:left">Hareket</th><th>Adet</th></tr></thead>
      <tbody>${h.map(x=>`<tr>
        <td class="xs dim">${trh(x.tarih)}</td>
        <td style="text-align:left"><div class="sm">${esc(x.aciklama)}</div>
          <div class="xs dim">${bahisIkon(x.ne)} ${esc(x.ne)}</div></td>
        <td><b class="${x.adet<0?'neg':'pos'}">${art(x.adet)}</b></td></tr>`).join('')}
      </tbody></table></div>`
     :'<div class="sm dim">Hareket yok.</div>'}
    <button class="btn-gh btn-full btn-sm" style="margin-top:14px" onclick="kapatModal()">Kapat</button>`);
}

function borcOzetiUret(){
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const t=borcTablosu();
  const kayit=Object.entries(t).filter(([,v])=>v!==0)
    .map(([k,v])=>{const i=k.indexOf('|');
      const taraf=tarafKisiler(k.slice(0,i));
      return {taraf, id:taraf[0], ne:k.slice(i+1), v};});
  const L=[`${g.emoji||''} ${String(g.ad).toLocaleUpperCase('tr-TR')} — HESAP ÖZETİ`,
           `${trh(bugun())} itibarıyla`,''];
  if(!kayit.length){ L.push('Masada açık borç bulunmamaktadır. Nadir görülen bir hâldir.'); return L.join('\n'); }
  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  if(borclu.length){
    L.push('BORÇLULAR:');
    borclu.forEach(r=>L.push(`  • ${r.taraf.map(ad).join(' & ')} — ${Math.abs(r.v)} ${r.ne}${r.taraf.length>1?' (ortak)':''}`));
  }
  if(alacakli.length){
    L.push('');
    L.push('ALACAKLILAR:');
    alacakli.forEach(r=>L.push(`  • ${r.taraf.map(ad).join(' & ')} — ${r.v} ${r.ne}${r.taraf.length>1?' (ortak)':''}`));
  }
  L.push('');
  const enCok=borclu[0];
  if(enCok) L.push(`Zimmeti en kabarık olan ${ad(enCok.id)}'dir; ifa süresi bir sonraki celseye kadardır.`);
  L.push('İtiraz, ödeme belgesi ibrazıyla mümkündür.');
  return L.join('\n');
}
function borcOzetiAc(){
  const metin=borcOzetiUret();
  acModal(`<h2 class="serif" style="margin:0 0 10px">Hesap Özeti</h2>
    <div class="zabit" id="boMetin" style="font-size:13px">${esc(metin)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="kopyala(document.getElementById('boMetin').textContent)">📋 Kopyala · WhatsApp'a Yapıştır</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="borcOzetiAkisa()">💬 Akışa da yaz</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
async function borcOzetiAkisa(){
  const id=await akisEkle('mesaj',borcOzetiUret(),{ozet:'borc'});
  if(id){ kapatModal(); toast('Hesap özeti akışa yazıldı'); }
}
