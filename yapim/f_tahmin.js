/* =========================================================
   TAHMİN YARIŞMASI
   Haftanın maçları girilir, herkes skor yazar. Tahminler AÇIK —
   herkes birbirini görür. Maç başlayınca kilitlenir; kilit
   veritabanında (yama 08), arayüzde değil.

   PUAN SKALASI
     tam skor .................. 5
     doğru sonuç + gol farkı ... 3
     sadece doğru sonuç ........ 2
     toplam gol de tutarsa ..... +1   (yalnız puan aldıysa)
     yoksa ..................... 0
   ========================================================= */

let TAHMIN_HAFTA=null;          // seçili hafta id

/* --------------------------- puanlama --------------------------- */
const isaret=x=>x>0?1:(x<0?-1:0);
function tahminPuan(t,k){
  if(!t||k.evSkor==null||k.depSkor==null) return null;
  if(t.ev===k.evSkor&&t.dep===k.depSkor) return 5;
  let p=0;
  if(isaret(t.ev-t.dep)===isaret(k.evSkor-k.depSkor))
    p = ((t.ev-t.dep)===(k.evSkor-k.depSkor)) ? 3 : 2;
  if(p>0 && (t.ev+t.dep)===(k.evSkor+k.depSkor)) p+=1;
  return p;
}
const puanEtiketi=p=>p===null?'':(p===0?'0':'+'+p);

/* --------------------------- veri ------------------------------- */
const haftalar     = ()=>(DB.haftalar||[]).filter(h=>h.masaId===DB.aktifGrup);
const haftaMaclari = hid=>(DB.karsilasmalar||[]).filter(k=>k.haftaId===hid)
                            .sort((a,b)=>a.sira-b.sira||String(a.baslangic).localeCompare(String(b.baslangic)));
const macTahminleri= kid=>(DB.tahminler||[]).filter(t=>t.karsilasmaId===kid);
const benimTahmin   = kid=>macTahminleri(kid).find(t=>t.profilId===OTURUM.id)||null;
const kilitli        = k=>new Date(k.baslangic).getTime()<=Date.now();
const skorVar        = k=>k.evSkor!=null&&k.depSkor!=null;

function saatMetni(iso){
  const d=new Date(iso);
  if(isNaN(d)) return '';
  const g=['Paz','Pzt','Sal','Çar','Per','Cum','Cts'][d.getDay()];
  const ik=n=>String(n).padStart(2,'0');
  return `${g} ${ik(d.getDate())}.${ik(d.getMonth()+1)} ${ik(d.getHours())}:${ik(d.getMinutes())}`;
}
function kalanMetni(iso){
  const fark=new Date(iso).getTime()-Date.now();
  if(fark<=0) return 'kilitli';
  const dk=Math.round(fark/60000);
  if(dk<60) return dk+' dk kaldı';
  const sa=Math.round(dk/60);
  if(sa<48) return sa+' saat kaldı';
  return Math.round(sa/24)+' gün kaldı';
}

/* haftanın puan tablosu: profilId → {puan, tam, adet} */
function haftaPuanlari(hid){
  const t={};
  const kur=id=>t[id]=t[id]||{puan:0,tam:0,adet:0};
  haftaMaclari(hid).filter(skorVar).forEach(k=>{
    macTahminleri(k.id).forEach(x=>{
      const p=tahminPuan(x,k); if(p===null) return;
      const s=kur(x.profilId); s.puan+=p; s.adet++; if(p===5) s.tam++;
    });
  });
  return t;
}
/* sezon: bütün haftalar */
function sezonPuanlari(){
  const t={};
  const kur=id=>t[id]=t[id]||{puan:0,tam:0,adet:0,hafta:0};
  haftalar().forEach(h=>{
    const hp=haftaPuanlari(h.id);
    const sirali=Object.entries(hp).sort((a,b)=>b[1].puan-a[1].puan);
    const en=sirali.length?sirali[0][1].puan:0;
    Object.entries(hp).forEach(([id,s])=>{
      const g=kur(id); g.puan+=s.puan; g.tam+=s.tam; g.adet+=s.adet;
      if(s.puan===en&&en>0) g.hafta++;      // haftalık şampiyonluk
    });
  });
  return t;
}
const profilAd=pid=>{
  const o=DB.oyuncular.find(x=>x.profilId===pid&&x.masaId===DB.aktifGrup);
  if(o) return o.ad;
  const u=MASA_UYELERI.find(u=>u.profil_id===pid)?.profiller?.ad;
  if(u) return u;
  /* WhatsApp linkiyle katilan misafir: uyelik kaydi yok, adi
     hafta_misafirleri tablosunda (yama 10). */
  const g=(typeof HAFTA_MISAFIRLERI!=='undefined'?HAFTA_MISAFIRLERI:[])
            .find(x=>x.profilId===pid);
  return g ? g.ad : '?';
};
const profilOyuncu=pid=>DB.oyuncular.find(x=>x.profilId===pid&&x.masaId===DB.aktifGrup)||null;
function profilAvatar(pid,b){
  const o=profilOyuncu(pid);
  if(o) return avatar(o.id,b||24);
  const p=MASA_UYELERI.find(u=>u.profil_id===pid)?.profiller;
  return `<div class="avatar" style="background:${esc(p?.renk||'#5a524c')};width:${b||24}px;height:${b||24}px;
    font-size:${Math.round((b||24)*.43)}px">${esc(bas(p?.ad))}</div>`;
}

