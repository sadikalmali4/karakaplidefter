//== profilAc
/* ---------- OYUNCU (masaya ait kayıt; hesap gerektirmez) ---------- */
let _foto=null, _fotoBlob=null;
function oyuncuAc(id,benimIcin){
  const o=id?oy(id):null;
  _foto=o?.foto||null; _fotoBlob=null;
  acModal(`
    <h2 class="serif" style="margin:0 0 4px">${o?'Oyuncuyu Düzenle':'Yeni Oyuncu'}</h2>
    <div class="xs dim" style="margin-bottom:14px">${benimIcin
      ? 'Bu kayıt senin hesabına bağlanacak.'
      : 'Hesabı olmayan da oyuncu olarak eklenir; sonradan kendi hesabıyla üstlenebilir.'}</div>
    <div class="row" style="gap:14px;align-items:center">
      <div class="fotoSec" id="fotoBtn" style="${_foto?`background-image:url('${_foto}');border-style:solid`:''}"
        onclick="document.getElementById('fotoInp').click()">${_foto?'':'Fotoğraf<br>ekle'}</div>
      <div class="grow">
        <label class="fl">Ad</label>
        <input id="pAd" value="${esc(o?.ad||(benimIcin?(PROFIL?.ad||''):''))}" placeholder="Adı" maxlength="24">
        ${_foto?`<button class="btn-xs btn-dn" style="margin-top:8px" onclick="fotoSil()">Fotoğrafı kaldır</button>`:''}
      </div>
    </div>
    <div class="field" style="margin-top:14px"><label class="fl">Doğum günü <span style="text-transform:none;letter-spacing:0">(isteğe bağlı)</span></label>
      <input type="date" id="pDogum" value="${esc(o?.dogum||'')}" max="${bugun()}">
      <div class="xs dim" style="margin-top:5px">Masa unutmasın diye. O gün oynanan celsede zabta işlenir.</div></div>
    <input type="file" id="fotoInp" accept="image/*" style="display:none" onchange="fotoSec(this)">
    <button class="btn-p btn-full" id="pBtn" style="margin-top:16px"
      onclick="oyuncuKaydet('${id||''}',${benimIcin?'true':'false'})">${o?'Kaydet':'Ekle'}</button>`);
}

//== fotoSec
function fotoSec(inp){
  const f=inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const B=320, cv=document.createElement('canvas'); cv.width=B; cv.height=B;
      const g=cv.getContext('2d'), k=Math.min(im.width,im.height);
      g.drawImage(im,(im.width-k)/2,(im.height-k)/2,k,k,0,0,B,B);
      _foto=cv.toDataURL('image/jpeg',.8);
      cv.toBlob(b=>{_fotoBlob=b;},'image/jpeg',.8);
      const b=$('#fotoBtn'); if(b){b.style.backgroundImage=`url('${_foto}')`;b.style.borderStyle='solid';b.innerHTML='';}
    };
    im.src=r.result;
  };
  r.readAsDataURL(f); inp.value='';
}

//== fotoSil
function fotoSil(){
  _foto=null; _fotoBlob=null;
  const b=$('#fotoBtn');
  if(b){b.style.backgroundImage='';b.style.borderStyle='dashed';b.innerHTML='Fotoğraf<br>ekle';}
}

