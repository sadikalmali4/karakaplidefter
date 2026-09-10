/* =========================================================
   TABELA — kâğıttaki hâliyle
   İki sütun, alt alta sayılar, altta toplam. Bir sütun hedefe
   (61) varınca parti biter. Artırma/azaltma düğmesi yok; sayı
   doğrudan yazılır. Batakta eksi de yazılabilir (örn. -7).

   Satırlar parti.eller içine {ham:[a,b]} olarak girer; böylece
   parti/maç/zabıt motorları hiç değişmeden çalışır.

   Hücre değişince TAM ÇİZİM YAPILMAZ — yalnız toplam ve yeni satır
   güncellenir. Yoksa mobilde her dokunuşta odak kaçar.
   ========================================================= */

/* Batak'ta ceza/ödül YOKTUR (ev kuralı, 02.09.2026): iki sütun, yazılan sayı,
   altta toplam. Ceza/ödül yalnız 101'de var. */
const TB_IZGARA='display:grid;grid-template-columns:32px 1fr 1fr;gap:7px;align-items:center';

function hamSatirlar(p){
  return (p.eller||[]).map(el=>{
    if(Array.isArray(el.ham)) return [Number(el.ham[0])||0, Number(el.ham[1])||0];
    const x=batakElPuan(el,DB.ayar.batak);      // detaylı satır da gösterilebilsin
    return [x[0],x[1]];
  });
}
function tbAktifParti(){ return batakMac(DB.aktif).aktif; }

