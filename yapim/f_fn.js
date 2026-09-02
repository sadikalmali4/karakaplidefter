//== render
function render(){
  const tb=document.querySelector('nav.tabbar');
  const v=$('#view');
  const tam = DURUM==='hazir';
  if(DURUM==='tmisafirGiris'||DURUM==='tmisafir'){
    tb.style.display='none'; document.body.style.paddingBottom='24px';
    $('#hdrSub').textContent = DURUM==='tmisafir'
      ? `tahmin · ${TMISAFIR?.ad||''}` : 'tahmin yarışması';
    $('#hdrRight').innerHTML='';
    v.innerHTML = DURUM==='tmisafir' ? tmisafirEkran() : tmisafirGirisEkrani();
    if(DURUM==='tmisafirGiris') setTimeout(()=>$('#tmAd')?.focus(),60);
    return;
  }
  if(DURUM==='misafirGiris'||DURUM==='misafir'){
    tb.style.display='none'; document.body.style.paddingBottom='24px';
    $('#hdrSub').textContent = DURUM==='misafir'
      ? `misafir · ${MISAFIR?.ad||''}` : 'misafir girişi';
    $('#hdrRight').innerHTML='';
    v.innerHTML = DURUM==='misafir' ? misafirEkran() : misafirGirisEkrani(misafirKodu());
    if(DURUM==='misafirGiris') setTimeout(()=>$('#msAd')?.focus(),60);
    return;
  }
  tb.style.display = tam?'':'none';
  document.body.style.paddingBottom = tam?'':'24px';

  if(DURUM==='yukleniyor'){
    $('#hdrSub').textContent='bağlanıyor…'; $('#hdrRight').innerHTML='';
    v.innerHTML='<div class="card"><div class="empty"><span class="yukleniyor"></span></div></div>'; return;
  }
  if(DURUM==='hata'){
    $('#hdrSub').textContent='bağlantı yok'; $('#hdrRight').innerHTML='';
    v.innerHTML=`<div class="card"><div class="empty"><div class="big">⚠️</div>
      <div class="sm" style="color:var(--ink2)">${esc(HATA)}</div>
      <button class="btn-p" style="margin-top:14px" onclick="location.reload()">Yeniden dene</button></div></div>`; return;
  }
  if(DURUM==='giris'){
    $('#hdrSub').textContent='Batak & 101 tabelası'; $('#hdrRight').innerHTML='';
    v.innerHTML=girisEkrani();
    setTimeout(()=>$(GIRIS_MOD==='kayit'?'#gAdi':'#gKad')?.focus(),60); return;
  }
  if(DURUM==='masayok'){
    $('#hdrSub').textContent=esc(PROFIL?.ad||''); $('#hdrRight').innerHTML='';
    v.innerHTML=masaYokEkrani(); return;
  }

  document.querySelectorAll('nav.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB));
  const g=aktifGrup();
  $('#hdrSub').innerHTML = (DB.ben?`${esc(ad(DB.ben))} · ${seviye(toplamMac(DB.ben)).ad}`:esc(PROFIL?.ad||''))
    + ` <span id="yazDurum" class="yaziyor"></span>`;
  $('#hdrRight').innerHTML = `<div class="grupBar" onclick="grupSecici()">
      <span class="ell">${esc(g?g.emoji+' '+g.ad:'Masa')}</span><span class="dim">▾</span></div>`;
  if(TAB==='celse') v.innerHTML=viewCelse();
  if(TAB==='akis')  v.innerHTML=viewAkis();
  if(TAB==='sicil') v.innerHTML=viewSicil();
  if(TAB==='iddia') v.innerHTML=viewIddia();
  if(TAB==='arsiv') v.innerHTML=viewArsiv();
  if(TAB==='rozet') v.innerHTML=viewRozet();
  if(TAB==='ayar')  v.innerHTML=viewAyar();
  yazIsigi();
}

//== karsilama
/* Hesabım var, masadayım — ama hangi oyuncu olduğum belli değil.
   Sahipsiz bir kaydı kendim üstlenirim; yoksa yeni kayıt açarım. */
function karsilama(){
  const bos=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup&&o.aktif&&!o.profilId);
  return `<div class="card">
    <div class="empty" style="padding-bottom:10px">
      <div class="big">§</div>
      <div class="serif" style="font-size:19px;color:var(--ink)">Sen hangisisin?</div>
      <div class="sm" style="margin-top:8px;max-width:360px;margin-left:auto;margin-right:auto">
        Grupta kendi sicilini görebilmen için hesabını bir oyuncu kaydına bağlaman gerekiyor.</div>
    </div>
    ${bos.length?`<div class="stack" style="margin-top:6px">${bos.map(o=>`
      <div class="row" style="gap:10px">${avatar(o.id,34)}
        <div class="grow" style="font-weight:600">${esc(o.ad)}</div>
        <button class="btn-sm btn-p" onclick="benimOl('${o.id}')">Bu benim</button>
      </div>`).join('')}</div>`
     :`<div class="sm dim center">Sahipsiz oyuncu kaydı kalmamış.</div>`}
    <div class="sep"></div>
    <button class="btn-b btn-full" onclick="oyuncuAc(null,true)">Kendimi Yeni Oyuncu Olarak Ekle</button>
    <div class="xs dim center" style="margin-top:8px">Yanlış kaydı seçtiysen grubu kuran geri alabilir.</div>
  </div>`;
}
async function benimOl(id){
  try{
    const {error}=await sb.rpc('oyuncu_sahiplen',{p_oyuncu:id});
    if(error) throw error;
    await yenile(true); toast(`Hoş geldin ${ad(id)}.`);
  }catch(e){ toast(hataMetni(e),true); }
}