//== profilKaydet
async function oyuncuKaydet(id,benimIcin){
  const n=$('#pAd').value.trim();
  if(!n) return toast('Ad gerekli',true);
  const cak=DB.oyuncular.some(o=>o.masaId===DB.aktifGrup&&o.id!==id&&o.aktif&&
                                 o.ad.toLocaleLowerCase('tr-TR')===n.toLocaleLowerCase('tr-TR'));
  if(cak) return toast('Bu isim grupta zaten var',true);
  const dg=$('#pDogum')?.value||null;
  const btn=$('#pBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  try{
    let foto_url = id ? (oy(id).foto||null) : null;
    if(_fotoBlob){
      const yol=`masa/${DB.aktifGrup}/${(id||yid())}_${Date.now()}.jpg`;
      const {error:ye}=await sb.storage.from('avatarlar')
        .upload(yol,_fotoBlob,{contentType:'image/jpeg',upsert:true});
      if(ye) throw ye;
      foto_url=sb.storage.from('avatarlar').getPublicUrl(yol).data.publicUrl;
    }else if(_foto===null&&id){ foto_url=null; }

    if(id){
      const {error}=await sb.from('oyuncular').update({ad:n,foto_url,dogum:dg}).eq('id',id);
      if(error) throw error;
    }else{
      await oyuncuEkle(n,foto_url,dg,!!benimIcin);
    }
    _foto=null; _fotoBlob=null;
    await verileriGetir(); kapatModal(); render(); toast('Kaydedildi');
  }catch(e){ toast(hataMetni(e),true); btn.disabled=false; btn.textContent='Kaydet'; }
}
async function oyuncuEkle(adi,foto_url,dogum,benim,renk){
  const n=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup).length;
  const {data,error}=await sb.from('oyuncular').insert({
    masa_id:DB.aktifGrup, ad:adi, foto_url:foto_url||null, dogum:dogum||null,
    renk:renk||RENKLER[n%RENKLER.length], profil_id: benim?OTURUM.id:null
  }).select('id').single();
  if(error) throw error;
  return data.id;
}

//== oyuncuSil
/* Sicili korumak için kayıt silinmez, PASİFLEŞTİRİLİR: eski maçlarda adı
   görünmeye devam eder, yeni maça seçilemez. */
async function oyuncuPasif(id,geri){
  const o=oy(id);
  if(!geri&&!confirm(`${o.ad} gruptan kaldırılsın mı? Eski maçlarda adı kalır, yeni maça seçilemez.`)) return;
  const {error}=await sb.from('oyuncular').update({aktif:!!geri}).eq('id',id);
  if(error) return toast(hataMetni(error),true);
  await yenile(true); toast(geri?'Geri alındı':'Gruptan kaldırıldı');
}
async function oyuncuCoz(id){
  if(!confirm(`${ad(id)} kaydının hesap bağı koparılsın mı?`)) return;
  const {error}=await sb.rpc('oyuncu_coz',{p_oyuncu:id});
  if(error) return toast(hataMetni(error),true);
  await yenile(true); toast('Bağ koparıldı');
}

//== grupAc
/* ---------- MASA ---------- */
function grupAc(id){
  const g=id?grup(id):null;
  if(!g){
    return acModal(`<h2 class="serif" style="margin:0 0 4px">Yeni Grup</h2>
      <div class="xs dim" style="margin-bottom:14px">Perşembe akşamı kimlerle oynuyorsan o. Sicil bu gruba özel tutulur.</div>
      <div class="field"><label class="fl">Grup adı</label>
        <input id="yMAd" placeholder="Parkverde" maxlength="40"></div>
      <div class="field"><label class="fl">Simge</label>
        <div class="row wrap" id="yMEmoji">${GRUP_EMOJI.map((e,i)=>
          `<div class="chip ${i===0?'on':''}" data-e="${e}" style="font-size:19px;padding:7px 11px" onclick="tekSec(this)">${e}</div>`).join('')}</div></div>
      <button class="btn-p btn-full" style="margin-top:16px" onclick="masaKur()">Grubu Kur</button>`);
  }
  const k=kurucuMu();
  acModal(`<h2 class="serif" style="margin:0 0 4px">${esc(g.ad)}</h2>
    <div class="xs dim" style="margin-bottom:14px">${k?'Grubu sen kurdun; adını ve kurallarını sen belirlersin.':'Grubu kuran değişiklik yapabilir.'}</div>
    <div class="field"><label class="fl">Grup adı</label>
      <input id="gAdi" value="${esc(g.ad)}" maxlength="40" ${k?'':'disabled'}></div>
    <div class="field"><label class="fl">Simge</label>
      <div class="row wrap" id="gEmoji">${GRUP_EMOJI.map(e=>
        `<div class="chip ${g.emoji===e?'on':''}" data-e="${e}" style="font-size:19px;padding:7px 11px"
          ${k?`onclick="tekSec(this)"`:''}>${e}</div>`).join('')}</div></div>
    <div class="field"><label class="fl">Davet kodu</label>
      <div class="row"><input value="${esc(g.kod)}" disabled style="letter-spacing:.2em;font-weight:700">
        <button class="btn-b" onclick="kodPaylas(grup('${g.id}'))">Paylaş</button></div></div>
    ${k?`<button class="btn-p btn-full" style="margin-top:16px" onclick="grupKaydet('${g.id}')">Kaydet</button>
        <button class="btn-dn btn-full btn-sm" style="margin-top:8px" onclick="grupSil('${g.id}')">Grubu Sil</button>`
       :`<button class="btn-dn btn-full btn-sm" style="margin-top:16px" onclick="masadanCik()">Gruptan Ayrıl</button>`}`);
}

