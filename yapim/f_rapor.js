//== rapor
/* =========================================================
   GENEL SİCİL KARARI — yazdırılabilir PDF rapor

   İstek (kullanıcı): "Hesap özeti falan PDF olarak çıkamaz mı, güzelce
   bir rapor şeklinde, mahkeme kararı gibi de olabilir, fotolar falan
   her şey."

   NASIL: dış kütüphane YOK (CSP dışarıdan yüklemeye izin vermiyor).
   Rapor, tam ekran bir katman (#raporHost) olarak çiziliyor; "Yazdır"
   deyince window.print() çalışıyor, @media print yalnız raporu
   bırakıyor. Telefonda çıkan yazdırma ekranından "PDF olarak kaydet"
   seçilir. Bilgisayarda "Hedef: PDF".

   İÇERİK: kapak (dava no + tarih), kadro (fotoğraflı), Batak ve 101
   sicil tabloları, ünvanlar (şeref/utanç), borç tablosu, efsaneler.
   Hepsi mevcut veriden; ekranda ne görünüyorsa rapor onu yazıyor.
   ========================================================= */

function raporTarih(){
  const d=new Date();
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}
function raporDavaNo(){
  const g=aktifGrup()||{};
  const kod=(g.kod||'0000').replace(/[^A-Z0-9]/gi,'').slice(0,4).toUpperCase();
  return `${new Date().getFullYear()}/${kod}`;
}

/* fotoğraflı avatar — baskıda kesin görünsün diye img etiketiyle */
function raporAvatar(id,b){
  const o=oy(id); b=b||46;
  if(o.foto) return `<img src="${esc(o.foto)}" style="width:${b}px;height:${b}px;border-radius:50%;
    object-fit:cover;border:1px solid #cbb78a" alt="">`;
  return `<div style="width:${b}px;height:${b}px;border-radius:50%;background:${o.renk||'#5a524c'};
    color:#fff;display:flex;align-items:center;justify-content:center;
    font:700 ${Math.round(b*.42)}px Georgia,serif">${esc(bas(o.ad))}</div>`;
}

/* --- sicil tablosu --- */
function raporSicil(oyun){
  const v=Object.values(istatistik(oyun)).filter(p=>p.celse>0)
    .sort((a,b)=>b.gal-a.gal||b.oran-a.oran||a.toplamPuan-b.toplamPuan);
  if(!v.length) return `<p class="rbos">Bu oyundan deftere geçmiş maç bulunmamaktadır.</p>`;
  const bat=oyun==='batak';
  const bas2=bat
    ? ['Oyuncu','Maç','Galibiyet','%','İhale','Tutan','Batan','Toplam Puan']
    : ['Oyuncu','Maç','Birincilik','%','İkincilik','Sonculuk','Toplam Ceza'];
  const sat=p=>bat
    ? [ad(p.id),p.celse,p.gal,Math.round(p.oran*100),p.ihale,p.ihaleTam,p.ihaleBat,p.toplamPuan]
    : [ad(p.id),p.celse,p.gal,Math.round(p.oran*100),p.ikinci,p.son,p.toplamPuan];
  return `<table class="rtab"><thead><tr>${bas2.map((h,i)=>`<th class="${i?'rsag':''}">${h}</th>`).join('')}</tr></thead>
    <tbody>${v.map(p=>{const c=sat(p);
      return `<tr><td>${esc(c[0])}</td>${c.slice(1).map(x=>`<td class="rsag">${x}</td>`).join('')}</tr>`;}).join('')}</tbody></table>`;
}

/* --- ünvanlar --- */
function raporUnvan(oyun){
  const r=muayyideler(oyun).concat(genelMuayyideler());
  if(!r.length) return '';
  const sat=x=>`<div class="runv"><span class="rk">${x.k}</span>
    <b>${esc(x.ad)}</b> — <span class="rgold">${esc(unvanAd(x.kim))}</span>
    <div class="rmini">${esc(x.aciklama||'')}</div></div>`;
  const iyi=r.filter(x=>x.tip!=='kotu'), kotu=r.filter(x=>x.tip==='kotu');
  return `${iyi.length?`<h3 class="rh3">Şeref Levhası</h3>${iyi.map(sat).join('')}`:''}
    ${kotu.length?`<h3 class="rh3">Utanç Duvarı</h3>${kotu.map(sat).join('')}`:''}`;
}

