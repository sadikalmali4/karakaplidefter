/* =========================================================
   MASA ÇAĞRISI
   "Perşembe 21:00 Parkverde — kim var?" Akışa düşer, WhatsApp'a
   yapıştırılacak metin ve link üretilir. Cevaplar uygulamada toplanır.

   NEDEN AKIŞ TEPKİSİ: akış kaydını yalnız yazan güncelleyebiliyor
   (kural böyle, doğrusu da bu). Katılım cevabını herkesin kendi adına
   yazması gerekiyor — akis_tepkileri tam bunu yapıyor: (kayıt, kişi,
   işaret) ve kişi yalnız kendi satırını yazabiliyor. Yeni tablo ya da
   yama gerekmedi.

   WhatsApp'ın kendi anketi de bunu yapar; uygulamada olmasının tek
   gerekçesi katılanların doğrudan kuraya girmesi ve kayda geçmesi.
   ========================================================= */

/* Tepki tablosunun anahtarı (kayıt, kişi, işaret) olduğu için bir kişi
   birden çok işaret taşıyabiliyor: biri katılım cevabı, biri eş oyu.
   Silme işlemleri bu yüzden yalnız kendi grubunu temizliyor — yoksa
   katılım cevabı verince eş oyu da uçuyordu. */
const CAGRI_VAR='✋', CAGRI_YOK='✖️', ES_KURA='🎲', ES_BELLI='🤝';
const RSVP_ISARET=[CAGRI_VAR,CAGRI_YOK];
const ESOY_ISARET=[ES_KURA,ES_BELLI];

const cagrilar = ()=>(DB.akis||[]).filter(a=>a.tip==='cagri'&&a.grupId===DB.aktifGrup);
function acikCagri(){
  /* Vakti geçmemiş en yeni çağrı */
  return cagrilar().filter(a=>{
    const t=a.veri&&a.veri.cagri&&a.veri.cagri.zaman;
    return t && new Date(t).getTime() > Date.now()-6*3600e3;   // 6 saat sonrasına kadar yaşasın
  }).sort((x,y)=>String(x.veri.cagri.zaman).localeCompare(String(y.veri.cagri.zaman)))[0]||null;
}
const cagriCevap = (a,isaret)=>(a.tepkiler||[]).filter(t=>t.emoji===isaret).map(t=>t.profilId);
const cagriBenim = a=>{
  const t=(a.tepkiler||[]).find(x=>x.profilId===OTURUM.id&&RSVP_ISARET.includes(x.emoji));
  return t?t.emoji:null;
};
const cagriEsBenim = a=>{
  const t=(a.tepkiler||[]).find(x=>x.profilId===OTURUM.id&&ESOY_ISARET.includes(x.emoji));
  return t?t.emoji:null;
};
/* Eş oylaması: yalnız GELECEĞİNİ söyleyenlerin oyu sayılır — masaya
   oturmayacak kişinin eş usulünü belirlemesi tuhaf olur. Eşitlikte
   sonuç yok, masada konuşulur. */
function cagriEsSonuc(a){
  const gelen=new Set(cagriCevap(a,CAGRI_VAR));
  const oy=e=>(a.tepkiler||[]).filter(t=>t.emoji===e&&gelen.has(t.profilId)).map(t=>t.profilId);
  const k=oy(ES_KURA), b=oy(ES_BELLI);
  return {kura:k, belli:b,
          sonuc: k.length===b.length ? null : (k.length>b.length?'kura':'belli')};
}
/* Çağrının fiilî eş usulü: kesin seçildiyse o, oylamaysa oyun sonucu */
function cagriEsUsul(a){
  const c=a.veri.cagri;
  if(c.es!=='oylama') return c.es;
  return cagriEsSonuc(a).sonuc;      // null → henüz belli değil
}
const profilOyuncuId = pid=>DB.oyuncular.find(o=>o.profilId===pid&&o.masaId===DB.aktifGrup)?.id||null;

