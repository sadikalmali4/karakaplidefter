/* =========================================================
   GİRİŞ · KAYIT · MASA KURMA
   ========================================================= */
let GIRIS_MOD='giris';
function girisEkrani(){
  const k=GIRIS_MOD==='kayit';
  const d=DAVET;                       // kişiye özel davetle mi gelindi?
  return `<div class="orta"><div style="max-width:400px;margin:0 auto;width:100%">
    <div class="center" style="margin-bottom:20px">
      <div class="serif" style="font-size:22px">Kara Kaplı Defter</div>
      <div class="xs dim" style="margin-top:4px">Batak &amp; 101 masa sicili</div>
    </div>
    ${d&&d.ad?`<div class="uyari" style="margin-bottom:12px">
      Hoş geldin <b>${esc(d.ad)}</b>. Bu davet senin adına.
      Tek yapman gereken bir şifre belirlemek — kod girmene, onay beklemene gerek yok.</div>`:''}
    <div class="card">
      ${d&&d.ad?'':`<div class="seg" style="margin-bottom:14px">
        <button class="${k?'':'on'}" onclick="GIRIS_MOD='giris';render()">Giriş</button>
        <button class="${k?'on':''}" onclick="GIRIS_MOD='kayit';render()">Kayıt Ol</button>
      </div>`}
      ${k?`<div class="field"><label class="fl">Adın</label>
        <input id="gAdi" placeholder="Mustafa" maxlength="24" autocomplete="name"
               value="${esc(d?.ad||'')}"></div>`:''}
      <div class="field"><label class="fl">Kullanıcı adı</label>
        <input id="gKad" placeholder="mustafa" autocapitalize="none" autocomplete="username"
               value="${esc(d?.kad||'')}"
               oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')">
        ${k?'<div class="xs dim" style="margin-top:5px">Küçük harf, rakam, alt çizgi. Bu sadece senin girişin.</div>':''}</div>
      <div class="field"><label class="fl">Şifre</label>
        <input id="gSifre" type="password" placeholder="••••••" autocomplete="${k?'new-password':'current-password'}"
               onkeydown="if(event.key==='Enter')girisYap()">
        ${k?'<div class="xs dim" style="margin-top:5px">En az 6 karakter. Kendin belirle, kimse görmez.</div>':''}</div>
      <button class="btn-p btn-full" id="gBtn" style="margin-top:14px" onclick="girisYap()">${k?'Hesabı Aç':'Gir'}</button>
      ${d&&d.ad&&k?`<button class="btn-gh btn-full btn-sm" style="margin-top:8px"
        onclick="GIRIS_MOD='giris';render()">Hesabım zaten var, girmek istiyorum</button>`:''}
    </div>
    <div class="xs dim center">Şifreyi biz saklamıyoruz; Supabase'in kimlik sistemi tutuyor.</div>
  </div></div>`;
}
async function girisYap(){
  const kad=$('#gKad').value.trim(), sifre=$('#gSifre').value;
  const kayit=GIRIS_MOD==='kayit', adi=kayit?$('#gAdi').value.trim():'';
  if(kayit&&!adi) return toast('Adını yaz',true);
  if(!kad) return toast('Kullanıcı adı gerekli',true);
  if(!sifre||sifre.length<6) return toast('Şifre en az 6 karakter olmalı',true);
  const btn=$('#gBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  try{
    if(kayit){
      const {error}=await sb.auth.signUp({email:kadToPosta(kad),password:sifre,options:{data:{ad:adi}}});
      if(error) throw error;
      const {error:e2}=await sb.auth.signInWithPassword({email:kadToPosta(kad),password:sifre});
      if(e2) throw e2;
    }else{
      const {error}=await sb.auth.signInWithPassword({email:kadToPosta(kad),password:sifre});
      if(error) throw error;
    }
    const {data:{session}}=await sb.auth.getSession();
    OTURUM=session.user;
    await verileriGetir();
    if(kayit&&PROFIL&&adi&&PROFIL.ad!==adi){
      await sb.from('profiller').update({ad:adi,renk:RENKLER[Math.floor(Math.random()*RENKLER.length)]}).eq('id',OTURUM.id);
      PROFIL.ad=adi;
    }
    const davetVarMi=!!DAVET;
    if(DAVET) await davetiIsle();      // davet linkiyle geldiyse gruba doğrudan gir
    kanalKur();
    DURUM=DB.gruplar.length?'hazir':'masayok';
    render();
    if(typeof pushHazirla==='function') pushHazirla().then(()=>render()).catch(()=>{});
    if(!davetVarMi) toast(kayit?`Hoş geldin ${adi}.`:`Tekrar hoş geldin ${PROFIL?.ad||''}.`);
  }catch(e){
    toast(hataMetni(e),true);
    btn.disabled=false; btn.textContent=kayit?'Hesabı Aç':'Gir';
  }
}
async function cikisYap(){
  if(!confirm('Çıkış yapılsın mı?')) return;
  if(KANAL){ sb.removeChannel(KANAL); KANAL=null; }
  await sb.auth.signOut();
  OTURUM=null; PROFIL=null; UYELIKLER=[];
  DB.gruplar=[]; DB.oyuncular=[]; DB.celseler=[]; DB.iddialar=[]; DB.akis=[];
  DB.acik=[]; DB.aktif=null; DB.ben=null; SECILI_MAC=null; DAVET=null; davetSil();
  localStorage.removeItem('kkd_aktif_masa');
  DURUM='giris'; kapatModal(); render();
}