/* --------------------------- görünüm ---------------------------- */
function tahminKart(){
  const hs=haftalar().slice().sort((a,b)=>String(b.olusturma).localeCompare(String(a.olusturma)));
  const k=kurucuMu();
  if(!hs.length) return `<div class="card"><div class="empty">
    <div class="big">⚽</div>Henüz tahmin haftası açılmadı.
    <div class="sm" style="margin-top:6px">Haftanın maçlarını yapıştır, masa tahmin etsin.</div>
    ${k?`<button class="btn-p" style="margin-top:14px" onclick="haftaAc()">+ Hafta Aç</button>`:''}
  </div></div>`;

  if(!TAHMIN_HAFTA||!hs.some(h=>h.id===TAHMIN_HAFTA)) TAHMIN_HAFTA=hs[0].id;
  const h=hs.find(x=>x.id===TAHMIN_HAFTA);
  const mac=haftaMaclari(h.id);
  const hp=haftaPuanlari(h.id);
  const sirali=Object.entries(hp).sort((a,b)=>b[1].puan-a[1].puan||b[1].tam-a[1].tam);

  return `
  ${hs.length>1?`<div class="row wrap" style="gap:6px;margin-bottom:10px">${hs.map(x=>
    `<div class="chip ${x.id===TAHMIN_HAFTA?'on':''}" onclick="TAHMIN_HAFTA='${x.id}';render()">
      ${esc(x.ad)}${x.kapandi?' ✔':''}</div>`).join('')}</div>`:''}

  <div class="card">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><div class="serif" style="font-size:17px">⚽ ${esc(h.ad)}</div>
        <div class="xs dim">${mac.length} maç · ${mac.filter(skorVar).length} sonuçlandı
          ${h.kapandi?' · hafta kapandı':''}</div></div>
      ${k?`<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end">
        <button class="btn-xs btn-gh" onclick="macEkleAc('${h.id}')">+ Maç</button>
        <button class="btn-xs btn-dn" onclick="haftaSil('${h.id}')">Sil</button></div>`:''}
    </div>
    ${!mac.length?`<div class="sep"></div><div class="sm dim">Bu haftaya maç girilmemiş.
      ${k?'Yukarıdaki "+ Maç" ile haftanın fikstürünü yapıştır.':''}</div>`
     :`<div class="sep"></div>${mac.map(macSatiri).join('<div class="sep" style="margin:10px -14px"></div>')}
       ${mac.some(x=>!kilitli(x))?`
         <button class="btn-p btn-full" style="margin-top:14px" id="thHepBtn"
           onclick="tahminHepsiniKaydet('${h.id}')">💾 Yazdıklarımın Hepsini Kaydet</button>
         ${k?`<button class="btn-g btn-full" style="margin-top:8px"
           onclick="tahminPaylasAc('${h.id}')">📱 Haftayı Gruba At (WhatsApp)</button>
         <div class="xs dim center" style="margin-top:6px">Linke tıklayan adını yazıp tahminini girer;
           hesap açması gerekmez.</div>`:''}
         <div class="xs dim center" style="margin-top:6px">Kutudan çıkınca zaten kendiliğinden kaydediliyor;
           bu düğme hepsini bir arada yazar.</div>`:''}`}
  </div>

  ${tahminPanosu(h.id)}

  ${sirali.length?`<div class="card">
    <h3>🏆 Hafta Sıralaması</h3>
    <table><thead><tr><th>Kişi</th><th>Puan</th><th>Tam</th><th>Maç</th></tr></thead><tbody>
    ${sirali.map(([pid,s],i)=>`<tr>
      <td><div class="row" style="gap:8px"><span class="rank ${i===0?'r1':''}">${i+1}</span>
        ${profilAvatar(pid,24)}<span style="font-weight:600">${esc(profilAd(pid))}</span></div></td>
      <td><b class="${s.puan>0?'pos':'zero'}">${s.puan}</b></td>
      <td>${s.tam?'🎯 '+s.tam:'–'}</td><td class="dim">${s.adet}</td></tr>`).join('')}
    </tbody></table>
    ${k&&mac.length&&mac.every(skorVar)&&!h.kapandi
      ?`<button class="btn-g btn-full" style="margin-top:11px" onclick="haftaKapat('${h.id}')">
          Haftayı Kapat → Zabıt</button>`:''}
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="tahminZabtiAc('${h.id}')">
      📋 Hafta Özetini Kopyala</button>
  </div>`:''}

  ${sezonKart()}

  ${k?`<div class="card tight center"><button class="btn-p btn-sm" onclick="haftaAc()">+ Yeni Hafta</button></div>`:''}
  <div class="card tight xs dim">Tam skor <b>5</b> · doğru sonuç + gol farkı <b>3</b> ·
    sadece doğru sonuç <b>2</b> · toplam gol de tutarsa <b>+1</b>. Sonucu tutmayan tahmin 0 alır.
    Tahminler açıktır, herkes birbirini görür; maç başlayınca kilitlenir.</div>`;
}

