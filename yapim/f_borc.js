/* =========================================================
   NEYE OYNANIYOR + BORÇ TABELASI
   Her maça bir bahis yazılır (cin, çay, hesap...). Maç kapanınca
   kazanan alacaklı, kaybeden borçlu olur. Ödeme akışa işlenir ve
   tabeladan düşer — yani borç kaydı da masanın gözü önünde durur.
   ========================================================= */
const BAHISLER=[
  {ad:'Cin',            k:'🥃'},
  {ad:"Hendrick's Gin", k:'🫐'},
  {ad:'Beefeater Gin',  k:'🇬🇧'},
  {ad:'Çay',    k:'🫖'},
  {ad:'Kahve',  k:'☕'},
  {ad:'Nargile',k:'💨'},
  {ad:'Tost',   k:'🥪'},
  {ad:'Hesap',  k:'🧾'},
  {ad:'Onur',   k:'🎖️'}   // borç doğurmaz
];
const bahisIkon=ne=>{ if(/₺|kafe/i.test(String(ne||''))) return '☕'; return (BAHISLER.find(b=>b.ad===ne)||{}).k||'🎁'; };
const BORCSUZ=['Onur',''];

/* Bir maçın bahsi birden çok kalem olabilir: hem hesap, hem içecek.
   ESKİ KAYIT {ne,adet} · YENİ KAYIT {kalemler:[{ne,adet},...]}
   Okuyan her yer bu iki fonksiyondan geçsin ki eski maçlar bozulmasın. */
function bahisKalemleri(b){
  if(!b) return [];
  if(Array.isArray(b.kalemler)) return b.kalemler.filter(x=>x&&x.ne)
    .map(x=>({ne:x.ne,adet:Math.max(1,Number(x.adet)||1)}));
  if(b.ne) return [{ne:b.ne,adet:Math.max(1,Number(b.adet)||1)}];
  return [];
}
const bahisBorcluKalemler=b=>bahisKalemleri(b).filter(x=>!BORCSUZ.includes(x.ne));
function bahisOzet(b){
  const k=bahisKalemleri(b);
  if(!k.length) return '';
  return k.map(x=>`${x.adet>1?x.adet+' ':''}${x.ne}`).join(' + ');
}

/* maç kurulum penceresine konan bahis seçici — ÇOKLU seçim */
function bahisSecici(varsayilan){
  const v=[].concat(varsayilan||'Cin').filter(Boolean);
  return `<div class="field">
    <label class="fl">Neye oynanıyor?
      <span style="text-transform:none;letter-spacing:0">(birden fazla seçebilirsin)</span></label>
    <div class="row wrap" id="mBahis">${BAHISLER.map(b=>
      `<div class="chip ${v.includes(b.ad)?'on':''}" data-b="${b.ad}" onclick="bahisSec(this)">${b.k} ${b.ad}</div>`).join('')}</div>
    <div class="row" style="margin-top:8px">
      <input id="mBahisSerbest" placeholder="listede yoksa kendin yaz..." style="flex:1"
        oninput="bahisAdetCiz()"></div>
    <div id="mBahisAdet"></div>
    <div class="xs dim" style="margin-top:6px">Kaybeden seçilenlerin hepsini borçlanır, kazanan alacaklı olur.
      "Onur" borç doğurmaz.</div></div>`;
}
function bahisSec(el){ el.classList.toggle('on'); bahisAdetCiz(); }
function bahisSecililer(){
  const l=[...document.querySelectorAll('#mBahis .chip.on')].map(e=>e.dataset.b);
  const s=($('#mBahisSerbest')?.value||'').trim();
  if(s && !l.includes(s)) l.push(s);
  return l;
}
/* seçilen her kalem için ayrı adet — "1 hesap + 2 cin" yazılabilsin */
function bahisAdetCiz(){
  const kap=$('#mBahisAdet'); if(!kap) return;
  const eski={}; kap.querySelectorAll('input').forEach(i=>{ eski[i.dataset.ne]=i.value; });
  const l=bahisSecililer();
  kap.innerHTML = !l.length ? '' : `<div style="margin-top:8px;padding:8px 10px;background:var(--panel2);
      border:1px solid var(--line);border-radius:10px">
    ${l.map(ne=>`<div class="row" style="gap:8px;padding:3px 0">
      <span class="grow sm ell">${bahisIkon(ne)} ${esc(ne)}</span>
      <span class="xs dim">adet</span>
      <input type="number" data-ne="${esc(ne)}" value="${esc(eski[ne]||1)}" min="1" max="20" style="width:60px">
    </div>`).join('')}</div>`;
}
function bahisOku(){
  const kap=$('#mBahisAdet');
  const adetOf=ne=>{
    let el=null;
    if(kap) kap.querySelectorAll('input').forEach(i=>{ if(i.dataset.ne===ne) el=i; });
    return Math.max(1,Math.min(20,parseInt(el&&el.value,10)||1));
  };
  const kalemler=bahisSecililer().map(ne=>({ne,adet:adetOf(ne)}));
  if(!kalemler.length) kalemler.push({ne:'Onur',adet:1});
  return {kalemler};
}