/* --------- masası olmayan --------- */
function masaYokEkrani(){
  const bekleyen=UYELIKLER.filter(u=>u.durum==='bekliyor');
  const red=UYELIKLER.filter(u=>u.durum==='reddedildi');
  return `
  <div class="row" style="margin-bottom:14px">
    <div class="grow"><div class="serif" style="font-size:18px">${esc(PROFIL.ad)}</div>
      <div class="xs dim">@${esc(postaToKad(OTURUM.email))}</div></div>
    <button class="btn-xs btn-gh" onclick="hesapAc()">Hesabım</button>
    <button class="btn-xs btn-gh" onclick="cikisYap()">Çıkış</button>
  </div>
  ${bekleyen.length?`<div class="uyari" style="margin-bottom:12px">
    <b>${esc(bekleyen.map(b=>b.masalar.ad).join(', '))}</b> grubuna katılma isteğin gönderildi.
    Grubu kuran onaylayınca içeri girersin.
    <button class="btn-xs btn-gh" style="margin-top:9px" onclick="yenile()">Kontrol et</button></div>`:''}
  ${red.length?`<div class="card tight"><div class="sm dim">${esc(red.map(b=>b.masalar.ad).join(', '))} isteğin kabul edilmedi.</div></div>`:''}
  <div class="card"><div class="empty">
    <div class="big">🍀</div>
    <div class="serif" style="font-size:17px;color:var(--ink)">Henüz bir grubun yok</div>
    <div class="sm" style="margin-top:6px">Ya kendi grubunu kur, ya arkadaşının verdiği davet linkine bas.</div></div></div>
  <div class="card">
    <h3>Kodla Katıl</h3>
    <div class="row">
      <input id="kKod" placeholder="ABC123" maxlength="6" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"
             oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"
             onkeydown="if(event.key==='Enter')kodlaKatil()">
      <button class="btn-b" onclick="kodlaKatil()">Katıl</button></div>
    <div class="xs dim" style="margin-top:7px">Kodu grubu kuran verir. İstek ona düşer, o onaylar. Kişiye özel davet linkiyle gelen beklemez.</div>
  </div>
  <div class="card">
    <h3>Grup Kur</h3>
    <div class="field"><label class="fl">Grup adı</label>
      <input id="yMAd" placeholder="Parkverde" maxlength="40"></div>
    <div class="field"><label class="fl">Simge</label>
      <div class="row wrap" id="yMEmoji">${GRUP_EMOJI.map((e,i)=>
        `<div class="chip ${i===0?'on':''}" data-e="${e}" style="font-size:19px;padding:7px 11px" onclick="tekSec(this)">${e}</div>`).join('')}</div></div>
    <button class="btn-p btn-full" style="margin-top:14px" onclick="masaKur()">Grubu Kur</button>
  </div>`;
}
async function masaKur(){
  const adi=$('#yMAd').value.trim();
  if(!adi) return toast('Grup adı gerekli',true);
  const emoji=document.querySelector('#yMEmoji .chip.on')?.dataset.e||GRUP_EMOJI[0];
  try{
    /* Masa kurma sunucudaki masa_kur() ile yapılır: masa ve kurucu üyeliği
       aynı işlemde oluşur. Doğrudan insert edilirse RETURNING okuma kuralına
       takılır (üyelik henüz görünmediği için). Bkz. yama 01. */
    const {data,error}=await sb.rpc('masa_kur',{p_ad:adi,p_emoji:emoji});
    if(error) throw error;
    const yeni=Array.isArray(data)?data[0]:data;
    if(!yeni) throw new Error('Grup kurulamadı');
    localStorage.setItem('kkd_aktif_masa',yeni.id);
    DB.aktifGrup=yeni.id;
    await verileriGetir();
    /* kuran kişi kendi oyuncu kaydını da alsın — yoksa maça giremez */
    if(!DB.ben&&PROFIL?.ad) await oyuncuEkle(PROFIL.ad,null,null,true);
    await verileriGetir(); kanalKur();
    DURUM='hazir'; kapatModal(); render();
    kodPaylas(grup(yeni.id));
  }catch(e){ toast(hataMetni(e),true); }
}
async function kodlaKatil(){
  const kod=($('#kKod')||$('#kKod2'))?.value.trim()||'';
  if(kod.length<4) return toast('Kodu tam yaz',true);
  try{
    const {data,error}=await sb.rpc('masaya_katil',{p_kod:kod});
    if(error) throw error;
    const r=Array.isArray(data)?data[0]:data;
    await verileriGetir();
    DURUM=DB.gruplar.length?'hazir':'masayok';
    kapatModal(); render();
    if(r?.durum==='onayli') toast(`${r.masa_ad} grubundasın.`);
    else toast(`${r?.masa_ad||'Masa'} için istek gönderildi. Kurucu onaylayacak.`,true);
  }catch(e){ toast(hataMetni(e),true); }
}
function kodPaylas(m){
  if(!m) return;
  const metin=`${m.emoji} ${m.ad} grubuna katıl.\nKod: ${m.kod}\n${location.origin+location.pathname}`;
  acModal(`<div class="center">
    <div style="font-size:34px">${m.emoji}</div>
    <div class="serif" style="font-size:20px;margin-top:6px">${esc(m.ad)}</div>
    <div class="sm dim" style="margin-top:8px">Bu kod açık davettir: girenin isteği sana düşer, sen onaylarsın. Kişiye özel link istiyorsan Ayarlar → Davet Linkleri.</div>
    <div style="margin:16px 0;padding:16px;background:var(--panel2);border:1px solid var(--line);border-radius:12px">
      <div class="kod">${esc(m.kod)}</div></div>
    <button class="btn-g btn-full" onclick='kopyala(${JSON.stringify(metin)})'>📋 Daveti Kopyala</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>
  </div>`);
}

