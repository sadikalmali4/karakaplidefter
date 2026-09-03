//== ozet
/* =========================================================
   #3 AYLIK OTOMATİK ÖZET + #2 SEZON KAPANIŞ TÖRENİ

   AYLIK ÖZET: her ayın sonunda "geçen ayın kısası" akışa kendiliğinden
   düşer — en çok kazanan, en çok borçlanan, ayın maç sayısı. Sıfır
   bakım: uygulama açılınca kurucu cihazında bir kez yazılır, tekrarı
   DB.ayar.sonAyOzeti damgasıyla engellenir (yalnız kurucu yazar).

   SEZON TÖRENİ: yıl kapanışını düz pencere yerine tam ekran bir
   törenle ilan eder — şampiyonlar + ünvanlar. Oradan resmen kapatılır
   ve PDF alınır.
   ========================================================= */

const AY_ADI=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz',
              'Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ayAnahtar=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const oncekiAy=()=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d; };

/* Bir aya (YYYY-MM) ait maçlardan hafif döküm */
function ayOzetiVeri(ym){
  const aylik=grupCelseleri().filter(c=>String(c.tarih||'').slice(0,7)===ym);
  if(!aylik.length) return null;
  const kaz={};                                  // id -> galibiyet
  const say=id=>kaz[id]=kaz[id]||{id,gal:0,mac:0};
  let batak=0, yz=0;
  aylik.forEach(c=>{
    if(c.oyun==='batak'){ batak++;
      const m=batakMac(c), kz=c.kazanan??m.macKazanan; if(kz==null) return;
      c.takimlar.forEach((tk,ti)=>tk.oyuncular.forEach(id=>{const p=say(id);p.mac++;if(ti===kz)p.gal++;}));
    }else{ yz++;
      const sr=yzMac(c).sira; if(!sr.length) return;
      sr.forEach((r,i)=>{const p=say(r.id);p.mac++;if(i===0)p.gal++;});
    }
  });
  const sirali=Object.values(kaz).sort((a,b)=>b.gal-a.gal||b.mac-a.mac);
  /* O ay doğan borçlar (akıştaki borcKaydi kayıtları) */
  const borc={};
  (DB.akis||[]).forEach(a=>{ const k=a.veri&&a.veri.borcKaydi;
    if(!k||String(a.olusturma||'').slice(0,7)!==ym) return;
    (k.borclular||[]).forEach(id=>{ borc[id]=(borc[id]||0)+(Number(k.adet)||1); });
  });
  const enBorc=Object.entries(borc).sort((a,b)=>b[1]-a[1])[0];
  return {ym, batak, yz, toplam:aylik.length, lider:sirali[0]||null, sirali,
          enBorclu:enBorc?{id:enBorc[0],adet:enBorc[1]}:null};
}

function ayOzetiMetni(ym){
  const v=ayOzetiVeri(ym); if(!v) return null;
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const [yil,ay]=ym.split('-');
  const L=[`${g.emoji||'📅'} ${AY_ADI[+ay-1]} ${yil} — AYIN KISASI`,''];
  L.push(`Bu ay ${v.toplam} maç görülmüştür (${v.batak} Batak, ${v.yz} adet 101).`);
  if(v.lider&&v.lider.gal>0)
    L.push(`Ayın galibi ${ad(v.lider.id)}: ${v.lider.mac} maçta ${v.lider.gal} birincilik.`);
  if(v.enBorclu)
    L.push(`Ayın kesesi ${ad(v.enBorclu.id)}: ${v.enBorclu.adet} kalem yeni borç. Kahve ocağı ısınmıştır.`);
  L.push('');
  L.push('İtirazlar bir sonraki ayın ilk çayında dinlenir.');
  return L.join('\n');
}

/* Uygulama açılınca: geçen ayın özeti yazıldı mı? Yalnız kurucu yazar. */
async function ayOzetiKontrol(){
  try{
    if(!kurucuMu()) return;
    const ym=ayAnahtar(oncekiAy());
    if((DB.ayar&&DB.ayar.sonAyOzeti)===ym) return;   // zaten yazılmış
    const metin=ayOzetiMetni(ym);
    /* Damgayı her hâlükârda ilerlet: maç yoksa da bir daha bakmayalım. */
    DB.ayar.sonAyOzeti=ym;
    if(metin){ await akisEkle('mesaj',metin,{ayOzeti:ym}); }
    await ayarYaz(true);
  }catch(e){ /* özet kritik değil; sessiz geç */ }
}

/* =========================================================
   SEZON KAPANIŞ TÖRENİ
   ========================================================= */