/* --------- tabela: maçlardan alacak/borç, akıştan ödeme --------- */
/* KİŞİ BAZLI ½ MODEL (kullanıcı, 09.09.2026): karma (değişen eşli) oynandığı
   için borç TAKIMA değil KİŞİYE yazılır. Eşli batakta kaybeden çiftin 1 şişe
   borcu iki kişiye ½'şer bölünür; aynı kişinin FARKLI eşlerdeki ½'leri toplanır
   (iki yarım bir tam olur) ve düzgün netleşir. 101'de taraf tek kişi → tam pay.
   Anahtar artık tek kişi: "kisiId|bahis". Depolama (ödeme.taraf, borcKaydi,
   takimlar) DEĞİŞMEDİ; eski ödemeler de kişi başına bölünüp doğru netlenir. */
const tarafKey = ids => (ids||[]).filter(Boolean).slice().sort().join('+');
const tarafKisiler = k => String(k||'').split('+').filter(Boolean);
/* kesir biçimleyici: 0.5→"½", 1→"1", 1.5→"1½" (mutlak değer, işaretsiz) */
function frak(n){
  n=Math.abs(Number(n)||0);
  const tam=Math.floor(n+1e-9), k=n-tam;
  if(Math.abs(k-0.5)<1e-6) return (tam?tam:'')+'½';
  if(k>1e-6) return String(Math.round(n*100)/100);
  return String(tam);
}

function borcTablosu(brut){
  const t={};        // "kisiId|bahis" → net (+ alacaklı, − borçlu), 0.5 adımlı
  /* brut verilirse: kişi başı GROSS (borç/alacak ayrı, ödemeler HARİÇ) —
     "ödeşti" tespiti için (aktifliği olup net 0'a inen kalem). */
  const gross=(id,ne,n)=>{ if(!id||BORCSUZ.includes(ne)) return;
    const k=`${id}|${ne}`; t[k]=(t[k]||0)+n;
    if(brut){ const m=(brut[id]=brut[id]||{}); const g=(m[ne]=m[ne]||{borc:0,alacak:0});
      if(n<0) g.borc+=-n; else g.alacak+=n; } };
  const ode=(id,ne,n)=>{ if(!id||BORCSUZ.includes(ne)) return; const k=`${id}|${ne}`; t[k]=(t[k]||0)+n; };

  for(const c of grupCelseleri()){
    const kalemler=bahisBorcluKalemler(c.bahis); if(!kalemler.length) continue;
    if(c.oyun==='batak'){
      const kz=c.kazanan??batakMac(c).macKazanan; if(kz==null) continue;
      c.takimlar.forEach((tk,ti)=>{
        const uy=(tk.oyuncular||[]).filter(Boolean), pay=uy.length||1;   // kişi başı pay
        kalemler.forEach(x=>{ const birim=(ti===kz?x.adet:-x.adet)/pay;
          uy.forEach(id=>gross(id,x.ne,birim)); });
      });
    }else{
      const sr=yzMac(c).sira; if(!sr.length) continue;
      kalemler.forEach(x=>{ gross(sr[0].id,x.ne,x.adet); gross(sr[sr.length-1].id,x.ne,-x.adet); });
    }
  }
  /* elle borç kayıtları (devir, iddia, söz) — listelenen kişilere ½'şer bölünür */
  (DB.akis||[]).forEach(a=>{
    const k=a.veri&&a.veri.borcKaydi; if(!k||!k.ne) return;
    const n=Number(k.adet)||1;
    const bl=(k.borclular||[]).filter(Boolean), al=(k.alacaklilar||[]).filter(Boolean);
    const nb=bl.length||1, na=al.length||1;
    bl.forEach(id=>gross(id,k.ne,-n/nb));
    al.forEach(id=>gross(id,k.ne, n/na));
  });
  /* ödemeler: ödeyen(ler)in borcunu, alacaklı(lar)ın alacağını KİŞİ BAŞINA düşürür.
     Eski takım ödemesi (taraf=[A,B], adet=1) → her birine ½ → ikisini de kapatır. */
  (DB.akis||[]).forEach(a=>{
    const o=a.veri&&a.veri.odeme; if(!o||!o.ne) return;
    const n=Number(o.adet)||0;
    const odeyen=((o.taraf&&o.taraf.length)?o.taraf:[o.kim]).filter(Boolean);
    const pb=odeyen.length||1;
    odeyen.forEach(id=>ode(id,o.ne, n/pb));            // borçlu: eksi azalır
    const al=(Array.isArray(o.alacakli)?o.alacakli:[]).filter(Boolean);
    if(al.length){ const pa=al.length; al.forEach(id=>ode(id,o.ne,-n/pa)); } // alacaklı azalır
  });
  return t;
}

