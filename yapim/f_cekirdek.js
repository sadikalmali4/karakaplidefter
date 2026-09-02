/* =========================================================
   KARA KAPLI DEFTER  v4 — BULUT
   Batak : eşli · ihaleli · parti 61 · maç = kaç parti alan
   101   : parti 11 el · ceza puanı · çok puanlı kaybeder

   Veri artık cihazda değil, masada. Herkes kendi hesabıyla girer;
   masaya kodla katılır, kurucu onaylar. Tabelayı tabelacı yazar,
   diğerleri canlı izler.
   ========================================================= */

const SB_URL = 'https://dgtgotopmbpuwmuqlkbd.supabase.co';
const SB_KEY = 'sb_publishable_OLcMTIJvS1hA41B-kUdkjw_aRoAAjle';

/* Kullanıcı adı → sahte e-posta. Kimseden e-posta istemiyoruz;
   Supabase e-posta beklediği için içeride bu alana çeviriyoruz. */
const POSTA_ALANI='karakaplidefter.local';
const kadToPosta=k=>`${String(k).toLowerCase()}@${POSTA_ALANI}`;
const postaToKad=e=>String(e||'').split('@')[0];

const RENKLER=['#C9A227','#4A8FA8','#A85C4A','#6E9B5C','#9B6EA8','#C4784A','#5C8A9B','#A89B4A','#8A7BC4','#C45C7B'];
const GRUP_EMOJI=['🍀','🂡','🀄','☕','🔥','🐺','🦅','🎩','⚔️','🧿'];

const VARSAYILAN_AYAR={
  bahis:'Cin', efsaneler:[],
  batak:{hedef:61,minIhale:7,toplamEl:13,tutunca:'alinan',batinca:'alinan',partiHedef:2,slem:'ihale'},
  yz:{elSayisi:11,partiHedef:1,bitiren:-101,acamayan:200,cifteCarpan:2,okeyAktif:false,okeyCarpan:2,silme:-202,
      muey3:'Çay ısmarlar',muey4:'Hesabı öder'}
};

let sb=null, OTURUM=null, PROFIL=null;
let UYELIKLER=[];      // hesabımın bütün masa üyelikleri (bekleyen dahil)
let BEKLEYENLER=[];    // aktif masada onay bekleyen hesaplar (kurucuysam)
let MASA_UYELERI=[];   // aktif masanın onaylı hesapları
let KANAL=null;        // canlı yayın aboneliği
let DURUM='yukleniyor';// yukleniyor | giris | masayok | hazir | hata
let HATA='';

let DB={ ben:null, oyuncular:[], gruplar:[], aktifGrup:null,
         ayar:JSON.parse(JSON.stringify(VARSAYILAN_AYAR)),
         celseler:[], iddialar:[], akis:[],
         acik:[],        // bu grupta AÇIK olan bütün masalar
         aktif:null };   // bunlardan hâlen ekranda olan

let SECILI_MAC=null;     // hangi masanın tabelası açık
/* Oyuncu seçim sırası: eşleri ve 101 sıralamasını bu belirliyor.
   Date.now() ile damgalamak yetmiyor — aynı milisaniyedeki iki seçim
   eşitlenip sıra bozuluyordu. Artan sayaç kullanılıyor. */
let SEC_NO=0;
let TAB='celse', SABIKA_ID=null, ARSIV_FILTRE='hepsi', SICIL_OYUN='batak', ROZET_OYUN='batak';

const yid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function norm(c){
  if(!c) return c;
  if(!c.partiler) c.partiler=[{eller:c.eller||[],kazanan:null}];
  if(!c.partiHedef) c.partiHedef=1;
  if(!c.giris) c.giris='detay';
  delete c.eller; return c;
}

/* =========================================================
   BULUT KATMANI
   ========================================================= */