/* --- borç --- */
function raporBorc(){
  const t=(typeof borcTablosu==='function')?borcTablosu():{};
  const kayit=Object.entries(t).filter(([,v])=>v!==0).map(([k,v])=>{
    const i=k.indexOf('|');
    return {taraf:tarafKisiler(k.slice(0,i)).map(ad).join(' & '),ne:k.slice(i+1),v};});
  if(!kayit.length) return `<p class="rbos">Taraflar arasında ödenmemiş bir zimmet bulunmamaktadır.</p>`;
  const borclu=kayit.filter(r=>r.v<0).sort((a,b)=>a.v-b.v);
  const alacakli=kayit.filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const sat=(r,işaret)=>`<tr><td>${esc(r.taraf)}</td><td>${esc(r.ne)}</td>
    <td class="rsag">${işaret}${Math.abs(r.v)}</td></tr>`;
  return `<table class="rtab"><thead><tr><th>Taraf</th><th>Kalem</th><th class="rsag">Adet</th></tr></thead><tbody>
    ${borclu.length?`<tr class="rgrp"><td colspan="3">BORÇLU</td></tr>${borclu.map(r=>sat(r,'−')).join('')}`:''}
    ${alacakli.length?`<tr class="rgrp"><td colspan="3">ALACAKLI</td></tr>${alacakli.map(r=>sat(r,'+')).join('')}`:''}
  </tbody></table>`;
}

/* --- rapor gövdesi --- */
function raporGovde(){
  const g=aktifGrup()||{ad:'Masa',emoji:'🍀'};
  const kadro=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif)
    .map(o=>({o,n:toplamMac(o.id)})).sort((a,b)=>b.n-a.n);
  const efs=efsaneler();
  const batakN=grupCelseleri().filter(c=>c.oyun==='batak').length;
  const yzN=grupCelseleri().filter(c=>c.oyun==='101').length;

  return `
  <div class="rsayfa">
    <div class="rkapak">
      <div class="rmuhur">§</div>
      <div class="rust">${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} MASA DİVANI</div>
      <h1 class="rbaslik">GENEL SİCİL KARARI</h1>
      <div class="rmeta">Karar No: ${raporDavaNo()} &nbsp;·&nbsp; Karar Tarihi: ${raporTarih()}</div>
      <p class="rgiris">Aşağıda künyesi yazılı masanın bugüne kadarki bütün celseleri incelenmiş;
        ${batakN} Batak, ${yzN} adet 101 maçı üzerinden oyuncuların sicili, ünvanları ve
        taraflar arası zimmet aşağıdaki şekilde tespit ve kayıt altına alınmıştır.</p>
    </div>

    <h2 class="rh2">1 · KADRO</h2>
    <div class="rkadro">${kadro.map(({o,n})=>{const s=seviye(n);
      return `<div class="rkisi">${raporAvatar(o.id,52)}
        <div class="rad">${esc(o.ad)}</div>
        <div class="rlv">${s.ad} · ${n} maç</div></div>`;}).join('')}</div>

    <h2 class="rh2">2 · BATAK SİCİLİ</h2>${raporSicil('batak')}
    <h2 class="rh2">3 · 101 SİCİLİ</h2>${raporSicil('101')}

    <h2 class="rh2">4 · ÜNVANLAR</h2>${raporUnvan('batak')||raporUnvan('101')||'<p class="rbos">Henüz ünvan dağıtılmamıştır.</p>'}

    <h2 class="rh2">5 · ZİMMET (BORÇ TABLOSU)</h2>${raporBorc()}

    ${efs.length?`<h2 class="rh2">6 · MASA EFSANELERİ</h2>
      ${efs.map(e=>`<div class="refs"><b>${esc(e.baslik||'')}</b>
        <div class="rmini">${esc(e.metin||e.aciklama||'')}</div></div>`).join('')}`:''}

    <div class="rimza">
      <p>İşbu karar masanın defterine geçirilmiş olup, itirazlar defterin sahibi huzurunda,
        çay demlenmiş iken yapılır. Gıyapta yapılan itiraz dinlenmez.</p>
      <div class="rimzasat">${esc((g.ad||'').toLocaleUpperCase('tr-TR'))} DİVANI ADINA<br>
        <span class="rmuhursat">§ Kara Kaplı Defter</span></div>
    </div>
  </div>`;
}

