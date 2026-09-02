/* =========================================================
   AKIŞ — konuşmalar, yorumlar, tepkiler
   Zabıtlar buraya kendiliğinden düşer; altına laf atılır.
   ========================================================= */
const TEPKILER=['😂','🔥','👏','💀','🤝','🎯'];
let _taslak='', _yorumAcik={}, _yorumTaslak={};

function akisKisi(profilId){
  const o=DB.oyuncular.find(x=>x.masaId===DB.aktifGrup&&x.profilId===profilId);
  if(o) return {ad:o.ad,foto:o.foto,renk:o.renk};
  const u=MASA_UYELERI.find(x=>x.profil_id===profilId);
  return {ad:u?.profiller?.ad||'birisi',foto:u?.profiller?.foto_url||null,renk:u?.profiller?.renk||'#5a524c'};
}
function avatarKisi(k,b){
  b=b||30;
  if(k.foto) return `<div class="avatar" style="width:${b}px;height:${b}px;background-image:url('${esc(k.foto)}')"></div>`;
  return `<div class="avatar" style="background:${esc(k.renk)};width:${b}px;height:${b}px;font-size:${Math.round(b*.43)}px">${esc(bas(k.ad))}</div>`;
}
function ne_zaman(iso){
  const t=new Date(iso), fark=(Date.now()-t.getTime())/1000;
  if(fark<60) return 'az önce';
  if(fark<3600) return Math.floor(fark/60)+' dk';
  if(fark<86400) return Math.floor(fark/3600)+' sa';
  if(fark<172800) return 'dün';
  const g=String(t.getDate()).padStart(2,'0'), a=String(t.getMonth()+1).padStart(2,'0');
  return `${g}.${a}`;
}

function viewAkis(){
  const hepsi=DB.akis.filter(a=>a.grupId===DB.aktifGrup);
  const ust=hepsi.filter(a=>!a.yanitId);
  const yorumlar=id=>hepsi.filter(a=>a.yanitId===id)
    .sort((a,b)=>a.olusturma.localeCompare(b.olusturma));

  const yazma=`
  <div class="card">
    <div class="row" style="align-items:flex-start;gap:9px">
      ${DB.ben?avatar(DB.ben,34):avatarKisi(akisKisi(OTURUM.id),34)}
      <div class="grow">
        <textarea id="akMetin" rows="2" placeholder="Masaya bir şey söyle..."
          oninput="_taslak=this.value" style="resize:none">${esc(_taslak)}</textarea>
        <div class="row wrap" style="margin-top:8px;gap:7px">
          <button class="btn-sm btn-gh" onclick="cagriYap()" title="Bu akşam oynayan var mı?">📣 Çağrı</button>
          <button class="btn-sm btn-gh" onclick="haftaOzetiAc(7)">🗓️ Hafta Özeti</button>
          <div class="grow"></div>
          <button class="btn-p btn-sm" id="akBtn" onclick="akisYaz()">Gönder</button>
        </div>
      </div>
    </div>
  </div>`;

  if(!ust.length) return yazma+`<div class="card"><div class="empty">
    <div class="big">💬</div>Akış boş.
    <div class="sm" style="margin-top:6px">İlk lafı sen et. Kapanan her zabıt da buraya düşecek.</div></div></div>`;

  return yazma+ust.map(a=>akisKart(a,yorumlar(a.id))).join('');
}