function macSatiri(k){
  const t=benimTahmin(k.id), hepsi=macTahminleri(k.id), kl=kilitli(k), bitti=skorVar(k);
  const digerleri=hepsi.filter(x=>x.profilId!==OTURUM.id);
  return `<div>
    <div class="row" style="justify-content:space-between;gap:8px">
      <div class="grow" style="min-width:0">
        <div style="font-weight:600;font-size:14px" class="ell">${esc(k.ev)} – ${esc(k.deplasman)}</div>
        <div class="xs dim">${saatMetni(k.baslangic)} · ${bitti?'sonuçlandı':(kl?'kilitli':kalanMetni(k.baslangic))}</div>
      </div>
      ${bitti?`<div class="serif" style="font-size:20px;flex-shrink:0">${k.evSkor}–${k.depSkor}</div>`
        :(kurucuMu()&&kl?`<button class="btn-xs btn-g" style="flex-shrink:0" onclick="skorGirAc('${k.id}')">Skor</button>`:'')}
      ${kurucuMu()?`<button class="btn-xs btn-gh" style="flex-shrink:0" onclick="macSil('${k.id}')">✕</button>`:''}
    </div>

    ${!kl?`<div class="row" style="gap:6px;margin-top:8px;align-items:center">
      <input type="number" inputmode="numeric" id="th-e-${k.id}" min="0" max="30" value="${t?t.ev:''}" placeholder="–"
        onchange="tahminKaydet('${k.id}',true)" onkeydown="if(event.key==='Enter')this.blur()"
        style="width:56px;text-align:center;font:600 16px Georgia,serif">
      <span class="dim">–</span>
      <input type="number" inputmode="numeric" id="th-d-${k.id}" min="0" max="30" value="${t?t.dep:''}" placeholder="–"
        onchange="tahminKaydet('${k.id}',true)" onkeydown="if(event.key==='Enter')this.blur()"
        style="width:56px;text-align:center;font:600 16px Georgia,serif">
      <span class="xs" id="th-n-${k.id}" style="color:${t?'var(--green)':'var(--dim)'}">${t?'✓ kayıtlı':'iki sayıyı yaz'}</span>
    </div>`
    :(t?`<div class="xs" style="margin-top:6px">Tahminin: <b>${t.ev}–${t.dep}</b>
        ${bitti?` · <b class="${tahminPuan(t,k)>0?'pos':'zero'}">${puanEtiketi(tahminPuan(t,k))}</b>`:''}</div>`
      :`<div class="xs dim" style="margin-top:6px">Tahmin girmedin.</div>`)}

    ${hepsi.length?`<div class="row wrap" style="gap:5px;margin-top:7px">${hepsi
      .slice().sort((a,b)=>(a.profilId===OTURUM.id?-1:0)-(b.profilId===OTURUM.id?-1:0))
      .map(x=>{
        const p=bitti?tahminPuan(x,k):null, ben=x.profilId===OTURUM.id;
        return `<span class="pill ${p===5?'gold':(p>0?'green':(bitti?'':(ben?'gold':'blue')))}"
          style="${ben?'font-weight:700':''}">
          ${ben?'sen':esc(profilAd(x.profilId))} ${x.ev}–${x.dep}${p!==null?' '+puanEtiketi(p):''}</span>`;}).join('')}
      </div>`:(kl?'':`<div class="xs dim" style="margin-top:6px">Henüz tahmin yok.</div>`)}
  </div>`;
}