//== grupKaydet
async function grupKaydet(id){
  const adi=$('#gAdi').value.trim();
  if(!adi) return toast('Grup adı gerekli',true);
  const emoji=document.querySelector('#gEmoji .chip.on')?.dataset.e||GRUP_EMOJI[0];
  const {error}=await sb.from('masalar').update({ad:adi,emoji}).eq('id',id);
  if(error) return toast(hataMetni(error),true);
  await verileriGetir(); kapatModal(); render(); toast('Grup güncellendi');
}

//== grupSil
async function grupSil(id){
  const n=DB.celseler.filter(c=>c.grupId===id).length;
  if(!confirm(`Grup ve İÇİNDEKİ HER ŞEY silinsin mi?${n?` ${n} maç, sicil, iddia defteri — hepsi gider.`:''}`)) return;
  if(!confirm('Bu geri alınamaz. Emin misin?')) return;
  const {error}=await sb.from('masalar').delete().eq('id',id);
  if(error) return toast(hataMetni(error),true);
  if(DB.aktifGrup===id){ DB.aktifGrup=null; localStorage.removeItem('kkd_aktif_masa'); }
  await verileriGetir();
  DURUM=DB.gruplar.length?'hazir':'masayok';
  kanalKur(); kapatModal(); render(); toast('Grup silindi');
}
async function masadanCik(){
  if(!confirm('Bu gruptan ayrılırsan sicilini göremezsin. Devam?')) return;
  const {error}=await sb.from('masa_uyeleri').delete()
    .eq('masa_id',DB.aktifGrup).eq('profil_id',OTURUM.id);
  if(error) return toast(hataMetni(error),true);
  DB.aktifGrup=null; localStorage.removeItem('kkd_aktif_masa');
  await verileriGetir();
  DURUM=DB.gruplar.length?'hazir':'masayok';
  kanalKur(); kapatModal(); render(); toast('Gruptan ayrıldın');
}

//== grupSecici
function grupSecici(){
  acModal(`<h2 class="serif" style="margin:0 0 12px">Grup Değiştir</h2>
    <div class="stack">
      ${DB.gruplar.map(g=>`<div class="chip ${DB.aktifGrup===g.id?'on':''}" style="width:100%;justify-content:flex-start"
        onclick="grupGec('${g.id}')"><span style="font-size:18px">${g.emoji}</span> ${esc(g.ad)}
        <span class="xs dim">· ${g.uyeler.length} oyuncu${g.rol==='kurucu'?' · kurucu':''}</span></div>`).join('')}
    </div>
    <div class="sep"></div>
    <div class="field"><label class="fl">Kodla başka gruba katıl</label>
      <div class="row"><input id="kKod2" placeholder="ABC123" maxlength="6"
        style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"
        oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')">
        <button class="btn-b" onclick="kodlaKatil()">Katıl</button></div></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="kapatModal();grupAc(null)">+ Yeni Grup Kur</button>`);
}