function akisKart(a,yrm){
  const k=akisKisi(a.yazanId);
  const benimki=a.yazanId===OTURUM.id;
  const grup2={};
  (a.tepkiler||[]).forEach(t=>{ (grup2[t.emoji]=grup2[t.emoji]||[]).push(t.profilId); });
  const acik=!!_yorumAcik[a.id];

  const govde = a.tip==='zabit'
    ? `<div class="row wrap" style="gap:6px;margin:2px 0 8px">
         <span class="pill ${a.veri?.oyun==='batak'?'red':'blue'}">${a.veri?.oyun==='batak'?'BATAK':'101'}</span>
         ${a.veri?.masaAd?`<span class="pill">${esc(a.veri.masaAd)}</span>`:''}
         ${a.veri?.kazanan?`<span class="pill gold">🏆 ${esc(a.veri.kazanan)}</span>`:''}
       </div>
       <details><summary>Zabtı oku</summary>
         <div class="zabit" style="margin-top:8px" id="zb_${a.id}">${esc(a.metin||'')}</div>
         <button class="btn-sm btn-gh" style="margin-top:8px;width:100%"
           onclick="kopyala(document.getElementById('zb_${a.id}').textContent)">📋 Kopyala</button>
       </details>`
    : a.tip==='unvan'
    ? `<div class="rozet" style="margin:2px 0"><div class="k">${esc(a.veri?.k||'🏅')}</div>
         <div><div style="font-weight:700;font-size:13.5px">${esc(a.veri?.unvan||'')} — <span style="color:var(--gold)">${esc(a.veri?.kim||'')}</span></div>
         <div class="xs muted">${esc(a.metin||'')}</div></div></div>`
    : a.tip==='cagri'
    ? `<div class="uyari" style="margin:2px 0">📣 ${esc(a.metin||'')}</div>`
    : `<div style="font-size:14.5px;line-height:1.55;white-space:pre-wrap;margin:2px 0">${esc(a.metin||'')}</div>`;

  return `<div class="card">
    <div class="row" style="gap:9px">
      ${avatarKisi(k,32)}
      <div class="grow" style="min-width:0">
        <div style="font-weight:700;font-size:13.5px" class="ell">${esc(k.ad)}
          ${a.tip==='zabit'?'<span class="xs dim" style="font-weight:500">zabıt kaydetti</span>':''}
          ${a.tip==='unvan'?'<span class="xs dim" style="font-weight:500">unvan değişti</span>':''}</div>
        <div class="xs dim">${ne_zaman(a.olusturma)}</div>
      </div>
      ${benimki||kurucuMu()?`<button class="btn-xs btn-gh" onclick="akisSil('${a.id}')">Sil</button>`:''}
    </div>
    <div style="margin-top:8px">${govde}</div>

    <div class="row wrap" style="gap:5px;margin-top:9px">
      ${Object.keys(grup2).map(e=>{
        const benVarMi=grup2[e].includes(OTURUM.id);
        return `<button class="btn-xs" style="${benVarMi?'border-color:var(--gold);color:var(--gold)':''}"
          onclick="tepkiVer('${a.id}','${e}')">${e} ${grup2[e].length}</button>`;}).join('')}
      <button class="btn-xs btn-gh" onclick="tepkiSec('${a.id}')">＋</button>
      <div class="grow"></div>
      <button class="btn-xs btn-gh" onclick="yorumAcKapa('${a.id}')">
        💬 ${yrm.length?yrm.length+' yorum':'yorum yaz'}</button>
    </div>

    ${(acik||yrm.length)?`<div style="margin-top:10px;border-left:2px solid var(--line);padding-left:10px">
      ${yrm.map(y=>{const yk=akisKisi(y.yazanId);
        return `<div class="row" style="gap:8px;align-items:flex-start;padding:5px 0">
          ${avatarKisi(yk,24)}
          <div class="grow" style="min-width:0">
            <div class="xs"><b>${esc(yk.ad)}</b> <span class="dim">${ne_zaman(y.olusturma)}</span></div>
            <div class="sm" style="white-space:pre-wrap">${esc(y.metin||'')}</div></div>
          ${y.yazanId===OTURUM.id||kurucuMu()?`<button class="btn-xs btn-gh" onclick="akisSil('${y.id}')">×</button>`:''}
        </div>`;}).join('')}
      ${acik?`<div class="row" style="margin-top:7px;gap:6px">
        <input id="yr_${a.id}" placeholder="Yorum yaz..." value="${esc(_yorumTaslak[a.id]||'')}"
          oninput="_yorumTaslak['${a.id}']=this.value"
          onkeydown="if(event.key==='Enter')yorumYaz('${a.id}')">
        <button class="btn-sm btn-p" onclick="yorumYaz('${a.id}')">Yaz</button></div>`:''}
    </div>`:''}
  </div>`;
}

