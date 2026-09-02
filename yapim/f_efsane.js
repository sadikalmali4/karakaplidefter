/* =========================================================
   MASA EFSANELERİ — masanın kayda geçmiş hafızası
   Kurucu yazar, masa okur. 'adlar' dolu olan bir efsane, o kişiler
   AYNI TAKIMDA eş düştüğünde maç kurulumunda uyarı olarak çıkar.
   Ayarda tutulur (masalar.ayar.efsaneler) → değiştiren yalnız kurucu.
   ========================================================= */
function efsaneler(){ return (DB.ayar&&DB.ayar.efsaneler)||[]; }

/* adı olan ama masada bulunmayan kişiyi de yazıyla gösterebilmek için */
function adaGoreOyuncu(adi){
  const n=String(adi||'').toLocaleLowerCase('tr-TR');
  return DB.oyuncular.find(o=>o.masaId===DB.aktifGrup&&o.ad.toLocaleLowerCase('tr-TR')===n)||null;
}

/* --------- görsel ekler: fotoğraf galerisi + video --------- */
function efsaneFotolari(e){
  return [].concat(e.fotolar||[], e.foto?[e.foto]:[]).filter(Boolean);
}
function efsaneMedya(e,boy){
  const f=efsaneFotolari(e);
  if(!f.length && !e.video) return '';
  const h=boy||118;
  return `<div style="margin-top:9px">
    ${f.length?`<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;-webkit-overflow-scrolling:touch">
      ${f.map(x=>`<img src="${esc(x)}" alt="" loading="lazy" onclick="medyaBuyut('${esc(x)}')"
        style="height:${h}px;border-radius:9px;border:1px solid var(--line);cursor:zoom-in;flex-shrink:0;object-fit:cover"></img>`).join('')}
    </div>`:''}
    ${e.video?`<video src="${esc(e.video)}" controls preload="none" playsinline
      ${f.length?`poster="${esc(f[0])}"`:''}
      style="width:100%;max-width:430px;margin-top:7px;border-radius:10px;border:1px solid var(--line);background:#000"></video>
      <div class="xs dim" style="margin-top:3px">▶︎ Kayıt · dokununca yüklenir</div>`:''}
  </div>`;
}
function medyaBuyut(u){
  acModal(`<img src="${esc(u)}" style="width:100%;border-radius:12px;display:block">
    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="kapatModal()">Kapat</button>`);
}

/* --------- vurgulu efsane: masanın pankartlık hâli --------- */
/* Masa kaşesi: pankartın köşesine basılan mühür. Süs değil, imza. */
function masaKasesi(){
  const g=grup(DB.aktifGrup);
  const ad2=(g&&g.ad)||'MASA';
  return `<div style="position:absolute;top:9px;right:9px;transform:rotate(-13deg);
      border:2px solid var(--gold);border-radius:8px;padding:4px 7px;text-align:center;
      opacity:.5;pointer-events:none;color:var(--gold);max-width:132px">
    <div style="font:700 7px/1.15 inherit;letter-spacing:.06em;text-transform:uppercase;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ad2)}</div>
    <div style="height:1px;background:currentColor;opacity:.5;margin:2px 0"></div>
    <div style="font:700 9.5px/1.15 Georgia,serif;letter-spacing:.04em">TARİHE</div>
    <div style="font:700 9.5px/1.15 Georgia,serif;letter-spacing:.04em">GEÇMİŞTİR</div>
  </div>`;
}