//== canliIzle
/* Tabelacı ben değilim: yazamam, canlı izlerim. */
function canliIzle(){
  const c=DB.aktif, m=macDurum(c);
  const kim = DB.oyuncular.find(o=>o.profilId===c._hesap&&o.masaId===c.grupId)
           || MASA_UYELERI.find(u=>u.profil_id===c._hesap)?.profiller;
  const bas2=`<div class="card">
    <div class="row" style="justify-content:space-between">
      <div><div class="serif" style="font-size:17px"><span class="canli"></span>${c.oyun==='batak'?'Batak':'101'} · canlı</div>
        <div class="xs dim">${trh(c.tarih)}${c.yer?' · '+esc(c.yer):''} · ✍️ ${esc(kim?.ad||'tabelacı')}</div></div>
      <button class="btn-xs btn-gh" onclick="yenile()">Yenile</button>
    </div><div class="sep"></div>`;

  if(c.oyun==='batak'){
    const T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
    return bas2+`
      ${[0,1].map(i=>`<div class="row" style="padding:7px 0">
        <span class="pill ${i?'blue':'red'}">${c.takimlar[i].ad}</span>
        <div class="grow" style="font-weight:600;font-size:14px">${esc(T(i))}</div>
        <div class="serif" style="font-size:22px;${m.macKazanan===i?'color:var(--gold)':''}">${m.gTop[i]}</div>
      </div>`).join('')}
      <div class="xs dim center" style="margin-top:6px">Parti ${m.partiSkor[0]}–${m.partiSkor[1]} · ${c.partiHedef} parti üzerinden</div>
      </div>
      ${gecmisPartiler(c)}
      <div class="card tight center xs dim">Tabelayı ${esc(kim?.ad||'tabelacı')} tutuyor. Ekran kendiliğinden güncellenir.</div>`;
  }
  const sr=m.sira;
  return bas2+`
    ${sr.map((r,i)=>`<div class="row" style="padding:6px 0;gap:9px">
      <div class="rank ${i===0?'r1':(i===sr.length-1?'rs':'')}">${i+1}</div>
      ${avatar(r.id,30)}
      <div class="grow" style="margin-left:4px;font-weight:600;font-size:14px">${esc(ad(r.id))}</div>
      <div class="serif" style="font-size:19px">${r.puan}</div></div>`).join('')}
    </div>
    ${gecmisPartiler(c)}
    <div class="card tight center xs dim">Tabelayı ${esc(kim?.ad||'tabelacı')} tutuyor. Ekran kendiliğinden güncellenir.</div>`;
}