function borcKart(){
  const t=borcTablosu();
  const kayitlar=Object.entries(t).filter(([,v])=>v!==0)
    .map(([k,v])=>{const i=k.indexOf('|');
      return {taraf:tarafKisiler(k.slice(0,i)), ne:k.slice(i+1), v};});
  if(!kayitlar.length) return '';

  const borclu=kayitlar.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayitlar.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const satir=r=>`<div class="row" style="padding:6px 0;gap:9px">
    <div class="row" style="gap:-6px;flex-shrink:0">${r.taraf.map((id,i)=>
      `<span style="margin-left:${i?-9:0}px;display:inline-block">${avatar(id,28)}</span>`).join('')}</div>
    <div class="grow" style="min-width:0">
      <div style="font-weight:600;font-size:13.5px" class="ell">${esc(r.taraf.map(ad).join(' & '))}</div>
      <div class="xs dim">${bahisIkon(r.ne)} ${esc(r.ne)}${r.taraf.length>1?' · ortak':''}</div></div>
    <div class="serif" style="font-size:18px">
      <span class="${r.v<0?'neg':'pos'}">${r.v<0?frak(r.v):'+'+frak(r.v)}</span></div>
    ${r.v<0&&kurucuMu()?`<button class="btn-xs btn-gh"
      onclick='borcOdeAc(${JSON.stringify(r.taraf)},${JSON.stringify(r.ne)},${Math.abs(r.v)})'>Ödedi</button>`:''}
  </div>`;

  return `<div class="card">
    <h3>🥃 Borç Tabelası</h3>
    <div class="xs dim" style="margin-bottom:8px">Kişi başına borç. Karma oynandığı için pay yarım (½) olabilir; iki yarım bir tam eder.</div>
    ${borclu.length?`<div class="xs" style="color:#DD8A8A;font-weight:700;margin:4px 0">BORÇLU</div>
      ${borclu.map(satir).join('')}`:''}
    ${alacakli.length?`<div class="sep"></div>
      <div class="xs" style="color:#8CC79B;font-weight:700;margin:4px 0">ALACAKLI</div>
      ${alacakli.map(satir).join('')}`:''}
    <div class="xs dim" style="margin-top:9px">Eşli batakta kaybeden çiftin borcu ikiye bölünür (kişi başı ½); 101'de sonuncu borçlanır, birinci alacaklı olur.
      <br><b>Ödemeyi yalnız ${esc((oy(kurucuOyuncu())||{}).ad||'masayı kuran')} işaretler</b> — borçlu kendi ödemesini kayda geçiremez.</div>
  </div>`;
}

/* O bahis kaleminde alacaklı taraflar — ödemenin kime yapıldığını
   sormak için. Bakiyesi artı olan her taraf bir seçenek. */
function alacakliTaraflar(ne){
  return Object.entries(borcTablosu())
    .filter(([k,v])=>v>0&&k.slice(k.indexOf('|')+1)===ne)
    .map(([k,v])=>({ids:tarafKisiler(k.slice(0,k.indexOf('|'))),v}))
    .sort((a,b)=>b.v-a.v);
}

