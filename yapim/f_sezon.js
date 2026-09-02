/* =========================================================
   SEZON — yıllık
   Sicil sonsuza kadar toplanırsa bir süre sonra tepedeki değişmez ve
   heyecan biter. Sezon takvim yılıdır; yıl her maçın tarihinde zaten
   yazılı olduğu için ne yeni tablo ne göç gerekti.

   SEZONA BAĞLI : Sicil, unvanlar, kürsü, oyuncu kartı
   HER ZAMAN TOPLAM : Rekorlar Kitabı, Aramızda, Borç Hesabı, İddia,
                      Arşiv — rekor, husumet ve borç yıl başında sıfırlanmaz.

   Şampiyonlar masalar.ayar.sampiyonlar'da tutulur; kalıcı unvandır.
   ========================================================= */

let SEZON=null;                      // null → içinde bulunduğumuz yıl
const buYil=()=>String(new Date().getFullYear());
const aktifSezon=()=>SEZON||buYil();

/* kayıtlı yıllar, yeniden eskiye */
function sezonYillari(){
  const y=[...new Set(grupCelseleri().map(c=>String(c.tarih||'').slice(0,4)).filter(x=>/^\d{4}$/.test(x)))];
  if(!y.includes(buYil())) y.push(buYil());
  return y.sort().reverse();
}
/* sicil/unvan bu listeden beslenir */
function sezonCelseleri(){
  const s=aktifSezon();
  if(s==='hepsi') return grupCelseleri();
  return grupCelseleri().filter(c=>String(c.tarih||'').startsWith(s));
}

function sezonSecici(){
  const y=sezonYillari();
  if(y.length<2 && aktifSezon()===buYil()) return '';    // tek yıl varsa gösterme
  const s=aktifSezon();
  return `<div class="row wrap" style="gap:6px;margin-bottom:10px">
    ${y.map(x=>`<div class="chip ${x===s?'on':''}" onclick="SEZON='${x}';render()">${x}</div>`).join('')}
    <div class="chip ${s==='hepsi'?'on':''}" onclick="SEZON='hepsi';render()">Tüm zamanlar</div>
  </div>`;
}

/* --------------------------- şampiyonlar --------------------------- */
const sampiyonlar=()=>((DB.ayar&&DB.ayar.sampiyonlar)||[]);
const sezonSampiyonu=(yil,oyun)=>sampiyonlar().find(s=>String(s.yil)===String(yil)&&s.oyun===oyun)||null;
function kisininUnvanlari(oyuncuId){
  return sampiyonlar().filter(s=>(s.kimler||[]).includes(oyuncuId));
}

/* Bir yılın şampiyonu: o yılın sicilinde birinci olan(lar) */
function sezonBirincileri(yil,oyun){
  const eski=SEZON; SEZON=String(yil);
  const v=Object.values(istatistik(oyun)).filter(p=>p.celse>0);
  SEZON=eski;
  if(!v.length) return null;
  const sirali = oyun==='batak'
    ? v.slice().sort((a,b)=>b.oran-a.oran||b.gal-a.gal||b.toplamPuan-a.toplamPuan)
    : v.slice().sort((a,b)=>a.ortSira-b.ortSira||a.ortPuan-b.ortPuan);
  const en=sirali[0];
  const esit = oyun==='batak'
    ? sirali.filter(p=>p.oran===en.oran&&p.gal===en.gal)
    : sirali.filter(p=>p.ortSira===en.ortSira);
  return {kimler:esit.map(p=>p.id), mac:en.celse, gal:en.gal,
          oran:Math.round(en.oran*100), tumSira:sirali};
}

function sezonPanosu(){
  const yil=aktifSezon();
  if(yil==='hepsi') return '';
  const k=kurucuMu(), gecmis=yil<buYil();
  const b=sezonSampiyonu(yil,'batak'), y=sezonSampiyonu(yil,'101');
  const ilan=(s,ad2,k2)=>s?`<div class="rozet" style="margin-bottom:8px">
      <div class="k">${k2}</div>
      <div class="grow"><div style="font-weight:700;font-size:13.5px">${esc(yil)} ${ad2} Şampiyonu</div>
        <div class="xs" style="color:var(--gold)">${esc((s.kimler||[]).map(ad).join(' & '))}</div>
        <div class="xs muted">${s.mac} maç · ${s.gal} birincilik · %${s.oran}</div></div>
    </div>`:'';

  const kapali=!!(b||y);
  return `<div class="card">
    <h3>📅 ${esc(yil)} Sezonu</h3>
    ${kapali?`${ilan(b,'Batak','🏆')}${ilan(y,'101','🏆')}
      <div class="xs dim">Sezon kapandı; unvanlar kalıcıdır.</div>`
     :`<div class="sm dim">Sezon açık. ${gecmis?'Bu yıl geçti ama kapatılmadı.':'Yıl sonunda kapatılınca şampiyonluk unvanı kalıcı olarak yazılır.'}</div>`}
    ${k&&!kapali&&sezonCelseleri().length
      ?`<button class="btn-g btn-full btn-sm" style="margin-top:11px" onclick="sezonKapatAc('${yil}')">
          🏆 ${esc(yil)} Sezonunu Kapat</button>`:''}
    ${k&&kapali?`<button class="btn-gh btn-full btn-sm" style="margin-top:9px" onclick="sezonAc('${yil}')">
      Sezonu yeniden aç</button>`:''}
  </div>`;
}