function hataMetni(e){
  const m=String(e?.message||e?.error_description||e||'');
  if(/Bu masanın onaylı üyesi değilsin/i.test(m)) return 'Bu grubun onaylı üyesi değilsin';
  if(/Bu masada zaten bir oyuncuya bağlısın/i.test(m)) return 'Bu grupta zaten bir oyuncuya bağlısın';
  if(/Böyle bir masa kodu yok/i.test(m))     return 'Böyle bir grup kodu yok';
  if(/Bunu yalnız masayı kuran yapabilir/i.test(m)) return 'Bunu yalnız grubu kuran yapabilir';
  if(/Masayı kuran taşıyabilir/i.test(m))    return 'Bu oyuncu başka bir hesaba bağlı. Grubu kuran taşıyabilir.';
  if(/Invalid login credentials/i.test(m))   return 'Kullanıcı adı veya şifre yanlış';
  if(/User already registered/i.test(m))     return 'Bu kullanıcı adı alınmış';
  if(/Password should be at least/i.test(m)) return 'Şifre en az 6 karakter olmalı';
  if(/Email logins are disabled/i.test(m))   return 'Supabase panelinde e-posta girişi kapalı (Authentication -> Providers -> Email)';
  if(/Email not confirmed/i.test(m))         return 'Supabase panelinde "Confirm email" hâlâ açık — kapatılmalı';
  if(/duplicate key|unique/i.test(m))        return 'Bu kayıt zaten var';
  if(/row-level security|violates|permission denied/i.test(m)) return 'Yetkin yok — bunu grubu kuran yapabilir';
  if(/Failed to fetch|NetworkError|fetch failed/i.test(m))     return 'İnternete ulaşılamadı';
  if(/JWT|token is expired/i.test(m))        return 'Oturum süresi doldu, yeniden gir';
  return m || 'Bilinmeyen hata';
}
const kurucuMu=()=>UYELIKLER.some(u=>u.masa_id===DB.aktifGrup&&u.rol==='kurucu'&&u.durum==='onayli');
/* Misafir de yazar: gerçek denetim sunucuda (misafir_celse_yaz). */
const tabelaciMiyim=()=>!!MISAFIR||!!(DB.aktif&&OTURUM&&DB.aktif._hesap===OTURUM.id);

async function baslat(){
  if(!window.supabase||!window.supabase.createClient){
    DURUM='hata'; HATA='Supabase kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'; return render();
  }
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  sb.auth.onAuthStateChange((olay)=>{
    if(olay==='SIGNED_OUT'){ OTURUM=null; PROFIL=null; DURUM='giris'; render(); }
  });
  /* ?misafir=<kod> ile gelindiyse hiç normal yola girmiyoruz:
     hesap yok, grup yok, tek maç var. */
  const _misafirKod=misafirKodu();
  if(_misafirKod){
    const {data:{session}}=await sb.auth.getSession();
    if(session){
      /* Aynı cihazda daha önce oturmuşsa adı sormadan devam et */
      try{
        const {data,error}=await sb.rpc('misafir_mac',{p_kod:_misafirKod});
        if(!error&&data){
          let ad2=''; try{ ad2=localStorage.getItem('kkd_misafir_ad')||''; }catch(e){}
          MISAFIR={kod:_misafirKod,ad:ad2||'Misafir',macId:data.mac.id,elBeklenen:data.mac.el_sayisi};
          misafirPencereKur(data); DURUM='misafir'; misafirNabizKur(); return render();
        }
      }catch(e){}
    }
    DURUM='misafirGiris'; return render();
  }

  davetOku();                       // ?kod=…&oyuncu=… ile gelindiyse yakala
  const _cagri=cagriOku();          // ?cagri=… ile gelindiyse Masa sekmesine düş
  try{
    const {data:{session}}=await sb.auth.getSession();
    OTURUM=session?.user||null;
    if(OTURUM){
      await verileriGetir();
      if(DAVET) await davetiIsle();
      kanalKur();
    }
    if(_cagri&&OTURUM){ TAB='celse'; SABIKA_ID=null; }
    DURUM = !OTURUM ? 'giris' : (DB.gruplar.length ? 'hazir' : 'masayok');
  }catch(e){ DURUM='hata'; HATA=hataMetni(e); }
  render();
}

