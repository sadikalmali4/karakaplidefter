//== viewSicil
/* SİCİL — iki oyun birden. Sekme yok, tıklama yok.
   Geniş ekranda yan yana, telefonda alt alta. */
function sicilForm(f){
  return f.slice(-5).map(x=>{
    const r=x==='G'?'var(--green)':(x==='M'?'var(--red)':'var(--ink3)');
    return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${r};margin-right:3px"></span>`;
  }).join('');
}
function sicilSirali(oyun){
  const v=Object.values(istatistik(oyun)).filter(p=>p.celse>0);
  return oyun==='batak'
    ? v.slice().sort((a,b)=>b.oran-a.oran||b.gal-a.gal||b.toplamPuan-a.toplamPuan)
    : v.slice().sort((a,b)=>a.ortSira-b.ortSira||a.ortPuan-b.ortPuan);
}

/* bir oyunun sicil kartı; kayıt yoksa tek satırlık uyarı */
function sicilKarti(oyun){
  const ad2=oyun==='batak'?'Batak':'101';
  const isaret=oyun==='batak'?'🂡':'🀄';
  const sirali=sicilSirali(oyun);
  if(!sirali.length) return `<div class="card">
    <h3>${isaret} ${ad2}</h3>
    <div class="sm dim">Bu oyundan kapanmış maç yok. İlk tabelayı kapat, sicil kendiliğinden dolar.</div></div>`;

  return `<div class="card">
    <h3>${isaret} ${ad2} Sicili</h3>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Oyuncu</th><th>Maç</th><th>1.</th><th>%</th><th>Parti</th>
        <th>${oyun==='batak'?'Puan':'Ort.'}</th><th>Form</th></tr></thead>
      <tbody>${sirali.map((p,i)=>`<tr onclick="SABIKA_ID='${p.id}';render();window.scrollTo(0,0)" style="cursor:pointer">
        <td><div class="row" style="gap:8px"><span class="rank ${i===0?'r1':''}">${i+1}</span>${avatar(p.id,24)}
          <span style="font-weight:600">${esc(ad(p.id))}</span></div></td>
        <td>${p.celse}</td><td>${p.gal}</td>
        <td><div class="${p.oran>=.5?'pos':''}">${Math.round(p.oran*100)}</div>
          <div class="bar" style="width:40px;margin:3px 0 0 auto"><i style="width:${Math.round(p.oran*100)}%;
            background:var(--gold)"></i></div></td>
        <td class="dim">${p.parti}</td><td>${oyun==='batak'?p.toplamPuan:Math.round(p.ortPuan)}</td>
        <td>${sicilForm(p.form)}</td></tr>`).join('')}</tbody></table></div>
    <div class="xs dim" style="margin-top:8px">Satıra dokun → oyuncu kartı.${
      oyun==='101'?" 101'de düşük ceza puanı iyidir.":''}</div>
  </div>`;
}