/* --------- yazma --------- */
async function akisEkle(tip,metin,veri,yanitId){
  const {data,error}=await sb.from('akis').insert({
    masa_id:DB.aktifGrup, tip, yazan_id:OTURUM.id,
    metin:metin||null, veri:veri||{}, yanit_id:yanitId||null
  }).select('id,tip,yazan_id,metin,veri,olusturma,yanit_id').single();
  if(error){ toast(hataMetni(error),true); return null; }
  DB.akis.unshift({id:data.id,grupId:DB.aktifGrup,tip:data.tip,yazanId:data.yazan_id,
    metin:data.metin,veri:data.veri||{},olusturma:data.olusturma,yanitId:data.yanit_id,tepkiler:[]});
  return data.id;
}
async function akisYaz(){
  const m=($('#akMetin')?.value||'').trim();
  if(!m) return toast('Önce bir şey yaz',true);
  const b=$('#akBtn'); b.disabled=true; b.innerHTML='<span class="yukleniyor"></span>';
  const id=await akisEkle('mesaj',m,{});
  if(id){ _taslak=''; render(); } else { b.disabled=false; b.textContent='Gönder'; }
}
async function yorumYaz(ustId){
  const m=(_yorumTaslak[ustId]||'').trim();
  if(!m) return;
  const id=await akisEkle('mesaj',m,{},ustId);
  if(id){ _yorumTaslak[ustId]=''; _yorumAcik[ustId]=true; render(); }
}
function yorumAcKapa(id){ _yorumAcik[id]=!_yorumAcik[id]; render();
  setTimeout(()=>$('#yr_'+id)?.focus(),50); }
async function cagriYap(){
  const id=await akisEkle('cagri','Bu akşam oynayan var mı? 👍 basan gelir.',{});
  if(id){ await tepkiVer(id,'👍',true); render(); toast('Çağrı yapıldı.'); }
}
async function akisSil(id){
  if(!confirm('Silinsin mi?')) return;
  const {error}=await sb.from('akis').delete().eq('id',id);
  if(error) return toast(hataMetni(error),true);
  DB.akis=DB.akis.filter(a=>a.id!==id&&a.yanitId!==id);
  render();
}

/* --------- tepkiler --------- */
async function tepkiVer(akisId,emoji,sessiz){
  const a=DB.akis.find(x=>x.id===akisId); if(!a) return;
  a.tepkiler=a.tepkiler||[];
  const varMi=a.tepkiler.find(t=>t.profilId===OTURUM.id&&t.emoji===emoji);
  if(varMi){
    a.tepkiler=a.tepkiler.filter(t=>!(t.profilId===OTURUM.id&&t.emoji===emoji));
    if(!sessiz) render();
    const {error}=await sb.from('akis_tepkileri').delete()
      .eq('akis_id',akisId).eq('profil_id',OTURUM.id).eq('emoji',emoji);
    if(error) toast(hataMetni(error),true);
  }else{
    a.tepkiler.push({profilId:OTURUM.id,emoji});
    if(!sessiz) render();
    const {error}=await sb.from('akis_tepkileri')
      .insert({akis_id:akisId,profil_id:OTURUM.id,emoji});
    if(error) toast(hataMetni(error),true);
  }
}
function tepkiSec(id){
  acModal(`<h2 class="serif" style="margin:0 0 12px">Tepki</h2>
    <div class="row wrap">${TEPKILER.map(e=>
      `<button style="font-size:26px;padding:12px 16px" onclick="kapatModal();tepkiVer('${id}','${e}')">${e}</button>`).join('')}</div>`);
}