/* --------- hesabım (oyuncu değil, giriş hesabı) --------- */
function hesapAc(){
  acModal(`<h2 class="serif" style="margin:0 0 4px">Hesabım</h2>
    <div class="xs dim" style="margin-bottom:14px">Bu senin giriş hesabın. Oyuncu adın ve fotoğrafın her grupta ayrı tutulur.</div>
    <div class="field"><label class="fl">Görünen ad</label>
      <input id="hAd" value="${esc(PROFIL?.ad||'')}" maxlength="24"></div>
    <div class="field"><label class="fl">Kullanıcı adı</label>
      <input value="${esc(postaToKad(OTURUM.email))}" disabled></div>
    <button class="btn-p btn-full" style="margin-top:14px" onclick="hesapKaydet()">Kaydet</button>
    <button class="btn-dn btn-full btn-sm" style="margin-top:8px" onclick="cikisYap()">Çıkış Yap</button>`);
}
async function hesapKaydet(){
  const adi=$('#hAd').value.trim();
  if(!adi) return toast('Ad gerekli',true);
  const {error}=await sb.from('profiller').update({ad:adi}).eq('id',OTURUM.id);
  if(error) return toast(hataMetni(error),true);
  PROFIL.ad=adi; kapatModal(); render(); toast('Kaydedildi');
}