/* karne: batakta ihale, 101'de el dökümü */
function sicilKarne(oyun){
  const v=Object.values(istatistik(oyun)).filter(p=>p.celse>0);
  if(!v.length) return '';
  if(oyun==='batak'){
    if(!v.some(p=>p.ihale)) return '';
    return `<div class="card"><h3>İhale Karnesi</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Oyuncu</th><th>İhale</th><th>Tuttu</th><th>Battı</th><th>Bat %</th></tr></thead><tbody>
        ${v.slice().sort((a,b)=>b.ihale-a.ihale).map(p=>`<tr><td>${esc(ad(p.id))}</td><td>${p.ihale}</td>
          <td class="${p.ihaleTam?'pos':''}">${p.ihaleTam}</td><td class="${p.ihaleBat?'neg':''}">${p.ihaleBat}</td>
          <td>${p.ihale?Math.round(p.batOran*100):'–'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="xs dim" style="margin-top:8px">Yalnız "Detaylı" açılmış masalarda dolar.</div></div>`;
  }
  if(!v.some(p=>p.elBitirdi||p.acamadi||p.cifte||p.enAgirCeza)) return '';
  return `<div class="card"><h3>El Karnesi</h3>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Oyuncu</th><th>Bitirdi</th><th>Açamadı</th><th>Çifte</th><th>En ağır</th></tr></thead><tbody>
      ${v.slice().sort((a,b)=>b.elBitirdi-a.elBitirdi).map(p=>`<tr><td>${esc(ad(p.id))}</td>
        <td class="${p.elBitirdi?'pos':''}">${p.elBitirdi}</td><td class="${p.acamadi?'neg':''}">${p.acamadi}</td>
        <td>${p.cifte}</td><td class="dim">${p.enAgirCeza||'–'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="xs dim" style="margin-top:8px">Bitirdi/açamadı dökümü yalnız "Detaylı" masalarda tutulur; ham tabelada "en ağır" yine sayılır.</div></div>`;
}

function viewSicil(){
  /* oyuncu kartı açıldıysa iki oyunu birlikte gösteriyoruz */
  if(SABIKA_ID) return sabikaGorunum(SABIKA_ID);

  const b=sicilSirali('batak').length, y=sicilSirali('101').length;
  if(!b&&!y) return `<div class="card"><div class="empty"><div class="big">📊</div>
    Henüz kapanmış maç yok.<div class="sm" style="margin-top:6px">İlk tabelayı kapat, sicil kendiliğinden dolar.</div></div></div>`;

  return `<div class="ikili">
      ${sicilKarti('batak')}
      ${sicilKarti('101')}
    </div>
    <div class="ikili">
      ${sicilKarne('batak')}
      ${sicilKarne('101')}
    </div>`;
}

//== sabikaGorunum
/* OYUNCU KARTI — iki oyun bir arada, sekme yok. */
function sabikaGorunum(id){
  const o=oy(id), sv=seviye(toplamMac(id));
  const kut=(b,e,r)=>`<div style="flex:1;min-width:74px;text-align:center;padding:9px 4px;
    background:var(--panel2);border-radius:10px">
    <div class="serif" style="font-size:19px;color:${r||'var(--ink)'}">${b}</div>
    <div class="xs dim">${e}</div></div>`;

  const oyunBlok=oyun=>{
    const p=istatistik(oyun)[id];
    const ad2=oyun==='batak'?'🂡 Batak':'🀄 101';
    if(!p||!p.celse) return `<div class="card"><h3>${ad2}</h3><div class="sm dim">Kayıt yok.</div></div>`;
    const rozet=muayyideler(oyun).filter(r=>unvanKisi(r.kim).includes(id));
    return `<div class="card">
      <h3>${ad2}</h3>
      <div class="row wrap" style="gap:7px">
        ${kut(p.celse,'Maç')}${kut(p.gal,'Birincilik','var(--gold)')}${kut('%'+Math.round(p.oran*100),'Oran')}
        ${kut(p.parti,'Parti')}
        ${oyun==='batak'?kut(art(p.toplamPuan),'Net puan',p.toplamPuan>=0?'var(--green)':'var(--red)')
                        :kut(Math.round(p.ortPuan),'Ort. ceza')}
        ${oyun==='batak'?kut(p.ihale,'İhale'):kut(p.elBitirdi,'El bitirdi')}
        ${oyun==='batak'?kut(p.ihaleBat,'Battı',p.ihaleBat?'var(--red)':''):kut(p.acamadi,'Açamadı',p.acamadi?'var(--red)':'')}
      </div>
      <div class="sep"></div>
      <div class="sm stack">
        <div><span class="dim">Son 5:</span> ${p.form.slice(-5).map(x=>x==='G'?'<b class="pos">G</b>'
          :(x==='M'?'<b class="neg">M</b>':'<span class="dim">–</span>')).join(' ')}</div>
        <div><span class="dim">Seri:</span> ${p.seriTip==='gal'
          ?`<b class="pos">${p.seri} maçtır kazanıyor</b>`:`<b class="neg">${p.seri} maçtır kazanamıyor</b>`}</div>
        <div><span class="dim">En iyi:</span> ${p.enIyi} &nbsp; <span class="dim">En kötü:</span> ${p.enKotu}</div>
      </div>
      ${rozet.length?`<div class="sep"></div>
        <div class="xs dim" style="margin-bottom:6px">ÜZERİNDEKİ UNVANLAR</div>
        <div class="row wrap" style="gap:6px">${rozet.map(r=>
          `<span class="pill ${r.tip==='kotu'?'red':'gold'}">${r.k} ${esc(r.ad)}</span>`).join('')}</div>`:''}
      ${h2h(id,oyun)}
    </div>`;
  };

  return `<button class="btn-sm btn-gh" style="margin-bottom:10px" onclick="SABIKA_ID=null;render()">‹ Sicile dön</button>
  <div class="card tight"><div class="row" style="gap:12px">${avatar(id,48)}
    <div class="grow"><div class="serif" style="font-size:19px">${esc(o.ad)}${
      lakap(id)?` <span style="color:var(--gold);font-size:15px">“${esc(lakap(id))}”</span>`:''}${
      dgKalan(o.dogum)===0?' <span class="pill gold">🎂 bugün</span>':''}</div>
      <div class="xs dim">${sv.k} ${sv.ad} · ${toplamMac(id)} maç${
        o.dogum?` · ${yas(o.dogum)} yaşında`:''}</div></div></div>
    <div class="xs dim" style="margin-top:8px;font-style:italic">${esc(sv.not)}</div></div>
  <div class="ikili">${oyunBlok('batak')}${oyunBlok('101')}</div>`;
}
