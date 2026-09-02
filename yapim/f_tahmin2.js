/* =========================================================
   TAHMİN YARIŞMASI — eylemler
   Fikstür YAPIŞTIRILARAK giriliyor: dış servise, API anahtarına ve
   kotaya bağımlılık yok. Anahtar statik sayfada saklanamaz zaten.
   ========================================================= */

/* ---------------- fikstür ayrıştırıcı ----------------
   Tanıdığı biçimler (satır başına bir maç):
     Cts 20:00 Fenerbahçe - Beşiktaş
     06.09 20:00  Galatasaray - Trabzonspor
     2026-09-06 22:00 Real Madrid vs Galatasaray
     20:00 Fenerbahçe-Beşiktaş
   Gün adı yazılmışsa bu haftanın o gününe denk getirilir.        */
const GUNLER={paz:0,pzt:1,pts:1,sal:2,car:3,'çar':3,per:4,cum:5,cts:6,cmt:6,
              pazar:0,pazartesi:1,sali:2,'salı':2,carsamba:3,'çarşamba':3,
              persembe:4,'perşembe':4,cuma:5,cumartesi:6};

const GUN_DESEN=/\b(pzt|pts|sal|çar|car|per|cum|cts|cmt|paz|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)\b/i;

/* Sıra önemli: ÖNCE tarih ayrılır, SONRA saat aranır.
   Tersi yapılınca "06.09 22:00" satırında 06.09 saat sanılıyor ve
   22:00 takım adına karışıyordu — yaşanan hata buydu.
   Ayırt etme kuralı: ':' varsa o kesin saattir; "gg.aa" ise ay 1-12
   olmak zorunda, yani "20.00" (ay=00) tarih olamaz, saattir. */
function fiksturAyristir(metin){
  const cikti=[], hata=[];
  const bugun=new Date();

  String(metin||'').split(/\r?\n/).forEach(ham=>{
    const asil=ham.trim(); if(!asil) return;
    let s=asil, d=null, saat=null, dk=null, tarihYazili=false;
    const cikar=x=>{ s=s.replace(x,' '); };

    /* 1) ISO tarih: 2026-09-06 */
    let m=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m){ d=new Date(+m[1],+m[2]-1,+m[3]); tarihYazili=true; cikar(m[0]); }

    /* 2) ':' ayraçlı saat — tereddütsüz saattir */
    m=s.match(/(\d{1,2}):(\d{2})/);
    if(m && +m[1]<=23 && +m[2]<=59){ saat=+m[1]; dk=+m[2]; cikar(m[0]); }

    /* 3) gg.aa[.yyyy] — ay 1-12 olmalı, yoksa tarih değildir */
    if(!d){
      m=s.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/);
      if(m && +m[1]>=1 && +m[1]<=31 && +m[2]>=1 && +m[2]<=12){
        const yil=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):bugun.getFullYear();
        d=new Date(yil,+m[2]-1,+m[1]); tarihYazili=true; cikar(m[0]);
      }
    }

    /* 4) saat hâlâ yoksa nokta ile yazılmış olabilir: 20.00 */
    if(saat===null){
      m=s.match(/\b(\d{1,2})[.](\d{2})\b/);
      if(m && +m[1]<=23 && +m[2]<=59){ saat=+m[1]; dk=+m[2]; cikar(m[0]); }
    }
    if(saat===null){ hata.push(asil); return; }

    /* 5) tarih yoksa gün adına bak: bu haftanın o günü (geçtiyse sonraki) */
    const g=s.match(GUN_DESEN);
    if(!d && g){
      const gi=GUNLER[g[1].toLocaleLowerCase('tr-TR')];
      if(gi!==undefined){
        d=new Date(bugun);
        d.setDate(bugun.getDate()+((gi-bugun.getDay()+7)%7));
      }
    }
    if(g) cikar(g[0]);
    if(!d) d=new Date(bugun);
    d.setHours(saat,dk,0,0);
    /* Sadece saat yazılmışsa ve o saat geçmişse yarını kastediyordur */
    if(!tarihYazili && !g && d.getTime()<Date.now()) d.setDate(d.getDate()+1);

    /* 6) takımlar */
    const kalan=s.replace(/\s+/g,' ').trim();
    const t2=takimlariAyir(kalan);
    if(!t2){ hata.push(asil); return; }
    const ev=t2[0], dep=t2[1];
    cikti.push({ev,deplasman:dep,baslangic:d.toISOString()});
  });
  return {mac:cikti,hata};
}