//== celseKur
async function celseKur(oyun){
  const s=secililer();
  const giris=document.querySelector('#mGiris .on')?.dataset.g||'hizli';
  const partiHedef= giris==='hizli' ? (oyun==='batak'?2:1) : Number(document.querySelector('#mParti .on')?.dataset.p||1);
  const tabelaci=document.querySelector('#mTabelaci .chip.on')?.dataset.id || DB.ben || s[0];
  const c={oyun,giris,tarih:$('#mTarih').value||bugun(),yer:yerOku(),
           tabelaci,partiHedef,not:'',partiler:[{eller:[],kazanan:null}]};
  if(oyun==='batak'){
    if(s.length!==4) return toast('Batak için tam 4 oyuncu gerekli',true);
    c.takimlar=[{ad:'A',oyuncular:[s[0],s[1]]},{ad:'B',oyuncular:[s[2],s[3]]}];
    c.hizli={partiSkor:[0,0],puan:[0,0]};
  }else{
    if(s.length<3) return toast('En az 3 oyuncu gerekli',true);
    c.mod=document.querySelector('#mMod .on')?.dataset.m||'tek';
    if(c.mod==='esli'&&s.length!==4) return toast('Eşli 101 için tam 4 oyuncu gerekli',true);
    c.oyuncular=s; c.esler=c.mod==='esli'?[[s[0],s[2]],[s[1],s[3]]]:null;
    c.hizli={sira:s.slice(),puan:{}};
  }
  const btn=$('#mKurBtn'); if(btn){btn.disabled=true;btn.innerHTML='<span class="yukleniyor"></span>';}
  try{
    const {data,error}=await sb.from('maclar').insert({
      masa_id:DB.aktifGrup, oyun, giris, tarih:c.tarih, yer:c.yer||null,
      tabelaci_id:OTURUM.id, parti_hedef:Math.min(5,Math.max(1,partiHedef)),
      mod:oyun==='101'?c.mod:null, celse:c, bitti:false
    }).select('id').single();
    if(error) throw error;
    DB.aktif=Object.assign(c,{id:data.id,grupId:DB.aktifGrup,bitti:false,_hesap:OTURUM.id});
    if(giris==='detay'&&kurucuMu()){
      DB.ayar[oyun==='batak'?'batak':'yz'].partiHedef=partiHedef;
      ayarYaz(true);
    }
    kapatModal(); git('celse');
  }catch(e){
    toast(hataMetni(e),true);
    if(btn){btn.disabled=false;btn.textContent='Tabelayı Aç';}
  }
}

//== celseKesinlestir
async function celseKesinlestir(){
  const c=DB.aktif; if(!c) return;
  clearTimeout(_yazZaman);          // bekleyen gecikmeli yazma kapanışın üstüne binmesin
  const oncekiRozet=rozetSahipleri(c.oyun);
  c.not=$('#zNot').value.trim();
  if(c.giris==='detay'){
    const son=c.partiler[c.partiler.length-1];
    if(son&&son.eller.length&&son.kazanan==null)
      son.kazanan=c.oyun==='batak'?batakPartiKazanan(son):yzPartiKazanan(son,c);
    if(son&&!son.eller.length&&c.partiler.length>1) c.partiler.pop();
  }
  const m=macDurum(c);
  c.kazanan = c.oyun==='batak' ? (m.macKazanan??(m.partiSkor[0]>=m.partiSkor[1]?0:1)) : (m.macKazanan??m.sira[0].id);
  c.zabit=zabitUret(c);
  const btn=document.querySelector('#modalHost .btn-g');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="yukleniyor"></span>';}
  try{
    await aktifYaz();                       // bekleyen yazma varsa önce o insin
    const {error}=await sb.from('maclar').update({
      celse:aktifBelge(c), bitti:true, kazanan:c.kazanan??null,
      zabit:c.zabit, aciklama:c.not||null, tarih:c.tarih
    }).eq('id',c.id);
    if(error) throw error;
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='Zabtı Üret';}
    return toast(hataMetni(e),true);
  }
  c.bitti=true;
  DB.celseler.unshift(c); DB.aktif=null;
  const sonra=rozetSahipleri(c.oyun), yeni=[];
  muayyideler(c.oyun).forEach(r=>{ if(oncekiRozet[r.ad]!==sonra[r.ad]) yeni.push(r); });
  kapatModal(); zabitGoster(c,yeni);
}

//== celseIptal
async function celseIptal(){
  const c=DB.aktif; if(!c) return;
  if(!confirm('Bu tabela kaydedilmeden silinsin mi?')) return;
  clearTimeout(_yazZaman); _bekleyenYazi=false;
  const {error}=await sb.from('maclar').delete().eq('id',c.id);
  if(error) return toast(hataMetni(error),true);
  DB.aktif=null; render(); toast('Tabela silindi');
}