async function verileriGetir(){
  const {data:pr,error:e1}=await sb.from('profiller').select('*').eq('id',OTURUM.id).maybeSingle();
  if(e1) throw e1;
  PROFIL=pr||{id:OTURUM.id,ad:postaToKad(OTURUM.email),renk:RENKLER[0]};

  const {data:uy,error:e2}=await sb.from('masa_uyeleri')
    .select('rol,durum,masa_id,masalar(id,ad,emoji,kod,kuran_id,ayar)')
    .eq('profil_id',OTURUM.id);
  if(e2) throw e2;
  UYELIKLER=(uy||[]).filter(u=>u.masalar);

  const onayli=UYELIKLER.filter(u=>u.durum==='onayli');
  DB.gruplar=onayli.map(u=>({id:u.masalar.id,ad:u.masalar.ad,emoji:u.masalar.emoji||'🍀',
                             kod:u.masalar.kod,kuran:u.masalar.kuran_id,rol:u.rol,
                             ayar:u.masalar.ayar||{},uyeler:[]}));
  if(!DB.gruplar.length){
    DB.oyuncular=[];DB.celseler=[];DB.iddialar=[];DB.akis=[];
    DB.haftalar=[];DB.karsilasmalar=[];DB.tahminler=[];
    DB.acik=[];DB.aktif=null;DB.aktifGrup=null;DB.ben=null;SECILI_MAC=null;
    BEKLEYENLER=[];MASA_UYELERI=[];
    return;
  }
  const kayitli=localStorage.getItem('kkd_aktif_masa');
  if(!DB.gruplar.some(g=>g.id===DB.aktifGrup))
    DB.aktifGrup = DB.gruplar.some(g=>g.id===kayitli) ? kayitli : DB.gruplar[0].id;
  localStorage.setItem('kkd_aktif_masa',DB.aktifGrup);

  const masaIds=DB.gruplar.map(g=>g.id);
  const [oyn,mac,idd,akm,hft,krs,thm]=await Promise.all([
    sb.from('oyuncular').select('*').in('masa_id',masaIds),
    sb.from('maclar').select('id,masa_id,bitti,tarih,tabelaci_id,olusturma,celse').in('masa_id',masaIds)
      .order('tarih',{ascending:false}).order('olusturma',{ascending:false}),
    sb.from('iddialar').select('*').in('masa_id',masaIds),
    sb.from('akis').select('id,masa_id,tip,yazan_id,metin,veri,olusturma,yanit_id,akis_tepkileri(profil_id,emoji)')
      .eq('masa_id',DB.aktifGrup).order('olusturma',{ascending:false}).limit(300),
    /* tahmin yarismasi: hafta/karsilasma/tahmin. Tablolar henuz kurulmamis
       olabilir (yama 08) — hata firlatmiyoruz, bos gecmesi yeter. */
    sb.from('haftalar').select('*').in('masa_id',masaIds).order('olusturma',{ascending:false}),
    sb.from('karsilasmalar').select('*'),
    sb.from('tahminler').select('*')
  ]);
  if(oyn.error) throw oyn.error;
  if(mac.error) throw mac.error;
  if(idd.error) throw idd.error;
  /* Akış olmasa da uygulama ayakta kalsın: yama 04 henüz çalıştırılmadıysa
     yanit_id sütunu yoktur, burada patlayıp bütün ekranı düşürmesin. */
  if(akm.error) console.warn('akış okunamadı:', akm.error.message);

  /* Pasif oyuncular da yüklenir — yoksa eski maçlarda adları "?" görünür.
     Yeni maça yalnız aktif olanlar seçilebilir (g.uyeler). */
  DB.oyuncular=(oyn.data||[]).map(o=>({id:o.id,ad:o.ad,foto:o.foto_url||null,dogum:o.dogum||null,
                                       renk:o.renk||'#C9A227',profilId:o.profil_id,masaId:o.masa_id,
                                       aktif:o.aktif!==false}));
  DB.gruplar.forEach(g=>g.uyeler=DB.oyuncular.filter(o=>o.masaId===g.id&&o.aktif).map(o=>o.id));

  DB.celseler=[]; DB.acik=[];
  (mac.data||[]).forEach(m=>{
    /* _sira: aynı gün oynanan maçların gerçek sırası. Sıralamada id (UUID)
       kullanılırsa "üst üste 3 galibiyet" gibi seriler yanlış çıkar. */
    const c=Object.assign({},m.celse||{},
      {id:m.id,grupId:m.masa_id,bitti:!!m.bitti,tarih:m.tarih,_hesap:m.tabelaci_id,
       _sira:m.olusturma||''});
    norm(c);
    if(m.bitti) DB.celseler.push(c);
    else if(m.masa_id===DB.aktifGrup) DB.acik.push(c);
  });
  /* açık masalar açılış sırasına göre: "1. Masa" hep üstte kalsın */
  DB.acik.sort((a,b)=>String(a._sira).localeCompare(String(b._sira)));
  DB.aktif = DB.acik.find(c=>c.id===SECILI_MAC) || null;
  if(!DB.aktif) SECILI_MAC=null;

  DB.iddialar=(idd.data||[]).map(i=>({id:i.id,grupId:i.masa_id,tarih:i.tarih,vade:i.vade||'',
    kim:i.kim_id,kime:i.kime_id,metin:i.metin,bahis:i.bahis||'',durum:i.durum,
    sonucNot:i.sonuc_not||'',kapanis:i.kapanis||''}));

  DB.akis=(akm.error?[]:(akm.data||[])).map(a=>({id:a.id,grupId:a.masa_id,tip:a.tip,yazanId:a.yazan_id,
    metin:a.metin,veri:a.veri||{},olusturma:a.olusturma,yanitId:a.yanit_id,
    tepkiler:(a.akis_tepkileri||[]).map(t=>({profilId:t.profil_id,emoji:t.emoji}))}));

  DB.haftalar=(hft&&!hft.error?(hft.data||[]):[]).map(h=>({id:h.id,masaId:h.masa_id,ad:h.ad,
    kapandi:!!h.kapandi,olusturan:h.olusturan,olusturma:h.olusturma}));
  DB.karsilasmalar=(krs&&!krs.error?(krs.data||[]):[]).map(k=>({id:k.id,haftaId:k.hafta_id,sira:k.sira,
    ev:k.ev,deplasman:k.deplasman,baslangic:k.baslangic,evSkor:k.ev_skor,depSkor:k.dep_skor}));
  DB.tahminler=(thm&&!thm.error?(thm.data||[]):[]).map(t=>({karsilasmaId:t.karsilasma_id,
    profilId:t.profil_id,ev:t.ev,dep:t.dep}));

  const g=grup(DB.aktifGrup)||{};
  /* ÖNCE saklanan ayarın tamamı kopyalanır, SONRA bildiğimiz alanlar
     normalleştirilir. Yalnız bilinen alanlar okunursa (eski hâl) geri
     kalanlar bellekten düşüyor ve ayarı bütün olarak yazan ilk işlem
     onları BULUTTAN DA siliyordu — lakaplar tam bu yüzden kayboluyordu. */
  DB.ayar=Object.assign({}, g.ayar||{}, {
    batak:Object.assign({},VARSAYILAN_AYAR.batak,(g.ayar||{}).batak||{}),
    yz:   Object.assign({},VARSAYILAN_AYAR.yz,   (g.ayar||{}).yz   ||{}),
    bahis:(g.ayar||{}).bahis||VARSAYILAN_AYAR.bahis,
    efsaneler:(g.ayar||{}).efsaneler||[],
    lakaplar:(g.ayar||{}).lakaplar||{},
    sampiyonlar:(g.ayar||{}).sampiyonlar||[]
  });
  if((g.ayar||{}).yerler) DB.ayar.yerler=g.ayar.yerler;
  DB.ben = DB.oyuncular.find(o=>o.masaId===DB.aktifGrup&&o.profilId===OTURUM.id)?.id || null;

  BEKLEYENLER=[]; MASA_UYELERI=[];
  const akt=UYELIKLER.find(u=>u.masa_id===DB.aktifGrup);
  if(akt){
    const {data:uyeler}=await sb.from('masa_uyeleri')
      .select('rol,durum,profil_id,profiller(id,ad,foto_url,renk)').eq('masa_id',DB.aktifGrup);
    MASA_UYELERI=(uyeler||[]).filter(u=>u.durum==='onayli');
    if(akt.rol==='kurucu') BEKLEYENLER=(uyeler||[]).filter(u=>u.durum==='bekliyor');
  }
}