/* ---- takım adlarını ayırma ----
   Ayraç (v / vs / - / x) varsa iş kolay. Fikstür sitelerinden kopyalanan
   satırlarda ayraç OLMUYOR: "04.09.2026 20:00 Başakşehir Galatasaray".
   O zaman kelimeleri ikiye bölmek gerekiyor ve tek doğru cevap yok:
   "Sporting CP Galatasaray" 2+1, "Liverpool Atletico Madrid" 1+2.

   Kural: kelime sayısı çiftse yarı yarıya. Tekse fazlalık EV sahibine
   gider; ancak son kelime bir takım adının İKİNCİ parçası olabilecek
   kelimelerdense (Madrid, City, United...) fazlalık deplasmana geçer.
   Sonuç her hâlükârda önizlemede gösteriliyor; yanlışsa satıra "v"
   koymak yeter. */
const IKINCI_PARCA=new Set(['madrid','city','united','munih','münih','munich','villa',
  'prag','praha','donetsk','leipzig','bilbao','brugge','bruges','atina','linz','wien',
  'zagreb','belgrad','bratislava','betis','sofya','moskova','kiev','lizbon','lisbon',
  'dortmund','eindhoven','glimt','sociedad','graz','salzburg','pilsen','plzen',
  'hoffenheim','leverkusen','frankfurt','mönchengladbach','bremen',
  'sofia','pireus','pire','selanik','saraybosna','skopje','tiran','baku','bakü']);

function takimlariAyir(kalan){
  const temiz=x=>String(x||'').trim().replace(/^[-–—|\s]+|[-–—|\s]+$/g,'');

  /* a) açık ayraç */
  const ayrac=kalan.split(/\s+(?:vs\.?|v|x|-|–|—|\|)\s+|(?<=\S)\s*[–—|]\s*(?=\S)/i);
  if(ayrac.length>=2){
    const a=temiz(ayrac[0]), b=temiz(ayrac.slice(1).join(' '));
    if(a&&b) return [a,b];
  }
  /* b) tireli ama boşluksuz: "Fenerbahçe-Beşiktaş" */
  if(/\S-\S/.test(kalan)){
    const i=kalan.indexOf('-');
    const a=temiz(kalan.slice(0,i)), b=temiz(kalan.slice(i+1));
    if(a&&b) return [a,b];
  }
  /* c) ayraçsız: kelimeleri böl */
  const k=kalan.split(/\s+/).filter(Boolean);
  if(k.length<2) return null;
  let evSay=Math.ceil(k.length/2);
  if(k.length%2===1 && IKINCI_PARCA.has(k[k.length-1].toLocaleLowerCase('tr-TR')))
    evSay=Math.floor(k.length/2);
  const a=temiz(k.slice(0,evSay).join(' ')), b=temiz(k.slice(evSay).join(' '));
  return (a&&b)?[a,b]:null;
}