function borcOdeAc(taraf,ne,enfazla){
  /* Yetki: ödemeyi yalnız masayı kuran işler. Asıl kilit veritabanında
     (yama 11): veri.odeme taşıyan akış satırını yalnız kurucu yazabilir. */
  if(!kurucuMu()) return toast('Ödemeyi yalnız masayı kuran işaretleyebilir',true);
  const ortak=taraf.length>1;
  const alk=alacakliTaraflar(ne);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Borç Ödemesi</h2>
    <div class="xs dim" style="margin-bottom:14px">Kayıt akışa işlenir; masa görür, tabeladan düşer.
      ${ortak?'Borç ortak olduğu için ödeme de tarafın tamamına yazılır.':''}</div>
    <div class="row" style="gap:10px;margin-bottom:12px">
      ${taraf.map(id=>avatar(id,36)).join('')}
      <div><div style="font-weight:700">${esc(taraf.map(ad).join(' & '))}</div>
        <div class="xs dim">${bahisIkon(ne)} ${esc(ne)} · ${frak(enfazla)} borç${ortak?' (ortak)':''}</div></div></div>

    ${alk.length?`<div class="field"><label class="fl">Kime ödedi?</label>
      <div class="row wrap" id="boAlacakli" style="gap:6px;margin-top:6px">
        ${alk.map((x,i)=>`<span class="chip ${alk.length===1?'on':''}"
          data-ids='${JSON.stringify(x.ids)}' onclick="chipTek(this)">${esc(x.ids.map(ad).join(' & '))}
          <span class="xs dim">${frak(x.v)}</span></span>`).join('')}
      </div>
      <div class="xs dim" style="margin-top:6px">Seçilen kişinin alacağı da bu miktarda düşer.
        Boş bırakırsan yalnız borçlunun borcu kapanır.</div></div>`:''}

    <div class="field"><label class="fl">Ne kadarını ödedi? (½ girilebilir)</label>
      <input type="number" id="boAdet" value="${enfazla}" min="0.5" max="${enfazla}" step="0.5"></div>
    <button class="btn-p btn-full" id="boBtn" style="margin-top:14px"
      onclick='borcOdeKaydet(${JSON.stringify(taraf)},${JSON.stringify(ne)},${enfazla})'>Ödendi Olarak İşle</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

/* Tek seçimli çip (aynı kaptaki ötekiler kapanır) */
function chipTek(el){
  const secili=el.classList.contains('on');
  el.parentElement.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  if(!secili) el.classList.add('on');
}
async function borcOdeKaydet(taraf,ne,enfazla){
  let adet=parseFloat(String($('#boAdet').value).replace(',','.'))||enfazla;
  adet=Math.round(Math.max(0.5,Math.min(enfazla,adet))*2)/2;   // 0.5 adımına yuvarla
  const secili=document.querySelector('#boAlacakli .chip.on');
  let alacakli=null;
  try{ alacakli=secili?JSON.parse(secili.dataset.ids):null; }catch(e){ alacakli=null; }
  const btn=$('#boBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const kim=liste(taraf.map(ad));
  const kime=alacakli&&alacakli.length?` ${liste(alacakli.map(ad))} lehine olan`:'';
  const metin=taraf.length>1
    ? `${kim}, ${frak(adet)} ${ne}${kime} ortak borcunu ifa etmişlerdir. Zimmetleri bu miktarda azalmıştır.`
    : `${kim}, ${frak(adet)} ${ne}${kime} borcunu ifa etmiştir. Zimmeti bu miktarda azalmıştır.`;
  const ok=await akisEkle('mesaj',metin,{odeme:{taraf,kim:taraf[0],ne,adet,alacakli}});
  if(!ok){ btn.disabled=false; btn.textContent='Ödendi Olarak İşle'; return; }
  kapatModal(); render(); toast(metin,true);
}

/* --------- geçmiş bir oyunun BAHSİNİ düzelt ---------
   İstek (kullanıcı, 07.09.2026): oyunlar/takımlar doğru ama Sadık+Volkan
   cin borçlu görünüyordu — "cini mi işaretlemedik acaba". Bir oyunda bahis
   yanlış/eksik girildiyse borç netleşmez. Maçı silip yeniden girmeye gerek
   kalmadan bahsi düzeltmek için. Yalnız masayı kuran (kurucuMu) yapar;
   sunucuda maclar.update zaten üyeye açık, bu ek client kilidi. */
function macBul(id){ return (DB.celseler||[]).concat(DB.acik||[]).find(x=>x.id===id); }
function macBahsiDuzeltAc(id){
  if(!kurucuMu()) return toast('Bahsi yalnız masayı kuran düzeltebilir',true);
  const c=macBul(id); if(!c) return toast('Oyun bulunamadı',true);
  let kim='—';
  if(c.oyun==='batak'){ const kz=c.kazanan??batakMac(c).macKazanan;
    kim = kz!=null ? `${c.takimlar[kz].oyuncular.map(ad).join(' & ')} kazandı` : 'sonuçsuz kapandı'; }
  else { const sr=yzMac(c).sira; kim = sr.length?`${ad(sr[0].id)} birinci · ${ad(sr[sr.length-1].id)} sonuncu`:'—'; }
  const mev=bahisKalemleri(c.bahis).map(x=>x.ne);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Bahsi Düzelt</h2>
    <div class="xs dim" style="margin-bottom:4px">${trh(c.tarih)} · ${c.oyun==='batak'?'Batak':'101'} · ${esc(kim)}</div>
    <div class="xs dim" style="margin-bottom:10px">Bu oyunda neye oynanmıştı? İşaretlenmemiş ya da yanlışsa şimdi düzelt;
      borç hesabı kendiliğinden yenilenir. ${mev.length?'Şu an: <b>'+esc(mev.join(' + '))+'</b>':'Şu an bahis <b>yok</b>.'}</div>
    ${bahisSecici(mev.length?mev:'Cin')}
    <button class="btn-p btn-full" id="mbdBtn" style="margin-top:12px" onclick="macBahsiKaydet('${id}')">Kaydet</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
  setTimeout(()=>{ if(typeof bahisAdetCiz==='function') bahisAdetCiz(); },0);
}
async function macBahsiKaydet(id){
  const c=macBul(id); if(!c) return;
  const yeni=bahisOku();
  const btn=$('#mbdBtn'); if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }
  const eski=c.bahis; c.bahis=yeni;
  const {error}=await sb.from('maclar').update({celse:aktifBelge(c)}).eq('id',c.id);
  if(error){ c.bahis=eski; if(btn){ btn.disabled=false; btn.textContent='Kaydet'; } return toast(hataMetni(error),true); }
  kapatModal(); render(); toast('Bahis güncellendi · hesap yenilendi',true);
}

/* zabıta bahis satırı */
function bahisNotu(c){
  const hepsi=bahisKalemleri(c.bahis);
  if(!hepsi.length) return '';
  const borclu=bahisBorcluKalemler(c.bahis);
  if(!borclu.length)
    return `BAHİS: Maç ${hepsi[0].ne.toLocaleLowerCase('tr-TR')}una oynanmıştır; maddi bir sonuç doğmamıştır.`;
  const dokum=borclu.map(x=>`${x.adet} ${x.ne}`).join(' + ');
  const coklu=borclu.length>1 ? ' Kalemler ayrı ayrı zimmete geçirilmiştir.' : '';
  if(c.oyun==='batak'){
    const kz=c.kazanan??batakMac(c).macKazanan;
    if(kz==null) return '';
    const kayb=c.takimlar[1-kz].oyuncular.map(ad);
    return `BAHİS: ${dokum}. ${liste(kayb)} borçlanmış olup, ifa süresi bir sonraki celseye kadardır.${coklu}`;
  }
  const sr=yzMac(c).sira;
  if(!sr.length) return '';
  return `BAHİS: ${dokum}. ${ad(sr[sr.length-1].id)} borçlanmış, ${ad(sr[0].id)} alacaklı hâle gelmiştir.${coklu}`;
}


//== kurucuOyuncu
/* Masayı kuranın oyuncu kaydı — "ödemeyi yalnız X işaretler" yazısı için. */
function kurucuOyuncu(){
  const g=aktifGrup(); if(!g) return null;
  const o=DB.oyuncular.find(x=>x.masaId===g.id&&x.profilId===g.kuran);
  return o?o.id:null;
}
