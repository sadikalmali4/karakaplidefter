/* =========================================================
   LAKAPLAR — masanın verdiği ad
   Ada gömmüyoruz; ayrı tutuyoruz ki zabıtlar kirlenmesin.
   masalar.ayar.lakaplar = { <oyuncuId>: "Dayı", ... }
   Şemada sütun açmaya gerek yok, ayar zaten jsonb.
   Yazan: yalnız masayı kuran.
   ========================================================= */
function lakaplar(){ return (DB.ayar&&DB.ayar.lakaplar)||{}; }
function lakap(id){ return lakaplar()[id]||''; }

/* Ad + lakap birlikte: kadro ve kartlarda kullanılır, zabıtta kullanılmaz */
function adLakap(id){
  const l=lakap(id);
  return l ? `${ad(id)} <span style="color:var(--gold);font-weight:600">"${esc(l)}"</span>` : esc(ad(id));
}
/* düz metin hâli (kopyalanan yerler için) */
function adLakapDuz(id){
  const l=lakap(id);
  return l ? `${ad(id)} "${l}"` : ad(id);
}

function lakapKart(){
  const oyn=grupOyunculari(), k=kurucuMu();
  if(!oyn.length) return '';
  const yazili=oyn.filter(o=>lakap(o.id));
  return `<div class="card">
    <h3>🎖 Lakaplar</h3>
    <div class="xs dim" style="margin-bottom:10px">Masanın verdiği ad. Kişinin kendi seçtiği değil —
      teamül böyledir, itiraz mercii yoktur.</div>
    ${yazili.length?yazili.map(o=>`<div class="row" style="padding:6px 0;gap:9px">
      ${avatar(o.id,30)}
      <div class="grow" style="min-width:0">
        <div style="font-weight:600;font-size:13.5px">${esc(o.ad)}</div>
        <div class="serif" style="font-size:15px;color:var(--gold)">“${esc(lakap(o.id))}”</div>
      </div>
      ${k?`<button class="btn-xs btn-gh" onclick="lakapAc('${o.id}')">Değiştir</button>`:''}
    </div>`).join('')
     :'<div class="sm dim">Henüz lakap takılmadı.</div>'}
    ${oyn.length>yazili.length?`<div class="xs dim" style="margin-top:9px">
      Lakabı olmayanlar: ${oyn.filter(o=>!lakap(o.id)).map(o=>esc(o.ad)).join(', ')}</div>`:''}
    ${k?`<button class="btn-b btn-full btn-sm" style="margin-top:11px" onclick="lakapAc()">🎖 Lakap Tak</button>`:''}
  </div>`;
}

function lakapAc(secili){
  if(!kurucuMu()) return toast('Lakabı yalnız masayı kuran takar',true);
  const oyn=grupOyunculari();
  acModal(`<h2 class="serif" style="margin:0 0 4px">Lakap Tak</h2>
    <div class="xs dim" style="margin-bottom:14px">Kısa olsun, tek kelime en iyisi.
      Boş bırakıp kaydedersen lakap kalkar.</div>
    <div class="field"><label class="fl">Kim</label>
      <div class="row wrap" id="lkKim">${oyn.map(o=>
        `<div class="chip ${o.id===secili?'on':''}" data-id="${o.id}"
          onclick="tekSecChip(this);lakapDoldur()">${avatar(o.id,20)}${esc(o.ad)}</div>`).join('')}</div></div>
    <div class="field"><label class="fl">Lakap</label>
      <input id="lkAd" maxlength="18" placeholder="Dayı" onkeydown="if(event.key==='Enter')lakapKaydet()"></div>
    <div class="xs dim" style="margin-top:6px">Zabıtlarda görünmez — orada asıl ad kullanılır.
      Lakap kadroda, kartlarda ve kürsüde görünür.</div>
    <button class="btn-p btn-full" id="lkBtn" style="margin-top:16px" onclick="lakapKaydet()">Kaydet</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
  lakapDoldur();
  setTimeout(()=>$('#lkAd')?.focus(),60);
}
function tekSecChip(el){
  el.parentElement.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
}
function lakapDoldur(){
  const id=document.querySelector('#lkKim .chip.on')?.dataset.id;
  const i=$('#lkAd'); if(i) i.value=id?lakap(id):'';
}
async function lakapKaydet(){
  const id=document.querySelector('#lkKim .chip.on')?.dataset.id;
  if(!id) return toast('Kimi seçtiğini söyle',true);
  const yeni=$('#lkAd').value.trim();
  const btn=$('#lkBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const m=Object.assign({},lakaplar());
  if(yeni) m[id]=yeni; else delete m[id];
  DB.ayar.lakaplar=m;
  await ayarYaz(true);
  kapatModal(); render();
  toast(yeni?`${ad(id)} bundan sonra “${yeni}”.`:`${ad(id)}'in lakabı kaldırıldı.`);
}