/* --------------------------- kurulum --------------------------- */
function cagriAc(){
  const bugun2=new Date(); bugun2.setDate(bugun2.getDate()+1);
  const ik=n=>String(n).padStart(2,'0');
  const varsayilanTarih=`${bugun2.getFullYear()}-${ik(bugun2.getMonth()+1)}-${ik(bugun2.getDate())}`;
  acModal(`<div class="center"><div style="font-size:30px">📣</div>
      <h2 class="serif" style="margin:6px 0 4px">Masa Çağrısı</h2>
      <div class="xs dim" style="margin-bottom:14px">Gruba yapıştıracağın çağrı. Herkes uygulamadan
        katılıyorum / katılmıyorum der; sayı burada görünür.</div></div>
    <div class="two">
      <div><label class="fl">Gün</label><input type="date" id="cgTarih" value="${varsayilanTarih}"></div>
      <div><label class="fl">Saat</label><input type="time" id="cgSaat" value="21:00"></div>
    </div>
    ${yerSecici(sonYer())}
    <div class="field"><label class="fl">Eşler nasıl belirlenecek?</label>
      <div class="seg" id="cgEs">
        <button class="on" data-e="oylama" onclick="segSec(this)">🗳️ Oylansın</button>
        <button data-e="kura" onclick="segSec(this)">🎲 Kurayla</button>
        <button data-e="belli" onclick="segSec(this)">🤝 Belli</button>
      </div>
      <div class="xs dim" style="margin-top:6px">
        <b>Oylansın:</b> gelenler oy verir, çoğunluk kazanır — eşitlikte masada konuşulur.<br>
        <b>Kurayla:</b> katılanlar arasından çekilir. <b>Belli:</b> uygulama karışmaz.</div></div>
    <div class="field"><label class="fl">Not <span style="text-transform:none;letter-spacing:0">(isteğe bağlı)</span></label>
      <input id="cgNot" maxlength="120" placeholder="Cin bende, siz mezeyi getirin"></div>
    <button class="btn-p btn-full" id="cgBtn" style="margin-top:16px" onclick="cagriKaydet()">Çağrıyı Yay</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function cagriKaydet(){
  const t=$('#cgTarih').value, s=$('#cgSaat').value;
  if(!t||!s) return toast('Gün ve saat gerekli',true);
  const zaman=new Date(`${t}T${s}`);
  if(isNaN(zaman)) return toast('Tarih okunamadı',true);
  const yer=yerOku()||yerListesi()[0];
  const es=document.querySelector('#cgEs .on')?.dataset.e||'kura';
  const not=$('#cgNot').value.trim();

  const btn=$('#cgBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const esLaf={kura:' Eşler kurayla çekilecek.',belli:' Eşler masada belirlenecek.',
               oylama:' Eş usulü gelenlerin oyuna bırakılmıştır.'}[es]||'';
  const metin=`${saatMetni(zaman.toISOString())} · ${yer} — masa kuruluyor.`+esLaf+(not?` ${not}`:'');
  const id=await akisEkle('cagri',metin,{cagri:{zaman:zaman.toISOString(),yer,es,not}});
  if(!id){ btn.disabled=false; btn.textContent='Çağrıyı Yay'; return; }
  /* çağıran zaten geliyor sayılır */
  await cagriCevapla(id,CAGRI_VAR,true);
  kapatModal(); await yenile(true);
  const yeni=cagrilar().find(a=>a.id===id);
  if(yeni) cagriPaylas(yeni.id);
  toast('Çağrı yayıldı.');
}

/* --------------------------- cevap --------------------------- */
/* Yalnız kendi grubundaki işareti değiştirir; öteki grup yerinde kalır. */
async function cagriIsaret(akisId,isaret,grup2,sessiz,laf){
  try{
    await sb.from('akis_tepkileri').delete()
      .eq('akis_id',akisId).eq('profil_id',OTURUM.id).in('emoji',grup2);
    if(isaret){
      const {error}=await sb.from('akis_tepkileri')
        .insert({akis_id:akisId,profil_id:OTURUM.id,emoji:isaret});
      if(error) throw error;
    }
    if(!sessiz){ await yenile(true); if(laf) toast(laf); }
    return true;
  }catch(e){ if(!sessiz) toast(hataMetni(e),true); return false; }
}
const cagriCevapla=(akisId,isaret,sessiz)=>cagriIsaret(akisId,isaret,RSVP_ISARET,sessiz,
  isaret===CAGRI_VAR?'Katılıyorsun, yazıldı.':'Katılmıyorsun, yazıldı.');
const cagriEsOy=(akisId,isaret)=>cagriIsaret(akisId,isaret,ESOY_ISARET,false,
  isaret===ES_KURA?'Oyun: kurayla.':'Oyun: eşler belli.');

/* --------------------------- kart --------------------------- */
function cagriKart(){
  const a=acikCagri();
  if(!a) return kurucuMu()||DB.ben
    ? `<div class="card tight center"><button class="btn-b btn-sm" onclick="cagriAc()">📣 Masa Çağrısı Yay</button></div>`
    : '';
  const c=a.veri.cagri;
  const gelen=cagriCevap(a,CAGRI_VAR), gelmeyen=cagriCevap(a,CAGRI_YOK);
  const benim=cagriBenim(a);
  const kalan=kalanMetni(c.zaman);
  const gecti=new Date(c.zaman).getTime()<=Date.now();
  const usul=cagriEsUsul(a);
  const oy=cagriEsSonuc(a), esBenim=cagriEsBenim(a);
  const rozet={kura:'🎲 Kurayla',belli:'🤝 Eşler belli',oylama:'🗳️ Oylanıyor'}[c.es]||'';
  const ad3=pid=>{const o=profilOyuncuId(pid); return o?ad(o):(MASA_UYELERI.find(u=>u.profil_id===pid)?.profiller?.ad||'?');};
  const av=pid=>{const o=profilOyuncuId(pid); return o?avatar(o,24):'';};

  return `<div class="card" style="border-color:${gecti?'var(--line)':'var(--gold)'}">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><div class="serif" style="font-size:17px">📣 Masa Çağrısı</div>
        <div class="xs dim">${saatMetni(c.zaman)} · ${esc(c.yer||'')} · ${gecti?'vakti geçti':kalan}</div></div>
      <span class="pill ${c.es==='belli'?'':'gold'}">${rozet}</span>
    </div>
    ${c.not?`<div class="sm" style="margin-top:8px;font-style:italic">${esc(c.not)}</div>`:''}

    <div class="sep"></div>
    <div class="row" style="justify-content:space-between">
      <div class="sm"><b class="pos">${gelen.length}</b> geliyor</div>
      <div class="sm"><b class="${gelmeyen.length?'neg':'zero'}">${gelmeyen.length}</b> gelmiyor</div>
    </div>
    ${gelen.length?`<div class="row wrap" style="gap:5px;margin-top:8px">${gelen.map(pid=>
      `<span class="pill green">${av(pid)} ${esc(ad3(pid))}</span>`).join('')}</div>`:''}
    ${gelmeyen.length?`<div class="row wrap" style="gap:5px;margin-top:6px">${gelmeyen.map(pid=>
      `<span class="pill red">${esc(ad3(pid))}</span>`).join('')}</div>`:''}

    ${!gecti?`<div class="two" style="margin-top:12px">
      <button class="${benim===CAGRI_VAR?'btn-ok':''}" style="${benim===CAGRI_VAR
        ?'background:var(--green);border-color:var(--green);color:#fff':''}"
        onclick="cagriCevapla('${a.id}','${CAGRI_VAR}')">✋ Katılıyorum</button>
      <button class="${benim===CAGRI_YOK?'btn-dn':''}" style="${benim===CAGRI_YOK
        ?'background:#5c3b33;border-color:#5c3b33;color:#fff':''}"
        onclick="cagriCevapla('${a.id}','${CAGRI_YOK}')">✖️ Katılmıyorum</button>
    </div>`:''}

    ${c.es==='oylama'?`
      <div class="sep"></div>
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <div class="xs dim">EŞLER — GELENLERİN OYU</div>
        <div class="xs ${usul?'':'dim'}" ${usul?'style="color:var(--gold);font-weight:700"':''}>${
          usul==='kura'?'🎲 kura kazandı':(usul==='belli'?'🤝 eşler belli':'henüz belli değil')}</div>
      </div>
      ${!gecti?`<div class="two" style="margin-top:8px">
        <button class="btn-sm" style="${esBenim===ES_KURA
          ?'background:var(--gold);border-color:var(--gold);color:#231d09':''}"
          onclick="cagriEsOy('${a.id}','${ES_KURA}')">🎲 Kura (${oy.kura.length})</button>
        <button class="btn-sm" style="${esBenim===ES_BELLI
          ?'background:var(--gold);border-color:var(--gold);color:#231d09':''}"
          onclick="cagriEsOy('${a.id}','${ES_BELLI}')">🤝 Belli (${oy.belli.length})</button>
      </div>
      ${benim!==CAGRI_VAR?`<div class="xs dim" style="margin-top:6px">
        Oyun sayılması için "Katılıyorum" demen gerekiyor.</div>`:''}`
      :`<div class="xs dim" style="margin-top:6px">
        🎲 ${oy.kura.length} · 🤝 ${oy.belli.length}</div>`}
      ${oy.sonuc===null&&(oy.kura.length||oy.belli.length)
        ?`<div class="xs dim" style="margin-top:6px">Oylar eşit — masada konuşulacak.</div>`:''}
    `:''}

    <button class="btn-gh btn-full btn-sm" style="margin-top:9px" onclick="cagriPaylas('${a.id}')">
      📋 WhatsApp'a Yapıştır</button>

    ${usul==='kura'&&gelen.length>=4&&!gecti
      ?`<button class="btn-g btn-full btn-sm" style="margin-top:8px" onclick="cagriKura('${a.id}')">
          🎲 Gelenler arasından kura çek</button>`
      :(usul==='kura'&&!gecti?`<div class="xs dim center" style="margin-top:8px">
          Kura için en az 4 kişi gerekiyor (${gelen.length} var).</div>`:'')}

    ${kurucuMu()||a.yazanId===OTURUM.id
      ?`<button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="akisSil('${a.id}')">Çağrıyı kaldır</button>`:''}
  </div>`;
}

/* katılanları kuraya taşı */
function cagriKura(akisId){
  const a=cagrilar().find(x=>x.id===akisId); if(!a) return;
  const ids=cagriCevap(a,CAGRI_VAR).map(profilOyuncuId).filter(Boolean);
  if(ids.length<4) return toast('Kura için en az 4 kişi gerekiyor',true);
  KURA_MEVCUT=ids;
  kuraDagit();
}

/* WhatsApp metni + link */
function cagriMetni(akisId){
  const a=cagrilar().find(x=>x.id===akisId);
  if(!a) return '';
  const c=a.veri.cagri, g=aktifGrup()||{ad:'Masa',emoji:''};
  const gelen=cagriCevap(a,CAGRI_VAR);
  const ad3=pid=>{const o=profilOyuncuId(pid); return o?ad(o):'?';};
  const link=`${location.origin}${location.pathname}?cagri=${a.id}`;
  return [
    `${g.emoji||''} ${g.ad} — MASA ÇAĞRISI`,
    `${saatMetni(c.zaman)} · ${c.yer||''}`,
    (c.es==='oylama'
      ? (()=>{const o=cagriEsSonuc(a);
              return o.sonuc==='kura' ? 'Eş usulü oylandı: KURAYLA.'
                   : o.sonuc==='belli' ? 'Eş usulü oylandı: EŞLER BELLİ.'
                   : `Eş usulü oylanıyor (🎲 ${o.kura.length} · 🤝 ${o.belli.length}). Oyunu uygulamadan ver.`;})()
      : (c.es==='kura'?'Eşler kurayla çekilecek.':'Eşler masada belirlenecek.')),
    c.not?c.not:'',
    '',
    gelen.length?`Şimdilik gelenler: ${gelen.map(ad3).join(', ')}`:'Henüz kimse cevap vermedi.',
    '',
    'Katılıyorum / katılmıyorum demek için:',
    link
  ].filter(x=>x!=='').join('\n');
}
function cagriPaylas(akisId){
  const m=cagriMetni(akisId);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Çağrıyı Paylaş</h2>
    <div class="xs dim" style="margin-bottom:12px">Metni gruba yapıştır. Linke dokunan uygulamada
      doğrudan bu çağrıya düşer, cevabını orada verir.</div>
    <div class="zabit" id="cgMetin" style="font-size:13px">${esc(m)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="kopyala(document.getElementById('cgMetin').textContent)">📋 Kopyala</button>
    <a class="btn btn-ok btn-full" style="margin-top:8px;text-decoration:none"
       href="https://wa.me/?text=${encodeURIComponent(m)}" target="_blank" rel="noopener">
       💬 WhatsApp'ta Aç</a>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}

/* linkle gelindiyse çağrıyı öne al */
function cagriOku(){
  const q=new URLSearchParams(location.search);
  const id=q.get('cagri');
  if(!id) return null;
  try{ history.replaceState(null,'',location.pathname); }catch(e){}
  return id;
}