/* --------- açık tabelayı buluta yazma ---------
   Prototipte kaydet() localStorage'a yazıyordu; burada AÇIK MAÇI buluta
   yazar. Ayar / oyuncu / iddia gibi kayıtların kendi fonksiyonları var. */
let _yazZaman=null, _yazSira=Promise.resolve(), _bekleyenYazi=false;
function kaydet(){
  if(!DB.aktif) return;
  if(!tabelaciMiyim()) return;          // yazma hakkı yoksa buluta gitmeye çalışma
  /* Talik edilmiş masaya sayı yazılıyorsa ara fiilen bitmiştir */
  if(DB.aktif.talik) talikKendiCozuldu(DB.aktif);
  /* Yerel ayna + bıkmayan yeniden deneme f_dayanikli.js'te.
     Buradaki gövde onun için duruyor; celseKaydet varsa o kullanılıyor. */
  if(MISAFIR) return misafirKaydet();
  if(typeof celseKaydet==='function') return celseKaydet();
  _bekleyenYazi=true; yazIsigi();
  clearTimeout(_yazZaman);
  _yazZaman=setTimeout(aktifYaz,450);
}
function aktifBelge(c){
  const g=JSON.parse(JSON.stringify(c));
  ['id','grupId','bitti','_hesap'].forEach(k=>delete g[k]);
  return g;
}
function aktifYaz(){
  if(typeof celseYaz==='function') return celseYaz();
  const c=DB.aktif;
  if(!c||!tabelaciMiyim()){ _bekleyenYazi=false; yazIsigi(); return _yazSira; }
  _yazSira=_yazSira.then(async()=>{
    const {error}=await sb.from('maclar').update({
      celse:aktifBelge(c), tarih:c.tarih||bugun(),
      parti_hedef:Math.min(5,Math.max(1,c.partiHedef||1)), giris:c.giris, yer:c.yer||null
    }).eq('id',c.id);
    if(error) toast(hataMetni(error),true);
  }).catch(e=>toast(hataMetni(e),true))
    .then(()=>{ _bekleyenYazi=false; yazIsigi(); });
  return _yazSira;
}
function yazIsigi(){
  const n=document.getElementById('yazDurum');
  if(n) n.textContent=_bekleyenYazi?'yazılıyor…':'';
}

