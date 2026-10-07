/* =========================================================
   DERİN KARNE — profesyonel bakış (06.10.2026)

   İstek (kullanıcı): "profesyonel bir batakçı gibi düşün, derinleştir;
   101'i de farklılaştır." Aramızda/Kabuslar/Eş Uyumu zaten var (Divan);
   burada EKSİK olan iki şey:
     · İHALE KARNESİ — batakta hüner ihaledir. Tutturma %, ortalama ve
       en yüksek tutturulan ihale, şlem, battı. Veri ihaleli modda
       zaten tutuluyor (istatistik + batakTumEller).
     · 101 KARNESİ — 101'in kendi dili: el bitirme, açamama, çifte,
       ortalama ceza, sonuncu/ikincilik. Oyuncuya ayrı bir kimlik verir.

   İkisi de oyuncu kartında (sabikaGorunum) ilgili oyunun altında çıkar;
   sezona bağlıdır (istatistik hangi sezonsa o). Salt okur.
   ========================================================= */

const _karneKut=(b,e,r)=>`<div style="flex:1;min-width:68px;text-align:center;padding:8px 4px;
  background:var(--panel2);border-radius:9px"><div class="serif" style="font-size:17px;
  color:${r||'var(--ink)'}">${b}</div><div class="xs dim">${e}</div></div>`;

/* ---------- BATAK: İhale Karnesi ---------- */
function ihaleKarne(id){
  const p=(typeof istatistik==='function')?istatistik('batak')[id]:null;
  if(!p||!p.ihale) return '';
  /* ortalama ve en yüksek TUTTURULAN ihale — el verisinden (sezon kapsamı) */
  let topIh=0, nIh=0, enYuksekTut=0;
  const liste=(typeof sezonCelseleri==='function'?sezonCelseleri():grupCelseleri())
    .filter(c=>c.oyun==='batak');
  liste.forEach(c=>{
    (typeof batakTumEller==='function'?batakTumEller(c):[]).forEach(el=>{
      const tk=c.takimlar&&c.takimlar[el&&el.ihaleTakim]; if(!tk) return;
      if(!tk.oyuncular.includes(id)) return;
      const ih=Number(el.ihale)||0; if(!ih) return;
      topIh+=ih; nIh++;
      if(Number(el.alinan)>=ih && ih>enYuksekTut) enYuksekTut=ih;
    });
  });
  const tut=p.ihale?Math.round(p.ihaleTam/p.ihale*100):0;
  const ortIh=nIh?topIh/nIh:0;
  let yorum;
  if(p.ihale<4)                       yorum='Temkinli — nadir ihaleye girer, ipe un sermez.';
  else if(tut>=70)                    yorum='Güvenilir ihaleci — ağzından çıkanı çıkarır.';
  else if(ortIh>=9 && tut<55)         yorum='Cesur ama tutarsız — yüksek açar, hepsini toparlayamaz.';
  else if(tut<45)                     yorum='İştahlı — ihaleyi sever, sonucu her zaman sevmez.';
  else                                yorum='Dengeli — ölçülü açar, çoğunu kotarır.';
  return `<div class="sep"></div>
    <div class="xs dim" style="margin-bottom:6px">🎯 İHALE KARNESİ</div>
    <div class="row wrap" style="gap:6px">
      ${_karneKut(p.ihale,'İhale')}
      ${_karneKut('%'+tut,'Tutturma', tut>=60?'var(--green)':(tut<45?'var(--red)':''))}
      ${_karneKut(p.ihaleBat,'Battı', p.ihaleBat?'var(--red)':'')}
      ${_karneKut(ortIh?ortIh.toFixed(1):'—','Ort. ihale')}
      ${_karneKut(enYuksekTut||'—','En yüksek tut.', enYuksekTut?'var(--gold)':'')}
      ${p.slem?_karneKut(p.slem,'Şlem','var(--gold)'):''}
    </div>
    <div class="xs" style="margin-top:7px;font-style:italic;color:var(--ink2)">${esc(yorum)}</div>`;
}

/* ---------- 101: kendi karnesi ---------- */
function yzKarne(id){
  const p=(typeof istatistik==='function')?istatistik('101')[id]:null;
  if(!p||!p.celse) return '';
  const sonOran=p.celse?p.son/p.celse:0;
  let yorum;
  if(p.elBitirdi>0 && p.elBitirdi>=p.acamadi*2) yorum='İnfazcı — eli bitirip masayı yakmayı sever.';
  else if(p.acamadi>p.elBitirdi && p.acamadi>0) yorum='Kapalı kutu — sık açamaz, cezayı yer.';
  else if(sonOran>=0.4)                          yorum='Masanın sponsoru — sonuncu olmayı alışkanlık edinmiş.';
  else if(p.cifte>0)                             yorum='Kumarbaz — çifteye girip riski ikiye katlar.';
  else                                           yorum='Sakin — ortada durur, az ceza ile idare eder.';
  return `<div class="sep"></div>
    <div class="xs dim" style="margin-bottom:6px">🀄 101 KARNESİ</div>
    <div class="row wrap" style="gap:6px">
      ${_karneKut(p.elBitirdi,'El bitirdi', p.elBitirdi?'var(--green)':'')}
      ${_karneKut(p.acamadi,'Açamadı', p.acamadi?'var(--red)':'')}
      ${p.cifte?_karneKut(p.cifte,'Çifte','var(--gold)'):''}
      ${_karneKut(Math.round(p.ortPuan),'Ort. ceza')}
      ${_karneKut(p.son,'Sonuncu', p.son?'var(--red)':'')}
      ${_karneKut(p.ikinci,'İkincilik')}
      ${_karneKut(p.enAgirCeza||'—','En ağır el', p.enAgirCeza?'var(--red)':'')}
    </div>
    <div class="xs" style="margin-top:7px;font-style:italic;color:var(--ink2)">${esc(yorum)}</div>`;
}