function efsanePankart(e,i,k){
  const ad2=(e.adlar||[]);
  return `<div style="background:linear-gradient(160deg,#241E0C,#1A1712);border:1px solid var(--gold);
      border-radius:13px;padding:14px;margin-bottom:10px;position:relative;overflow:hidden">
    ${masaKasesi()}
    <div class="xs" style="color:var(--gold);letter-spacing:.13em;text-transform:uppercase;font-weight:700;
      max-width:calc(100% - 142px)">
      ${e.ustBaslik?esc(e.ustBaslik):'Masa tarihinin en ağır farkı'}</div>
    ${e.skor?`<div class="serif center" style="margin:11px 0 4px;line-height:1">
      <span style="font-size:44px;color:var(--gold)">${esc(e.skor.sol)}</span>
      <span style="font-size:17px;color:var(--ink3);margin:0 8px">${esc(e.skor.ayrac||'ye')}</span>
      <span style="font-size:44px;color:var(--red)">${esc(e.skor.sag)}</span></div>`:''}
    ${ad2.length?`<div class="xs center" style="color:var(--ink2);margin-bottom:9px">
      ${esc(ad2.join(' & '))}${e.kazananlar?` <span class="dim">karşısında</span> ${esc(e.kazananlar.join(' & '))}`:''}</div>`:''}
    <div class="serif center" style="font-size:15px;margin:2px 0 8px">${esc(e.baslik||'')}</div>
    <div class="xs muted" style="line-height:1.6">${esc(e.metin||'')}</div>
    ${efsaneMedya(e,150)}
    ${serhSatiri(e)}
    ${k?`<button class="btn-xs btn-dn" style="margin-top:10px" onclick="efsaneSil(${i})">Sil</button>`:''}
  </div>`;
}

/* Şerh: efsanenin altına düşülen kuru not. Asıl espri burada. */
function serhSatiri(e){
  if(!e.serh) return '';
  return `<div style="margin-top:9px;padding-top:8px;border-top:1px dashed var(--line);
    font:italic 11.5px/1.5 Georgia,serif;color:var(--ink3)">— ${esc(e.serh)}</div>`;
}

function efsaneKart(){
  const l=efsaneler(), k=kurucuMu();
  if(!l.length&&!k) return '';
  return `<div class="card">
    <h3>📜 Masa Efsaneleri</h3>
    <div class="xs dim" style="margin-bottom:10px">Masanın hafızası. Bir daha "öyle olmamıştı" diyen olmaz.</div>
    ${l.length?l.map((e,i)=> e.vurgu ? efsanePankart(e,i,k) : `<div class="rozet" style="margin-bottom:8px">
      <div class="k">${e.tip==='uyari'?'⚠️':'📖'}</div>
      <div class="grow" style="min-width:0">
        <div style="font-weight:700;font-size:13.5px">${esc(e.baslik||'Efsane')}</div>
        ${(e.adlar||[]).length?`<div class="xs" style="color:var(--gold);margin:2px 0">${esc((e.adlar||[]).join(' & '))}</div>`:''}
        <div class="xs muted" style="line-height:1.55">${esc(e.metin||'')}</div>
        ${efsaneMedya(e)}
        ${serhSatiri(e)}
      </div>
      ${k?`<button class="btn-xs btn-dn" style="flex-shrink:0" onclick="efsaneSil(${i})">Sil</button>`:''}
    </div>`).join('')
     :'<div class="sm dim">Henüz efsane yazılmadı.</div>'}
    ${k?`<button class="btn-b btn-full btn-sm" style="margin-top:10px" onclick="efsaneAc()">+ Efsane Yaz</button>
      <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="efsaneSeed()">
        ⚡ Hazır efsaneleri ${l.length?'güncelle':'yükle'}</button>`:''}
  </div>`;
}

