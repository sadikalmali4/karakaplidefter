/* =========================================================
   KİŞİ BAŞINA MASADA GEÇEN SÜRE

   İstek (kullanıcı, 07.09.2026): "kişilerin batak ve 101'de geçen
   süreleri olsun".

   NASIL SAYILIYOR: maçın süresi (macSuresi) o maçta oturan HERKESE
   yazılır. Kişi başına ayrı sayaç yok — masada oturuyorsa o süreyi
   masada geçirmiş sayılıyor. Batak'ta katılanlar iki takımın
   oyuncuları, 101'de c.oyuncular.

   MOLA SAYILMAZ: macSuresi parti sürelerinin toplamı; celse talik
   edilip gece beklerse aradaki boşluk girmiyor (f_sure.js'teki karar).

   ESKİ KAYITLAR: 03.09.2026'dan önce açılan maçlarda süre damgası YOK.
   Uydurulmuyor; o maçlar süreye hiç girmiyor ve kaç maçın sayılmadığı
   kartın altında yazıyor. Süre bir istatistik — puanı, sırayı, borcu
   ETKİLEMEZ.
   ========================================================= */

/* Süresi ölçülebilen maçlar: en az bir partisinde başlama damgası olan */
const sureOlculur = c => (c && (c.partiler||[]).some(p=>p&&p.basla));

function macKatilanlar(c){
  if(!c) return [];
  if(c.oyun==='batak')
    return (c.takimlar||[]).flatMap(t=>(t.oyuncular||[])).filter(Boolean);
  return (c.oyuncular||[]).filter(Boolean);
}

/* {id:{batak:ms, yz:ms, toplam:ms, macB:n, macY:n}} + sayılmayan maç sayısı */
function kisiSureleri(){
  const d={}, al=id=>(d[id]=d[id]||{batak:0,yz:0,toplam:0,macB:0,macY:0});
  let atlanan=0, olculen=0, grupMs=0;

  grupCelseleri().forEach(c=>{
    if(!sureOlculur(c)){ atlanan++; return; }
    const ms=macSuresi(c).ms;
    if(!(ms>0)){ atlanan++; return; }
    olculen++; grupMs+=ms;
    const batakMi=c.oyun==='batak';
    macKatilanlar(c).forEach(id=>{
      const k=al(id);
      if(batakMi){ k.batak+=ms; k.macB++; } else { k.yz+=ms; k.macY++; }
      k.toplam+=ms;
    });
  });
  return {d,atlanan,olculen,grupMs};
}

function sureKisiKart(){
  if(typeof macSuresi!=='function') return '';
  const {d,atlanan,olculen,grupMs}=kisiSureleri();
  const ids=Object.keys(d).filter(id=>d[id].toplam>0)
    .sort((a,b)=>d[b].toplam-d[a].toplam);

  if(!ids.length) return `<div class="card">
    <h3>⏱️ Masada Geçen Süre</h3>
    <div class="xs dim">Henüz süresi ölçülmüş maç yok.${atlanan?` ${atlanan} eski maçta süre damgası
      bulunmadığı için sayılamadı — bundan sonraki maçlar sayılacak.`:''}</div></div>`;

  const enUzun=ids[0];
  /* Ortalaması en uzun olan — "maç uzatan" */
  const ortalama=id=>{ const k=d[id], n=k.macB+k.macY; return n?k.toplam/n:0; };
  const enOrt=ids.slice().sort((a,b)=>ortalama(b)-ortalama(a))[0];
  const enBatak=ids.slice().sort((a,b)=>d[b].batak-d[a].batak)[0];
  const enYz=ids.slice().sort((a,b)=>d[b].yz-d[a].yz)[0];
  const cok=ids.length>1;

  const cubuk=(ms,en)=>`<div class="bar" style="height:5px;margin-top:5px"><i style="width:${
    en>0?Math.round(ms/en*100):0}%;background:var(--gold)"></i></div>`;

  return `<div class="card">
    <h3>⏱️ Masada Geçen Süre</h3>
    <div class="xs dim" style="margin-bottom:10px">Maçın süresi o maçta oturan herkese yazılır.
      Molalar sayılmaz — masada oynanan süre sayılır.</div>

    ${cok?`<div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="sm">🪑 <b>Masanın Demirbaşı:</b> ${esc(ad(enUzun))} — ${SURE_BICIM(d[enUzun].toplam)}</div>
      ${d[enBatak].batak>0?`<div class="sm" style="margin-top:3px">🃏 <b>Batak'ta en çok:</b> ${esc(ad(enBatak))} — ${SURE_BICIM(d[enBatak].batak)}</div>`:''}
      ${d[enYz].yz>0?`<div class="sm" style="margin-top:3px">💯 <b>101'de en çok:</b> ${esc(ad(enYz))} — ${SURE_BICIM(d[enYz].yz)}</div>`:''}
      <div class="sm" style="margin-top:3px">🐌 <b>Maç Uzatan</b> (maç başı ortalama): ${esc(ad(enOrt))} — ${SURE_BICIM(ortalama(enOrt))}</div>
    </div>`:''}

    ${ids.map(id=>{const k=d[id], n=k.macB+k.macY;
      return `<div class="row" style="padding:8px 0;gap:10px;align-items:flex-start">
      ${avatar(id,32)}
      <div class="grow" style="min-width:0">
        <div class="row" style="justify-content:space-between;gap:8px">
          <span style="font-weight:600;font-size:13.5px" class="ell">${esc(ad(id))}</span>
          <span class="serif" style="font-size:16px;color:var(--gold);flex-shrink:0">${SURE_BICIM(k.toplam)}</span>
        </div>
        <div class="xs dim" style="margin-top:1px">
          ${k.batak>0?`🃏 batak ${SURE_BICIM(k.batak)} <span style="opacity:.6">(${k.macB} maç)</span>`:''}
          ${k.batak>0&&k.yz>0?' · ':''}
          ${k.yz>0?`💯 101 ${SURE_BICIM(k.yz)} <span style="opacity:.6">(${k.macY} maç)</span>`:''}
        </div>
        <div class="xs dim" style="opacity:.6;margin-top:1px">maç başı ortalama ${SURE_BICIM(n?k.toplam/n:0)}</div>
        ${cubuk(k.toplam,d[enUzun].toplam)}
      </div>
    </div>`;}).join('<div class="sep" style="margin:0 -14px"></div>')}

    <div class="xs dim" style="margin-top:10px">Bu masada toplam <b>${SURE_BICIM(grupMs)}</b> oynanmış
      (${olculen} maç).${atlanan?` <b>${atlanan}</b> eski maçta süre damgası yok, sayılamadı.`:''}</div>
  </div>`;
}
