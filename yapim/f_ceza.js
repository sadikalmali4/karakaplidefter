//== ceza
/* =========================================================
   CEZA DEFTERİ — masanın mizahi müeyyideleri

   İstek (kullanıcı, 03.09.2026): arkadaş grubu için ceza defteri.
   "Kim ne yaptı, cezası ne." Uygulamanın hukuk-mizah diline birebir
   oturuyor.

   VERİ — şema değişmedi: akış 'mesaj' + veri.ceza = {kim, sebep, ceza,
   infaz}. Ödeme/borç gibi kısıtlı DEĞİL; masanın her üyesi ceza
   yazabilir (yama 11 yalnız veri.odeme/borcKaydi'yi kurucuya kısıyor).
   İnfaz işaretini yazan kişi kaldırır (akış düzeltme kuralı: kendi
   satırın).
   ========================================================= */

const CEZA_ORNEK = [
  'Bir tur çay ısmarlar',
  'Kaçmakan hesabı öder',
  'Sonraki maçta eş seçemez',
  'Bir el herkese kağıt dağıtır',
  'Telefonu masaya koyar; kaldırırsa ceza katlanır',
  'Bir hafta "Dayı" der',
  'Nargileyi o söyler'
];

function cezalar(){
  return (DB.akis||[])
    .filter(a=>a.grupId===DB.aktifGrup && a.veri && a.veri.ceza)
    .sort((a,b)=>String(b.olusturma).localeCompare(String(a.olusturma)));
}

function cezaKart(){
  const list=cezalar();
  const bekleyen=list.filter(a=>!a.veri.ceza.infaz);
  const bitmis=list.filter(a=>a.veri.ceza.infaz);

  const sat=a=>{
    const c=a.veri.ceza, benimki=a.yazanId===OTURUM.id||kurucuMu();
    const kesen=akisKisi(a.yazanId);
    return `<div class="rozet" style="margin:2px 0;align-items:flex-start">
      ${c.kim?avatar(c.kim,30):'<div class="k">⚖️</div>'}
      <div class="grow" style="min-width:0">
        <div style="font-weight:700;font-size:13.5px">${c.kim?esc(ad(c.kim)):'Masa'}
          ${c.infaz?'<span class="pill green" style="margin-left:4px">infaz edildi</span>':'<span class="pill" style="margin-left:4px">bekliyor</span>'}</div>
        <div class="sm" style="margin-top:2px">${esc(c.sebep||'')}</div>
        <div class="xs" style="color:var(--gold);margin-top:2px">⚖️ ${esc(c.ceza||'')}</div>
        <div class="xs dim" style="margin-top:2px">${esc(kesen.ad)} kaydetti · ${ne_zaman(a.olusturma)}</div>
      </div>
      ${benimki?`<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <button class="btn-xs ${c.infaz?'btn-gh':'btn-g'}" onclick="cezaInfaz('${a.id}',${c.infaz?'false':'true'})">${c.infaz?'Geri al':'İnfaz et'}</button>
        <button class="btn-xs btn-dn" onclick="akisSil('${a.id}')">Sil</button></div>`:''}
    </div>`;
  };

  return `<div class="card">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div><h3 style="margin:0">⚖️ Ceza Defteri</h3>
        <div class="xs dim">Masanın müeyyideleri. İtiraz, çay demlenmiş iken yapılır.</div></div>
      <button class="btn-b btn-sm" style="flex-shrink:0" onclick="cezaEkleAc()">+ Ceza Kes</button>
    </div>
    ${!list.length?`<div class="sep"></div><div class="sm dim">Henüz kimse ceza yemedi.
      İlk müeyyideyi kesmek sana düşer.</div>`:''}
    ${bekleyen.length?`<div class="sep"></div>
      <div class="xs" style="color:#DD8A8A;font-weight:700;margin:4px 0">İNFAZ BEKLEYEN (${bekleyen.length})</div>
      <div class="stack">${bekleyen.map(sat).join('')}</div>`:''}
    ${bitmis.length?`<details style="margin-top:10px"><summary>İnfaz edilenler (${bitmis.length})</summary>
      <div class="stack" style="margin-top:8px">${bitmis.map(sat).join('')}</div></details>`:''}
  </div>`;
}

function cezaEkleAc(){
  const oyn=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Ceza Kes</h2>
    <div class="xs dim" style="margin-bottom:12px">Kim, ne yaptı, cezası ne? Masa görür, defterе geçer.</div>
    <div class="field"><label class="fl">Kime</label>
      <div class="row wrap" id="czKim" style="gap:6px">
        ${oyn.map(o=>`<span class="chip" data-id="${o.id}" onclick="chipTek(this)">${esc(o.ad)}</span>`).join('')}
      </div></div>
    <div class="field"><label class="fl">Ne yaptı? (gerekçe)</label>
      <input id="czSebep" maxlength="80" placeholder="Örn. masaya geç geldi"></div>
    <div class="field"><label class="fl">Ceza</label>
      <input id="czCeza" maxlength="80" placeholder="Örn. bir tur çay ısmarlar">
      <div class="row wrap" style="gap:5px;margin-top:7px">
        ${CEZA_ORNEK.map(c=>`<span class="chip" onclick="document.getElementById('czCeza').value=${JSON.stringify(c)}">${esc(c)}</span>`).join('')}
      </div></div>
    <button class="btn-p btn-full" id="czBtn" style="margin-top:14px" onclick="cezaKaydet()">Deftere Geçir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function cezaKaydet(){
  const kim=document.querySelector('#czKim .chip.on')?.dataset.id||null;
  const sebep=($('#czSebep')?.value||'').trim();
  const ceza=($('#czCeza')?.value||'').trim();
  if(!sebep) return toast('Gerekçe yaz',true);
  if(!ceza) return toast('Ceza yaz',true);
  const btn=$('#czBtn'); if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }
  const metin=`${kim?ad(kim):'Masa'} — ${sebep}. Müeyyide: ${ceza}.`;
  const id=await akisEkle('mesaj',metin,{ceza:{kim,sebep,ceza,infaz:false}});
  if(!id){ if(btn){ btn.disabled=false; btn.textContent='Deftere Geçir'; } return; }
  kapatModal(); render(); toast('Ceza deftere geçti',true);
}

async function cezaInfaz(id,durum){
  const a=(DB.akis||[]).find(x=>x.id===id); if(!a||!a.veri.ceza) return;
  const yeni=Object.assign({},a.veri,{ceza:Object.assign({},a.veri.ceza,{infaz:durum})});
  const {error}=await sb.from('akis').update({veri:yeni}).eq('id',id);
  if(error) return toast(hataMetni(error),true);
  a.veri=yeni; render();
  toast(durum?'İnfaz edildi':'İnfaz geri alındı');
}
