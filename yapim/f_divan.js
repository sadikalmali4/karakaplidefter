//== viewRozet
/* DİVAN — masanın sosyal tarafı tek sekmede, alt bölümlere ayrılmış.
   Unvanlar · Borç Hesabı · Rekorlar · Aramızda · Efsaneler */
function viewRozet(){
  const b=[['unvan','🏅 Unvan'],['borc','🥃 Borç'],['tahmin','⚽ Tahmin'],['rekor','📖 Rekor'],
           ['aramizda','⚔️ Aramızda'],['efsane','📜 Efsane']];
  const nav=`<div class="row" style="overflow-x:auto;gap:7px;padding-bottom:4px;margin-bottom:12px">
    ${b.map(([k,ad2])=>`<div class="chip ${DIVAN===k?'on':''}" style="flex-shrink:0"
      onclick="DIVAN='${k}';render();window.scrollTo(0,0)">${ad2}</div>`).join('')}</div>`;

  const oyunSec=`<div class="seg" style="margin-bottom:12px">
    <button class="${ROZET_OYUN==='batak'?'on':''}" onclick="ROZET_OYUN='batak';render()">Batak</button>
    <button class="${ROZET_OYUN==='101'?'on':''}" onclick="ROZET_OYUN='101';render()">101</button></div>`;

  if(DIVAN==='borc')     return nav+borcHesabi();
  if(DIVAN==='tahmin')   return nav+tahminKart();
  /* Efsane bölümü masanın hafızası; lakaplar da oraya ait — ayrı sekme açmaya değmez */
  if(DIVAN==='efsane')   return nav+lakapKart()+(efsaneKart()||'');
  if(DIVAN==='rekor')    return nav+oyunSec+rekorKart(ROZET_OYUN);
  if(DIVAN==='aramizda') return nav+oyunSec+(aramizdaKart(ROZET_OYUN)
    ||'<div class="card"><div class="empty"><div class="big">⚔️</div>Henüz karşılaşma yok.</div></div>');

  /* --- unvanlar --- */
  const sz=sezonSecici();
  const oyun=ROZET_OYUN, r=muayyideler(oyun), gen=genelMuayyideler();
  if(!r.length && !gen.length) return nav+oyunSec+sz+`<div class="card"><div class="empty"><div class="big">🏅</div>
    Henüz unvan dağıtılmadı.<div class="sm" style="margin-top:6px">Birkaç maç oyna, unvanlar sahiplerini bulsun.</div></div></div>`;
  const iyi=r.filter(x=>x.tip!=='kotu').concat(gen.filter(x=>x.tip!=='kotu'));
  const kotu=r.filter(x=>x.tip==='kotu').concat(gen.filter(x=>x.tip==='kotu'));
  const kart=x=>{
    const l=unvanKisi(x.kim);
    return `<div class="rozet"><div class="k">${x.k}</div><div class="grow" style="min-width:0">
      <div style="font-weight:700;font-size:13.5px">${esc(x.ad)}
        ${l.length>1?'<span class="pill" style="margin-left:4px">ortak</span>':''}</div>
      <div style="font-size:12.5px;color:var(--gold);margin-top:1px">${esc(unvanAd(x.kim))}</div>
      <div class="xs muted" style="margin-top:2px">${esc(x.aciklama||'')}</div></div>
      <div class="row" style="gap:4px;flex-shrink:0">${unvanAvatar(x.kim,26)}</div></div>`;
  };
  const svTablo=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup)
    .map(o=>({o,n:toplamMac(o.id)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n);
  return nav+oyunSec+`
  ${iyi.length?`<div class="card"><h3>🏆 Şeref Levhası</h3><div class="stack">${iyi.map(kart).join('')}</div></div>`:''}
  ${kotu.length?`<div class="card"><h3>⚠️ Utanç Duvarı</h3><div class="stack">${kotu.map(kart).join('')}</div></div>`:''}
  ${oyun==='batak'?`<div class="card tight xs dim">Batak'ta ihale ve puan takıma aittir; eşler
    başa başsa unvanı <b>ortak</b> taşır. Farklı eşlerle oynadıkça sayılar ayrışır, unvan tek kişiye döner.</div>`:''}
  ${svTablo.length?`<div class="card"><h3>Kıdem</h3>${svTablo.map(({o,n})=>{const s=seviye(n);
    const sonra=SEVIYELER.find(x=>x.n>n);
    return `<div class="row" style="padding:7px 0;gap:9px">${avatar(o.id,28)}
      <div class="grow"><div style="font-weight:600;font-size:13.5px">${esc(o.ad)}</div>
        <div class="xs dim">${s.k} ${s.ad}${sonra?` · ${sonra.n-n} maç sonra ${sonra.ad}`:' · zirve'}</div></div>
      <div class="serif dim" style="font-size:16px">${n}</div></div>`;}).join('')}</div>`:''}`;
}