function efsaneAc(){
  if(!kurucuMu()) return toast('Efsaneyi yalnız grubu kuran yazabilir',true);
  const oyn=grupOyunculari();
  acModal(`<h2 class="serif" style="margin:0 0 4px">Efsane Yaz</h2>
    <div class="xs dim" style="margin-bottom:14px">Masada yaşanmış, unutulmaması gereken bir hâl.
      Kişi seçersen o kişiler eş düştüğünde masa uyarı verir.</div>
    <div class="field"><label class="fl">Başlık</label>
      <input id="efBas" maxlength="40" placeholder="Kredi Meselesi"></div>
    <div class="field"><label class="fl">Metin</label>
      <textarea id="efMetin" rows="4" placeholder="Ne olmuştu? Zabıt üslubuyla yazarsan tadından yenmez."></textarea></div>
    <div class="field"><label class="fl">Kimler hakkında <span style="text-transform:none;letter-spacing:0">(isteğe bağlı)</span></label>
      <div class="row wrap" id="efKim">${oyn.map(o=>
        `<div class="chip" data-id="${o.id}" onclick="this.classList.toggle('on')">${avatar(o.id,20)}${esc(o.ad)}</div>`).join('')}</div>
      <div class="xs dim" style="margin-top:6px">İki kişi seçersen, o ikisi Batak'ta eş düştüğünde uyarı çıkar.</div></div>
    <div class="field"><label class="fl">Tür</label>
      <div class="seg" id="efTip">
        <button class="on" data-t="efsane" onclick="segSec(this)">📖 Efsane</button>
        <button data-t="uyari" onclick="segSec(this)">⚠️ Uyarı</button></div></div>
    <button class="btn-p btn-full" id="efBtn" style="margin-top:16px" onclick="efsaneKaydet()">Deftere Geçir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function efsaneKaydet(){
  const baslik=$('#efBas').value.trim(), metin=$('#efMetin').value.trim();
  if(!baslik) return toast('Başlık gerekli',true);
  if(!metin)  return toast('Metni yaz',true);
  const adlar=[...document.querySelectorAll('#efKim .chip.on')].map(e=>ad(e.dataset.id));
  const tip=document.querySelector('#efTip .on')?.dataset.t||'efsane';
  const btn=$('#efBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  DB.ayar.efsaneler=[...efsaneler(),{baslik,metin,adlar,tip}];
  await ayarYaz(true);
  kapatModal(); render(); toast('Efsane deftere geçti.');
}

async function efsaneSil(i){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const e=efsaneler()[i]; if(!e) return;
  if(!confirm(`"${e.baslik}" silinsin mi?`)) return;
  DB.ayar.efsaneler=efsaneler().filter((_,j)=>j!==i);
  await ayarYaz(true);
  render(); toast('Silindi');
}

async function efsaneSeed(){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  try{
    const d=await fetch('kurulum/efsaneler.json',{cache:'no-store'}).then(r=>r.json());
    // Aynı başlıklı efsane varsa ÜZERİNE BİRLEŞTİR: sonradan eklenen
    // fotoğraf/video/vurgu alanları mevcut kayda da işlensin.
    const mevcut=efsaneler().slice();
    let yeni=0, guncel=0;
    for(const e of (d.efsaneler||[])){
      const j=mevcut.findIndex(x=>x.baslik===e.baslik);
      if(j<0){ mevcut.push(e); yeni++; }
      else{
        const onceki=JSON.stringify(mevcut[j]);
        mevcut[j]=Object.assign({},mevcut[j],e);
        if(JSON.stringify(mevcut[j])!==onceki) guncel++;
      }
    }
    if(!yeni&&!guncel) return toast('Hazır efsaneler zaten güncel');
    DB.ayar.efsaneler=mevcut;
    await ayarYaz(true);
    render();
    toast(`${yeni} efsane eklendi, ${guncel} tanesi güncellendi.`);
  }catch(e){ toast('Efsane dosyası okunamadı',true); }
}

/* --------- maç kurulumunda uyarı ---------
   Aynı takıma düşen ikili hakkında yazılmış efsane varsa göster. */
function efsaneUyari(takimlar){
  const l=efsaneler().filter(e=>(e.adlar||[]).length>=2);
  if(!l.length||!takimlar) return '';
  const cikti=[];
  for(const e of l){
    const ids=(e.adlar||[]).map(a=>adaGoreOyuncu(a)?.id).filter(Boolean);
    if(ids.length<2) continue;
    const ayniTakim=takimlar.some(t=>ids.every(id=>t.includes(id)));
    if(ayniTakim) cikti.push(e);
  }
  if(!cikti.length) return '';
  return cikti.map(e=>`<div class="uyari" style="margin-top:10px">
    ⚠️ <b>${esc(e.baslik)}</b> — ${esc(e.metin)}</div>`).join('');
}