function sezonKapatAc(yil){
  if(!kurucuMu()) return toast('Sezonu yalnız grubu kuran kapatır',true);
  const b=sezonBirincileri(yil,'batak'), y=sezonBirincileri(yil,'101');
  if(!b&&!y) return toast('Bu sezonda kapanmış maç yok',true);
  const sat=(s,ad2)=>s?`<div class="sm" style="padding:3px 0">${ad2}: <b style="color:var(--gold)">
      ${esc(s.kimler.map(ad).join(' & '))}</b> <span class="xs dim">${s.mac} maç · %${s.oran}</span></div>`:'';
  acModal(`<div class="center"><div style="font-size:32px">🏆</div>
      <h2 class="serif" style="margin:6px 0 4px">${esc(yil)} Sezonunu Kapat</h2>
      <div class="xs dim" style="margin-bottom:14px">Şampiyonluk kalıcı unvan olarak yazılır ve zabıt akışa düşer.
        Maçlar ve sicil silinmez; yeni yıl kendi sezonuyla başlar.</div></div>
    <div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      ${sat(b,'🂡 Batak')}${sat(y,'🀄 101')}
      ${!b?'<div class="xs dim">Batak: bu sezon maç yok</div>':''}
      ${!y?'<div class="xs dim">101: bu sezon maç yok</div>':''}
    </div>
    <button class="btn-g btn-full" id="szBtn" onclick="sezonKapat('${yil}')">Kapat ve Zabıt Tut</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function sezonKapat(yil){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  const btn=$('#szBtn'); if(btn){btn.disabled=true;btn.innerHTML='<span class="yukleniyor"></span>';}
  try{
    const yeni=sampiyonlar().filter(s=>String(s.yil)!==String(yil));
    ['batak','101'].forEach(oyun=>{
      const s=sezonBirincileri(yil,oyun);
      if(s) yeni.push({yil:String(yil),oyun,kimler:s.kimler,mac:s.mac,gal:s.gal,oran:s.oran,
                       kapanis:new Date().toISOString()});
    });
    DB.ayar.sampiyonlar=yeni;
    await ayarYaz(true);
    await akisEkle('zabit',sezonZabtiUret(yil),{sezon:String(yil)});
    kapatModal(); await yenile(true);
    toast(`${yil} sezonu kapandı, unvanlar yazıldı.`,true);
  }catch(e){ toast(hataMetni(e),true); if(btn){btn.disabled=false;btn.textContent='Kapat ve Zabıt Tut';} }
}
async function sezonAc(yil){
  if(!kurucuMu()) return toast('Yetkin yok',true);
  if(!confirm(`${yil} sezonu yeniden açılsın mı? Şampiyonluk unvanı kaldırılır.`)) return;
  DB.ayar.sampiyonlar=sampiyonlar().filter(s=>String(s.yil)!==String(yil));
  await ayarYaz(true); await yenile(true); toast('Sezon yeniden açıldı');
}

function sezonZabtiUret(yil){
  const g=aktifGrup()||{ad:'Masa',emoji:''};
  const L=[`${g.emoji||''} ${String(g.ad).toLocaleUpperCase('tr-TR')} — ${yil} SEZONU KAPANIŞ ZABTI`,''];
  let varMi=false;
  ['batak','101'].forEach(oyun=>{
    const s=sezonBirincileri(yil,oyun);
    if(!s) return;
    varMi=true;
    const ad2=oyun==='batak'?'BATAK':'101';
    L.push(`${ad2}:`);
    s.tumSira.forEach((p,i)=>L.push(`  ${i+1}. ${ad(p.id)} — ${p.celse} maç, ${p.gal} birincilik, %${Math.round(p.oran*100)}`));
    L.push('');
    L.push(`${yil} ${ad2} ŞAMPİYONU: ${liste(s.kimler.map(ad))}.`+
      (s.kimler.length>1?' Beraberlik hâlinde unvan ortak taşınır.':''));
    const son=s.tumSira[s.tumSira.length-1];
    if(s.tumSira.length>1)
      L.push(`Sezonu ${ad(son.id)} kapatmıştır; kendisine bir sonraki yıl için sabır tavsiye edilir.`);
    L.push('');
  });
  if(!varMi) return L.concat('Bu sezonda kapanmış maç bulunmamaktadır.').join('\n');
  L.push('Unvan kalıcıdır, geri alınamaz. Yeni sezon sıfırdan başlar.');
  L.push('Zabıt okundu, imza altına alındı.');
  return L.join('\n');
}
