/* =========================================================
   BİLDİRİM: "herkes ayrı ayrı açmasın, açık olsun"

   YAPILAMAYAN: bildirimi başkası adına açmak. Tarayıcı iznini yalnız
   o cihazın sahibi verebilir — ne sunucu, ne kurucu, ne kod. Böyle
   olması iyi: yoksa herkes izinsiz bildirim yağdırırdı.

   YAPILAN: kimsenin aramasına gerek kalmıyor.
     1. İzin ZATEN varsa → hiç sormadan sessizce abone olur.
     2. İzin yoksa → Masa ve Akış sekmesinin TEPESİNDE tek dokunuşluk
        şerit çıkar. Ayarlar'a girmek gerekmiyor.
     3. Reddedilmişse → şerit "tarayıcı ayarından aç" der ve susar
        (ısrar etmek yasak; tarayıcı da bir daha sormaz).
     4. iPhone'da bildirim ancak uygulama ANA EKRANA eklenirse çalışır;
        şerit bunu söyler, boşuna izin istemez.

   Neden kendiliğinden sormuyoruz: izin isteği kullanıcı dokunuşu
   olmadan iOS'ta reddedilir, Chrome'da da "spam" sayılıp kalıcı
   engellenebilir. Bir dokunuş, sonsuza kadar engellenmekten iyidir.
   ========================================================= */

let PUSH_DURUM=null;        // {destek,izin,abone} — render şeridi buna bakar
let PUSH_SERIT_KAPALI=false; // kullanıcı şeridi kapattıysa bu oturumda gösterme

const iosMu=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const anaEkrandaMi=()=>window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone===true;

/* Girişten sonra bir kez: izin varsa sessizce abone ol, durumu öğren. */
async function pushHazirla(){
  if(!pushDestekli()){ PUSH_DURUM={destek:false}; return; }
  try{
    PUSH_DURUM=await pushDurum();
    /* İzin verilmiş ama bu cihaz aboneliği yoksa (uygulama silinip
       yeniden kurulmuş, önbellek temizlenmiş) — sormadan tamamla. */
    if(PUSH_DURUM.izin==='granted' && !PUSH_DURUM.abone){
      await pushAboneOl(true);
      PUSH_DURUM=await pushDurum();
    }
  }catch(e){ PUSH_DURUM={destek:false}; }
}

/* pushAc()'ın izin istemeyen hâli: izin zaten varken abone eder. */
async function pushAboneOl(sessiz){
  const reg=await navigator.serviceWorker.ready;
  let ab=await reg.pushManager.getSubscription();
  if(!ab){
    ab=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:b64uBuf(VAPID_PUBLIC)
    });
  }
  const j=ab.toJSON();
  const {error}=await sb.from('push_abonelikleri').upsert({
    profil_id:OTURUM.id, masa_id:DB.aktifGrup,
    endpoint:ab.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth
  },{onConflict:'endpoint'});
  if(error&&!sessiz) toast(hataMetni(error),true);
  return !error;
}

/* Masa/Akış tepesindeki şerit — tek dokunuş. */
function pushSerit(){
  if(PUSH_SERIT_KAPALI) return '';
  const d=PUSH_DURUM;
  if(!d) return '';                                  // henüz ölçülmedi
  if(d.destek && d.izin==='granted' && d.abone) return '';   // her şey yolunda

  /* iPhone'da ana ekrana eklenmeden bildirim hiç çalışmıyor */
  if(iosMu() && !anaEkrandaMi())
    return `<div class="uyari" style="margin-bottom:12px">
      🔔 <b>Bildirim için uygulamayı ana ekrana ekle.</b>
      Safari'de <b>Paylaş → Ana Ekrana Ekle</b> deyip oradan aç; masa çağrısı
      o zaman telefonuna düşer. iPhone başka yolla bildirim vermiyor.
      <div style="margin-top:8px"><button class="btn-xs btn-gh" onclick="pushSeritKapat()">Şimdi değil</button></div>
    </div>`;

  if(!d.destek)
    return `<div class="card tight xs dim" style="margin-bottom:12px">
      🔔 Bu tarayıcı bildirim desteklemiyor. Masa çağrısını akıştan görürsün.
      <button class="btn-xs btn-gh" style="margin-left:6px" onclick="pushSeritKapat()">Tamam</button></div>`;

  if(d.izin==='denied')
    return `<div class="card tight" style="margin-bottom:12px">
      <div class="xs dim">🔔 Bildirim bu site için engellenmiş. Tarayıcı ayarlarından
        (adres çubuğundaki kilit → Bildirimler → İzin ver) açman gerekiyor; uygulama
        bir daha soramaz.</div>
      <button class="btn-xs btn-gh" style="margin-top:7px" onclick="pushSeritKapat()">Anladım</button></div>`;

  return `<div class="uyari" style="margin-bottom:12px">
    🔔 <b>Bildirimler kapalı.</b> Aç ki masa çağrısı, uygulama kapalıyken de telefonuna düşsün.
    <div class="row" style="margin-top:9px;gap:7px">
      <button class="btn-g btn-sm" onclick="pushSeritAc()">Bildirimleri Aç</button>
      <button class="btn-xs btn-gh" onclick="pushSeritKapat()">Şimdi değil</button>
    </div></div>`;
}
function pushSeritKapat(){ PUSH_SERIT_KAPALI=true; render(); }
async function pushSeritAc(){
  await pushAc();
  PUSH_DURUM=await pushDurum().catch(()=>PUSH_DURUM);
  render();
}