function tbHucre(r,i,deger,kilit){
  /* iOS sayı klavyesinde eksi yok; batakta batınca eksi gerekir.
     Hücrenin soluna ± düğmesi: değerin işaretini çevirir. */
  /* type=text + inputmode=numeric: iOS'ta yine sayı tuş takımı gelir ama
     değer "-7" gibi eksili durabilir (type=number kısmi "-"i silerdi).
     − düğmesi boş hücrede bile başa eksi koyar; kişi sonra rakamı yazar. */
  return `<div style="position:relative">
    <input type="text" inputmode="numeric" pattern="-?[0-9]*" data-r="${r}" data-i="${i}"
      value="${deger===''?'':deger}" ${kilit?'disabled':''} placeholder="·"
      onchange="tbYaz(${r},${i},this.value)" onkeydown="tbTus(event,${r},${i})"
      style="width:100%;text-align:center;font:600 17px/1 Georgia,serif;padding:9px 24px 9px 2px;
        background:${kilit?'transparent':'var(--panel2)'};
        border-color:${kilit?'transparent':'var(--line)'}">
    ${kilit?'':`<button type="button" onclick="tbSign(${r},${i})" title="eksi (batak) — bas, sonra sayıyı yaz" aria-label="eksi"
      style="position:absolute;right:3px;top:50%;transform:translateY(-50%);width:24px;height:26px;
        border:1px solid var(--line);border-radius:6px;background:var(--panel3);color:var(--red);
        font-weight:700;font-size:16px;line-height:1;padding:0;cursor:pointer">−</button>`}
  </div>`;
}
/* − düğmesi: girişin başındaki eksiyi aç/kapat. Boş hücrede de çalışır:
   önce "-" görünür, kişi rakamı yazınca "-7" olur. */
function tbSign(r,i){
  const inp=document.querySelector(`#tbGovde input[data-r="${r}"][data-i="${i}"]`);
  let s=inp?String(inp.value).trim():'';
  s = s.startsWith('-') ? s.slice(1) : ('-'+s);
  if(inp){ inp.value=s; try{ inp.focus(); }catch(e){} }
  const parti=tbAktifParti();
  while(parti.eller.length<=r) parti.eller.push({ham:[0,0]});
  const el=parti.eller[r];
  if(!Array.isArray(el.ham)) el.ham=[0,0];
  el.ham[i]=(s===''||s==='-')?0:(parseInt(s,10)||0);
  /* − boş son satırda basıldıysa satır açılmış olur; değer hâlâ yoksa geri al.
     Yoksa "1 el yazıldı" diyip tabelada 0/0 hayalet satır kalıyor. */
  while(parti.eller.length){
    const e=parti.eller[parti.eller.length-1];
    if(Array.isArray(e.ham) && !e.ham[0] && !e.ham[1] && !e.etiket) parti.eller.pop(); else break;
  }
  parti.kazanan=null; kaydet();
  if(batakPartiKazanan(parti)!==null){ render(); return; }
  tbTazele();
}
const TB_ETIKET=[
  {t:'iyi_acti',   k:'🎯', ad:'İyi el açtı'},
  {t:'iyi_oynadi', k:'👏', ad:'İyi oynadı'},
  {t:'kotu_acti',  k:'💥', ad:'Kötü el açtı'},
  {t:'cizdi',      k:'🖐️', ad:'Çizdi (13/13)'},
  {t:'ciplak',     k:'🍑', ad:'Kendini çıplak hissetti'}
];
const tbEtiketK=t=>(TB_ETIKET.find(x=>x.t===t)||{}).k||'';
function tbSatirHtml(r,cift,kilit){
  const el=(tbAktifParti().eller||[])[r];
  const em=el&&el.etiket?tbEtiketK(el.etiket.t):'';
  const noHtml=(!kilit)
    ? `<button type="button" onclick="tbEtiketAc(${r})" title="bu ele mizahi not ekle"
        style="background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:4px 0;
          cursor:pointer;color:var(--ink2);font-size:11px;line-height:1.15;text-align:center;width:100%">${r+1}<br>${em||'🎭'}</button>`
    : `<div class="xs dim center">${r+1}${em?`<br>${em}`:''}</div>`;
  return `<div style="${TB_IZGARA};margin-bottom:5px" data-satir="${r}">
    ${noHtml}
    ${tbHucre(r,0,cift?cift[0]:'',kilit)}${tbHucre(r,1,cift?cift[1]:'',kilit)}
  </div>`;
}
let _tbEtiketSira=null;
function tbEtiketAc(r){
  const c=DB.aktif; if(!c) return;
  const parti=tbAktifParti();
  while(parti.eller.length<=r) parti.eller.push({ham:[0,0]});   // el yoksa oluştur
  const el=parti.eller[r];
  _tbEtiketSira=el.etiket?el.etiket.i:null;
  const mev=el.etiket?el.etiket.t:null;
  const tk=Array.isArray(c.takimlar)?c.takimlar:[];
  acModal(`<h2 class="serif" style="margin:0 0 4px">${r+1}. El — Not</h2>
    <div class="xs dim" style="margin-bottom:12px">Ele mizahi bir not iliştir; tabelada ve zabıtta görünür.</div>
    ${tk.length?`<label class="fl">Kime? (isteğe bağlı)</label>
    <div class="row wrap" id="tbEtKim" style="gap:6px;margin:6px 0 12px">
      ${tk.map((t,i)=>(t.oyuncular||[]).map(oid=>`<span class="chip ${el.etiket&&el.etiket.oy===oid?'on':''}" data-oy="${oid}" data-i="${i}"
        onclick="chipTek(this)"><span class="pill ${i?'blue':'green'}">${esc(t.ad||('Taraf '+(i+1)))}</span> ${esc(ad(oid))}</span>`).join('')).join('')}
    </div>`:'<div id="tbEtKim"></div>'}
    <label class="fl">Not</label>
    <div class="stack" style="margin-top:6px">
      ${TB_ETIKET.map(x=>`<button class="btn-full btn-sm ${mev===x.t?'btn-g':'btn-gh'}" style="text-align:left"
        onclick="tbEtiketSec(${r},'${x.t}')">${x.k} ${x.ad}</button>`).join('')}
    </div>
    ${el.etiket?`<button class="btn-dn btn-full btn-sm" style="margin-top:10px" onclick="tbEtiketSil(${r})">Notu kaldır</button>`:''}
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
function tbEtiketSec(r,t){
  const parti=tbAktifParti(), el=(parti.eller||[])[r]; if(!el) return;
  const secKim=document.querySelector('#tbEtKim .chip.on');
  const oy=secKim?secKim.dataset.oy:null;
  const i=secKim?Number(secKim.dataset.i):null;
  el.etiket={t, oy:oy||null, i:(i!=null&&!isNaN(i))?i:null};
  kaydet(); kapatModal(); render();
  toast(`${tbEtiketK(t)} ${(TB_ETIKET.find(x=>x.t===t)||{}).ad} — ${r+1}. el`);
}
function tbEtiketSil(r){
  const el=(tbAktifParti().eller||[])[r]; if(!el) return;
  delete el.etiket; kaydet(); kapatModal(); render();
}
/* Bir partinin etiketli ellerini yazıya çevir (geçmiş + zabıt) */
function tbEtiketOzet(c,parti){
  const l=(parti.eller||[]).map((el,r)=>{
    if(!el.etiket) return null;
    const x=TB_ETIKET.find(y=>y.t===el.etiket.t); if(!x) return null;
    const kim=el.etiket.oy?` (${ad(el.etiket.oy)})`
      :(el.etiket.i!=null&&c.takimlar)?` (${c.takimlar[el.etiket.i].ad})`:'';
    return `${r+1}. el ${x.k} ${x.ad}${kim}`;
  }).filter(Boolean);
  return l;
}
/* Bir celse listesindeki mizahi el etiketlerini düz metin satırlarına çevir
   (batak tbEtiketOzet / 101 yzEtiketOzet). Özetlerde/raporlarda ortak kullanılır. */
function elNotlariListe(celseler,limit){
  const en=[];
  (celseler||[]).forEach(c=>{
    const parts=c.partiler||[{eller:c.eller||[]}];
    parts.forEach(p=>{
      const oz=c.oyun==='batak'
        ? ((typeof tbEtiketOzet==='function')?tbEtiketOzet(c,p):[])
        : ((typeof yzEtiketOzet==='function')?yzEtiketOzet(c,p):[]);
      (oz||[]).forEach(s=>en.push(s));
    });
  });
  return limit?en.slice(0,limit):en;
}
function tbToplamHtml(){
  const c=DB.aktif, a=DB.ayar.batak, parti=tbAktifParti();
  const {top}=batakPartiToplam(parti);
  const pKz=batakPartiKazanan(parti);
  const yuz=i=>Math.min(100,Math.max(0,top[i]/a.hedef*100));
  return `<div style="${TB_IZGARA}">
    <div class="xs dim center">Σ</div>
    ${[0,1].map(i=>`<div class="center">
      <div class="serif" style="font-size:30px;line-height:1;
        color:${pKz===i?'var(--gold)':(top[i]<0?'var(--red)':'var(--ink)')}">${top[i]}</div>
      <div class="bar" style="margin-top:6px"><i style="width:${yuz(i)}%;
        background:${i?'var(--blue)':'var(--accent2)'}"></i></div>
    </div>`).join('')}
  </div>
  <div class="xs dim center" style="margin-top:7px">hedef ${a.hedef} · ${parti.eller.length} el yazıldı</div>`;
}

function batakTabela(){
  const c=DB.aktif, a=DB.ayar.batak, m=batakMac(c);
  const parti=m.aktif, pIdx=m.aktifIdx;
  const {top}=batakPartiToplam(parti);
  const pKz=batakPartiKazanan(parti);
  const pAd=partiAd(c,pIdx), cikis=pAd==='Çıkıştırma';
  const T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
  const satir=hamSatirlar(parti);
  const bitti=pKz!==null;

  return `
  ${MISAFIR?'':macSerit(c)}
  ${MISAFIR?'':kurtarmaKontrol(c)}
  ${MISAFIR?'':misafirCagriKart(c)}
  ${talikBanner(c)}
  ${MISAFIR?'':macKafeKart(c)}
  <div class="card ${cikis?'cikis':''}">
    <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div style="flex:1 1 150px;min-width:0"><div class="serif" style="font-size:17px">${cikis?'🔥 ':''}${pAd}</div>
        <div class="xs dim">${trh(c.tarih)}${c.yer?' · '+esc(c.yer):''}${c.tabelaci?' · ✍️ '+esc(ad(c.tabelaci)):''}</div></div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;flex:1 1 auto;min-width:0;justify-content:flex-end">
        ${MISAFIR?'':`<button class="btn-xs btn-gh" onclick="macBirak()">← Masalar</button>
        <button class="btn-xs btn-gh" onclick="devretAc()">✍️ Devret</button>
        <button class="btn-xs btn-gh" onclick="misafirPaylasAc()">📱 Paylaş</button>
        ${talikDugme()}
        <button class="btn-xs btn-dn" onclick="celseIptal()">İptal</button>`}
      </div>
    </div>

    <div class="sep"></div>

    <div style="${TB_IZGARA};align-items:end">
      <div></div>
      ${[0,1].map(i=>`<div class="center">
        <div><span class="pill ${i?'blue':'green'}">${c.takimlar[i].ad}</span></div>
        <div class="xs" style="font-weight:600;margin-top:3px;line-height:1.3">${esc(T(i))}</div>
      </div>`).join('')}
    </div>

    <div style="height:1px;background:var(--line);margin:9px 0"></div>

    <div id="tbGovde">
      ${satir.map((cift,r)=>tbSatirHtml(r,cift,bitti)).join('')}
      ${bitti?'':tbSatirHtml(satir.length,null,false)}
    </div>

    <div style="height:2px;background:var(--line);margin:8px 0"></div>
    <div id="tbToplam">${tbToplamHtml()}</div>

    ${satir.length&&!bitti?`<button class="btn-sm btn-dn btn-full" style="margin-top:11px"
      onclick="tbSonSatirSil()">Son satırı sil</button>`:''}

    ${bitti?`<div class="sep"></div><div class="center">
      <div class="serif" style="color:var(--gold);font-size:16px">${esc(T(pKz))} partiyi aldı</div>
      <div class="xs dim" style="margin-top:2px">${top[pKz]} – ${top[1-pKz]}</div>
      ${/* batakMac, kapatılmamış partiyi de sayıyor — üstüne +1 eklenirse
            ilk partide maç bitmiş sanılır. Olduğu gibi karşılaştır. */''}
      ${m.partiSkor[pKz]>=c.partiHedef
        ?(MISAFIR
          ?`<div class="xs dim center" style="margin-top:11px">Parti doldu. Maçı <b>tabelacı</b> bitirir.</div>`
          :`<button class="btn-g btn-full" style="margin-top:11px" onclick="partiKapat(true)">Maçı Bitir → Zabıt</button>`)
        :`<button class="btn-g btn-full" style="margin-top:11px" onclick="partiKapat(false)">Partiyi Kapat → Sonraki Parti</button>`}
      </div>`:''}
  </div>

  ${sureKarti(c)}
  ${gecmisPartiler(c)}

  ${!MISAFIR&&!bitti&&satir.length?`<div class="card tight center">
    <button class="btn-gh btn-sm" onclick="celseKapat()">Yarıda kes, tabelayı olduğu gibi kapat</button></div>`:''}
  <div class="card tight center xs dim">Batınca eksi için hücredeki <b style="color:var(--red)">−</b> düğmesine bas (sonra sayıyı yaz), ya da başına − koyup yaz.
    El numarasına (<b>🎭</b>) dokununca o ele mizahi not eklersin (🎯 iyi el açtı, 👏 iyi oynadı, 💥 kötü el açtı, 🖐️ çizdi, 🍑 çıplak).
    İhale/koz/şlem dökümü tutulacaksa masa <b>İhaleli</b> açılmalı.</div>`;
}

/* =========================================================
   101 TABELASI — oyuncu başına bir sütun
   Her el o oyuncunun aldığı sayı doğrudan yazılır (bitirdi −101,
   açamadı +200, elinde kalan +X … hangisi olduysa sayısı yazılır).
   elSayisi (11) el dolunca parti biter; toplamı en DÜŞÜK olan alır.
   ========================================================= */
function yzIzgara(n){ return `display:grid;grid-template-columns:34px repeat(${n},minmax(70px,1fr));gap:6px;align-items:center`; }

function yzHamSatir(el,c){
  if(el && el.ham) return c.oyuncular.map(id=>Number(el.ham[id])||0);
  return c.oyuncular.map(id=>yzElPuan(el,id));
}
/* 101'DE EKSİ (07.09.2026): iOS sayı tuş takımında eksi tuşu YOK.
   Batak'a − düğmesi konmuştu, 101 atlanmıştı — oysa burada eksi daha çok
   gerekiyor: eli bitiren ${DB.ayar.yz.bitiren}, silme ${DB.ayar.yz.silme}, ödül.
   Çözüm batakla aynı: type=text + inputmode=numeric (kısmi "-" silinmesin)
   ve hücrenin sağında − düğmesi. */
function yzHucre(r,id,deger,kilit){
  return `<div style="position:relative">
    <input type="text" inputmode="numeric" pattern="-?[0-9]*" data-r="${r}" data-oy="${id}"
      value="${deger===''?'':deger}" ${kilit?'disabled':''} placeholder="·"
      onchange="yzTbYaz(${r},'${id}',this.value)" onkeydown="yzTbTus(event,${r},'${id}')"
      style="width:100%;text-align:center;font:600 15px/1 Georgia,serif;padding:9px 21px 9px 2px;
        background:${kilit?'transparent':'var(--panel2)'};
        border-color:${kilit?'transparent':'var(--line)'}">
    ${kilit?'':`<button type="button" onclick="yzSign(${r},'${id}')" title="eksi — bas, sonra sayıyı yaz" aria-label="eksi"
      style="position:absolute;right:2px;top:50%;transform:translateY(-50%);width:20px;height:24px;
        border:1px solid var(--line);border-radius:6px;background:var(--panel3);color:var(--green);
        font-weight:700;font-size:15px;line-height:1;padding:0;cursor:pointer">−</button>`}
  </div>`;
}
/* − düğmesi: başındaki eksiyi aç/kapat. Boş hücrede de çalışır. */
function yzSign(r,id){
  const c=DB.aktif; if(!c) return;
  const inp=document.querySelector(`#yzGovde input[data-r="${r}"][data-oy="${id}"]`);
  let s=inp?String(inp.value).trim():'';
  s = s.startsWith('-') ? s.slice(1) : ('-'+s);
  if(inp){ inp.value=s; try{ inp.focus(); }catch(e){} }
  const parti=yzMac(c).aktif;
  while(parti.eller.length<=r) parti.eller.push({ham:{}});
  const el=parti.eller[r];
  if(!el.ham) el.ham={};
  el.ham[id]=(s===''||s==='-')?0:(parseInt(s,10)||0);
  /* boş satır açıldıysa geri al (notu varsa dokunma) */
  while(parti.eller.length){
    const e=parti.eller[parti.eller.length-1];
    if(e.ham && c.oyuncular.every(x=>!e.ham[x]) && !e.etiket) parti.eller.pop(); else break;
  }
  parti.kazanan=null; kaydet();
  const N=DB.ayar.yz.elSayisi||11;
  if(parti.eller.length>=N){ render(); return; }
  yzTbTazele();
}
/* 101 EL NOTU — batakla aynı mantık, listesi 101'e göre.
   "Çizdi (13/13)" batak işidir, buraya konmadı; yerine 101'in gerçek
   olayları var (eli bitirme, açamama, silme). */
const YZ_ETIKET=[
  {t:'iyi_acti',   k:'🎯', ad:'İyi el açtı'},
  {t:'iyi_oynadi', k:'👏', ad:'İyi oynadı'},
  {t:'kotu_acti',  k:'💥', ad:'Kötü el açtı'},
  {t:'bitirdi',    k:'✂️', ad:'Eli bitirdi'},
  {t:'acamadi',    k:'🙈', ad:'Açamadı'},
  {t:'silme',      k:'🧹', ad:'Silme yaptı'},
  {t:'ciplak',     k:'🍑', ad:'Kendini çıplak hissetti'}
];
const yzEtiketK=t=>(YZ_ETIKET.find(x=>x.t===t)||{}).k||'';
function yzTbSatirHtml(r,degerler,kilit,c){
  const el=((yzMac(c).aktif.eller)||[])[r];
  const em=el&&el.etiket?yzEtiketK(el.etiket.t):'';
  const no=(!kilit)
    ? `<button type="button" onclick="yzEtiketAc(${r})" title="bu ele mizahi not ekle"
        style="background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:4px 0;
          cursor:pointer;color:var(--ink2);font-size:11px;line-height:1.15;text-align:center;width:100%">${r+1}<br>${em||'🎭'}</button>`
    : `<div class="xs dim center">${r+1}${em?`<br>${em}`:''}</div>`;
  return `<div style="${yzIzgara(c.oyuncular.length)};margin-bottom:5px" data-satir="${r}">
    ${no}
    ${c.oyuncular.map((id,k)=>yzHucre(r,id,degerler?degerler[k]:'',kilit)).join('')}
  </div>`;
}
let _yzEtiketSira=null;
function yzEtiketAc(r){
  const c=DB.aktif; if(!c) return;
  const parti=yzMac(c).aktif;
  while(parti.eller.length<=r) parti.eller.push({ham:{}});
  const el=parti.eller[r];
  const mev=el.etiket?el.etiket.t:null;
  acModal(`<h2 class="serif" style="margin:0 0 4px">${r+1}. El — Not</h2>
    <div class="xs dim" style="margin-bottom:12px">Ele mizahi bir not iliştir; tabelada ve geçmişte görünür.</div>
    <label class="fl">Kime? (isteğe bağlı)</label>
    <div class="row wrap" id="yzEtKim" style="gap:6px;margin:6px 0 12px">
      ${c.oyuncular.map(oid=>`<span class="chip ${el.etiket&&el.etiket.oy===oid?'on':''}" data-oy="${oid}"
        onclick="chipTek(this)">${esc(ad(oid))}</span>`).join('')}
    </div>
    <label class="fl">Not</label>
    <div class="stack" style="margin-top:6px">
      ${YZ_ETIKET.map(x=>`<button class="btn-full btn-sm ${mev===x.t?'btn-g':'btn-gh'}" style="text-align:left"
        onclick="yzEtiketSec(${r},'${x.t}')">${x.k} ${x.ad}</button>`).join('')}
    </div>
    ${el.etiket?`<button class="btn-dn btn-full btn-sm" style="margin-top:10px" onclick="yzEtiketSil(${r})">Notu kaldır</button>`:''}
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
function yzEtiketSec(r,t){
  const c=DB.aktif, parti=yzMac(c).aktif, el=(parti.eller||[])[r]; if(!el) return;
  const sec=document.querySelector('#yzEtKim .chip.on');
  el.etiket={t, oy:sec?sec.dataset.oy:null};
  kaydet(); kapatModal(); render();
  toast(`${yzEtiketK(t)} ${(YZ_ETIKET.find(x=>x.t===t)||{}).ad} — ${r+1}. el`);
}
function yzEtiketSil(r){
  const el=(yzMac(DB.aktif).aktif.eller||[])[r]; if(!el) return;
  delete el.etiket; kaydet(); kapatModal(); render();
}
/* Bir 101 partisinin etiketli ellerini yazıya çevir (geçmiş partiler) */
function yzEtiketOzet(c,parti){
  return (parti.eller||[]).map((el,r)=>{
    if(!el.etiket) return null;
    const x=YZ_ETIKET.find(y=>y.t===el.etiket.t); if(!x) return null;
    return `${r+1}. el ${x.k} ${x.ad}${el.etiket.oy?` (${ad(el.etiket.oy)})`:''}`;
  }).filter(Boolean);
}

function yzTbToplamHtml(){
  const c=DB.aktif, a=DB.ayar.yz, parti=yzMac(c).aktif;
  const top=yzPartiToplam(parti,c);
  const N=a.elSayisi||11, doldu=parti.eller.length>=N;
  const en=Math.min(...c.oyuncular.map(id=>top[id]));
  return `<div style="${yzIzgara(c.oyuncular.length)}">
    <div class="xs dim center">Σ</div>
    ${c.oyuncular.map(id=>`<div class="center serif" style="font-size:22px;line-height:1;
      color:${doldu&&top[id]===en?'var(--gold)':(top[id]<0?'var(--green)':'var(--ink)')}">${top[id]}</div>`).join('')}
  </div>
  <div class="xs dim center" style="margin-top:7px">${parti.eller.length} / ${N} el · düşük puan iyidir</div>`;
}

function yzTabela(){
  const c=DB.aktif, a=DB.ayar.yz, m=yzMac(c);
  const parti=m.aktif, pIdx=m.aktifIdx;
  const N=a.elSayisi||11;
  const pAd=partiAd(c,pIdx), cikis=pAd==='Çıkıştırma';
  const satir=(parti.eller||[]).map(el=>yzHamSatir(el,c));
  const doldu=parti.eller.length>=N;
  const top=yzPartiToplam(parti,c);
  const pKz=doldu?yzPartiKazanan(parti,c):null;
  const sonParti=doldu&&pKz&&((m.partiKaz[pKz[0]]||0)>=c.partiHedef);

  return `
  ${MISAFIR?'':macSerit(c)}
  ${MISAFIR?'':kurtarmaKontrol(c)}
  ${MISAFIR?'':misafirCagriKart(c)}
  ${talikBanner(c)}
  ${MISAFIR?'':macKafeKart(c)}
  <div class="card ${cikis?'cikis':''}">
    <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div style="flex:1 1 150px;min-width:0"><div class="serif" style="font-size:17px">${cikis?'🔥 ':''}${pAd}</div>
        <div class="xs dim">${trh(c.tarih)}${c.yer?' · '+esc(c.yer):''}${c.tabelaci?' · ✍️ '+esc(ad(c.tabelaci)):''}
          ${c.mod==='esli'?' · eşli':''}</div></div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;flex:1 1 auto;min-width:0;justify-content:flex-end">
        ${MISAFIR?'':`<button class="btn-xs btn-gh" onclick="macBirak()">← Masalar</button>
        <button class="btn-xs btn-gh" onclick="devretAc()">✍️ Devret</button>
        <button class="btn-xs btn-gh" onclick="misafirPaylasAc()">📱 Paylaş</button>
        ${talikDugme()}
        <button class="btn-xs btn-dn" onclick="celseIptal()">İptal</button>`}
      </div>
    </div>

    <div class="sep"></div>

    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <div style="min-width:${34+c.oyuncular.length*76}px">
        <div style="${yzIzgara(c.oyuncular.length)};align-items:end">
          <div></div>
          ${c.oyuncular.map(id=>`<div class="center">
            ${avatar(id,22)}
            <div class="xs ell" style="font-weight:600;margin-top:3px">${esc(ad(id))}</div>
          </div>`).join('')}
        </div>

        <div style="height:1px;background:var(--line);margin:9px 0"></div>

        <div id="yzGovde">
          ${satir.map((d,r)=>yzTbSatirHtml(r,d,doldu,c)).join('')}
          ${doldu?'':yzTbSatirHtml(satir.length,null,false,c)}
        </div>

        <div style="height:2px;background:var(--line);margin:8px 0"></div>
        <div id="yzToplam">${yzTbToplamHtml()}</div>
      </div>
    </div>

    ${satir.length&&!doldu?`<button class="btn-sm btn-dn btn-full" style="margin-top:11px"
      onclick="yzTbSonSatirSil()">Son satırı sil</button>`:''}

    ${doldu?`<div class="sep"></div><div class="center">
      <div class="serif" style="color:var(--gold);font-size:16px">${esc(liste((pKz||[]).map(ad)))} partiyi aldı</div>
      <div class="xs dim" style="margin-top:2px">sonuncu ${esc(ad(c.oyuncular.slice().sort((x,y)=>top[y]-top[x])[0]))}</div>
      ${c.partiHedef<=1||sonParti
        ?(MISAFIR
          ?`<div class="xs dim center" style="margin-top:11px">Parti doldu. Maçı <b>tabelacı</b> bitirir.</div>`
          :`<button class="btn-g btn-full" style="margin-top:11px" onclick="partiKapat(true)">Maçı Bitir → Zabıt</button>`)
        :`<button class="btn-g btn-full" style="margin-top:11px" onclick="partiKapat(false)">Partiyi Kapat → Sonraki Parti</button>`}
      </div>`:''}
  </div>

  ${sureKarti(c)}
  ${gecmisPartiler(c)}

  ${!MISAFIR&&!doldu&&satir.length?`<div class="card tight center">
    <button class="btn-gh btn-sm" onclick="celseKapat()">Yarıda kes, tabelayı olduğu gibi kapat</button></div>`:''}
  <div class="card tight center xs dim">Eksi için hücredeki <b style="color:var(--green)">−</b> düğmesine bas (sonra sayıyı yaz), ya da başına − koyup yaz.
    El numarasına (<b>🎭</b>) dokununca o ele mizahi not eklersin (🎯 iyi el açtı, 👏 iyi oynadı, 💥 kötü el açtı, ✂️ bitirdi, 🙈 açamadı, 🧹 silme, 🍑 çıplak).
    Ceza ve ödül kutuları gerekiyorsa masa <b>⚖️ Ceza / Ödül</b> şıkkıyla açılmalı;
    orada her oyuncu için sayı, ceza (+) ve ödül (−) ayrı ayrı girilir.</div>`;
}

function yzTbYaz(r,id,deger){
  const c=DB.aktif; if(!c) return;
  const parti=yzMac(c).aktif;
  const bos=String(deger).trim()==='';
  const v=bos?0:(parseInt(deger,10)||0);

  while(parti.eller.length<=r) parti.eller.push({ham:{}});
  const el=parti.eller[r];
  if(!el.ham) el.ham={};
  el.ham[id]=v;

  /* sondaki tamamen boş satırları at */
  while(parti.eller.length){
    const e=parti.eller[parti.eller.length-1];
    /* NOTU OLAN SATIR ATILMAZ (boş satıra 🎭 not eklenebiliyor) */
    const bosMu = e.ham && c.oyuncular.every(x=>!e.ham[x]) && !e.etiket;
    if(bosMu) parti.eller.pop(); else break;
  }
  parti.kazanan=null;
  kaydet();

  const N=DB.ayar.yz.elSayisi||11;
  if(parti.eller.length>=N){ render(); return; }
  yzTbTazele();
}
function yzTbTazele(){
  const t=document.getElementById('yzToplam');
  if(t) t.innerHTML=yzTbToplamHtml();
  const g=document.getElementById('yzGovde');
  if(!g) return;
  const c=DB.aktif, parti=yzMac(c).aktif, n=parti.eller.length;
  const mevcut=g.querySelectorAll('[data-satir]').length;
  if(mevcut<n+1) g.insertAdjacentHTML('beforeend', yzTbSatirHtml(n,null,false,c));
  else if(mevcut>n+1)
    for(let k=mevcut-1;k>=n+1;k--) g.querySelector(`[data-satir="${k}"]`)?.remove();
}
/* Enter: satırdaki sıradaki oyuncu, satır bitince alt satırın başı */
function yzTbTus(e,r,id){
  if(e.key!=='Enter') return;
  e.preventDefault();
  e.target.dispatchEvent(new Event('change'));
  const c=DB.aktif, k=c.oyuncular.indexOf(id);
  const sonraki = k<c.oyuncular.length-1 ? {r, id:c.oyuncular[k+1]} : {r:r+1, id:c.oyuncular[0]};
  setTimeout(()=>yzTbOdak(sonraki.r,sonraki.id),0);
}
function yzTbOdak(r,id){
  const s=document.querySelector(`#yzGovde input[data-r="${r}"][data-oy="${id}"]`);
  if(s&&!s.disabled){ s.focus(); try{ s.select(); }catch(e){} }
}
function yzTbSonSatirSil(){
  const c=DB.aktif; if(!c) return;
  const parti=yzMac(c).aktif;
  if(!parti.eller.length) return;
  parti.eller.pop(); parti.kazanan=null;
  kaydet(); render();
}

/* --- hücreye yazma --- */
function tbYaz(r,i,deger){
  const c=DB.aktif; if(!c) return;
  const parti=tbAktifParti();
  const bos=String(deger).trim()==='';
  const v=bos?0:(parseInt(deger,10)||0);

  while(parti.eller.length<=r) parti.eller.push({ham:[0,0]});
  const el=parti.eller[r];
  if(!Array.isArray(el.ham)) el.ham=[0,0];
  el.ham[i]=v;

  /* 13 EL KURALI: bir taraf batmadan (pozitif) yazınca, diğer taraf
     HENÜZ boşsa otomatik (toplamEl − v) girilir. Eksi (batak) yazıldıysa
     dokunma — orada iki taraf 13'e tamamlanmaz. */
  const T=DB.ayar.batak.toplamEl||13, dg=1-i;
  if(v>0 && v<=T && !el.ham[dg]){
    el.ham[dg]=T-v;
    const di=document.querySelector(`#tbGovde input[data-r="${r}"][data-i="${dg}"]`);
    if(di) di.value=el.ham[dg];
  }

  /* sondaki tamamen boş satırları at — yanlışlıkla açılmış satır kalmasın */
  while(parti.eller.length){
    const e=parti.eller[parti.eller.length-1];
    /* NOTU OLAN SATIR ATILMAZ: boş son satıra 🎭 not eklenebiliyor;
       eskiden buradan sessizce siliniyordu (not kayboluyordu). */
    if(Array.isArray(e.ham) && !e.ham[0] && !e.ham[1] && !e.etiket) parti.eller.pop(); else break;
  }
  parti.kazanan=null;
  kaydet();                                  // buluta gecikmeli yazar

  if(batakPartiKazanan(parti)!==null){ render(); return; }   // parti bitti
  tbTazele();
}
/* toplamı ve gerekirse yeni boş satırı yerinde güncelle */
function tbTazele(){
  const t=document.getElementById('tbToplam');
  if(t) t.innerHTML=tbToplamHtml();
  const g=document.getElementById('tbGovde');
  if(!g) return;
  const parti=tbAktifParti(), n=parti.eller.length;
  const mevcut=g.querySelectorAll('[data-satir]').length;
  if(mevcut<n+1){
    g.insertAdjacentHTML('beforeend', tbSatirHtml(n,null,false));
  }else if(mevcut>n+1){
    for(let k=mevcut-1;k>=n+1;k--) g.querySelector(`[data-satir="${k}"]`)?.remove();
  }
}
/* Enter: aynı satırın diğer hücresi, oradan sonraki satırın başı */
function tbTus(e,r,i){
  if(e.key!=='Enter') return;
  e.preventDefault();
  e.target.dispatchEvent(new Event('change'));
  setTimeout(()=>tbOdak(i===0?r:r+1, i===0?1:0),0);
}
function tbOdak(r,i){
  const s=document.querySelector(`#tbGovde input[data-r="${r}"][data-i="${i}"]`);
  if(s&&!s.disabled){ s.focus(); try{ s.select(); }catch(e){} }
}
function tbSonSatirSil(){
  const c=DB.aktif; if(!c) return;
  const parti=tbAktifParti();
  if(!parti.eller.length) return;
  parti.eller.pop(); parti.kazanan=null;
  kaydet(); render();
}