/* ---------------- hafta ---------------- */
function haftaAc(){
  if(!kurucuMu()) return toast('Haftayı yalnız masayı kuran açar',true);
  const n=haftalar().length+1;
  acModal(`<h2 class="serif" style="margin:0 0 4px">Tahmin Haftası Aç</h2>
    <div class="xs dim" style="margin-bottom:14px">Haftanın maçlarını herhangi bir yerden kopyalayıp
      yapıştır; uygulama ayrıştırır. Tahminler açık olur, maç başlayınca kilitlenir.</div>
    <div class="field"><label class="fl">Hafta adı</label>
      <input id="hfAd" value="${n}. Hafta" maxlength="60"></div>
    <div class="field"><label class="fl">Maçlar <span style="text-transform:none;letter-spacing:0">(satır başına bir maç)</span></label>
      <textarea id="hfMac" rows="7" placeholder="Cts 20:00  Fenerbahçe - Beşiktaş
Paz 19:00  Galatasaray - Trabzonspor
06.09 22:00  Real Madrid - Galatasaray"></textarea>
      <div class="xs dim" style="margin-top:6px">Gün adı, tarih (06.09 · 04.09.2026 · 2026-09-06) ve saat tanınır.
        Takımları ayırmasan da okur; <b>v</b> ya da <b>-</b> koyarsan kesin olur.</div></div>

    <details style="margin-top:4px"><summary>➕ Maçı elle ekle (tarihi kendin seç)</summary><div>
      <div class="xs dim" style="margin:8px 0">Ayrıştırıcı bir satırı yanlış okuduysa burada tek tek girip
        listeye eklersin; yukarıdaki metne düzgün biçimde yazılır.</div>
      <div class="two">
        <div><label class="fl">Tarih</label><input type="date" id="elTarih" value="${bugun()}"></div>
        <div><label class="fl">Saat</label><input type="time" id="elSaat" value="20:00"></div>
      </div>
      <div class="two" style="margin-top:9px">
        <div><label class="fl">Ev sahibi</label><input id="elEv" maxlength="40" placeholder="Fenerbahçe"></div>
        <div><label class="fl">Deplasman</label><input id="elDep" maxlength="40" placeholder="Beşiktaş"></div>
      </div>
      <button class="btn-b btn-full btn-sm" style="margin-top:10px" onclick="elleMacEkle()">Listeye Ekle</button>
    </div></details>

    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="fiksturDene()">Ayrıştırmayı Göster</button>
    <div id="hfOnizleme"></div>
    <button class="btn-p btn-full" id="hfBtn" style="margin-top:12px" onclick="haftaKaydet()">Haftayı Aç</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}
/* Elle girilen maçı metin alanına KANONİK biçimde yazar; ayrıştırıcı
   kendi satırını her zaman doğru okur. */
function elleMacEkle(){
  const t=$('#elTarih')?.value, sa=$('#elSaat')?.value||'20:00';
  const ev=($('#elEv')?.value||'').trim(), dep=($('#elDep')?.value||'').trim();
  if(!t) return toast('Tarih seç',true);
  if(!ev||!dep) return toast('İki takımı da yaz',true);
  const ta=$('#hfMac'); if(!ta) return;
  const satir=`${t} ${sa} ${ev} v ${dep}`;
  ta.value=(ta.value.trim()?ta.value.replace(/\s*$/,'')+'\n':'')+satir;
  $('#elEv').value=''; $('#elDep').value=''; $('#elEv').focus();
  fiksturDene();
  toast(`${ev} – ${dep} eklendi`);
}

function fiksturDene(){
  const r=fiksturAyristir($('#hfMac').value);
  const k=$('#hfOnizleme');
  k.innerHTML=`<div class="card tight" style="margin-top:10px;background:var(--panel2)">
    ${r.mac.length?`<div class="xs dim" style="margin-bottom:6px">${r.mac.length} maç okundu:</div>
      ${r.mac.map(m=>`<div class="sm" style="padding:2px 0">${esc(m.ev)} – ${esc(m.deplasman)}
        <span class="xs dim">· ${saatMetni(m.baslangic)}</span></div>`).join('')}`
     :'<div class="sm dim">Hiç maç okunamadı.</div>'}
    ${r.hata.length?`<div class="xs" style="color:#DD8A8A;margin-top:8px">Anlaşılmayan satırlar:
      ${r.hata.map(x=>esc(x)).join(' / ')}</div>`:''}
  </div>`;
}
async function haftaKaydet(){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const ad2=$('#hfAd').value.trim();
  if(!ad2) return toast('Hafta adı gerekli',true);
  const r=fiksturAyristir($('#hfMac').value);
  if(!r.mac.length) return toast('Hiç maç okunamadı — "Ayrıştırmayı Göster" ile bak',true);
  const btn=$('#hfBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  try{
    const {data:h,error}=await sb.from('haftalar')
      .insert({masa_id:DB.aktifGrup,ad:ad2,olusturan:OTURUM.id}).select().single();
    if(error) throw error;
    const {error:e2}=await sb.from('karsilasmalar').insert(
      r.mac.map((m,i)=>({hafta_id:h.id,sira:i+1,ev:m.ev,deplasman:m.deplasman,baslangic:m.baslangic})));
    if(e2) throw e2;
    await akisEkle('mesaj',`${ad2} tahmin haftası açılmıştır. ${r.mac.length} maç için tahminler `+
      `maç başlangıcına kadar alınacaktır; tahminler açıktır, taraflar birbirini görür.`,{tahminHafta:h.id});
    TAHMIN_HAFTA=h.id;
    kapatModal(); await yenile(true);
    toast(`${ad2} açıldı, ${r.mac.length} maç girildi.`);
  }catch(e){ toast(hataMetni(e),true); btn.disabled=false; btn.textContent='Haftayı Aç'; }
}
async function haftaSil(hid){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const h=haftalar().find(x=>x.id===hid); if(!h) return;
  if(!confirm(`"${h.ad}" ve içindeki bütün maçlar ve tahminler silinsin mi?`)) return;
  const {error}=await sb.from('haftalar').delete().eq('id',hid);
  if(error) return toast(hataMetni(error),true);
  TAHMIN_HAFTA=null; await yenile(true); toast('Hafta silindi');
}

/* ---------------- maç ekle / sil / skor ---------------- */
function macEkleAc(hid){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Maç Ekle</h2>
    <div class="xs dim" style="margin-bottom:14px">Bu haftaya maç eklenir; yapıştırma biçimi aynı.</div>
    <div class="field"><label class="fl">Maçlar</label>
      <textarea id="hfMac" rows="5" placeholder="Cum 21:45  Beşiktaş - Fenerbahçe"></textarea></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:10px" onclick="fiksturDene()">Ayrıştırmayı Göster</button>
    <div id="hfOnizleme"></div>
    <button class="btn-p btn-full" id="hfBtn" style="margin-top:12px" onclick="macEkle('${hid}')">Ekle</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}
async function macEkle(hid){
  const r=fiksturAyristir($('#hfMac').value);
  if(!r.mac.length) return toast('Hiç maç okunamadı',true);
  const btn=$('#hfBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const bas=haftaMaclari(hid).length;
  const {error}=await sb.from('karsilasmalar').insert(
    r.mac.map((m,i)=>({hafta_id:hid,sira:bas+i+1,ev:m.ev,deplasman:m.deplasman,baslangic:m.baslangic})));
  if(error){ toast(hataMetni(error),true); btn.disabled=false; btn.textContent='Ekle'; return; }
  kapatModal(); await yenile(true); toast(`${r.mac.length} maç eklendi.`);
}
async function macSil(kid){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const k=(DB.karsilasmalar||[]).find(x=>x.id===kid); if(!k) return;
  if(!confirm(`${k.ev} – ${k.deplasman} maçı ve tahminleri silinsin mi?`)) return;
  const {error}=await sb.from('karsilasmalar').delete().eq('id',kid);
  if(error) return toast(hataMetni(error),true);
  await yenile(true); toast('Maç silindi');
}
function skorGirAc(kid){
  if(!kurucuMu()) return toast('Sonucu yalnız masayı kuran girer',true);
  const k=(DB.karsilasmalar||[]).find(x=>x.id===kid); if(!k) return;
  acModal(`<h2 class="serif" style="margin:0 0 4px">Maç Sonucu</h2>
    <div class="sm" style="margin-bottom:14px">${esc(k.ev)} – ${esc(k.deplasman)}
      <span class="xs dim">· ${saatMetni(k.baslangic)}</span></div>
    <div class="row" style="gap:8px;align-items:center;justify-content:center">
      <input type="number" id="skE" min="0" max="30" value="${k.evSkor??''}" placeholder="0"
        style="width:70px;text-align:center;font:600 20px Georgia,serif">
      <span class="dim">–</span>
      <input type="number" id="skD" min="0" max="30" value="${k.depSkor??''}" placeholder="0"
        style="width:70px;text-align:center;font:600 20px Georgia,serif">
    </div>
    <button class="btn-p btn-full" id="skBtn" style="margin-top:16px" onclick="skorKaydet('${kid}')">Kaydet</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}
async function skorKaydet(kid){
  const e=parseInt($('#skE').value,10), d=parseInt($('#skD').value,10);
  if(!Number.isInteger(e)||!Number.isInteger(d)||e<0||d<0) return toast('İki skoru da yaz',true);
  const btn=$('#skBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const {error}=await sb.from('karsilasmalar').update({ev_skor:e,dep_skor:d}).eq('id',kid);
  if(error){ toast(hataMetni(error),true); btn.disabled=false; btn.textContent='Kaydet'; return; }
  kapatModal(); await yenile(true); toast('Sonuç işlendi, puanlar güncellendi.');
}

/* ---------------- tahmin ---------------- */
/* sessiz=true: kutudan çıkınca kendiliğinden yazılır. Ekranı yeniden
   çizmez (yazarken odak kaçmasın), yanındaki küçük not güncellenir. */
async function tahminKaydet(kid,sessiz){
  const k=(DB.karsilasmalar||[]).find(x=>x.id===kid); if(!k) return;
  const not=(m,renk)=>{ const n=$(`#th-n-${kid}`); if(n){ n.textContent=m; n.style.color=renk; } };
  if(kilitli(k)){ await yenile(true); return toast('Maç başladı, tahmin kapandı.',true); }
  const e=parseInt($(`#th-e-${kid}`)?.value,10), d=parseInt($(`#th-d-${kid}`)?.value,10);
  if(!Number.isInteger(e)||!Number.isInteger(d)||e<0||d<0){
    if(sessiz){ not('iki sayıyı yaz','var(--dim)'); return; }
    return toast('İki skoru da yaz',true);
  }
  const eski=benimTahmin(kid);
  if(eski&&eski.ev===e&&eski.dep===d){ not('✓ kayıtlı','var(--green)'); return; }
  not('yazılıyor…','var(--dim)');
  const {error}=await tahminYaz(kid,e,d);
  if(error){
    /* kilit veritabanında: maç başladıysa kural engeller */
    if(/row-level security|violates/i.test(error.message||'')){
      await yenile(true); return toast('Maç başladı, tahmin kapandı.',true);
    }
    not('yazılamadı','var(--red)');
    return toast(hataMetni(error),true);
  }
  if(sessiz){
    /* yerel kaydı güncelle, ekranı çizmeden notu yeşile çevir */
    const yeni={karsilasmaId:kid,profilId:OTURUM.id,ev:e,dep:d};
    const i=(DB.tahminler||[]).findIndex(t=>t.karsilasmaId===kid&&t.profilId===OTURUM.id);
    if(i>=0) DB.tahminler[i]=Object.assign(DB.tahminler[i],yeni); else (DB.tahminler=DB.tahminler||[]).push(yeni);
    not('✓ kayıtlı','var(--green)');
    return;
  }
  await yenile(true);
  toast(`${k.ev} – ${k.deplasman}: ${e}–${d} yazıldı.`);
}

function tahminYaz(kid,e,d){
  return sb.from('tahminler')
    .upsert({karsilasma_id:kid,profil_id:OTURUM.id,ev:e,dep:d,guncelleme:new Date().toISOString()},
            {onConflict:'karsilasma_id,profil_id'});
}

/* Ekrandaki bütün açık maçların kutularını okuyup TEK istekte yazar. */
async function tahminHepsiniKaydet(hid){
  const acik=haftaMaclari(hid).filter(k=>!kilitli(k));
  const satir=[], atlanan=[];
  acik.forEach(k=>{
    const e=parseInt($(`#th-e-${k.id}`)?.value,10), d=parseInt($(`#th-d-${k.id}`)?.value,10);
    if(!Number.isInteger(e)||!Number.isInteger(d)||e<0||d<0){ atlanan.push(k); return; }
    satir.push({karsilasma_id:k.id,profil_id:OTURUM.id,ev:e,dep:d,guncelleme:new Date().toISOString()});
  });
  if(!satir.length) return toast('Kaydedilecek tahmin yok — skorları yaz',true);

  const btn=$('#thHepBtn');
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>'; }
  const {error}=await sb.from('tahminler').upsert(satir,{onConflict:'karsilasma_id,profil_id'});
  if(error){
    if(btn){ btn.disabled=false; btn.textContent='💾 Yazdıklarımın Hepsini Kaydet'; }
    if(/row-level security|violates/i.test(error.message||'')){
      await yenile(true);
      return toast('Bir maç bu arada başlamış olabilir; ekran yenilendi, kalanları tekrar dene.',true);
    }
    return toast(hataMetni(error),true);
  }
  await yenile(true);
  toast(`${satir.length} tahmin kaydedildi${atlanan.length?`, ${atlanan.length} maç boş bırakıldı`:''}.`,true);
}

/* ---------------- hafta zabıtı ---------------- */
function tahminZabtiUret(hid){
  const h=haftalar().find(x=>x.id===hid); if(!h) return '';
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const mac=haftaMaclari(hid), hp=haftaPuanlari(hid);
  const sirali=Object.entries(hp).sort((a,b)=>b[1].puan-a[1].puan||b[1].tam-a[1].tam);
  const L=[`${g.emoji||''} ${String(g.ad).toLocaleUpperCase('tr-TR')} — ${String(h.ad).toLocaleUpperCase('tr-TR')} TAHMİN ZABTI`,''];

  const bitmis=mac.filter(skorVar);
  if(bitmis.length){
    L.push('SONUÇLAR:');
    bitmis.forEach(k=>L.push(`  ${k.ev} ${k.evSkor}–${k.depSkor} ${k.deplasman}`));
    L.push('');
  }
  const bekleyen=mac.filter(k=>!skorVar(k));
  if(bekleyen.length){
    L.push(`SONUCU BEKLENEN: ${bekleyen.map(k=>`${k.ev}–${k.deplasman}`).join(', ')}.`);
    L.push('');
  }
  if(!sirali.length){ L.push('Henüz puanlanmış tahmin yok.'); return L.join('\n'); }

  L.push('SIRALAMA:');
  sirali.forEach(([pid,s],i)=>L.push(`  ${i+1}. ${profilAd(pid)} — ${s.puan} puan`+
    (s.tam?` (${s.tam} tam skor)`:'')));
  L.push('');

  const en=sirali[0][1].puan;
  const sampiyonlar=sirali.filter(([,s])=>s.puan===en).map(([pid])=>profilAd(pid));
  L.push(`HÜKÜM: ${liste(sampiyonlar)} ${en} puanla haftanın birincisi olmuştur.`+
    (sampiyonlar.length>1?' Beraberlik hâlinde unvan ortak taşınır.':''));

  const son=sirali[sirali.length-1];
  if(sirali.length>1&&son[1].puan<en)
    L.push(`${profilAd(son[0])} ${son[1].puan} puanda kalmıştır. Futbol bilgisi hususu tartışmaya açılmamıştır.`);

  const tamci=sirali.filter(([,s])=>s.tam>0);
  if(tamci.length) L.push(`TAM SKOR: ${liste(tamci.map(([pid,s])=>`${profilAd(pid)} (${s.tam})`))}.`);
  else L.push('Bu hafta tam skor tutan çıkmamıştır.');

  const sifir=sirali.filter(([,s])=>s.puan===0).map(([pid])=>profilAd(pid));
  if(sifir.length) L.push(`Sıfır çeken: ${liste(sifir)}. Tahmin serbestliği anayasal bir haktır.`);

  L.push('');
  L.push('Zabıt okundu, imza altına alındı.');
  return L.join('\n');
}
function tahminZabtiAc(hid){
  const m=tahminZabtiUret(hid);
  acModal(`<h2 class="serif" style="margin:0 0 10px">Hafta Zabtı</h2>
    <div class="zabit" id="hzMetin">${esc(m)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="kopyala(document.getElementById('hzMetin').textContent)">📋 Kopyala · WhatsApp'a Yapıştır</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
async function haftaKapat(hid){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const h=haftalar().find(x=>x.id===hid); if(!h) return;
  if(!confirm(`"${h.ad}" kapatılsın mı? Zabıt akışa işlenecek.`)) return;
  const {error}=await sb.from('haftalar').update({kapandi:true}).eq('id',hid);
  if(error) return toast(hataMetni(error),true);
  await akisEkle('mesaj',tahminZabtiUret(hid),{tahminZabit:hid});
  await yenile(true); toast('Hafta kapandı, zabıt akışa düştü.');
}
