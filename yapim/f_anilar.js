//== anilar
/* =========================================================
   ANILAR ALBÜMÜ — grubun fotoğraf hafızası

   İstek (kullanıcı, 03.09.2026): arkadaş grubu için anılar albümü.

   Akışta paylaşılan bütün fotoğraflar (veri.foto) tek bir ızgarada
   toplanır: pankart, doğum günü, masa. Ayrı depo yok — akış zaten
   kaynak; burada yalnız fotoğraflıları süzüp galeriye diziyoruz.
   Doğrudan albüme fotoğraf da eklenir (akışa foto'lu mesaj olarak
   düşer, herkes görür).
   ========================================================= */

function anilarFotolari(){
  return (DB.akis||[])
    .filter(a=>a.grupId===DB.aktifGrup && a.veri && a.veri.foto)
    .sort((a,b)=>String(b.olusturma).localeCompare(String(a.olusturma)));
}

function anilarKart(){
  const f=anilarFotolari();
  const ekle=`<div class="card">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div><h3 style="margin:0">📸 Anılar</h3>
        <div class="xs dim">Masanın hafızası. Paylaşılan her fotoğraf burada toplanır.</div></div>
      <button class="btn-b btn-sm" style="flex-shrink:0" onclick="anilarEkle()">+ Fotoğraf</button>
    </div>
    <input type="file" id="anFotoInp" accept="image/*" style="display:none" onchange="anilarFotoSec(this)">
    <div id="anOnizle"></div>
  </div>`;

  if(!f.length) return ekle+`<div class="card"><div class="empty">
    <div class="big">🖼️</div>Henüz anı yok.
    <div class="sm" style="margin-top:6px">İlk fotoğrafı ekle; masanın albümü buradan başlasın.</div></div></div>`;

  return ekle+`<div class="card">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">
      ${f.map(a=>`<div style="position:relative;aspect-ratio:1;cursor:pointer"
        onclick="fotoBuyut('${esc(a.veri.foto)}')">
        <img src="${esc(a.veri.foto)}" loading="lazy"
          style="width:100%;height:100%;object-fit:cover;border-radius:8px">
        ${a.metin?`<div style="position:absolute;left:0;right:0;bottom:0;padding:4px 6px;
          background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;font-size:10px;
          border-radius:0 0 8px 8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(a.metin)}</div>`:''}
      </div>`).join('')}
    </div>
    <div class="xs dim center" style="margin-top:9px">${f.length} anı · fotoğrafa dokun, büyüsün</div>
  </div>`;
}

/* Albüme doğrudan foto ekleme — akışa foto'lu mesaj olarak yazar */
let _anFotoData=null, _anFotoBlob=null;
function anilarEkle(){ document.getElementById('anFotoInp')?.click(); }
function anilarFotoSec(inp){
  const f=inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ const im=new Image();
    im.onload=()=>{
      const enb=1200, o=Math.min(1,enb/Math.max(im.width,im.height));
      const w=Math.round(im.width*o), h=Math.round(im.height*o);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(im,0,0,w,h);
      _anFotoData=cv.toDataURL('image/jpeg',.82);
      cv.toBlob(b=>{_anFotoBlob=b;},'image/jpeg',.82);
      const el=$('#anOnizle'); if(el) el.innerHTML=`
        <div style="margin-top:10px"><img src="${_anFotoData}"
          style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--line)"></div>
        <input id="anNot" maxlength="80" placeholder="Bir not… (isteğe bağlı)" style="margin-top:8px">
        <div class="two" style="margin-top:8px">
          <button class="btn-p btn-sm" id="anBtn" onclick="anilarKaydet()">Albüme Ekle</button>
          <button class="btn-gh btn-sm" onclick="anilarVaz()">Vazgeç</button>
        </div>`;
    }; im.src=r.result; };
  r.readAsDataURL(f); inp.value='';
}
function anilarVaz(){ _anFotoData=null; _anFotoBlob=null; const el=$('#anOnizle'); if(el) el.innerHTML=''; }
async function anilarKaydet(){
  if(!_anFotoBlob) return;
  const not=($('#anNot')?.value||'').trim();
  const btn=$('#anBtn'); if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }
  try{
    const yol=`masa/${DB.aktifGrup}/anilar/${OTURUM.id}_${Date.now()}.jpg`;
    const {error}=await sb.storage.from('avatarlar')
      .upload(yol,_anFotoBlob,{contentType:'image/jpeg',upsert:true});
    if(error) throw error;
    const url=sb.storage.from('avatarlar').getPublicUrl(yol).data.publicUrl;
    const id=await akisEkle('mesaj',not,{foto:url,anilar:true});
    if(!id) throw new Error('kaydedilemedi');
    anilarVaz(); render(); toast('Anı albüme eklendi',true);
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Albüme Ekle'; }
    toast('Eklenemedi: '+hataMetni(e),true);
  }
}