function sezonTorenAc(yil){
  const b=sezonBirincileri(yil,'batak'), y=sezonBirincileri(yil,'101');
  if(!b&&!y) return toast('Bu sezonda kapanmış maç yok',true);
  /* Sezonun ünvanları (o yıla göre) */
  const eski=SEZON; SEZON=String(yil);
  const unv=muayyideler('batak').concat(muayyideler('101')).concat(genelMuayyideler());
  SEZON=eski;
  const seçkin=unv.slice(0,8);
  const g=aktifGrup()||{ad:'Masa'};

  const sampiyon=(s,ad2,k)=>s?`<div class="tsamp">
    <div class="tk">${k}</div>
    <div class="txt"><div class="tunv">${esc(yil)} ${ad2} Şampiyonu</div>
      <div class="tad">${esc((s.kimler||[]).map(ad).join(' & '))}</div>
      <div class="tmini">${s.mac} maç · ${s.gal} birincilik · %${s.oran}</div></div></div>`:'';

  const host=document.createElement('div'); host.id='torenHost';
  host.innerHTML=`
    <div class="tarac">
      ${kurucuMu()?`<button class="btn-g btn-sm" onclick="sezonKapat('${yil}')">🏆 Sezonu Resmen Kapat</button>`:''}
      <button class="btn-gh btn-sm" onclick="raporAc()">📄 PDF</button>
      <button class="btn-gh btn-sm" onclick="torenKapat()">Kapat</button>
    </div>
    <div class="tbelge">
      <div class="tust">🎉 ${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} DİVANI 🎉</div>
      <h1 class="tbaslik">${esc(yil)} SEZONU<br>KAPANIŞ TÖRENİ</h1>
      ${sampiyon(b,'Batak','🏆')}${sampiyon(y,'101','🏆')}
      ${seçkin.length?`<div class="tbolum">ÖDÜLLER</div>
        ${seçkin.map(x=>`<div class="tunvsat"><span class="tuk">${x.k}</span>
          <b>${esc(x.ad)}</b> — <span class="tgold">${esc(unvanAd(x.kim))}</span></div>`).join('')}`:''}
      <div class="tson">Sezon defteri mühürlenmiştir. Yeni yıl, yeni sicil.</div>
    </div>`;
  const e=document.getElementById('torenHost'); if(e) e.remove();
  document.body.appendChild(host);
  if(!document.getElementById('torenStil')){
    const st=document.createElement('style'); st.id='torenStil'; st.textContent=TOREN_STIL;
    document.head.appendChild(st);
  }
  window.scrollTo(0,0);
}
function torenKapat(){ const h=document.getElementById('torenHost'); if(h) h.remove(); }

const TOREN_STIL=`
#torenHost{position:fixed;inset:0;z-index:200;overflow:auto;
  background:radial-gradient(1200px 600px at 50% -10%, #2a2416, #14110c 60%)}
#torenHost .tarac{position:sticky;top:0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;
  padding:10px;background:rgba(10,8,6,.75);backdrop-filter:blur(6px);z-index:2}
#torenHost .tbelge{max-width:560px;margin:0 auto;padding:26px 20px 60px;text-align:center;color:#f3ecda}
#torenHost .tust{letter-spacing:3px;font-size:12px;color:#c8a24a;margin-bottom:6px}
#torenHost .tbaslik{font:700 30px/1.2 Georgia,serif;color:#f6d98a;margin:0 0 24px;
  text-shadow:0 2px 20px rgba(200,162,74,.35)}
#torenHost .tsamp{display:flex;gap:14px;align-items:center;text-align:left;
  background:linear-gradient(180deg,#221c10,#1a160e);border:1px solid #6a5320;border-radius:16px;
  padding:16px 18px;margin:10px 0;box-shadow:0 4px 24px rgba(0,0,0,.4)}
#torenHost .tk{font-size:38px}
#torenHost .tunv{font-size:12px;letter-spacing:1px;color:#c8a24a}
#torenHost .tad{font:700 22px Georgia,serif;color:#fff;margin:2px 0}
#torenHost .tmini{font-size:12px;color:#b8ac90}
#torenHost .tbolum{letter-spacing:2px;font-size:12px;color:#c8a24a;margin:26px 0 10px;
  border-top:1px solid #4a3f22;padding-top:16px}
#torenHost .tunvsat{text-align:left;padding:6px 4px;font-size:14px;border-bottom:1px solid #2a2416}
#torenHost .tuk{margin-right:7px}
#torenHost .tgold{color:#f6d98a;font-weight:700}
#torenHost .tson{margin-top:26px;font-style:italic;color:#b8ac90;font-size:13px}
@media print{ #torenHost{display:none} }`;
