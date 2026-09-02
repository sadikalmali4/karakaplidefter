/* =========================================================
   DEVİR KAYITLARI + ELLE BORÇ
   Uygulamadan önceki dönemden gelen maçlar ve borçlar.
   Borç kaydı akışa yazılır (veri.borcKaydi) — böylece hesabın her
   kalemi masanın gözü önünde durur ve kimse "ben görmedim" diyemez.
   ========================================================= */

/* --------- elle borç kaydı --------- */
function borcEkleAc(){
  const oyn=grupOyunculari();
  if(oyn.length<2) return toast('Önce oyuncuları ekle',true);
  acModal(`<h2 class="serif" style="margin:0 0 4px">Borç Kaydı</h2>
    <div class="xs dim" style="margin-bottom:14px">Maçtan doğmayan borçları buraya yaz — devirden gelen,
      iddiadan doğan, masada söz verilen. Kayıt akışa işlenir.</div>
    <div class="field"><label class="fl">Borçlular</label>
      <div class="row wrap" id="beBorclu">${oyn.map(o=>
        `<div class="chip" data-id="${o.id}" onclick="this.classList.toggle('on')">${avatar(o.id,20)}${esc(o.ad)}</div>`).join('')}</div></div>
    <div class="field" style="margin-top:12px"><label class="fl">Alacaklılar</label>
      <div class="row wrap" id="beAlacakli">${oyn.map(o=>
        `<div class="chip" data-id="${o.id}" onclick="this.classList.toggle('on')">${avatar(o.id,20)}${esc(o.ad)}</div>`).join('')}</div></div>
    <div class="field" style="margin-top:12px"><label class="fl">Ne</label>
      <div class="row wrap" id="beNe">${BAHISLER.filter(b=>b.ad!=='Onur').map((b,i)=>
        `<div class="chip ${i===0?'on':''}" data-b="${b.ad}" onclick="tekSec(this)">${b.k} ${b.ad}</div>`).join('')}</div>
      <div class="row" style="margin-top:8px;gap:8px;align-items:center">
        <input id="beSerbest" placeholder="ya da kendin yaz (Hendrick's Gin...)" style="flex:1">
        <div class="row" style="gap:6px;align-items:center"><span class="xs dim">adet</span>
          <input type="number" id="beAdet" value="1" min="1" max="20" style="width:64px"></div>
      </div></div>
    <div class="field" style="margin-top:12px"><label class="fl">Gerekçe <span style="text-transform:none;letter-spacing:0">(isteğe bağlı)</span></label>
      <input id="beNot" placeholder="Devir borcu, iddia sonucu..."></div>
    <button class="btn-p btn-full" id="beBtn" style="margin-top:16px" onclick="borcEkleKaydet()">Hesaba Geçir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}
async function borcEkleKaydet(){
  const borclular=[...document.querySelectorAll('#beBorclu .chip.on')].map(e=>e.dataset.id);
  const alacaklilar=[...document.querySelectorAll('#beAlacakli .chip.on')].map(e=>e.dataset.id);
  if(!borclular.length)   return toast('Borçluyu seç',true);
  if(!alacaklilar.length) return toast('Alacaklıyı seç',true);
  if(borclular.some(id=>alacaklilar.includes(id))) return toast('Aynı kişi hem borçlu hem alacaklı olamaz',true);
  const ne=($('#beSerbest').value||'').trim()||document.querySelector('#beNe .chip.on')?.dataset.b||'Cin';
  const adet=Math.max(1,Math.min(20,parseInt($('#beAdet').value,10)||1));
  const not=($('#beNot').value||'').trim();
  const btn=$('#beBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const ok=await borcKaydiYaz({borclular,alacaklilar,ne,adet,aciklama:not});
  if(!ok){ btn.disabled=false; btn.textContent='Hesaba Geçir'; return; }
  kapatModal(); render();
  toast(`${liste(borclular.map(ad))} → ${liste(alacaklilar.map(ad))}: ${adet} ${ne}`,true);
}
async function borcKaydiYaz(k){
  const metin=`ZİMMET: ${liste(k.borclular.map(ad))}, ${liste(k.alacaklilar.map(ad))} lehine `+
    `${k.adet} ${k.ne} borçlu kaydedilmiştir.${k.aciklama?' '+k.aciklama:''}`;
  return await akisEkle('mesaj',metin,{borcKaydi:k});
}

/* --------- devir kayıtlarını yükle --------- */
async function devirSor(){
  if(!kurucuMu()) return toast('Bunu yalnız grubu kuran yapabilir',true);
  let d;
  try{ d=await fetch('kurulum/devir.json',{cache:'no-store'}).then(r=>r.json()); }
  catch(e){ return toast('Devir dosyası okunamadı',true); }
  const mac=(d.maclar||[]), borc=(d.borclar||[]);
  const eksik=new Set();
  [...mac.flatMap(m=>[...(m.A||[]),...(m.B||[])]),
   ...borc.flatMap(b=>[...(b.borclular||[]),...(b.alacaklilar||[])])]
    .forEach(n=>{ if(!adaGoreOyuncu(n)) eksik.add(n); });

  acModal(`<h2 class="serif" style="margin:0 0 4px">Devir Kayıtları</h2>
    <div class="xs dim" style="margin-bottom:12px">Uygulamadan önceki dönemden aktarılacak kayıtlar.
      Bir kez yüklenir; sicil ve hesap bunlara göre yeniden hesaplanır.</div>
    ${mac.length?`<div class="card tight" style="margin:0 0 10px;background:var(--panel2)">
      <div class="xs" style="font-weight:700;color:var(--gold);margin-bottom:6px">MAÇLAR (${mac.length})</div>
      ${mac.map(m=>`<div class="sm" style="padding:3px 0">${trh(m.tarih)} · ${esc((m.A||[]).join(' & '))}
        <b>${m.puanA}</b> – <b>${m.puanB}</b> ${esc((m.B||[]).join(' & '))}</div>`).join('')}
    </div>`:''}
    ${borc.length?`<div class="card tight" style="margin:0 0 10px;background:var(--panel2)">
      <div class="xs" style="font-weight:700;color:#DD8A8A;margin-bottom:6px">BORÇLAR (${borc.length})</div>
      ${borc.map(b=>`<div class="sm" style="padding:3px 0">${esc((b.borclular||[]).join(' & '))}
        → ${esc((b.alacaklilar||[]).join(' & '))} · <b>${b.adet} ${esc(b.ne)}</b></div>`).join('')}
    </div>`:''}
    ${eksik.size?`<div class="uyari" style="margin-bottom:10px">⚠️ Kadroda bulunamayan isimler:
      <b>${esc([...eksik].join(', '))}</b>. Bunlar eklenmeden devir işlenemez.
      ${kurucuMu()?`<button class="btn-sm btn-b btn-full" style="margin-top:9px" onclick="kapatModal();kadroSor()">
        ⚡ Kadroyu Tamamla (${esc([...eksik].join(', '))})</button>`
       :'<div class="xs" style="margin-top:6px">Masayı kuran eklemeli.</div>'}</div>`:''}
    <button class="btn-p btn-full" id="dvBtn" ${eksik.size?'disabled':''} onclick="devirYukle()">Devri İşle</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function devirYukle(){
  const btn=$('#dvBtn'); if(btn){btn.disabled=true;}
  let macN=0, borcN=0, hata=0;
  try{
    const d=await fetch('kurulum/devir.json',{cache:'no-store'}).then(r=>r.json());

    /* maçlar */
    for(const m of (d.maclar||[])){
      if(btn) btn.innerHTML=`<span class="yukleniyor"></span> maç ${macN+1}`;
      const A=(m.A||[]).map(n=>adaGoreOyuncu(n)?.id).filter(Boolean);
      const B=(m.B||[]).map(n=>adaGoreOyuncu(n)?.id).filter(Boolean);
      if(A.length!==2||B.length!==2){ hata++; continue; }
      /* zaten yüklenmiş mi? aynı tarih + aynı kadro */
      const varMi=DB.celseler.some(c=>c.tarih===m.tarih&&c.oyun==='batak'&&c.takimlar&&
        c.takimlar.some(t=>t.oyuncular.every(id=>A.includes(id))));
      if(varMi) continue;
      const kz=(Number(m.puanA)||0)>=(Number(m.puanB)||0)?0:1;
      const c={oyun:'batak',giris:'hizli',masaAd:'Devir',tarih:m.tarih,yer:m.yer||'',
        tabelaci:DB.ben||A[0],partiHedef:2,not:m.not||'',bahis:m.bahis||{ne:'Onur',adet:1},
        takimlar:[{ad:'A',oyuncular:A},{ad:'B',oyuncular:B}],
        hizli:{partiSkor:[Number(m.partiA)||(kz===0?2:0),Number(m.partiB)||(kz===1?2:0)],
               puan:[Number(m.puanA)||0,Number(m.puanB)||0]},
        kazanan:kz,partiler:[{eller:[],kazanan:null}]};
      c.zabit=zabitUret(c);
      const {data,error}=await sb.from('maclar').insert({
        masa_id:DB.aktifGrup,oyun:'batak',giris:'hizli',tarih:m.tarih,yer:m.yer||null,
        tabelaci_id:OTURUM.id,parti_hedef:2,celse:JSON.parse(JSON.stringify(c)),bitti:true,
        kazanan:kz,zabit:c.zabit,aciklama:c.not||null}).select('id,olusturma').single();
      if(error){ hata++; continue; }
      Object.assign(c,{id:data.id,grupId:DB.aktifGrup,bitti:true,_hesap:OTURUM.id,_sira:data.olusturma});
      DB.celseler.push(c); macN++;
    }

    /* borçlar */
    for(const b of (d.borclar||[])){
      if(btn) btn.innerHTML=`<span class="yukleniyor"></span> borç ${borcN+1}`;
      const bl=(b.borclular||[]).map(n=>adaGoreOyuncu(n)?.id).filter(Boolean);
      const al=(b.alacaklilar||[]).map(n=>adaGoreOyuncu(n)?.id).filter(Boolean);
      if(!bl.length||!al.length){ hata++; continue; }
      const zaten=(DB.akis||[]).some(a=>{
        const k=a.veri&&a.veri.borcKaydi;
        return k&&k.ne===b.ne&&(k.borclular||[]).length===bl.length&&
               (k.borclular||[]).every(id=>bl.includes(id));
      });
      if(zaten) continue;
      const ok=await borcKaydiYaz({borclular:bl,alacaklilar:al,ne:b.ne,
        adet:Number(b.adet)||1,aciklama:b.aciklama||'Devir borcu.'});
      if(ok) borcN++; else hata++;
    }
  }catch(e){ toast(hataMetni(e),true); }
  await verileriGetir(); kapatModal(); render();
  toast(hata?`${macN} maç, ${borcN} borç işlendi · ${hata} kayıt olmadı`
            :`Devir işlendi: ${macN} maç, ${borcN} borç kaydı.`,true);
}