function sezonKart(){
  const t=sezonPuanlari();
  const s=Object.entries(t).filter(([,x])=>x.adet>0).sort((a,b)=>b[1].puan-a[1].puan||b[1].tam-a[1].tam);
  if(s.length<1||haftalar().length<2) return '';
  return `<div class="card"><h3>📅 Sezon Sıralaması</h3>
    <table><thead><tr><th>Kişi</th><th>Puan</th><th>🎯</th><th>Hafta</th></tr></thead><tbody>
    ${s.map(([pid,x],i)=>`<tr>
      <td><div class="row" style="gap:8px"><span class="rank ${i===0?'r1':''}">${i+1}</span>
        ${profilAvatar(pid,24)}<span style="font-weight:600">${esc(profilAd(pid))}</span></div></td>
      <td><b>${x.puan}</b></td><td>${x.tam||'–'}</td>
      <td class="dim">${x.hafta?x.hafta+' 🏆':'–'}</td></tr>`).join('')}
    </tbody></table></div>`;
}


//== tahminPanosu
/* HERKESİN TAHMİNİ BİR TABLODA
   Satır = kişi, sütun = maç. Hücrede o kişinin skoru; maç
   sonuçlandıysa aldığı puana göre renklenir (altın = tam skor).
   Sütun başlıkları numaralı, altında hangi maç olduğu yazıyor —
   20 maçlık haftada takım adlarını yatay sığdırmanın yolu yok. */
function tahminPanosu(hid){
  const mac=haftaMaclari(hid);
  if(!mac.length) return '';
  const tahminler=mac.flatMap(k=>macTahminleri(k.id));
  if(!tahminler.length) return `<div class="card"><h3>🗒️ Tahmin Panosu</h3>
    <div class="sm dim">Henüz kimse tahmin yazmadı. İlk yazan sen ol.</div></div>`;

  /* kişiler: tahmin yazanlar önce, sonra yazmayan masa üyeleri */
  const yazanlar=[...new Set(tahminler.map(t=>t.profilId))];
  const uyeler=(MASA_UYELERI||[]).map(u=>u.profil_id).filter(id=>!yazanlar.includes(id));
  const kisiler=yazanlar.concat(uyeler);

  const hp=haftaPuanlari(hid);
  const sirali=kisiler.slice().sort((a,b)=>
    ((hp[b]?.puan)||0)-((hp[a]?.puan)||0)
    || (a===OTURUM.id?-1:0)-(b===OTURUM.id?-1:0)
    || String(profilAd(a)).localeCompare(String(profilAd(b)),'tr'));

  const hucre=(pid,k)=>{
    const t=macTahminleri(k.id).find(x=>x.profilId===pid);
    if(!t) return `<td class="dim center">–</td>`;
    const p=skorVar(k)?tahminPuan(t,k):null;
    const renk = p===5 ? 'var(--gold)' : (p>0 ? 'var(--green)' : (p===0 ? 'var(--dim)' : 'var(--ink)'));
    return `<td class="center" style="white-space:nowrap;color:${renk};font-weight:${p>0?700:600}">
      ${t.ev}–${t.dep}${p!==null&&p>0?`<span class="xs"> +${p}</span>`:''}</td>`;
  };

  return `<div class="card">
    <h3>🗒️ Tahmin Panosu</h3>
    <div class="xs dim" style="margin-bottom:9px">Herkesin tahmini bir arada.
      <b style="color:var(--gold)">Altın</b> tam skor, <b style="color:var(--green)">yeşil</b> puan aldı,
      soluk olan tutmadı. Sağa kaydırarak bütün maçları görürsün.</div>

    <div style="overflow-x:auto"><table style="min-width:100%">
      <thead><tr><th style="position:sticky;left:0;background:var(--panel)">Kişi</th>
        ${mac.map((k,i)=>`<th class="center" title="${esc(k.ev)} – ${esc(k.deplasman)}">${i+1}</th>`).join('')}
        <th class="center">Σ</th></tr></thead>
      <tbody>${sirali.map(pid=>`<tr>
        <td style="position:sticky;left:0;background:var(--panel)">
          <div class="row" style="gap:7px">${profilAvatar(pid,22)}
            <span style="font-weight:${pid===OTURUM.id?700:600};white-space:nowrap">${
              pid===OTURUM.id?'sen':esc(profilAd(pid))}</span></div></td>
        ${mac.map(k=>hucre(pid,k)).join('')}
        <td class="center"><b>${(hp[pid]?.puan)||0}</b></td></tr>`).join('')}
      </tbody>
    </table></div>

    <div class="xs dim" style="margin-top:10px;line-height:1.7">
      ${mac.map((k,i)=>`<div><b>${i+1}</b> · ${esc(k.ev)} – ${esc(k.deplasman)}
        ${skorVar(k)?`<b>${k.evSkor}–${k.depSkor}</b>`:`<span class="dim">${kilitli(k)?'oynanıyor':saatMetni(k.baslangic)}</span>`}</div>`).join('')}
    </div>
  </div>`;
}