async function yenile(sessiz){
  try{
    await verileriGetir();
    if(typeof aynaTemizle==='function') aynaTemizle();
    DURUM = DB.gruplar.length ? 'hazir' : 'masayok';
    render();
    if(!sessiz) toast('Güncellendi');
  }catch(e){ if(!sessiz) toast(hataMetni(e),true); }
}

/* --------- canlı yayın ---------
   Tabelacıysam kendi yazdığımı geri çekmem; yazarken ekranım sıfırlanmasın. */
let _yenileZaman=null;
/* CANLI YAYIN — masadaki herkesin eklediği her şey kendiliğinden gelsin.
   Dinlenen tablolar, Supabase'de de yayına ekli olmalı (bkz. yama 06);
   biri eksikse o değişiklik hiç ulaşmaz. */
function kanalKur(){
  if(!DB.aktifGrup) return;
  if(KANAL){ sb.removeChannel(KANAL); KANAL=null; }
  const f='masa_id=eq.'+DB.aktifGrup;          // masaya bağlı tablolar
  const fId='id=eq.'+DB.aktifGrup;             // masalar tablosunun kendisi

  const olay=()=>{
    /* Kendi yazım havadaysa bekle — yoksa gecikmeli yazı geri alınmış görünür. */
    if(_bekleyenYazi) return;
    /* AÇIK TABELAM varsa dokunma: yenileme DB.aktif'i değiştirir, yazdığım
       eller uçar. Tabelacı olmam tek başına engel değil; ekranda olmam engel. */
    if(DB.aktif && tabelaciMiyim()) return;
    /* Form/pencere açıkken yenileme, kullanıcının yazdığı gider. */
    if(document.getElementById('modalHost')?.innerHTML) return;
    clearTimeout(_yenileZaman);
    _yenileZaman=setTimeout(()=>yenile(true),700);
  };

  KANAL=sb.channel('masa_'+DB.aktifGrup)
    .on('postgres_changes',{event:'*',schema:'public',table:'akis',        filter:f},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'maclar',      filter:f},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'iddialar',    filter:f},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'oyuncular',   filter:f},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'masa_uyeleri',filter:f},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'masalar',     filter:fId},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'haftalar',    filter:f},olay)
    /* karsilasmalar/tahminler masa_id tasimadigi icin suzulemez;
       hafta uzerinden bagli olduklari icin genel dinleniyorlar. */
    .on('postgres_changes',{event:'*',schema:'public',table:'karsilasmalar'},olay)
    .on('postgres_changes',{event:'*',schema:'public',table:'tahminler'},olay)
    .subscribe();
}
