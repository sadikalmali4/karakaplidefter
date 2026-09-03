//== push
/* =========================================================
   #1 PUSH BİLDİRİMİ — masa çağrısı telefonlara düşsün

   İki parça sunucuda (senin Supabase'inde kurulacak):
     · push_abonelikleri tablosu (yama 13)
     · bildirim-gonder Edge Function (VAPID ile şifreli push atar)
   Bu dosya İSTEMCİ tarafı:
     · pushDurum(): tarayıcı destekliyor mu, izin var mı, abone mi
     · pushAc(): izin ister, PushManager'a abone olur, aboneliği tabloya yazar
     · pushKapat(): aboneliği iptal eder
     · pushCagriGonder(): çağrı atılınca Edge Function'ı tetikler

   VAPID public key aşağıda (private key Edge Function'da secret). Sunucu
   yoksa Ayarlar'daki bildirim kartı "kurulum bekliyor" der; hiçbir şey
   bozulmaz.
   ========================================================= */

const VAPID_PUBLIC='BGmk0OslRwGU7rX2XANgiUlsnXCPI04kSvhxM5QLmWRk3jBMFf4c9M1mICVK9BF9FaeVQQr-7f5ajVGgEBLT0Ps';
const PUSH_FN='bildirim-gonder';          // Edge Function adı

function pushDestekli(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function b64uBuf(s){
  const pad='='.repeat((4-s.length%4)%4);
  const b=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...b].map(c=>c.charCodeAt(0)));
}

async function pushAbonelik(){
  if(!pushDestekli()) return null;
  const reg=await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function pushDurum(){
  if(!pushDestekli()) return {destek:false};
  const ab=await pushAbonelik();
  return {destek:true, izin:Notification.permission, abone:!!ab};
}

async function pushAc(){
  if(!pushDestekli()) return toast('Bu tarayıcı bildirim desteklemiyor',true);
  try{
    const izin=await Notification.requestPermission();
    if(izin!=='granted') return toast('Bildirim izni verilmedi',true);
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
    if(error) throw error;
    toast('Bildirimler açıldı — masa çağrısı telefonuna düşecek',true);
    render();
  }catch(e){
    const m=hataMetni(e);
    if(/relation|does not exist|table/i.test(m))
      return toast('Bildirim tablosu yok — yama 13 çalıştırılmalı',true);
    toast('Açılamadı: '+m,true);
  }
}

async function pushKapat(){
  try{
    const ab=await pushAbonelik();
    if(ab){ await sb.from('push_abonelikleri').delete().eq('endpoint',ab.endpoint); await ab.unsubscribe(); }
    toast('Bildirimler kapatıldı');
    render();
  }catch(e){ toast(hataMetni(e),true); }
}

/* Çağrı atılınca sunucuyu tetikle. Sunucu yoksa sessizce geçilir —
   çağrı akışa yine düşer, yalnız push gitmez. */
async function pushCagriGonder(metin,cagriId){
  try{
    await sb.functions.invoke(PUSH_FN,{ body:{
      masa_id:DB.aktifGrup, gonderen:OTURUM.id,
      baslik:(aktifGrup()?.ad||'Masa')+' · Çağrı',
      govde:metin,
      url:location.origin+location.pathname+(cagriId?('?cagri='+cagriId):'')
    }});
  }catch(e){ /* Edge Function yoksa/erişilemezse sorun değil */ }
}

/* Ayarlar kartı */
function pushKart(durum){
  if(!durum.destek) return `<div class="card"><h3>🔔 Bildirim</h3>
    <div class="xs dim">Bu tarayıcı/uygulama bildirim desteklemiyor.
      iPhone'da: uygulamayı <b>ana ekrana ekle</b>, oradan aç; bildirim öyle çalışır.</div></div>`;
  const acik=durum.abone&&durum.izin==='granted';
  return `<div class="card"><h3>🔔 Bildirim</h3>
    <div class="xs dim" style="margin-bottom:10px">Masa çağrısı (📣) atıldığında,
      uygulama kapalı olsa bile telefonuna bildirim düşer.</div>
    ${durum.izin==='denied'?`<div class="uyari">Bildirime izin engellenmiş. Tarayıcı ayarlarından
      bu site için bildirimi tekrar açman gerekir.</div>`
     :acik?`<button class="btn-gh btn-full btn-sm" onclick="pushKapat()">Bildirimleri Kapat</button>
       <div class="xs dim" style="margin-top:6px">Açık. Bu cihaza çağrı bildirimi gelir.</div>`
     :`<button class="btn-p btn-full btn-sm" onclick="pushAc()">Bildirimleri Aç</button>`}
  </div>`;
}