/* --- aç / yazdır --- */
function raporAc(){
  const eski=document.getElementById('raporHost'); if(eski) eski.remove();
  const host=document.createElement('div');
  host.id='raporHost';
  host.innerHTML=`
    <div class="rarac">
      <button class="btn-p btn-sm" onclick="window.print()">🖨️ Yazdır / PDF olarak kaydet</button>
      <button class="btn-gh btn-sm" onclick="raporKapat()">Kapat</button>
    </div>
    <div class="rbelge">${raporGovde()}</div>`;
  document.body.appendChild(host);
  if(!document.getElementById('raporStil')){
    const st=document.createElement('style'); st.id='raporStil'; st.textContent=RAPOR_STIL;
    document.head.appendChild(st);
  }
  window.scrollTo(0,0);
}
function raporKapat(){ const h=document.getElementById('raporHost'); if(h) h.remove(); }

const RAPOR_STIL=`
#raporHost{position:fixed;inset:0;z-index:200;background:#e9e5db;overflow:auto;-webkit-overflow-scrolling:touch}
#raporHost .rarac{position:sticky;top:0;display:flex;gap:8px;justify-content:center;
  padding:10px;background:#1a1713;box-shadow:0 1px 8px rgba(0,0,0,.4);z-index:2}
#raporHost .rbelge{max-width:760px;margin:16px auto;padding:0 12px}
#raporHost .rsayfa{background:#fdfbf5;color:#241f18;border:1px solid #d8cfb8;
  padding:38px 40px;font:14px/1.6 Georgia,'Times New Roman',serif;box-shadow:0 2px 14px rgba(0,0,0,.15)}
#raporHost .rkapak{text-align:center;border-bottom:2px solid #c8a24a;padding-bottom:20px;margin-bottom:8px}
#raporHost .rmuhur{width:56px;height:56px;margin:0 auto 10px;border:2px solid #c8a24a;border-radius:50%;
  color:#c8a24a;font:700 30px Georgia,serif;display:flex;align-items:center;justify-content:center}
#raporHost .rust{letter-spacing:3px;font-size:12px;color:#8a7a52;text-transform:uppercase}
#raporHost .rbaslik{font-size:26px;margin:6px 0 4px;letter-spacing:1px}
#raporHost .rmeta{font-size:12.5px;color:#6a5f4a}
#raporHost .rgiris{text-align:justify;margin-top:16px;font-size:13.5px}
#raporHost .rh2{font-size:15px;letter-spacing:1px;border-bottom:1px solid #d8cfb8;
  padding-bottom:5px;margin:26px 0 12px;color:#5a4a28}
#raporHost .rh3{font-size:13px;letter-spacing:.5px;margin:14px 0 6px;color:#7a3a2a}
#raporHost .rkadro{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}
#raporHost .rkisi{text-align:center;width:88px}
#raporHost .rad{font-weight:700;font-size:12.5px;margin-top:5px}
#raporHost .rlv{font-size:11px;color:#7a6f58}
#raporHost .rtab{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px}
#raporHost .rtab th{background:#f0e9d6;text-align:left;padding:6px 8px;border-bottom:1.5px solid #c8a24a;font-size:11.5px}
#raporHost .rtab td{padding:5px 8px;border-bottom:1px solid #e6ddca}
#raporHost .rsag{text-align:right}
#raporHost .rgrp td{background:#f5efdf;font-weight:700;font-size:11px;letter-spacing:1px;color:#7a3a2a}
#raporHost .runv{margin:7px 0;padding-left:2px}
#raporHost .rk{font-size:16px;margin-right:5px}
#raporHost .rgold{color:#9a6a1a;font-weight:700}
#raporHost .rmini{font-size:11.5px;color:#6a5f4a;margin-top:1px}
#raporHost .refs{margin:9px 0}
#raporHost .rbos{font-size:13px;color:#7a6f58;font-style:italic}
#raporHost .rimza{margin-top:30px;border-top:2px solid #c8a24a;padding-top:14px;font-size:12.5px}
#raporHost .rimzasat{text-align:right;margin-top:20px;font-weight:700;line-height:1.9}
#raporHost .rmuhursat{color:#c8a24a}
@media print{
  body>*:not(#raporHost){display:none!important}
  #raporHost{position:static;background:#fff;overflow:visible}
  #raporHost .rarac{display:none!important}
  #raporHost .rbelge{max-width:none;margin:0;padding:0}
  #raporHost .rsayfa{border:none;box-shadow:none;padding:0}
  #raporHost .rh2{break-after:avoid}
  #raporHost .rtab{break-inside:avoid}
  #raporHost .runv,#raporHost .rkisi{break-inside:avoid}
  @page{margin:16mm}
}`;
