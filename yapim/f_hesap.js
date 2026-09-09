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
      /* KİŞİ BAŞINA ½: eşli takımın payı ikiye bölünür; ekstredeki rakam da yarım. */
      const pay=(c.takimlar[ti].oyuncular||[]).filter(Boolean).length||1;
      const es=c.takimlar[ti].oyuncular.filter(x=>x!==id).map(ad);
      const ortakNot=es.length?` (½ · ${es.join(' & ')} ile paylaşımlı)`:'';
      kalemler.forEach(x=>h.push({tarih:c.tarih,sira:c._sira||'',ne:x.ne,adet:(ti===kz?x.adet:-x.adet)/pay,
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
      const nb=(k.borclular||[]).filter(Boolean).length||1, na=(k.alacaklilar||[]).filter(Boolean).length||1;
      const ortakNot=(t,c)=>{
        const es=(t||[]).filter(x=>x!==id).map(ad);
        return es.length?` (${c>1?'½ · ':''}${es.join(' & ')} ile)`:'';
      };
      if((k.borclular||[]).includes(id))
        h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:k.ne,adet:-n/nb,
          ortak:(k.borclular||[]).length>1,
          aciklama:(k.aciklama||'Borç kaydı · '+liste((k.alacaklilar||[]).map(ad))+' lehine')+ortakNot(k.borclular,nb)});
      if((k.alacaklilar||[]).includes(id))
        h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:k.ne,adet:n/na,
          ortak:(k.alacaklilar||[]).length>1,
          aciklama:'Alacak kaydı · '+liste((k.borclular||[]).map(ad))+' zimmetinde'+ortakNot(k.alacaklilar,na)});
    }
    const o=a.veri&&a.veri.odeme;
    if(!o) return;
    const odeyenler=o.taraf&&o.taraf.length?o.taraf:[o.kim];   // eski kayıtlar tek kişi
    if(!odeyenler.includes(id)) return;
    const pb=odeyenler.filter(Boolean).length||1;
    const digerleri=odeyenler.filter(x=>x!==id).map(ad);
    h.push({tarih:(a.olusturma||'').slice(0,10),sira:a.olusturma||'',ne:o.ne,
      adet:(Number(o.adet)||0)/pb,ortak:odeyenler.length>1,
      aciklama:'Ödeme yapıldı'+(digerleri.length?` (${pb>1?'½ · ':''}${digerleri.join(' & ')} ile)`:''),odeme:true});
  });
  return h.sort((x,y)=>(y.tarih+y.sira).localeCompare(x.tarih+x.sira));
}

/* Tüm oyunların tarih sıralı dökümü — her oyunun borca katkısı ve durumu
   açıkça görünsün. "Yarıda kes" ile sonuçsuz kapanan oyun borca girmez;
   net sıfır çıkmıyorsa sebebi çoğu zaman budur, bu döküm onu gösterir. */
