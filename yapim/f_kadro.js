/* =========================================================
   KADRO KURULUMU — oyuncular + fotoğrafları tek dokunuşla
   Kaynak: kurulum/kadro.json (uygulamayla birlikte yayınlanır)
   ========================================================= */
async function kadroSor(){
  let k;
  try{ k=await fetch('kurulum/kadro.json',{cache:'no-store'}).then(r=>r.json()); }
  catch(e){ return toast('Kadro dosyası okunamadı',true); }
  const varOlan=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup)
    .map(o=>o.ad.toLocaleLowerCase('tr-TR'));
  const yeni=k.oyuncular.filter(o=>!varOlan.includes(o.ad.toLocaleLowerCase('tr-TR')));
  if(!yeni.length) return toast('Kadro zaten kurulu');
  acModal(`<h2 class="serif" style="margin:0 0 4px">${esc(k.grup)} Kadrosu</h2>
    <div class="xs dim" style="margin-bottom:12px">Şu oyuncular gruba eklenecek. Hesap gerekmiyor —
      sicilleri bu kayıtlara işlenir. Sonradan herkes kendi hesabını bağlayabilir.</div>
    <div class="row wrap" style="gap:7px">${yeni.map(o=>
      `<span class="chip" style="cursor:default">${o.foto?'🖼':'👤'} ${esc(o.ad)}</span>`).join('')}</div>
    <div class="xs dim" style="margin-top:10px">🖼 işaretli olanların fotoğrafı da yüklenecek.</div>
    <button class="btn-p btn-full" id="kdBtn" style="margin-top:16px" onclick="kadroKur()">
      ${yeni.length} oyuncuyu ekle</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function kadroKur(){
  const btn=$('#kdBtn'); if(btn){btn.disabled=true;}
  let eklenen=0, hata=0;
  try{
    const k=await fetch('kurulum/kadro.json',{cache:'no-store'}).then(r=>r.json());
    const varOlan=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup)
      .map(o=>o.ad.toLocaleLowerCase('tr-TR'));
    const bendeOyuncuVar=!!DB.ben;
    const yeni=k.oyuncular.filter(o=>!varOlan.includes(o.ad.toLocaleLowerCase('tr-TR')));

    for(let i=0;i<yeni.length;i++){
      const o=yeni[i];
      if(btn) btn.innerHTML=`<span class="yukleniyor"></span> ${i+1}/${yeni.length} · ${esc(o.ad)}`;
      try{
        let foto_url=null;
        if(o.foto){
          const blob=await fetch('kurulum/'+o.foto,{cache:'no-store'}).then(r=>r.blob());
          const yol=`masa/${DB.aktifGrup}/${o.kad||yid()}_${Date.now()}.jpg`;
          const {error:ye}=await sb.storage.from('avatarlar')
            .upload(yol,blob,{contentType:'image/jpeg',upsert:true});
          if(ye) throw ye;
          foto_url=sb.storage.from('avatarlar').getPublicUrl(yol).data.publicUrl;
        }
        /* "ben" işaretli oyuncu bu hesaba bağlanır — ama zaten bağlıysam dokunma */
        /* Lakap ada GÖMÜLMÜYOR: ayar.lakaplar'da tutulur, aşağıda işlenir.
           Ada gömülse her zabıtta tırnak içinde çıkar, metni kirletir. */
        await oyuncuEkle(o.ad,foto_url,o.dogum||null,!!o.ben&&!bendeOyuncuVar,o.renk||null);
        eklenen++;
      }catch(e){ hata++; console.warn(o.ad,e); }
    }
    /* lakapları ada göre eşleştirip ayara yaz (oyuncular oluştuktan sonra) */
    if(kurucuMu()){
      await verileriGetir();
      const m=Object.assign({},lakaplar());
      let lk=0;
      for(const o of k.oyuncular){
        if(!o.lakap) continue;
        const oy=grupOyunculari().find(x=>
          x.ad.toLocaleLowerCase('tr-TR')===o.ad.toLocaleLowerCase('tr-TR'));
        if(oy && m[oy.id]!==o.lakap){ m[oy.id]=o.lakap; lk++; }
      }
      if(lk){ DB.ayar.lakaplar=m; await ayarYaz(true); }
    }
  }catch(e){ toast(hataMetni(e),true); }
  await verileriGetir(); kapatModal(); render();
  toast(hata?`${eklenen} oyuncu eklendi, ${hata} tanesi olmadı.`:`${eklenen} oyuncu eklendi.`,!!hata);
}

/* =========================================================
   DAVET — kişiye özel link, onay beklemeden içeri
   ========================================================= */
let DAVET=null;

function davetOku(){
  const q=new URLSearchParams(location.search);
  const kod=q.get('kod');
  if(!kod) return;
  DAVET={kod:kod.toUpperCase(),oyuncu:q.get('oyuncu')||null,
         ad:q.get('ad')||'',kad:q.get('kad')||''};
  if(DAVET.ad||DAVET.kad) GIRIS_MOD='kayit';
  /* adres çubuğunu temizle: link paylaşılınca kimlik bilgisi taşınmasın */
  try{ history.replaceState(null,'',location.pathname); }catch(e){}
}

async function davetiIsle(){
  if(!DAVET||!OTURUM) return;
  const d=DAVET; DAVET=null;
  try{
    if(d.oyuncu){
      const {data,error}=await sb.rpc('davetle_katil',{p_kod:d.kod,p_oyuncu:d.oyuncu});
      if(error) throw error;
      const r=Array.isArray(data)?data[0]:data;
      DB.aktifGrup=r.masa_id;
      localStorage.setItem('kkd_aktif_masa',r.masa_id);
      await verileriGetir(); kanalKur();
      toast(`Hoş geldin ${r.oyuncu_ad}. ${r.masa_ad} grubundasın.`);
    }else{
      const {data,error}=await sb.rpc('masaya_katil',{p_kod:d.kod});
      if(error) throw error;
      const r=Array.isArray(data)?data[0]:data;
      await verileriGetir(); kanalKur();
      toast(r?.durum==='onayli'?`${r.masa_ad} grubundasın.`
        :`${r?.masa_ad||'Grup'} için istek gönderildi, kurucu onaylayacak.`, r?.durum!=='onayli');
    }
  }catch(e){ toast(hataMetni(e),true); }
}

const davetKad=ad2=>String(ad2||'').toLocaleLowerCase('tr-TR')
  .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i')
  .replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]/g,'');

function davetLinki(oyuncuId){
  const g=aktifGrup(), o=oy(oyuncuId);
  const q=new URLSearchParams({kod:g.kod,oyuncu:oyuncuId,ad:o.ad,kad:davetKad(o.ad)});
  return location.origin+location.pathname+'?'+q.toString();
}
function davetPaylas(oyuncuId){
  const g=aktifGrup(), o=oy(oyuncuId);
  const link=davetLinki(oyuncuId);
  const metin=`${g.emoji} ${o.ad}, ${g.ad} deftere geçti.\n`+
    `Batak ve 101 skorları buraya yazılıyor — kim kaç ihale batırdı, kim hesabı ödedi, hepsi kayıtta.\n\n`+
    `${link}\n\n`+
    `Link senin adına; aç, bir şifre belirle, içeridesin. Sonra "Ana Ekrana Ekle" de, uygulama gibi durur.`;
  acModal(`<h2 class="serif" style="margin:0 0 4px">${esc(o.ad)} için davet</h2>
    <div class="xs dim" style="margin-bottom:12px">Bu link <b>yalnız ${esc(o.ad)}</b> içindir ve <b>tek kullanımlıktır</b>.
      Açan kişi sadece kendi şifresini belirler; onay beklemez, doğrudan ${esc(o.ad)} olarak girer.
      Kullanıldıktan sonra link kimseyi içeri almaz.</div>
    <div class="zabit" style="font-size:12.5px;line-height:1.5" id="dvMetin">${esc(metin)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="kopyala(document.getElementById('dvMetin').textContent)">📋 Kopyala · WhatsApp'a Yapıştır</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
function davetHepsi(){
  const bos=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif&&!o.profilId);
  if(!bos.length) return toast('Herkesin hesabı bağlı');
  acModal(`<h2 class="serif" style="margin:0 0 4px">Davet Linkleri</h2>
    <div class="xs dim" style="margin-bottom:12px">Her satır o kişiye özel, tek kullanımlık.
      Kime göndereceksen onun linkini kopyala.</div>
    <div class="stack">${bos.map(o=>`
      <div class="row" style="gap:9px">${avatar(o.id,30)}
        <div class="grow" style="font-weight:600;font-size:13.5px">${esc(o.ad)}</div>
        <button class="btn-sm btn-b" onclick="kapatModal();davetPaylas('${o.id}')">Davet</button>
      </div>`).join('')}</div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:14px" onclick="kapatModal()">Kapat</button>`);
}