//== celseSil
async function celseSil(id){
  if(!confirm('Bu maç arşivden silinsin mi? Sicil yeniden hesaplanır.')) return;
  const {error}=await sb.from('maclar').delete().eq('id',id);
  if(error) return toast(hataMetni(error),true);
  DB.celseler=DB.celseler.filter(c=>c.id!==id); render(); toast('Maç silindi');
}

//== ayarSet
async function ayarSet(g,k,v,tam){
  if(!kurucuMu()) return toast('Kuralları yalnız grubu kuran değiştirebilir',true);
  if(typeof v==='boolean') DB.ayar[g][k]=v;
  else if(typeof DB.ayar[g][k]==='number') DB.ayar[g][k]=tam?(parseInt(v,10)||0):(Number(v)||0);
  else DB.ayar[g][k]=String(v);
  await ayarYaz();
}
async function ayarYaz(sessiz){
  const {error}=await sb.from('masalar').update({ayar:DB.ayar}).eq('id',DB.aktifGrup);
  if(error) return toast(hataMetni(error),true);
  const g=grup(DB.aktifGrup); if(g) g.ayar=JSON.parse(JSON.stringify(DB.ayar));
  if(!sessiz) toast('Kural güncellendi — gruptaki herkes için');
}

//== iddiaKaydet
async function iddiaKaydet(){
  const kim=document.querySelector('#iKim .chip.on')?.dataset.id;
  if(!kim) return toast('İddia edeni seç',true);
  const kime=document.querySelector('#iKime .chip.on')?.dataset.id||null;
  if(kime===kim) return toast('Kendine karşı iddia olmaz',true);
  const metin=$('#iMetin').value.trim();
  if(!metin) return toast('İddia metnini yaz',true);
  const bahis=$('#iBahisSerbest').value.trim()||document.querySelector('#iBahis .chip.on')?.dataset.b||'';
  const {data,error}=await sb.from('iddialar').insert({
    masa_id:DB.aktifGrup, kim_id:kim, kime_id:kime, metin, bahis:bahis||null,
    tarih:bugun(), vade:$('#iVade').value||null, durum:'acik', acan_id:OTURUM.id
  }).select('*').single();
  if(error) return toast(hataMetni(error),true);
  DB.iddialar.push({id:data.id,grupId:data.masa_id,tarih:data.tarih,vade:data.vade||'',
    kim:data.kim_id,kime:data.kime_id,metin:data.metin,bahis:data.bahis||'',
    durum:data.durum,sonucNot:'',kapanis:''});
  kapatModal(); render();
  toast('İddia deftere geçirildi. Geri dönüşü yoktur.',true);
}

//== iddiaKarar
async function iddiaKarar(id,durum){
  const i=DB.iddialar.find(x=>x.id===id); if(!i) return;
  const kaybeden = durum==='kazandi' ? (i.kime||null) : i.kim;
  const not = durum==='kazandi'
    ? `${ad(i.kim)} sözünü tutmuştur.${i.bahis&&kaybeden?` ${ad(kaybeden)} "${i.bahis}" borcunu ifa edecektir.`:''}`
    : `${ad(i.kim)} tutturamamıştır.${i.bahis?` "${i.bahis}" borcu kendisine yüklenmiştir.`:''}`;
  const {error}=await sb.from('iddialar')
    .update({durum,sonuc_not:not,kapanis:bugun()}).eq('id',id);
  if(error) return toast(hataMetni(error),true);
  i.durum=durum; i.sonucNot=not; i.kapanis=bugun();
  render(); toast(not,true);
}

//== iddiaAc
async function iddiaAc(id){
  const i=DB.iddialar.find(x=>x.id===id); if(!i) return;
  const {error}=await sb.from('iddialar')
    .update({durum:'acik',sonuc_not:null,kapanis:null}).eq('id',id);
  if(error) return toast(hataMetni(error),true);
  i.durum='acik'; i.sonucNot=''; i.kapanis=''; render();
}

//== iddiaSil
async function iddiaSil(id){
  if(!confirm('İddia defterden silinsin mi?')) return;
  const {error}=await sb.from('iddialar').delete().eq('id',id);
  if(error) return toast(hataMetni(error),true);
  DB.iddialar=DB.iddialar.filter(x=>x.id!==id); render();
}