function oyunSatiri(c){
  const bahis=bahisOzet(c.bahis)||'Onur';
  const borcDogar=bahisBorcluKalemler(c.bahis).length>0;
  let durum='', sonuc='—', sinif='dim', sayildi=false;
  if(!c.bitti){
    durum = c.talik ? '⏸️ ertelendi' : '🟢 açık · sürüyor';
  }else if(c.oyun==='batak'){
    const kz=c.kazanan??batakMac(c).macKazanan;
    if(kz==null){ durum='⚠️ sonuçsuz kapandı'; sonuc='yarıda kesilmiş'; sinif='neg'; }
    else{
      const kazAd=c.takimlar[kz].oyuncular.map(ad).join(' & ');
      const kayAd=c.takimlar[1-kz].oyuncular.map(ad).join(' & ');
      sonuc=`${kazAd} kazandı`; sinif='pos';
      durum = borcDogar ? `${kayAd} → ${bahis}` : 'onur · borç yok';
      sayildi = borcDogar;
    }
  }else{
    const sr=yzMac(c).sira;
    if(!sr.length){ durum='⚠️ sonuçsuz kapandı'; sinif='neg'; }
    else{
      sonuc=`${ad(sr[0].id)} birinci · ${ad(sr[sr.length-1].id)} sonuncu`; sinif='pos';
      durum = borcDogar ? `${ad(sr[sr.length-1].id)} → ${bahis}` : 'onur · borç yok';
      sayildi = borcDogar;
    }
  }
  return {c,bahis,durum,sonuc,sinif,sayildi};
}
function oyunDokumu(){
  const g=aktifGrup();
  const hepsi=(DB.celseler||[]).filter(c=>g&&c.grupId===g.id)
    .sort((a,b)=>String((b.tarih||'')+(b.id||'')).localeCompare(String((a.tarih||'')+(a.id||''))));
  if(!hepsi.length) return '';
  const sat=hepsi.map(oyunSatiri);
  const sorunlu=sat.filter(s=>s.c.bitti&&s.sinif==='neg'&&bahisBorcluKalemler(s.c.bahis).length);
  const uyari=sorunlu.length?`<div class="xs" style="color:#DD8A8A;background:rgba(221,138,138,.1);
      border:1px solid rgba(221,138,138,.35);border-radius:10px;padding:8px 10px;margin-bottom:10px">
      ⚠️ ${sorunlu.length} oyun <b>sonuçsuz</b> kapanmış (yarıda kesilmiş) — bunlar borç hesabına
      <b>girmez</b>. Net sıfır çıkmıyorsa sebebi büyük ihtimalle budur: kazanılan oyun kazanansız kapatılmış.
      İlgili oyunu açıp sonucu işlersen borç kendiliğinden netleşir.</div>`:'';
  const row=s=>{const c=s.c;
    return `<div class="row" style="padding:7px 0;gap:9px;align-items:flex-start">
      <div class="xs dim" style="flex-shrink:0;width:52px;line-height:1.25">${trh(c.tarih)}<br>
        <span class="pill" style="font-size:9px;padding:1px 5px">${c.oyun==='batak'?'Batak':'101'}</span></div>
      <div class="grow" style="min-width:0">
        <div class="sm ell" style="font-weight:600">${esc(s.sonuc)}</div>
        <div class="xs ${s.sinif}" style="margin-top:1px">${esc(s.durum)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        ${s.sayildi?'<span class="pill green" style="font-size:9px">borçta</span>'
          :(c.bitti&&s.sinif==='neg'?'<span class="pill red" style="font-size:9px">sayılmadı</span>':'')}
        ${kurucuMu()?`<button class="btn-xs btn-gh" onclick="macBahsiDuzeltAc('${c.id}')">✏️ bahis</button>`:''}
      </div>
    </div>`;};
  return `<div class="card">
    <h3>📜 Oyun Dökümü</h3>
    <div class="xs dim" style="margin-bottom:8px">Tüm oyunlar, tarih sırasıyla. Hangi oyunun borca girdiği burada görünür.</div>
    ${uyari}
    <div>${sat.map(row).join('<div class="sep" style="margin:0 -14px"></div>')}</div>
    <div class="xs dim" style="margin-top:9px">${hepsi.length} oyun · <span class="pill green" style="font-size:9px">borçta</span> = bahsi hesaba işlendi ·
      <span class="pill red" style="font-size:9px">sayılmadı</span> = sonuçsuz kapandı</div>
  </div>`;
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
    </div></div>
    ${oyunDokumu()}`;

  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);

  const satir=r=>`<div class="row" style="padding:8px 0;gap:9px">
    <div class="row" style="gap:0;flex-shrink:0">${r.taraf.map((id,i)=>
      `<span style="margin-left:${i?-10:0}px;display:inline-block">${avatar(id,32)}</span>`).join('')}</div>
    <div class="grow" style="min-width:0">
      <div style="font-weight:600;font-size:14px" class="ell">${esc(r.taraf.map(ad).join(' & '))}</div>
      <div class="xs dim">${bahisIkon(r.ne)} ${esc(r.ne)}</div></div>
    <div class="serif ${r.v<0?'neg':'pos'}" style="font-size:20px;min-width:34px;text-align:right">
      ${r.v<0?frak(r.v):'+'+frak(r.v)}</div>
    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
      ${r.taraf.map(id=>`<button class="btn-xs btn-gh" onclick="ekstreAc('${id}')">${
        r.taraf.length>1?esc(ad(id)):'Ekstre'}</button>`).join('')}
      ${r.v<0&&kurucuMu()?`<button class="btn-xs btn-g"
        onclick='borcOdeAc(${JSON.stringify(r.taraf)},${JSON.stringify(r.ne)},${Math.abs(r.v)})'>Ödedi</button>`:''}
    </div></div>`;

  /* ÖDEŞME DETAYI (altta): aynı kişi aynı kalemde hem borçlanıp hem alacaklı
     olmuşsa (karma oyunun tipik hâli) ½'ler birbirini götürür; burada
     "ödeşti / net ne kaldı" düz cümleyle görünür. GROSS'u brut'tan alıyoruz. */
  const brut={}; borcTablosu(brut);
  const netSatir=[];
  Object.keys(brut).forEach(id=>{
    Object.entries(brut[id]).forEach(([ne,e])=>{
      if(e.borc>0 && e.alacak>0)   // iki yönlü — ödeşme asıl burada anlamlı
        netSatir.push({id,ne,n:e.alacak-e.borc,borc:e.borc,alacak:e.alacak});
    });
  });
  netSatir.sort((a,b)=>Math.abs(b.n)-Math.abs(a.n));
  const hepKapali = netSatir.length && netSatir.every(r=>Math.abs(r.n)<1e-6);
  const netKart = netSatir.length?`<div class="card">
    <h3>⚖️ Ödeşme Detayı</h3>
    <div class="xs dim" style="margin-bottom:8px">Karma oynayınca aynı kişi bir kalemde hem borçlanır hem alacaklı olur; ½'ler birbirini götürür. Düz hâli:</div>
    ${hepKapali?`<div class="row" style="gap:9px;padding:8px 10px;background:rgba(140,199,155,.12);
      border:1px solid rgba(140,199,155,.4);border-radius:10px;margin-bottom:6px">
      <span style="font-size:18px">✅</span>
      <div class="sm" style="color:#8CC79B;font-weight:600">Bu kalemlerde kimsenin net borcu yok — ödeşmiş.</div></div>`:''}
    ${netSatir.map(r=>`<div class="row" style="padding:8px 0;gap:9px">
      ${avatar(r.id,32)}
      <div class="grow" style="min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(ad(r.id))} <span class="xs dim" style="font-weight:400">${bahisIkon(r.ne)} ${esc(r.ne)}</span></div>
        <div class="xs ${r.n<0?'neg':(r.n>0?'pos':'dim')}" style="margin-top:2px">${
          Math.abs(r.n)<1e-6 ? `başa baş · ${frak(r.borc)} borç, ${frak(r.alacak)} alacak → ödeşti`
          : r.n<0 ? `net ${frak(r.n)} ${esc(r.ne)} borçlu · (${frak(r.alacak)} alacağı düşülmüş)`
                  : `net ${frak(r.n)} ${esc(r.ne)} alacaklı · (${frak(r.borc)} borcu düşülmüş)`}</div></div>
      <div class="serif ${r.n<0?'neg':(r.n>0?'pos':'dim')}" style="font-size:20px;min-width:44px;text-align:right">
        ${Math.abs(r.n)<1e-6?'0':(r.n<0?frak(r.n):'+'+frak(r.n))}</div>
    </div>`).join('<div class="sep" style="margin:0 -14px"></div>')}
  </div>`:'';

  return `
  <div class="card">
    <h3>🥃 Borçlular Hesabı</h3>
    <div class="xs dim" style="margin-bottom:6px">Kişi başına net borç. Karma oynandığı için pay ½ olabilir; iki yarım bir tam eder.</div>
    ${borclu.length?`<div class="xs" style="color:#DD8A8A;font-weight:700;margin:8px 0 2px">BORÇLU</div>
      ${borclu.map(satir).join('<div class="sep" style="margin:0 -14px"></div>')}`:''}
    ${alacakli.length?`<div class="sep"></div>
      <div class="xs" style="color:#8CC79B;font-weight:700;margin:2px 0">ALACAKLI</div>
      ${alacakli.map(satir).join('<div class="sep" style="margin:0 -14px"></div>')}`:''}
  </div>
  ${netKart}
  <div class="card">
    <div class="two" style="margin-bottom:10px">
      <button class="btn-p btn-sm" onclick="borcEkleAc()">+ Borç Kaydı</button>
      <button class="btn-b btn-sm" onclick="devirSor()">⚡ Devir Kayıtları</button>
    </div>
    <button class="btn-g btn-full" onclick="borcOzetiAc()">📋 Hesap Özetini Kopyala</button>
    <div class="xs dim" style="margin-top:8px">Gruba yapıştırılacak hâli. Kimse "ben ödemiştim" diyemez.</div>
  </div>
  ${oyunDokumu()}
  <div class="card tight xs dim">Karma (değişen eşli) oynandığı için borç KİŞİYE yazılır: eşli batakta
    kaybeden çiftin bir şişesi ikiye bölünür (kişi başı ½), iki yarım bir tam eder. 101'de sonuncu borçlanır,
    birinci alacaklı olur. "Onur"a oynanan maç borç doğurmaz.</div>`;
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
      ${Object.entries(bakiye).filter(([,v])=>Math.abs(v)>1e-6).map(([ne,v])=>
        `<span class="pill ${v<0?'red':'green'}">${bahisIkon(ne)} ${esc(ne)} ${v<0?frak(v)+' borç':'+'+frak(v)+' alacak'}</span>`).join('')
        ||'<span class="pill">temiz</span>'}
    </div>
    ${h.length?`<div style="overflow-x:auto"><table>
      <thead><tr><th>Tarih</th><th style="text-align:left">Hareket</th><th>Adet</th></tr></thead>
      <tbody>${h.map(x=>`<tr>
        <td class="xs dim">${trh(x.tarih)}</td>
        <td style="text-align:left"><div class="sm">${esc(x.aciklama)}</div>
          <div class="xs dim">${bahisIkon(x.ne)} ${esc(x.ne)}</div></td>
        <td><b class="${x.adet<0?'neg':'pos'}">${(x.adet<0?'−':'+')+frak(x.adet)}</b></td></tr>`).join('')}
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
    borclu.forEach(r=>L.push(`  • ${r.taraf.map(ad).join(' & ')} — ${frak(r.v)} ${r.ne}`));
  }
  if(alacakli.length){
    L.push('');
    L.push('ALACAKLILAR:');
    alacakli.forEach(r=>L.push(`  • ${r.taraf.map(ad).join(' & ')} — ${frak(r.v)} ${r.ne}`));
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