//== grupGec
async function grupGec(id){
  if(id===DB.aktifGrup) return kapatModal();
  DB.aktifGrup=id; SABIKA_ID=null;
  localStorage.setItem('kkd_aktif_masa',id);
  kapatModal();
  await yenile(true);
  kanalKur();
}

//== yedekAl
/* TAM yedek. Ücretsiz katmanda veritabanının geri dönüşü (PITR) yok;
   biri masayı yanlışlıkla silerse tek dayanağımız bu dosya. O yüzden
   akış (zabıtlar, mesajlar, BORÇ ÖDEMELERİ) ve tahmin verisi de giriyor —
   önceki hâlde bunlar dışarı çıkmıyordu. */
function yedekAl(){
  const g=aktifGrup();
  const hIds=(DB.haftalar||[]).filter(h=>h.masaId===DB.aktifGrup).map(h=>h.id);
  const kars=(DB.karsilasmalar||[]).filter(k=>hIds.includes(k.haftaId));
  const kIds=kars.map(k=>k.id);
  const veri={
    v:5, kaynak:'bulut', alindi:new Date().toISOString(),
    masa:g?{ad:g.ad,emoji:g.emoji,kod:g.kod,kuran:g.kuran}:null,
    ben:DB.ben, ayar:DB.ayar,
    uyeler:(MASA_UYELERI||[]).map(u=>({profilId:u.profil_id,rol:u.rol,
             ad:u.profiller?.ad||null})),
    oyuncular:DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup),
    celseler:DB.celseler.filter(c=>c.grupId===DB.aktifGrup),
    acik:(DB.acik||[]).filter(c=>c.grupId===DB.aktifGrup),   // yarım kalan tabelalar
    iddialar:DB.iddialar.filter(i=>i.grupId===DB.aktifGrup),
    akis:(DB.akis||[]).filter(a=>a.grupId===DB.aktifGrup),   // zabıtlar + ödemeler burada
    haftalar:(DB.haftalar||[]).filter(h=>h.masaId===DB.aktifGrup),
    karsilasmalar:kars,
    tahminler:(DB.tahminler||[]).filter(t=>kIds.includes(t.karsilasmaId))
  };
  const say=`${veri.oyuncular.length} oyuncu · ${veri.celseler.length} maç · `+
            `${veri.iddialar.length} iddia · ${veri.akis.length} akış · `+
            `${veri.haftalar.length} tahmin haftası`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(veri,null,2)],{type:'application/json'}));
  a.download=`${(g?.ad||'masa').replace(/[^\wğüşıöçĞÜŞİÖÇ ]/g,'')}-${bugun()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Yedek indirildi: '+say,true);
}

//== yedekYukle
/* Eski tek-dosya prototipin (localStorage) yedeğini bu masaya taşır.
   Oyuncular ADA göre eşlenir; masada olmayan ad yeni oyuncu olarak açılır. */
function yedekYukle(inp){
  const f=inp.files[0]; if(!f) return;
  if(!kurucuMu()){ inp.value=''; return toast('İçe aktarmayı yalnız grubu kuran yapabilir',true); }
  const r=new FileReader();
  r.onload=async()=>{
    let d;
    try{ d=JSON.parse(r.result); }catch(e){ return toast('Dosya okunamadı',true); }
    if(!d||!Array.isArray(d.oyuncular)||!Array.isArray(d.celseler)) return toast('Bu bir defter yedeği değil',true);
    const gelen=d.celseler.filter(c=>c.bitti);
    if(!confirm(`Yedekte ${d.oyuncular.length} oyuncu, ${gelen.length} kapanmış maç var.\nBu masaya EKLENECEK (mevcut kayıtlar silinmez). Devam?`)) return;
    try{
      const harita={};
      for(const o of d.oyuncular){
        const varOlan=DB.oyuncular.find(x=>x.masaId===DB.aktifGrup&&
          x.ad.toLocaleLowerCase('tr-TR')===String(o.ad||'').toLocaleLowerCase('tr-TR'));
        harita[o.id]= varOlan ? varOlan.id : await oyuncuEkle(o.ad||'Oyuncu',null,o.dogum||null,false);
      }
      let n=0;
      for(const c of gelen){
        const y=celseHaritala(JSON.parse(JSON.stringify(c)),harita);
        const {error}=await sb.from('maclar').insert({
          masa_id:DB.aktifGrup, oyun:y.oyun, giris:y.giris||'detay', tarih:y.tarih||bugun(),
          yer:y.yer||null, tabelaci_id:OTURUM.id, parti_hedef:Math.min(5,Math.max(1,y.partiHedef||1)),
          mod:y.oyun==='101'?(y.mod||'tek'):null, celse:y, bitti:true,
          kazanan:y.kazanan??null, zabit:y.zabit||null, aciklama:y.not||null });
        if(error) throw error;
        n++;
      }
      await yenile(true);
      toast(`${n} maç içeri alındı.`,true);
    }catch(e){ toast(hataMetni(e),true); }
  };
  r.readAsText(f); inp.value='';
}
function celseHaritala(c,h){
  const m=id=>h[id]||id;
  ['id','grupId','_hesap'].forEach(k=>delete c[k]);
  if(c.tabelaci) c.tabelaci=m(c.tabelaci);
  if(c.takimlar) c.takimlar.forEach(t=>t.oyuncular=t.oyuncular.map(m));
  if(c.oyuncular) c.oyuncular=c.oyuncular.map(m);
  if(c.esler) c.esler=c.esler.map(p=>p.map(m));
  if(c.oyun==='101'&&typeof c.kazanan==='string') c.kazanan=m(c.kazanan);
  if(c.hizli){
    if(Array.isArray(c.hizli.sira)) c.hizli.sira=c.hizli.sira.map(m);
    if(c.hizli.puan&&!Array.isArray(c.hizli.puan)){
      const p={}; Object.keys(c.hizli.puan).forEach(k=>p[m(k)]=c.hizli.puan[k]); c.hizli.puan=p;
    }
  }
  (c.partiler||[]).forEach(pt=>{
    if(Array.isArray(pt.kazanan)) pt.kazanan=pt.kazanan.map(m);
    (pt.eller||[]).forEach(el=>{
      if(el.durum){ const d={}; Object.keys(el.durum).forEach(k=>d[m(k)]=el.durum[k]); el.durum=d; }
    });
  });
  return c;
}

//== hepsiniSil
async function uyeKarar(profilId,durum){
  const {error}=await sb.from('masa_uyeleri').update({durum})
    .eq('masa_id',DB.aktifGrup).eq('profil_id',profilId);
  if(error) return toast(hataMetni(error),true);
  await yenile(true);
  toast(durum==='onayli'?'Gruba alındı. Şimdi hangi oyuncu olduğunu seçecek.':'Reddedildi');
}
async function uyeCikar(profilId){
  if(!confirm('Bu kişi gruptan çıkarılsın mı? Oyuncu kaydı ve sicili kalır.')) return;
  const {error}=await sb.from('masa_uyeleri').delete()
    .eq('masa_id',DB.aktifGrup).eq('profil_id',profilId);
  if(error) return toast(hataMetni(error),true);
  await yenile(true); toast('Çıkarıldı');
}
async function hesabaBagla(oyuncuId,profilId){
  const {error}=await sb.rpc('oyuncu_bagla',{p_oyuncu:oyuncuId,p_profil:profilId});
  if(error) return toast(hataMetni(error),true);
  await yenile(true); toast('Bağlandı');
}
